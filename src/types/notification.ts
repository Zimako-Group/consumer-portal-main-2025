export interface Notification {
  id?: string;
  type: 'QUERY_ASSIGNMENT';
  recipientId: string;
  senderId: string;
  senderName: string;
  queryId: string;
  queryTitle: string;
  queryDescription: string;
  read: boolean;
  createdAt: string;
}

export type NotificationType = 'QUERY_ASSIGNMENT';
