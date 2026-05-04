import createClient from 'openapi-fetch';

import type { paths } from './generated';

import { API_BASE_URL } from '@/config/constants';
import { getItem } from '@/services/storageService';

function resolveOpenApiBaseUrl(input: string): string {
  const raw = (input || '').trim();
  if (!raw) return '';
  return raw.replace(/\/api\/?$/i, '');
}

export const apiFetch = createClient<paths>({
  baseUrl: resolveOpenApiBaseUrl(API_BASE_URL),
  headers: { 'Content-Type': 'application/json' },
});

apiFetch.use({
  async onRequest({ request }) {
    const token = getItem('access_token');
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
});

export type ApiEnvelope<T = unknown> = {
  data?: T;
  error?: unknown;
  response: Response;
};

export async function apiOk<T>(promise: Promise<ApiEnvelope<T>>): Promise<T> {
  const { data, error, response } = await promise;
  if (error) {
    const err = new Error(`API request failed (${response.status})`);
    (err as { response?: unknown; error?: unknown }).response = {
      status: response.status,
      data: error,
      headers: response.headers,
      url: response.url,
    };
    (err as { response?: unknown; error?: unknown }).error = error;
    throw err;
  }
  return data as T;
}

export function asApiEnvelope<T>(promise: unknown): Promise<ApiEnvelope<T>> {
  return promise as Promise<ApiEnvelope<T>>;
}

export function openApiQueryRecord<T extends object>(query: T): Record<string, unknown> {
  return query as unknown as Record<string, unknown>;
}

type LooseMethod = (path: string, init?: unknown) => Promise<unknown>;

export type ApiFetchLoose = {
  GET: LooseMethod;
  POST: LooseMethod;
  PUT: LooseMethod;
  DELETE: LooseMethod;
  PATCH: LooseMethod;
};

export const apiFetchLoose = apiFetch as unknown as ApiFetchLoose;

