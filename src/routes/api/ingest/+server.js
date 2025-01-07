import { error, json } from "@sveltejs/kit";
import { compile } from "html-to-text";
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const loadApiDocs = async (url) => {
  const compiledConvert = compile({ wordwrap: 130 });

  const loader = new RecursiveUrlLoader(url, {
    extractor: compiledConvert,
    maxDepth: 8,
    preventOutside: true,
  });

  return await loader.load();
}

const splitDocs = async (docs) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });

  return await splitter.splitDocuments([...docs]);
}

export const POST = async ({ platform }) => {
  try {
    // check if docs already ingested
    const isIngested = await platform.env.CRUSTDATA_KV.get('docsIngested');
    if (isIngested) return json({ message: 'Documents already ingested' });

    // load and split docs
    const docs = await loadApiDocs("https://docs.crustdata.com/docs/intro");
    const split_docs = await splitDocs(docs);

    // process all documents in one batch
    const { data } = await platform.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: split_docs.map(doc => doc.pageContent),
    });
    
    if (!data) throw new Error('Failed to generate vector embeddings!');

    const vectors = data.map((values, i) => ({
      id: split_docs[i].id,
      values,
      metadata: split_docs[i].metadata,
    }));

    await platform.env.VECTOR_INDEX.upsert(vectors);
    await platform.env.CRUSTDATA_KV.put('docsIngested', 'true');

    return json({ message: 'Initial ingestion completed!' }, { status: 200 });
  } catch (err) {
    return error(500, { message: err.message });
  }
}
