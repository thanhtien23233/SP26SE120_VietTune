export const EMBARGO_STATUS_LABELS: Record<number, string> = {
  1: 'Không có',
  2: 'Đã lên lịch',
  3: 'Đang áp dụng',
  4: 'Đã hết hạn',
  5: 'Đã gỡ bỏ',
};

import type {
  ApiEmbargoDto,
  ApiEmbargoCreateUpdateDto,
  ApiEmbargoLiftDto,
} from '@/api';

export type EmbargoDto = ApiEmbargoDto;

export type EmbargoCreateUpdateDto = ApiEmbargoCreateUpdateDto;
export type EmbargoLiftDto = ApiEmbargoLiftDto;

export interface EmbargoListFilters {
  status?: number;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}

export interface EmbargoPagedResult {
  items: EmbargoDto[];
  page: number;
  pageSize: number;
  total: number;
}
