/** Flat + nested contributor fields sometimes returned by VietTune API (not always in OpenAPI). */

import type { Recording } from '@/types';

function trimStr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Extract contributor id, display name, and username/handle from one API object (submission row,
 * recording DTO, or nested `recording` / `user` payloads).
 */
export function pickContributorFieldsFromApiRow(
  row: Record<string, unknown> | null | undefined,
): { id: string; fullName?: string; username?: string } {
  if (!row) return { id: '' };

  const id =
    trimStr(row.uploadedById) ??
    trimStr(row.UploadedById) ??
    trimStr(row.contributorId) ??
    trimStr(row.ContributorId) ??
    '';

  const nestedKeys = [
    'user',
    'User',
    'uploadedBy',
    'UploadedBy',
    'contributor',
    'Contributor',
    'uploader',
    'Uploader',
  ];
  let nestedFull: string | undefined;
  let nestedUser: string | undefined;
  for (const k of nestedKeys) {
    const n = asObj(row[k]);
    if (!n) continue;
    nestedFull = trimStr(
      n.fullName ?? n.FullName ?? n.displayName ?? n.DisplayName ?? n.name ?? n.Name,
    );
    nestedUser = trimStr(n.userName ?? n.UserName ?? n.username ?? n.Username);
    if (nestedFull || nestedUser) break;
  }

  const directFull =
    trimStr(row.contributorName) ??
    trimStr(row.ContributorName) ??
    trimStr(row.uploadedByName) ??
    trimStr(row.UploadedByName) ??
    trimStr(row.uploaderName) ??
    trimStr(row.UploaderName) ??
    trimStr(row.submittedBy) ??
    trimStr(row.SubmittedBy);

  const directUser =
    trimStr(row.contributorUserName) ??
    trimStr(row.ContributorUserName) ??
    trimStr(row.userName) ??
    trimStr(row.UserName) ??
    trimStr(row.username) ??
    trimStr(row.Username);

  return {
    id,
    fullName: nestedFull ?? directFull,
    username: nestedUser ?? directUser,
  };
}

/**
 * Merge contributor labels onto `Recording.uploader` when the API sends names on the root DTO or
 * under nested `recording` / user objects (extra JSON fields not in the OpenAPI `Recording` type).
 */
export function enrichRecordingUploaderFromRecord(rec: Recording): Recording {
  const r = rec as Recording & Record<string, unknown>;
  const fromRoot = pickContributorFieldsFromApiRow(r);
  const innerRec = asObj(r.recording) ?? asObj(r.Recording);
  const fromInner = pickContributorFieldsFromApiRow(innerRec ?? undefined);

  const id = fromInner.id || fromRoot.id;
  const fullName = fromInner.fullName ?? fromRoot.fullName;
  const username = fromInner.username ?? fromRoot.username;
  if (!fullName && !username && !id) return rec;

  const u = rec.uploader;
  return {
    ...rec,
    uploader: {
      ...u,
      id: id || u.id,
      fullName: fullName ?? u.fullName,
      username: (username ?? u.username) || '',
    },
  };
}
