// import { ChromaClient } from 'chromadb/dist/main/index';
// import { funcClass } from '#functionSchema/functionDecorators';
//
// import { Chroma } from "@langchain/community/vectorstores/chroma";
// import { OpenAIEmbeddings } from "@langchain/openai";
//
// const embeddings = new OpenAIEmbeddings({
//     model: "text-embedding-3-small",
// });
//
// const vectorStore = new Chroma(embeddings, {
//     collectionName: "a-test-collection",
//     url: "http://localhost:8000", // Optional, will default to this value
//     collectionMetadata: {
//         "hnsw:space": "cosine",
//     }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
// });
//
//
//
// @funcClass(__filename)
// export class ChromaDb {
//     client = new ChromaClient();
//
//     private async createCollection(name: string, metadata?: Record<string, any>): Promise<any> {
//         try {
//             return await this.client.createCollection({ name, metadata });
//         } catch (error) {
//             console.error(`Error creating collection ${name}:`, error);
//             throw error;
//         }
//     }
//
//     private async getCollection(name: string): Promise<any> {
//         try {
//             return await this.client.getCollection({ name });
//         } catch (error) {
//             console.error(`Error getting collection ${name}:`, error);
//             throw error;
//         }
//     }
//
//     private async deleteCollection(name: string): Promise<void> {
//         try {
//             await this.client.deleteCollection({ name });
//             console.log(`Collection ${name} deleted successfully`);
//         } catch (error) {
//             console.error(`Error deleting collection ${name}:`, error);
//             throw error;
//         }
//     }
// }
