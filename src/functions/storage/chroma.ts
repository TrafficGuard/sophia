// import { ChromaClient } from 'chromadb';
// import { funcClass } from '#functionSchema/functionDecorators';
//
// @funcClass(__filename)
// export class Chroma {
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
