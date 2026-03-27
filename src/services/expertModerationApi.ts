import axios from "axios";
import apiClient, { api } from "@/services/api";
import {
  extractSubmissionRows,
  mapSubmissionToLocalRecording,
  type SubmissionLookupMaps,
} from "@/services/submissionApiMapper";
import { referenceDataService } from "@/services/referenceDataService";
import type { LocalRecording } from "@/types";
import type { ExpertQueueSource } from "@/config/expertWorkflowPhase";
import { macroRegionDisplayNameFromProvinceRegionCode } from "@/config/provinceRegionCodes";

const DEFAULT_PAGE_SIZE = 200;
const LOOKUP_TTL_MS = 15 * 60 * 1000;
let lookupCache: { ts: number; data: SubmissionLookupMaps } | null = null;
let lookupInflight: Promise<SubmissionLookupMaps> | null = null;

function normalizeId(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/** Shared reference maps for resolving ethnic/ceremony/instrument/geo IDs in submission payloads. */
export async function buildSubmissionLookupMaps(): Promise<SubmissionLookupMaps> {
  if (lookupCache && Date.now() - lookupCache.ts < LOOKUP_TTL_MS) {
    return lookupCache.data;
  }
  if (lookupInflight) return lookupInflight;
  lookupInflight = (async () => {
  try {
    const [ethnics, ceremonies, instruments, communes, districts, provinces] =
      await Promise.all([
        referenceDataService.getEthnicGroups(),
        referenceDataService.getCeremonies(),
        referenceDataService.getInstruments(),
        referenceDataService.getCommunes(),
        referenceDataService.getDistricts(),
        referenceDataService.getProvinces(),
      ]);

    const macroRegionByProvinceId = Object.fromEntries(
      provinces
        .map((p) => {
          const label = macroRegionDisplayNameFromProvinceRegionCode(p.regionCode).trim();
          return label ? ([normalizeId(p.id), label] as const) : null;
        })
        .filter((e): e is readonly [string, string] => e != null),
    );
    const provinceIdByDistrictId = Object.fromEntries(
      districts.map((d) => [normalizeId(d.id), normalizeId(d.provinceId)]),
    );
    const districtIdByCommuneId = Object.fromEntries(
      communes.map((c) => [normalizeId(c.id), normalizeId(c.districtId)]),
    );

    const data: SubmissionLookupMaps = {
      ethnicById: Object.fromEntries(ethnics.map((x) => [normalizeId(x.id), x.name])),
      ceremonyById: Object.fromEntries(ceremonies.map((x) => [normalizeId(x.id), x.name])),
      instrumentById: Object.fromEntries(instruments.map((x) => [normalizeId(x.id), x.name])),
      communeById: Object.fromEntries(communes.map((x) => [normalizeId(x.id), x.name])),
      districtById: Object.fromEntries(districts.map((x) => [normalizeId(x.id), x.name])),
      provinceById: Object.fromEntries(provinces.map((x) => [normalizeId(x.id), x.name])),
      macroRegionByProvinceId,
      provinceIdByDistrictId,
      districtIdByCommuneId,
    };
    lookupCache = { ts: Date.now(), data };
    return data;
  } catch {
    return {};
  }
  })();
  try {
    return await lookupInflight;
  } finally {
    lookupInflight = null;
  }
}

async function getSubmissionsByStatus(params: {
  status?: number;
  page?: number;
  pageSize?: number;
  lookups?: SubmissionLookupMaps;
}): Promise<LocalRecording[]> {
  const lookups = params.lookups ?? (await buildSubmissionLookupMaps());
  const res = await api.get<unknown>("/Submission/get-by-status", {
    params: {
      ...(params.status !== undefined ? { status: params.status } : {}),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    },
  });
  return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row, lookups));
}

async function getAdminSubmissions(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  reviewer?: string;
  lookups?: SubmissionLookupMaps;
}): Promise<LocalRecording[]> {
  const lookups = params.lookups ?? (await buildSubmissionLookupMaps());
  const res = await api.get<unknown>("/Admin/submissions", {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      ...(params.status ? { status: params.status } : {}),
      ...(params.reviewer ? { reviewer: params.reviewer } : {}),
    },
  });
  return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row, lookups));
}

