// User types
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  expertise?: string[];
  phoneNumber?: string;
  isActive?: boolean;
  isEmailConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = "Admin",
  MODERATOR = "Moderator",
  RESEARCHER = "Researcher",
  CONTRIBUTOR = "Contributor",
  EXPERT = "Expert",
  USER = "User",
}

export enum ModerationStatus {
  PENDING_REVIEW = "PENDING_REVIEW",
  IN_REVIEW = "IN_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  TEMPORARILY_REJECTED = "TEMPORARILY_REJECTED",
}

// Recording types
export interface Recording {
  id: string;
  title: string;
  titleVietnamese?: string;
  description?: string;
  ethnicity: Ethnicity;
  region: Region;
  recordingType: RecordingType;
  duration: number; // in seconds
  audioUrl: string;
  waveformUrl?: string;
  coverImage?: string;
  instruments: Instrument[];
  performers: Performer[];
  recordedDate?: string;
  uploadedDate: string;
  uploader: User;
  tags: string[];
  metadata: RecordingMetadata;
  verificationStatus: VerificationStatus;
  verifiedBy?: User;
  viewCount: number;
  likeCount: number;
  downloadCount: number;
}

export interface RecordingMetadata {
  tuningSystem?: string;
  modalStructure?: string;
  tempo?: number;
  ritualContext?: string;
  regionalVariation?: string;
  lyrics?: string;
  lyricsTranslation?: string;
  transcription?: string;
  culturalSignificance?: string;
  historicalContext?: string;
  recordingQuality: RecordingQuality;
  originalSource?: string;
}

export enum RecordingType {
  INSTRUMENTAL = "INSTRUMENTAL",
  VOCAL = "VOCAL",
  CEREMONIAL = "CEREMONIAL",
  FOLK_SONG = "FOLK_SONG",
  EPIC = "EPIC",
  LULLABY = "LULLABY",
  WORK_SONG = "WORK_SONG",
  OTHER = "OTHER",
}

export enum RecordingQuality {
  PROFESSIONAL = "PROFESSIONAL",
  FIELD_RECORDING = "FIELD_RECORDING",
  ARCHIVE = "ARCHIVE",
  DIGITIZED = "DIGITIZED",
}

export enum VerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  UNDER_REVIEW = "UNDER_REVIEW",
}

// Ethnicity types
export interface Ethnicity {
  id: string;
  name: string;
  nameVietnamese: string;
  description?: string;
  region: Region;
  population?: number;
  language?: string;
  musicalTraditions?: string;
  thumbnail?: string;
  recordingCount: number;
}

export enum Region {
  NORTHERN_MOUNTAINS = "NORTHERN_MOUNTAINS",
  RED_RIVER_DELTA = "RED_RIVER_DELTA",
  NORTH_CENTRAL = "NORTH_CENTRAL",
  SOUTH_CENTRAL_COAST = "SOUTH_CENTRAL_COAST",
  CENTRAL_HIGHLANDS = "CENTRAL_HIGHLANDS",
  SOUTHEAST = "SOUTHEAST",
  MEKONG_DELTA = "MEKONG_DELTA",
}

// Instrument types
export interface Instrument {
  id: string;
  name: string;
  nameVietnamese: string;
  description?: string;
  category: InstrumentCategory;
  construction?: string;
  playingTechnique?: string;
  images: string[];
  ethnicity?: Ethnicity;
  audioSamples?: string[];
  recordingCount: number;
}

export enum InstrumentCategory {
  STRING = "STRING",
  WIND = "WIND",
  PERCUSSION = "PERCUSSION",
  IDIOPHONE = "IDIOPHONE",
  VOICE = "VOICE",
}

// Performer/Master types
export interface Performer {
  id: string;
  name: string;
  nameVietnamese?: string;
  title?: string; // e.g., "Nghệ nhân", "Master musician"
  ethnicity?: Ethnicity;
  specialization?: string[];
  biography?: string;
  birthYear?: number;
  deathYear?: number;
  photo?: string;
  recordingCount: number;
  isVerified: boolean;
}

