import { api } from "@/services/api";

function safeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  if ("data" in obj) return safeArray<T>(obj.data);
  if ("items" in obj) return safeArray<T>(obj.items);
  if ("results" in obj) return safeArray<T>(obj.results);
  if ("result" in obj) return safeArray<T>(obj.result);
  if ("value" in obj) return safeArray<T>(obj.value);
  return [];
}

function safeObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if ("data" in obj) {
    const inner = obj.data;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  }
  if ("item" in obj) {
    const inner = obj.item;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  }
  return obj;
}

export type AnalyticsOverview = {
  totalRecordings?: number;
  totalSubmissions?: number;
  totalUsers?: number;
  totalContributors?: number;
  totalExperts?: number;
};

export type CoverageRow = {
  name?: string;
  label?: string;
  ethnicity?: string;
  region?: string;
  count?: number;
  value?: number;
};

export type ContributorRow = {
  userId?: string;
  id?: string;
  username?: string;
  fullName?: string;
  contributionCount?: number;
  submissions?: number;
  approvedCount?: number;
  rejectedCount?: number;
};

export const analyticsApi = {
  async getOverview(): Promise<AnalyticsOverview | null> {
    const res = await api.get<unknown>("/Analytics/overview");
    return safeObject(res) as AnalyticsOverview | null;
  },

  async getCoverage(): Promise<CoverageRow[]> {
    const res = await api.get<unknown>("/Analytics/coverage");
    return safeArray<CoverageRow>(res);
  },

  async getSubmissionsTrend(): Promise<Record<string, number>> {
    // Prefer server aggregation; if server returns rows, caller can map.
    const res = await api.get<unknown>("/Analytics/submissions");
    const obj = safeObject(res);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      // if already returned as { "2026-03": 12, ... }
      const entries = Object.entries(obj);
      if (entries.every(([, v]) => typeof v === "number")) return obj as Record<string, number>;
    }
    // otherwise return empty and let UI fallback.
    return {};
  },

  async getContributors(): Promise<ContributorRow[]> {
    const res = await api.get<unknown>("/Analytics/contributors");
    return safeArray<ContributorRow>(res);
  },
};

