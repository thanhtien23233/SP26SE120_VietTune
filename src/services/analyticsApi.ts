import { apiFetch, apiFetchLoose, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type {
  ApiAnalyticsContentQuery,
  ApiAnalyticsExpertsQuery,
} from '@/api';
import type {
  AnalyticsOverview,
  ContentAnalyticsDto,
  ContributorRow,
  CoverageRow,
  ExpertPerformanceDto,
} from '@/types/analytics';
import { extractArray, extractObject } from '@/utils/apiHelpers';

type OverviewResponse = AnalyticsOverview | { data?: AnalyticsOverview; isSuccess?: boolean };
type CoverageResponse = CoverageRow[] | { data?: CoverageRow[] };
type SubmissionsTrendResponse =
  | Record<string, number>
  | { data?: Record<string, number> }
  | Record<string, unknown>;
type ContributorsResponse = ContributorRow[] | { data?: ContributorRow[] };
type ExpertsResponse = ExpertPerformanceDto[] | { data?: ExpertPerformanceDto[] };
type ContentResponse = ContentAnalyticsDto | { data?: ContentAnalyticsDto };

export const analyticsApi = {
  async getOverview(): Promise<AnalyticsOverview | null> {
    const res = await apiOk(
      asApiEnvelope<OverviewResponse>(
        apiFetchLoose.GET('/api/Analytics/overview', {}),
      ),
    );
    return extractObject(res) as AnalyticsOverview | null;
  },

  async getCoverage(): Promise<CoverageRow[]> {
    const res = await apiOk(
      asApiEnvelope<CoverageResponse>(apiFetch.GET('/api/Analytics/coverage', {})),
    );
    return extractArray<CoverageRow>(res);
  },

  async getSubmissionsTrend(): Promise<Record<string, number>> {
    const res = await apiOk(
      asApiEnvelope<SubmissionsTrendResponse>(
        apiFetchLoose.GET('/api/Analytics/submissions', {}),
      ),
    );
    const obj = extractObject(res);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const entries = Object.entries(obj);
      if (entries.every(([, v]) => typeof v === 'number')) return obj as Record<string, number>;
    }
    return {};
  },

  async getContributors(): Promise<ContributorRow[]> {
    const res = await apiOk(
      asApiEnvelope<ContributorsResponse>(apiFetch.GET('/api/Analytics/contributors')),
    );
    return extractArray<ContributorRow>(res);
  },

  async getExperts(period = '30d'): Promise<ExpertPerformanceDto[]> {
    const params: ApiAnalyticsExpertsQuery = { period };
    const res = await apiOk(
      asApiEnvelope<ExpertsResponse>(
        apiFetch.GET('/api/Analytics/experts', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
    return extractArray<ExpertPerformanceDto>(res);
  },

  async getContent(type = 'songs'): Promise<ContentAnalyticsDto | null> {
    const params: ApiAnalyticsContentQuery = { type };
    const res = await apiOk(
      asApiEnvelope<ContentResponse>(
        apiFetch.GET('/api/Analytics/content', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
    return extractObject(res) as ContentAnalyticsDto | null;
  },
};