// Search & Filter types
export interface SearchFilters {
  query?: string;
  ethnicityIds?: string[];
  regions?: Region[];
  recordingTypes?: RecordingType[];
  instrumentIds?: string[];
  performerIds?: string[];
  verificationStatus?: VerificationStatus[];
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export interface SearchResult {
  recordings: Recording[];
  total: number;
  page: number;
  pageSize: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface UploadRecordingForm {
  title: string;
  titleVietnamese?: string;
  description?: string;
  ethnicityId: string;
  region: Region;
  recordingType: RecordingType;
  audioFile: File;
  coverImage?: File;
  instrumentIds: string[];
  performerIds: string[];
  recordedDate?: string;
  tags: string[];
  metadata: Partial<RecordingMetadata>;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
}

export interface RegisterResearcherForm {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

export interface ConfirmAccountForm {
  otp: string;
}

/** Local recording (upload/moderation/IndexedDB) — used when backend is unavailable (demo). */
export interface LocalRecording {
  id?: string;
  title?: string;
  titleVietnamese?: string;
  description?: string;
  ethnicity?: Ethnicity;
  region?: Region;
  recordingType?: RecordingType;
  duration?: number;
  audioUrl?: string;
  waveformUrl?: string;
  coverImage?: string;
  instruments?: Instrument[];
  performers?: Performer[];
  recordedDate?: string;
  uploadedDate?: string;
  uploader?: User | { id?: string; username?: string; email?: string; fullName?: string; role?: string; createdAt?: string; updatedAt?: string };
  tags?: string[];
  metadata?: Partial<RecordingMetadata>;
  verificationStatus?: VerificationStatus;
  verifiedBy?: User;
  viewCount?: number;
  likeCount?: number;
  downloadCount?: number;
  basicInfo?: {
    title?: string;
    artist?: string;
    genre?: string;
    recordingDate?: string;
  };
  culturalContext?: {
    region?: string;
    ethnicity?: string;
    instruments?: string[];
    eventType?: string;
    province?: string;
    performanceType?: string;
  };
  audioData?: string | null;
  videoData?: string | null;
  youtubeUrl?: string | null;
  mediaType?: "audio" | "video" | "youtube";
  moderation?: {
    status?: ModerationStatus | string;
    claimedBy?: string | null;
    claimedByName?: string | null;
    claimedAt?: string | null;
    reviewerId?: string | null;
    reviewerName?: string | null;
    reviewedAt?: string | null;
    rejectionNote?: string;
    /** True khi expert từ chối vĩnh viễn bản thu mà contributor đã chỉnh sửa (resubmission): contributor không được chỉnh sửa nữa, chỉ được yêu cầu xóa; chỉ expert được chỉnh sửa. */
    contributorEditLocked?: boolean;
  };
  /** True khi bản thu đang PENDING_REVIEW do contributor bấm "Hoàn tất chỉnh sửa" (đang chờ expert kiểm duyệt lại). */
  resubmittedForModeration?: boolean;
}

// Account deletion (Expert phải qua kiểm duyệt Admin)
export interface ExpertAccountDeletionRequest {
  expertId: string;
  expertUsername: string;
  expertFullName?: string;
  requestedAt: string;
}

// Yêu cầu xóa bản thu: Người đóng góp → Admin → Chuyên gia
export interface DeleteRecordingRequest {
  id: string;
  recordingId: string;
  recordingTitle: string;
  contributorId: string;
  contributorName: string;
  requestedAt: string;
  status: "pending_admin" | "forwarded_to_expert";
  forwardedToExpertId?: string;
  forwardedAt?: string;
}

// Yêu cầu chỉnh sửa bản thu (đã duyệt): Người đóng góp → Admin
export interface EditRecordingRequest {
  id: string;
  recordingId: string;
  recordingTitle: string;
  contributorId: string;
  contributorName: string;
  requestedAt: string;
  status: "pending" | "approved";
  approvedAt?: string;
}

// Chỉnh sửa bản thu đã gửi chờ chuyên gia duyệt (contributor bấm "Hoàn tất chỉnh sửa" → chờ expert duyệt)
export interface EditSubmissionForReview {
  id: string;
  recordingId: string;
  recordingTitle: string;
  contributorId: string;
  contributorName: string;
  submittedAt: string;
}

// Thông báo hệ thống (sau khi xóa bản thu, duyệt xóa tài khoản, v.v.)
export interface AppNotification {
  id: string;
  type: "recording_deleted" | "recording_edited" | "expert_account_deletion_approved" | "delete_request_rejected" | "edit_submission_approved";
  title: string;
  body: string;
  forRoles: UserRole[];
  recordingId?: string;
  createdAt: string;
  read?: boolean;
}
