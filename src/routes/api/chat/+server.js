// +server.js
import { json } from '@sveltejs/kit';

const SYSTEM_PROMPT = `
You are an expert API support assistant for Crustdata. Your role is to provide accurate, 
helpful, and super concise answers about Crustdata's APIs based on the provided documentation context.
Cite search results using [\${{number}}] notation. Only cite the most relevant results that answer the question accurately.
Place these citations at the end of the sentence or paragraph that reference them - do not put them all at the end. 
If different results refer to different entities within the same name, write separate answers for each entity.
You must only use information from the provided search results.

Guidelines:
- Focus on information present in the provided context
- Provide API URLs that are specific, actionable answers.
- Explicitly state the API, along with its use and an example if relevant to the question.
- Include relevant code examples when appropriate
- If unsure or if information is not in context, acknowledge limitations
- Use an unbiased and journalistic tone. 
- Combine search results together into a coherent answer. Do not repeat text.
- For API answers, provide the API URL instead of cURL examples.

REMEMBER: Do not repeat yourself, always be concise and if there is no relevant information within the context, just say "Hmm, I'm not sure." DON'T TRY TO MAKE UP AN ANSWER.`;

export const POST = async ({ request, platform }) => {
  try {
    const { messages } = await request.json();
    if (!messages?.length) {
      throw new Error('No messages provided');
    }

    const currentMessage = messages[messages.length - 1];
    const chatHistory = messages.slice(0, -1);

    // Generate embeddings for the question
    const embeddings = await platform.env.AI.run(
      '@cf/baai/bge-base-en-v1.5', 
      { text: currentMessage.content }
    );

    if (!embeddings.data[0]) throw new Error('Failed to generate embeddings');

    // query vector database using the embeddings
    const vectorQuery = await platform.env.VECTORIZE.query(
      embeddings.data[0],  // using the actual vector here
      { topK: 10 }
    );

    // extract matching documents
    let contextDocs = [];
    if (vectorQuery.matches.length > 0) {
      for (const match of vectorQuery.matches) {
        const doc = await platform.env.DB.prepare(`SELECT content FROM documents WHERE id = ?`).bind(match.id).first();
        contextDocs.push(doc);
      }
    }

    const context = contextDocs.length ? `Context:\n${contextDocs.map(doc => `- ${JSON.stringify(doc)}`).join('\n')}` : '';

    const promptMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(contextDocs.length ? [{ role: 'system', content: context }] : []),
      ...chatHistory,
      { role: 'user', content: currentMessage.content }
    ];

    const response = await platform.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: promptMessages,
      stream: true,
      max_tokens: 1000,
    });

    return new Response(response, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

const fetchDocumentById = async (id) => {
  const result = await platform.env.DOCUMENTS_DB.prepare(`SELECT content FROM documents WHERE id = ?`).bind(id).first();
  return result.content || null;
};
