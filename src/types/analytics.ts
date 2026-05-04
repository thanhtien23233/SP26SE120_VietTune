export type AnalyticsOverview = {
  totalRecordings?: number;
  totalSubmissions?: number;
  totalUsers?: number;
  totalContributors?: number;
  totalExperts?: number;
};

export type CoverageRow = {
  name?: string;
  label?: string;
  ethnicity?: string;
  region?: string;
  count?: number;
  value?: number;
};

export type ContributorRow = {
  userId?: string;
  id?: string;
  username?: string;
  fullName?: string;
  contributionCount?: number;
  submissions?: number;
  approvedCount?: number;
  rejectedCount?: number;
};

export type ExpertPerformanceDto = {
  expertId?: string | null;
  name?: string | null;
  reviews?: number;
  accuracy?: number;
  avgTime?: string | null;
};

export type ContentAnalyticsDto = {
  totalSongs?: number;
  byEthnicity?: Record<string, number> | null;
  byRegion?: Record<string, number> | null;
  mostViewedSongs?: string[] | null;
};
