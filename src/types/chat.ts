export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  sourceRecordingIdsJson?: string | null;
  sourceKBEntryIdsJson?: string | null;
  expertCorrection?: string | null;
  flaggedByExpert?: boolean;
}
