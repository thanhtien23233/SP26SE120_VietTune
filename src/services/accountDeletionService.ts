/**
 * Xóa tài khoản: Người đóng góp xóa trực tiếp; Chuyên gia phải qua kiểm duyệt Quản trị viên.
 */

import { authService } from '@/services/authService';
import { getItem, setItem } from '@/services/storageService';
import type { ExpertAccountDeletionRequest } from '@/types';
import { UserRole } from '@/types';

const PENDING_EXPERT_DELETION_KEY = 'pending_expert_deletion_requests';

function parseList<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as T[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export const accountDeletionService = {
  /** Người đóng góp: xóa tài khoản ngay (logout + xóa khỏi overrides). */
  async deleteAccountContributor(userId: string): Promise<void> {
    const oRaw = getItem('users_overrides');
    const overrides = oRaw ? (JSON.parse(oRaw) as Record<string, unknown>) : {};
    delete overrides[userId];
    await setItem('users_overrides', JSON.stringify(overrides));
    await authService.logout();
  },

  /** Chuyên gia: gửi yêu cầu xóa tài khoản (Admin sẽ duyệt). */
  async requestExpertAccountDeletion(
    request: Omit<ExpertAccountDeletionRequest, 'requestedAt'>,
  ): Promise<void> {
    const raw = getItem(PENDING_EXPERT_DELETION_KEY);
    const list = parseList<ExpertAccountDeletionRequest>(raw);
    const newReq: ExpertAccountDeletionRequest = {
      ...request,
      requestedAt: new Date().toISOString(),
    };
    if (list.some((r) => r.expertId === newReq.expertId)) return; // đã có yêu cầu
    list.push(newReq);
    await setItem(PENDING_EXPERT_DELETION_KEY, JSON.stringify(list));
  },

  /** Admin: lấy danh sách yêu cầu xóa tài khoản Chuyên gia. */
  getPendingExpertDeletionRequests(): ExpertAccountDeletionRequest[] {
    const raw = getItem(PENDING_EXPERT_DELETION_KEY);
    return parseList<ExpertAccountDeletionRequest>(raw);
  },

  /** Admin: duyệt xóa tài khoản Chuyên gia → xóa khỏi overrides, nếu đang đăng nhập là expert đó thì logout. */
  async approveExpertAccountDeletion(
    expertId: string,
    currentUserId: string | undefined,
    currentUserRole: string | undefined,
  ): Promise<void> {
    const raw = getItem(PENDING_EXPERT_DELETION_KEY);
    const list = parseList<ExpertAccountDeletionRequest>(raw).filter(
      (r) => r.expertId !== expertId,
    );
    await setItem(PENDING_EXPERT_DELETION_KEY, JSON.stringify(list));

    const oRaw = getItem('users_overrides');
    const overrides = oRaw ? (JSON.parse(oRaw) as Record<string, unknown>) : {};
    delete overrides[expertId];
    await setItem('users_overrides', JSON.stringify(overrides));

    if (currentUserId === expertId && currentUserRole === UserRole.EXPERT) {
      await authService.logout();
    }
  },
};
