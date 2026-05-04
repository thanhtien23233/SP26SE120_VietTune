import type { APIRequestContext } from "@playwright/test";

type CleanupFn = () => Promise<void>;

export type TestDataTracker = {
  track: (cleanup: CleanupFn) => void;
  cleanup: () => Promise<void>;
};

export function createTestDataTracker(): TestDataTracker {
  const cleanups: CleanupFn[] = [];
  return {
    track: (cleanup) => {
      cleanups.push(cleanup);
    },
    cleanup: async () => {
      for (const fn of cleanups.reverse()) {
        try {
          await fn();
        } catch {
          void 0;
        }
      }
    },
  };
}

export async function apiDelete(
  request: APIRequestContext,
  url: string,
  opts?: { token?: string },
): Promise<void> {
  const headers: Record<string, string> = {};
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  await request.delete(url, { headers }).catch(() => {});
}

