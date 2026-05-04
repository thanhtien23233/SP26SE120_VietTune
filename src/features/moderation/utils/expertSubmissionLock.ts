/**
 * Detects when a submission is owned / assigned to someone other than the current expert.
 * Backend may set `reviewerId` while `status` is still PENDING — `claimedBy` is only derived
 * in the mapper when status maps to IN_REVIEW, so we must check `reviewerId` explicitly.
 */
export function isLockedToAnotherExpert(
  moderation:
    | { claimedBy?: unknown; reviewerId?: unknown; status?: unknown }
    | undefined,
  currentUserId: string | undefined,
): boolean {
  if (!moderation || !currentUserId) return false;
  const uid = String(currentUserId).trim().toLowerCase();
  const claimedBy =
    moderation.claimedBy != null && String(moderation.claimedBy).trim()
      ? String(moderation.claimedBy).trim().toLowerCase()
      : '';
  const reviewerId =
    moderation.reviewerId != null && String(moderation.reviewerId).trim()
      ? String(moderation.reviewerId).trim().toLowerCase()
      : '';

  if (claimedBy && claimedBy !== uid) return true;
  if (reviewerId && reviewerId !== uid) return true;
  return false;
}
