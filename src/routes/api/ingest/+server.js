import { error, json } from "@sveltejs/kit";
import { compile } from "html-to-text";
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const loadApiDocs = async (url) => {
  const compiledConvert = compile({ wordwrap: 130 });

  const loader = new RecursiveUrlLoader(url, {
    extractor: compiledConvert,
    maxDepth: 20,
    excludeDirs: ["https://docs.crustdata.com/api"]
  });

  return await loader.load();
}

const splitDocs = async (docs) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 4000,
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
    console.log(split_docs);

    let counter = 0;
    const batchSize = 10;
    for (let i = 0; i < split_docs.length; i++) {
      const { data } = await platform.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [split_docs[i].pageContent],
      });
      const values = data[0];

      // prepare vectors and store content in d1
      const docId = `doc_${counter++}`;
      const content = split_docs[i].pageContent;
      const metadata = JSON.stringify(split_docs[i].metadata);
      console.log(content);

      // store document in d1
      await platform.env.DB.prepare(`INSERT INTO documents (id, content, metadata) VALUES (?, ?, ?)`).bind(docId, content, metadata).run();

      // upsert vector embeddings into VECTORIZE
      await platform.env.VECTORIZE.upsert([{
        id: docId,
        values,
      }]);
    }

    await platform.env.CRUSTDATA_KV.put('docsIngested', 'true');
    return json({ message: 'Initial ingestion completed!' }, { status: 200 });
  } catch (err) {
    return error(500, { message: err.message });
  }
}
