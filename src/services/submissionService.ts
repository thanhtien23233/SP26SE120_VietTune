import { api } from './api';

// Types matching the backend response
export interface SubmissionRecording {
  title: string | null;
  description: string | null;
  videoFileUrl: string | null;
  audioFileUrl?: string | null;
  audioFormat: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  uploadedById: string;
  communeId: string | null;
  ethnicGroupId: string | null;
  ceremonyId: string | null;
  vocalStyleId: string | null;
  musicalScaleId: string | null;
  performanceContext: string | null;
  lyricsOriginal: string | null;
  lyricsVietnamese: string | null;
  performerName: string | null;
  performerAge: number | null;
  recordingDate: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  tempo: number | null;
  keySignature: string | null;
  instrumentIds: string[];
}

export interface Submission {
  id: string;
  recordingId: string;
  contributorId: string;
  currentStage: number;
  status: number;
  notes: string | null;
  submittedAt: string;
  updatedAt: string | null;
  recording: SubmissionRecording;
}

interface SubmissionListResponse {
  isSuccess: boolean;
  message: string;
  data: Submission[];
}

interface SubmissionDetailResponse {
  isSuccess: boolean;
  message: string;
  data: Submission;
}

export const submissionService = {
  /** Get my submissions (paginated) */
  getMySubmissions: async (userId: string, page: number = 1, pageSize: number = 10) => {
    return api.get<SubmissionListResponse>(
      `/Submission/my?userId=${userId}&page=${page}&pageSize=${pageSize}`
    );
  },

  /** Get submissions by status (paginated) */
  getSubmissionsByStatus: async (status: number, page: number = 1, pageSize: number = 10) => {
    return api.get<SubmissionListResponse>(
      `/Submission/get-by-status?status=${status}&page=${page}&pageSize=${pageSize}`
    );
  },

  /** Get submission detail by ID */
  getSubmissionById: async (id: string) => {
    return api.get<SubmissionDetailResponse>(`/Submission/${id}`);
  },

  /** Delete a submission */
  deleteSubmission: async (id: string) => {
    return api.delete<{ isSuccess: boolean; message: string }>(`/Submission/${id}`);
  },
};
