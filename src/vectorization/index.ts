import { OpenAIApi } from "openai";
import { LocalIndex, MetadataTypes, QueryResult } from "vectra";

type ResultItem = QueryResult<Record<string, MetadataTypes>>;
type QueryResultCollection = ResultItem[];

interface QueryResultCollectionFormatter {
    format: (results:QueryResultCollection) => string,
}

export const filesContextFormatter:QueryResultCollectionFormatter = {
    format: (results:QueryResultCollection) => results.map(({item}) => {
        return `filePath: ${item.metadata["filePath"]}\nlanguage: ${item.metadata["languageId"]}\ncontent:\n${item.metadata["text"]}`;
    }).join("\n\n---\n\n")
}

export async function query(api:OpenAIApi, index:LocalIndex, text: string, topK=3):Promise<QueryResultCollection> {
    const vector = await getVector(api, text);
    const results = await index.queryItems(vector, topK);
    if (results.length > 0) {
        console.log(`${results.length} records matched`);
    } else {
        console.log(`No results found.`);
    }
    
    return results;
}

async function getVector(api:OpenAIApi, text: string) {
    const response = await api.createEmbedding({
        'model': 'text-embedding-ada-002',
        'input': text,
    });
    return response.data.data[0].embedding;
}
