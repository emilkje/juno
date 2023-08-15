import { createOpenAiApi } from "@juno/llm/openai";
import { FunctionData } from "@juno/llm/openai/functions";
import { OpenAIApi } from "openai";
import { LocalIndex, MetadataTypes, QueryResult } from "vectra";
import { join as joinPath } from 'path';
import { getExtensionContext, getPeristentWorkspaceFolderPath } from "@juno/common";

type ResultItem = QueryResult<Record<string, MetadataTypes>>;
type QueryResultCollection = ResultItem[];

interface QueryResultCollectionFormatter {
    format: (results:QueryResultCollection) => string,
}

export const MAX_FILE_SIZE = 30_000;

export const commonExcludes = [
    '**/node_modules/**',
    '**/out/**',
    '**/dist/**',
    '**/vectors/**',
    '**/package-lock.json',
    '.*/**',
    '**/.*/**',
    '**/bin/**', // dotnet
    '**/obj/**' // dotnet
];

export const filesContextFormatter:QueryResultCollectionFormatter = {
    format: (results:QueryResultCollection) => results.map(({item}) => {
        return `filePath: ${item.metadata["filePath"]}\nlanguage: ${item.metadata["languageId"]}\ncontent:\n${item.metadata["text"]}`;
    }).join("\n\n---\n\n")
};

export function getIndex() {
    const ctx = getExtensionContext();
    const workspacePath = getPeristentWorkspaceFolderPath(ctx);
    return new LocalIndex(joinPath(workspacePath, 'vectors'));
}

/**
 * Searches for matching records in a local index based on a given text input.
 * @param api - The OpenAIApi object for making API calls.
 * @param index - The LocalIndex object representing the index to be searched.
 * @param text - The input text to be searched for in the index.
 * @param topK - The maximum number of matching records to retrieve (default: 3).
 * @returns A Promise that resolves to a QueryResultCollection containing the matching records.
 */
export async function search(api:OpenAIApi, index:LocalIndex, text: string, topK=3):Promise<QueryResultCollection> {
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


// Then define the function with its associated function object
export const vectorSearchTool:FunctionData = {
    function: async ({query}: {query:string}): Promise<string> => {
        const openai = createOpenAiApi();
        const index = getIndex();

        const result = await search(openai, index, query, 3);
        return filesContextFormatter.format(result);
    },
    object: {
        name: "vectorSearch",
        description: "Search the vector databse for additional file context. This is useful for gathering more information about the repository.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: 'The search query against the vector database. It is useful to use words that appear in code. E.g. a function name',
                },
            },
            required: ["query"],
        }
    },
    displayExecution: ({query}:{query:string}) => `gathering information...`
};