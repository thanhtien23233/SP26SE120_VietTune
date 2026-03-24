import { api } from './api';
import {
  Recording,
  SearchFilters,
  PaginatedResponse,
  ApiResponse
} from '@/types';
import type { RecordingDto } from '@/services/recordingDto';

export const recordingService = {
  // Get all recordings with pagination (backend: GET /api/Recording)
  getRecordings: async (page: number = 1, pageSize: number = 20) => {
    return api.get<PaginatedResponse<Recording>>(`/Recording?page=${page}&pageSize=${pageSize}`);
  },

  // Get recording by ID (backend: GET /api/Recording/{id})
  getRecordingById: async (id: string) => {
    return api.get<ApiResponse<Recording>>(`/Recording/${id}`);
  },

  // Search recordings (backend: GET /api/Search/songs with query params)
  searchRecordings: async (filters: SearchFilters, page: number = 1, pageSize: number = 20) => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (filters.regions?.length) params.append('region', filters.regions.join(','));
    if (filters.recordingTypes?.length) params.append('type', filters.recordingTypes.join(','));
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    return api.get<PaginatedResponse<Recording>>(`/Search/songs?${params.toString()}`);
  },

  // Upload new recording (backend: POST /api/Recording with JSON body)
  uploadRecording: async (data: Partial<Recording>) => {
    return api.post<ApiResponse<Recording>>('/Recording', data);
  },

  // Update recording (backend: PUT /api/Recording/{id}/upload — OpenAPI RecordingDto)
  updateRecording: async (id: string, data: RecordingDto) => {
    return api.put<ApiResponse<Recording>>(`/Recording/${id}/upload`, data);
  },

  // Create submission (backend: POST /api/Submission/create-submission)
  createSubmission: async (data: { audioFileUrl?: string; videoFileUrl?: string; uploadedById: string }) => {
    return api.post<{
      isSuccess: boolean;
      message: string;
      data: {
        audioFileUrl?: string;
        videoFileUrl?: string;
        uploadedById: string;
        submissionId: string;
        recordingId: string;
      };
    }>('/Submission/create-submission', data);
  },

  // Delete recording (backend: DELETE /api/Recording/{id})
  deleteRecording: async (id: string) => {
    return api.delete<ApiResponse<void>>(`/Recording/${id}`);
  },

  // Get popular recordings (backend: GET /api/Song/popular)
  getPopularRecordings: async (limit: number = 10) => {
    return api.get<ApiResponse<Recording[]>>(`/Song/popular?pageSize=${limit}`);
  },

  // Get recent recordings (backend: GET /api/Song/recent)
  getRecentRecordings: async (limit: number = 10) => {
    return api.get<ApiResponse<Recording[]>>(`/Song/recent?pageSize=${limit}`);
  },

  // Get featured recordings (backend: GET /api/Song/featured)
  getFeaturedRecordings: async (limit: number = 10) => {
    return api.get<ApiResponse<Recording[]>>(`/Song/featured?pageSize=${limit}`);
  },
};
