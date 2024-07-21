import { Firestore, DocumentSnapshot } from '@google-cloud/firestore';
import { envVar } from '#utils/env-var';
import { logger } from '#o11y/logger';

export interface CodeReviewConfig {
  id: string;
  description: string;
  file_extensions: {
    include: string[];
  };
  requires: {
    text: string[];
  };
  examples: {
    code: string;
    review_comment: string;
  }[];
}

export class FirestoreCodeReviewService {
  private db: Firestore;

  constructor() {
    this.db = new Firestore({
      projectId: process.env.FIRESTORE_EMULATOR_HOST ? 'demo-nous' : envVar('GCLOUD_PROJECT'),
      databaseId: process.env.FIRESTORE_DATABASE,
      ignoreUndefinedProperties: true,
    });
  }

  async getCodeReviewConfig(id: string): Promise<CodeReviewConfig | null> {
    try {
      const docRef = this.db.doc(`CodeReviewConfig/${id}`);
      const docSnap: DocumentSnapshot = await docRef.get();
      if (!docSnap.exists) {
        return null;
      }
      return { id: docSnap.id, ...docSnap.data() } as CodeReviewConfig;
    } catch (error) {
      logger.error(error, 'Error getting code review config');
      throw error;
    }
  }

  async listCodeReviewConfigs(): Promise<CodeReviewConfig[]> {
    try {
      const querySnapshot = await this.db.collection('CodeReviewConfig').get();
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CodeReviewConfig));
    } catch (error) {
      logger.error(error, 'Error listing code review configs');
      throw error;
    }
  }

  async createCodeReviewConfig(config: Omit<CodeReviewConfig, 'id'>): Promise<string> {
    try {
      const docRef = await this.db.collection('CodeReviewConfig').add(config);
      return docRef.id;
    } catch (error) {
      logger.error(error, 'Error creating code review config');
      throw error;
    }
  }

  async updateCodeReviewConfig(id: string, config: Partial<CodeReviewConfig>): Promise<void> {
    try {
      const docRef = this.db.doc(`CodeReviewConfig/${id}`);
      await docRef.update(config);
    } catch (error) {
      logger.error(error, 'Error updating code review config');
      throw error;
    }
  }

  async deleteCodeReviewConfig(id: string): Promise<void> {
    try {
      const docRef = this.db.doc(`CodeReviewConfig/${id}`);
      await docRef.delete();
    } catch (error) {
      logger.error(error, 'Error deleting code review config');
      throw error;
    }
  }
}
