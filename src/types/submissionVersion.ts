import type {
  ApiCreateSubmissionVersionDto,
  ApiSubmissionVersionDto,
  ApiUpdateSubmissionVersionDto,
} from '@/api';

export type SubmissionVersionDto = ApiSubmissionVersionDto;

export type CreateSubmissionVersionDto = ApiCreateSubmissionVersionDto;

export type UpdateSubmissionVersionDto = ApiUpdateSubmissionVersionDto;

export interface SubmissionVersionListFilters {
  page?: number;
  pageSize?: number;
}

export interface SubmissionVersionPagedResult {
  items: SubmissionVersionDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SubmissionVersionChange {
  field: string;
  before?: string | null;
  after?: string | null;
}

export interface SubmissionVersionChangeset {
  fields?: SubmissionVersionChange[];
  note?: string | null;
}

export function parseChangesJson(raw: string | null | undefined): SubmissionVersionChangeset | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as SubmissionVersionChangeset;
  } catch {
    return null;
  }
}
