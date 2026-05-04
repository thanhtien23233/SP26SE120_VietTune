import type { components, paths } from './generated';

import type { LocalRecording } from '@/types';

type Schemas = components['schemas'];
type ApiPaths = paths;

export type ApiAnnotationDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.AnnotationDto'];
export type ApiCreateAnnotationDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.CreateAnnotationDto'];
export type ApiUpdateAnnotationDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.UpdateAnnotationDto'];

export type ApiEmbargoDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.EmbargoDto'];
export type ApiEmbargoCreateUpdateDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.EmbargoCreateUpdateDto'];
export type ApiEmbargoLiftDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.EmbargoLiftDto'];

export type ApiEthnicGroupDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.EthnicGroupDto'];
export type ApiInstrumentDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.InstrumentDto'];

export type ApiRecordingDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.RecordingDto'];
export type ApiSubmissionDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.SubmissionDto'];

export type ApiSubmissionVersionDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.SubmissionVersionDto'];
export type ApiCreateSubmissionVersionDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.CreateSubmissionVersionDto'];
export type ApiUpdateSubmissionVersionDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.UpdateSubmissionVersionDto'];

export type ApiCreateCopyrightDisputeRequest =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.Request.CreateCopyrightDisputeRequest'];
export type ApiAssignReviewerRequest =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.Request.AssignReviewerRequest'];
export type ApiResolveDisputeRequest =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.Request.ResolveDisputeRequest'];

export type ApiCreateKBEntryRequest =
  Schemas['VietTuneArchive.Domain.Entities.DTO.KnowledgeBase.CreateKBEntryRequest'];
export type ApiUpdateKBEntryRequest =
  Schemas['VietTuneArchive.Domain.Entities.DTO.KnowledgeBase.UpdateKBEntryRequest'];
export type ApiUpdateKBEntryStatusRequest =
  Schemas['VietTuneArchive.Domain.Entities.DTO.KnowledgeBase.UpdateKBEntryStatusRequest'];
export type ApiCreateKBCitationRequest =
  Schemas['VietTuneArchive.Domain.Entities.DTO.KnowledgeBase.CreateKBCitationRequest'];
export type ApiUpdateKBCitationRequest =
  Schemas['VietTuneArchive.Domain.Entities.DTO.KnowledgeBase.UpdateKBCitationRequest'];

export type ApiKbEntriesListQuery = NonNullable<
  ApiPaths['/api/kb-entries']['get']['parameters']['query']
>;
export type ApiRecordingListQuery = NonNullable<
  ApiPaths['/api/Recording']['get']['parameters']['query']
>;
export type ApiRecordingGuestListQuery = NonNullable<
  ApiPaths['/api/RecordingGuest']['get']['parameters']['query']
>;
export type ApiRecordingSearchByFilterQuery = NonNullable<
  ApiPaths['/api/Recording/search-by-filter']['get']['parameters']['query']
>;
export type ApiAdminUsersListQuery = NonNullable<
  ApiPaths['/api/Admin/users']['get']['parameters']['query']
>;
export type ApiAnalyticsExpertsQuery = NonNullable<
  ApiPaths['/api/Analytics/experts']['get']['parameters']['query']
>;
export type ApiAnalyticsContentQuery = NonNullable<
  ApiPaths['/api/Analytics/content']['get']['parameters']['query']
>;
export type ApiAuthConfirmEmailQuery = NonNullable<
  ApiPaths['/api/Auth/confirm-email']['get']['parameters']['query']
>;
export type ApiSubmissionMyQuery = NonNullable<
  ApiPaths['/api/Submission/my']['get']['parameters']['query']
>;
export type ApiSubmissionGetByStatusQuery = NonNullable<
  ApiPaths['/api/Submission/get-by-status']['get']['parameters']['query']
>;
export type ApiSubmissionActionQuery = NonNullable<
  ApiPaths['/api/Submission/confirm-submit-submission']['put']['parameters']['query']
>;

export type ApiQAMessageListQuery = NonNullable<
  ApiPaths['/api/QAMessage']['get']['parameters']['query']
>;
export type ApiQAMessageByConversationQuery = NonNullable<
  ApiPaths['/api/QAMessage/get-by-conversation']['get']['parameters']['query']
>;
export type ApiQAMessageFlagQuery = NonNullable<
  ApiPaths['/api/QAMessage/flagged']['put']['parameters']['query']
>;

