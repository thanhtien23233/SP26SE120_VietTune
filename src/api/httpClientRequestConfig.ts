export type HttpClientRequestConfig = {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  timeout?: number;
};
