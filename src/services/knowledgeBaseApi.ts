import { api } from "@/services/api";

function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "data" in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

export const knowledgeBaseApi = {
  async countKnowledgeBaseItems(): Promise<number> {
    // /api/KnowledgeBase (GET) exists; count by list length.
    const res = await api.get<unknown>("/KnowledgeBase");
    return safeArray<unknown>(res).length;
  },

  async countRevisions(): Promise<number> {
    // /api/KBRevision (GET) exists; count by list length.
    const res = await api.get<unknown>("/KBRevision");
    return safeArray<unknown>(res).length;
  },

  async countEntries(): Promise<number> {
    // /api/KBEntry (GET) exists; count by list length.
    const res = await api.get<unknown>("/KBEntry");
    return safeArray<unknown>(res).length;
  },
};

