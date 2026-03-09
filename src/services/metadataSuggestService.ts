import { AxiosError } from "axios";
import { api } from "@/services/api";

export type MetadataSuggestResponse = {
  ethnicity?: string | null;
  region?: string | null;
  instruments?: string[] | null;
  message?: string | null;
};

/** Chuẩn hóa response từ backend (hỗ trợ cả camelCase và PascalCase). */
function normalizeResponse(raw: Record<string, unknown> | null): MetadataSuggestResponse {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const instrumentsRaw = r.instruments ?? r.Instruments;
  const instruments = Array.isArray(instrumentsRaw)
    ? instrumentsRaw.filter((x): x is string => typeof x === "string")
    : null;
  return {
    ethnicity: (r.ethnicity ?? r.Ethnicity) as string | undefined ?? null,
    region: (r.region ?? r.Region) as string | undefined ?? null,
    instruments: instruments && instruments.length > 0 ? instruments : null,
    message: (r.message ?? r.Message) as string | undefined ?? null,
  };
}

/**
 * Gọi API gợi ý metadata (dân tộc, vùng miền, nhạc cụ) từ AI cho luồng đóng góp.
 * Backend dùng Gemini khi đã cấu hình; nếu lỗi hoặc chưa cấu hình trả về fallback/rỗng.
 */
export async function suggestMetadata(params: {
  genre?: string;
  title?: string;
  description?: string;
}): Promise<MetadataSuggestResponse> {
  try {
    const data = await api.post<Record<string, unknown>>("MetadataSuggest", {
      genre: params.genre || "",
      title: params.title || "",
      description: params.description || "",
    });
    return normalizeResponse(data ?? {});
  } catch (err) {
    const msg =
      (err as AxiosError)?.response?.data != null &&
      typeof (err as AxiosError).response?.data === "object" &&
      "message" in ((err as AxiosError).response!.data as object)
        ? String((err as AxiosError).response!.data as { message?: string }).message
        : (err as Error)?.message ?? "Không kết nối được dịch vụ gợi ý.";
    console.warn("MetadataSuggest API error:", err);
    return { message: msg };
  }
}
