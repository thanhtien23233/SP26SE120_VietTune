export const COPYRIGHT_DISPUTE_STATUS_LABELS: Record<number, string> = {
  0: 'Mở',
  1: 'Đang xem xét',
  2: 'Giữ lại bản ghi',
  3: 'Gỡ bản ghi',
  4: 'Từ chối báo cáo',
};

import type {
  ApiAssignReviewerRequest,
  ApiCreateCopyrightDisputeRequest,
  ApiResolveDisputeRequest,
} from '@/api';

// NOTE: Swagger hiện tại chưa mô tả response body cho các endpoint CopyrightDispute,
// nên chưa thể alias DTO này sang `@/api` mà không phá type-safety ở UI.
export interface CopyrightDisputeDto {
  disputeId: string;
  recordingId: string;
  submissionId: string | null;
  reportedByUserId: string;
  reasonCode: string | null;
  description: string | null;
  evidenceUrls: string[] | null;
  status: number;
  assignedReviewerId: string | null;
  resolution: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export type CreateCopyrightDisputeRequest = ApiCreateCopyrightDisputeRequest;
export type AssignReviewerRequest = ApiAssignReviewerRequest;
export type ResolveDisputeRequest = ApiResolveDisputeRequest;

export interface CopyrightDisputeListFilters {
  status?: number;
  assignedReviewerId?: string;
  recordingId?: string;
  page?: number;
  pageSize?: number;
}

export interface CopyrightDisputePagedResult {
  items: CopyrightDisputeDto[];
  page: number;
  pageSize: number;
  total: number;
}