export type ApiQAConversationByUserQuery = NonNullable<
  ApiPaths['/api/QAConversation/get-by-user']['get']['parameters']['query']
>;

export type ApiSemanticSearchQuery = NonNullable<
  ApiPaths['/api/search/semantic']['get']['parameters']['query']
>;
export type ApiSemanticSearch768Query = NonNullable<
  ApiPaths['/api/search/semantic-768']['get']['parameters']['query']
>;

export type ApiAdminUserAdminDto =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.AdminDto+UserAdminDto'];
export type ApiAdminUserDetailAdminDto =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.AdminDto+UserDetailAdminDto'];
export type ApiAdminUsersPagedList =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.PagedList`1[[VietTuneArchive.Application.Mapper.DTOs.AdminDto+UserAdminDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];
export type ApiAdminUpdateRoleRequest =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.Request.AdminRequest+UpdateRoleRequest'];
export type ApiAdminUpdateStatusRequest =
  Schemas['VietTuneArchive.Application.Mapper.DTOs.Request.AdminRequest+UpdateStatusRequest'];
export type ApiBaseResponse = Schemas['VietTuneArchive.Application.Mapper.DTOs.BaseResponse'];

export type ApiAuthLoginModel = Schemas['VietTuneArchive.Domain.Entities.Model.LoginModel'];
export type ApiAuthRegisterModel = Schemas['VietTuneArchive.Domain.Entities.Model.RegisterModel'];
export type ApiAuthForgotPasswordModel =
  Schemas['VietTuneArchive.API.Controllers.AuthController+ForgotPasswordModel'];
export type ApiAuthResetPasswordModel =
  Schemas['VietTuneArchive.API.Controllers.AuthController+ResetPasswordModel'];

export type ApiPagedResponseEmbargoDto =
  Schemas['VietTuneArchive.Application.Responses.PagedResponse`1[[VietTuneArchive.Application.Mapper.DTOs.EmbargoDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];
export type ApiServiceResponseEmbargoDto =
  Schemas['VietTuneArchive.Application.Responses.ServiceResponse`1[[VietTuneArchive.Application.Mapper.DTOs.EmbargoDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];

export type ApiPagedResponseEthnicGroupDto =
  Schemas['VietTuneArchive.Application.Responses.PagedResponse`1[[VietTuneArchive.Application.Mapper.DTOs.EthnicGroupDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];
export type ApiServiceResponseEthnicGroupDto =
  Schemas['VietTuneArchive.Application.Responses.ServiceResponse`1[[VietTuneArchive.Application.Mapper.DTOs.EthnicGroupDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];

export type ApiPagedResponseInstrumentDto =
  Schemas['VietTuneArchive.Application.Responses.PagedResponse`1[[VietTuneArchive.Application.Mapper.DTOs.InstrumentDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];
export type ApiServiceResponseInstrumentDto =
  Schemas['VietTuneArchive.Application.Responses.ServiceResponse`1[[VietTuneArchive.Application.Mapper.DTOs.InstrumentDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];

export type ApiPagedResponseRecordingDto =
  Schemas['VietTuneArchive.Application.Responses.PagedResponse`1[[VietTuneArchive.Application.Mapper.DTOs.GetRecordingDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];
export type ApiServiceResponseRecordingDto =
  Schemas['VietTuneArchive.Application.Responses.ServiceResponse`1[[VietTuneArchive.Application.Mapper.DTOs.RecordingDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];

export type ApiPagedResponseSubmissionVersionDto =
  Schemas['VietTuneArchive.Application.Responses.PagedResponse`1[[VietTuneArchive.Application.Mapper.DTOs.SubmissionVersionDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];
export type ApiServiceResponseSubmissionVersionDto =
  Schemas['VietTuneArchive.Application.Responses.ServiceResponse`1[[VietTuneArchive.Application.Mapper.DTOs.SubmissionVersionDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];

export type ApiQAMessageDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.QAMessageDto'];
export type ApiQAConversationDto = Schemas['VietTuneArchive.Application.Mapper.DTOs.QAConversationDto'];
export type ApiPagedResponseQAMessageDto =
  Schemas['VietTuneArchive.Application.Responses.PagedResponse`1[[VietTuneArchive.Application.Mapper.DTOs.QAMessageDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];
export type ApiServiceResponseQAMessageDto =
  Schemas['VietTuneArchive.Application.Responses.ServiceResponse`1[[VietTuneArchive.Application.Mapper.DTOs.QAMessageDto, VietTuneArchive.Application, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]'];

export type ApiReferenceDataEthnicGroupsQuery = NonNullable<
  ApiPaths['/api/ReferenceData/ethnic-groups']['get']['parameters']['query']
>;
export type ApiReferenceDataProvincesQuery = NonNullable<
  ApiPaths['/api/ReferenceData/provinces']['get']['parameters']['query']
>;
export type ApiReferenceDataCeremoniesQuery = NonNullable<
  ApiPaths['/api/ReferenceData/ceremonies']['get']['parameters']['query']
>;
export type ApiReferenceDataVocalStylesQuery = NonNullable<
  ApiPaths['/api/ReferenceData/vocal-styles']['get']['parameters']['query']
>;
export type ApiReferenceDataMusicalScalesQuery = NonNullable<
  ApiPaths['/api/ReferenceData/musical-scales']['get']['parameters']['query']
>;
export type ApiReferenceDataTagsQuery = NonNullable<
  ApiPaths['/api/ReferenceData/tags']['get']['parameters']['query']
>;
export type ApiInstrumentListQuery = NonNullable<
  ApiPaths['/api/Instrument']['get']['parameters']['query']
>;
export type ApiDistrictListQuery = NonNullable<
  ApiPaths['/api/District']['get']['parameters']['query']
>;
export type ApiCommuneListQuery = NonNullable<
  ApiPaths['/api/Commune']['get']['parameters']['query']
>;

export type NormalizedPagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizePagedResponse<T>(input: unknown): NormalizedPagedResult<T> {
  const obj = asRecord(input);
  const rawItems = obj?.items ?? obj?.data ?? [];
  const items = Array.isArray(rawItems) ? (rawItems as T[]) : [];
  const total = asNumber(obj?.total, items.length);
  const page = asNumber(obj?.page, 1);
  const pageSize = asNumber(obj?.pageSize, items.length || 1);
  return { items, total, page, pageSize };
}

export function unwrapServiceResponse<T>(input: unknown): T | null {
  const obj = asRecord(input);
  if (!obj) return null;
  if ('data' in obj) return (obj.data as T) ?? null;
  return null;
}

/**
 * OpenAPI `RecordingDto` (VietTuneArchive v1) — additionalProperties: false.
 * Only keys allowed by the spec are sent; omit undefined optional fields.
 */
export type RecordingUploadDto = ApiRecordingDto & {
  composer?: string | null;
  language?: string | null;
  recordingLocation?: string | null;
};

/** Map `LocalRecording` → JSON body for PUT /api/Recording/{id}/upload. */
export function buildRecordingUploadPayload(recording: LocalRecording): Record<string, unknown> {
  const uploaderId = (recording.uploader as { id?: string } | undefined)?.id;
  const duration =
    typeof recording.duration === 'number' && Number.isFinite(recording.duration)
      ? Math.round(recording.duration)
      : undefined;

  const dto: RecordingUploadDto = {
    title: recording.basicInfo?.title ?? recording.title ?? null,
    description: recording.description ?? null,
    audioFileUrl:
      typeof recording.audioUrl === 'string' && !recording.audioUrl.startsWith('data:')
        ? recording.audioUrl
        : typeof recording.audioData === 'string' && !recording.audioData.startsWith('data:')
          ? recording.audioData
          : null,
    videoFileUrl:
      typeof recording.videoData === 'string' && !recording.videoData.startsWith('data:')
        ? recording.videoData
        : null,
    durationSeconds: duration ?? null,
    performerName: recording.basicInfo?.artist ?? null,
    recordingDate: recording.recordedDate ?? recording.basicInfo?.recordingDate ?? null,
    gpsLatitude: recording.gpsLatitude ?? null,
    gpsLongitude: recording.gpsLongitude ?? null,
    lyricsOriginal: recording.metadata?.lyrics ?? null,
    lyricsVietnamese: recording.metadata?.lyricsTranslation ?? null,
    performanceContext:
      recording.metadata?.ritualContext ?? recording.metadata?.culturalSignificance ?? null,
    tempo: recording.metadata?.tempo ?? null,
    instrumentIds:
      Array.isArray(recording.instruments) && recording.instruments.length > 0
        ? recording.instruments.map((i) => i.id).filter(Boolean)
        : null,
  };

  if (uploaderId) dto.uploadedById = uploaderId;
  const ethnicId = recording.ethnicity?.id;
  if (ethnicId) dto.ethnicGroupId = ethnicId;

  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) body[k] = v;
  }
  return body;
}

