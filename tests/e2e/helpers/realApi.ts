import type { APIRequestContext } from "@playwright/test";

export async function apiJson<T>(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  opts?: { token?: string; data?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;

  const res =
    method === "GET"
      ? await request.get(url, { headers })
      : method === "POST"
        ? await request.post(url, { headers, data: opts?.data })
        : method === "PUT"
          ? await request.put(url, { headers, data: opts?.data })
          : await request.delete(url, { headers });

  const headersObj = res.headers();
  const ct = headersObj["content-type"] ?? headersObj["Content-Type"] ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;

  const text = await res.text();
  try {
    return (text ? (JSON.parse(text) as T) : ({} as T));
  } catch {
    return ({} as T);
  }
}

