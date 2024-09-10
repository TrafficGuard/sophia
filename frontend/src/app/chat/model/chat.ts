import { Message } from './message';

export interface Chat {
  id?: string;
  uid?: string;
  createdAt: number;
  count: number;
  messages: Message[];
  participants: string[];
  ownerId: string;
  typing: string[];
}
