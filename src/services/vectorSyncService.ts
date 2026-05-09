/**
 * Vector Sync API — triggers embedding index synchronization on the backend.
 *
 * Endpoints:
 *   GET  /api/vector-sync/status           — check sync status
 *   POST /api/vector-sync/resync           — sync delta (default, called on app init)
 *   POST /api/vector-sync/all              — full rebuild (admin only)
 *   POST /api/vector-sync/{recordingId}    — sync single recording
 *   DELETE /api/vector-sync/{recordingId}  — remove recording from index
 */

import { legacyGet, legacyPost, legacyDelete } from '@/api/legacyHttp';
import { logServiceError, logServiceInfo } from '@/services/serviceLogger';

export const vectorSyncService = {
  /** Check current sync status. */
  getStatus: async (): Promise<unknown> => {
    return legacyGet<unknown>('/vector-sync/status');
  },

  /**
   * Sync delta — only recordings missing embeddings.
   * Safe to call on every app init; server is idempotent.
   */
  resync: async (): Promise<void> => {
    try {
      await legacyPost<unknown>('/vector-sync/resync');
      logServiceInfo('[VectorSync] resync triggered successfully');
    } catch (err) {
      logServiceError('[VectorSync] resync failed (non-blocking)', err);
    }
  },

  /** Full rebuild — admin only. Rebuilds entire vector store. */
  syncAll: async (): Promise<void> => {
    await legacyPost<unknown>('/vector-sync/all');
  },

  /** Sync a single recording's embedding. */
  syncRecording: async (recordingId: string): Promise<void> => {
    await legacyPost<unknown>(`/vector-sync/${encodeURIComponent(recordingId)}`);
  },

  /** Remove a recording from the vector index. */
  removeRecording: async (recordingId: string): Promise<void> => {
    await legacyDelete<unknown>(`/vector-sync/${encodeURIComponent(recordingId)}`);
  },
};