/**
 * Phase 2 queue: merge distinct statuses for expert view (dedupe by id).
 * Without `status`, some backends return a default slice only — we still try one unfiltered call first.
 */
export async function fetchExpertQueueBase(source: ExpertQueueSource): Promise<LocalRecording[]> {
  const lookups = await buildSubmissionLookupMaps();
  if (source === "admin") {
    return getAdminSubmissions({ page: 1, pageSize: DEFAULT_PAGE_SIZE, lookups });
  }
  const unfiltered = await getSubmissionsByStatus({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    lookups,
  });
  if (unfiltered.length > 0) return dedupeById(unfiltered);

  const chunks = await Promise.all(
    [0, 1, 2, 3, 4].map((status) =>
      getSubmissionsByStatus({ status, page: 1, pageSize: DEFAULT_PAGE_SIZE, lookups }).catch(
        () => [] as LocalRecording[],
      ),
    ),
  );
  return dedupeById(chunks.flat());
}

function dedupeById(rows: LocalRecording[]): LocalRecording[] {
  const map = new Map<string, LocalRecording>();
  for (const r of rows) {
    if (r.id) map.set(r.id, r);
  }
  return [...map.values()];
}

/** Result of POST /Admin/submissions/{id}/assign — never throws. */
export type AssignReviewerResult =
  | { ok: true }
  | { ok: false; forbidden: boolean; httpStatus?: number };

/**
 * POST /Admin/submissions/{id}/assign — wrapped in try/catch.
 * On 403 Forbidden: returns `{ ok: false, forbidden: true }` and logs a console warning (RBAC not ready).
 */
export async function assignSubmissionReviewer(
  submissionId: string,
  reviewerId: string | null,
): Promise<AssignReviewerResult> {
  try {
    await apiClient.post(`/Admin/submissions/${submissionId}/assign`, {
      reviewerId,
    });
    return { ok: true };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 403) {
        console.warn(
          "[expertModerationApi] Assign reviewer forbidden (403). RBAC may not allow this role yet. submissionId=",
          submissionId,
          "reviewerId=",
          reviewerId,
        );
        return { ok: false, forbidden: true, httpStatus: 403 };
      }
      console.warn(
        "[expertModerationApi] Assign reviewer failed",
        { submissionId, reviewerId, status, message: err.message },
      );
      return { ok: false, forbidden: false, httpStatus: status };
    }
    console.warn("[expertModerationApi] Assign reviewer unexpected error", err);
    return { ok: false, forbidden: false };
  }
}

export async function approveSubmissionOnServer(submissionId: string): Promise<boolean> {
  try {
    await api.put("/Submission/approve-submission", undefined, {
      params: { submissionId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function rejectSubmissionOnServer(submissionId: string): Promise<boolean> {
  try {
    await api.put("/Submission/reject-submission", undefined, {
      params: { submissionId },
    });
    return true;
  } catch {
    return false;
  }
}

/** OpenAPI AuditLogDto — POST /AuditLog (expert moderation trail, Phase 2). */
export type ExpertModerationAuditPayload = {
  userId: string;
  submissionId: string;
  action: "expert_approve" | "expert_reject";
  /** Serialized into newValuesJson */
  notesSummary: string;
};

export async function postExpertModerationAuditLog(
  params: ExpertModerationAuditPayload,
): Promise<boolean> {
  try {
    const newValuesJson = JSON.stringify({
      submissionId: params.submissionId,
      expertNotes: params.notesSummary,
      source: "expert_moderation",
    });
    await api.post("/AuditLog", {
      userId: params.userId,
      entityType: "Submission",
      entityId: params.submissionId,
      action: params.action,
      oldValuesJson: null,
      newValuesJson,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn("[expertModerationApi] Audit log POST failed", err);
    return false;
  }
}
