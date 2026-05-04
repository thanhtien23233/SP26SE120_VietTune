import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { RecordingUploadDto } from '@/api';
import { legacyPost } from '@/api/legacyHttp';
import { LANGUAGES } from '@/features/upload/uploadConstants';
import { recordingService } from '@/services/recordingService';
import type { InstrumentItem } from '@/services/referenceDataService';
import { submissionService } from '@/services/submissionService';
import { submissionVersionApi } from '@/services/submissionVersionApi';
import { uploadFileToSupabase } from '@/services/uploadService';
import { UserRole } from '@/types';
import { uiToast } from '@/uiToast';

type NameItem = { id?: string; name: string };
type IdNameItem = { id: string; name: string };
type DistrictLike = { id: string; name: string; provinceId: string };
type CommuneLike = { id: string; name: string; districtId: string };

type MediaInfo = {
  duration?: number;
  type?: string;
  size?: number;
  name?: string;
};

type UseUploadSubmissionOptions = {
  isEditMode: boolean;
  currentUserId?: string | number;
  currentUserRole?: UserRole;
  mediaType: 'audio' | 'video';
  file: File | null;
  createdRecordingId: string | null;
  setCreatedRecordingId: (value: string | null) => void;
  setCurrentSubmissionId: (value: string | null) => void;
  currentSubmissionId: string | null;
  editingRecordingId: string | null;
  setIsUploadingMedia: (value: boolean) => void;
  setUploadProgress: Dispatch<SetStateAction<number>>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setNewUploadedUrl: (value: string | null) => void;
  useAiAnalysis: boolean;
  setNoLanguage: (value: boolean) => void;
  setLanguage: (value: string) => void;
  setCustomLanguage: (value: string) => void;
  setRecordingLocation: Dispatch<SetStateAction<string>>;
  setTranscription: (value: string) => void;
  setInstruments: Dispatch<SetStateAction<string[]>>;
  setEthnicity: (value: string) => void;
  setCustomEthnicity: (value: string) => void;
  setVocalStyle: (value: string) => void;
  setMusicalScale: (value: string) => void;
  setEventType: (value: string) => void;
  setCustomEventType: (value: string) => void;
  setPerformanceType: (value: string) => void;
  setTitle: (value: string) => void;
  setComposer: (value: string) => void;
  setComposerUnknown: (value: boolean) => void;
  ethnicGroupsData: NameItem[];
  ceremoniesData: NameItem[];
  provincesData: IdNameItem[];
  districtsData: DistrictLike[];
  communesData: CommuneLike[];
  vocalStylesData: IdNameItem[];
  musicalScalesData: IdNameItem[];
  instrumentsData: InstrumentItem[];
  title: string;
  description: string;
  artist: string;
  artistUnknown: boolean;
  composer: string;
  composerUnknown: boolean;
  language: string;
  noLanguage: boolean;
  customLanguage: string;
  recordingDate: string;
  recordingLocation: string;
  performanceType: string;
  transcription: string;
  ethnicity: string;
  customEthnicity: string;
  eventType: string;
  customEventType: string;
  commune: string;
  district: string;
  province: string;
  vocalStyle: string;
  musicalScale: string;
  instruments: string[];
  audioInfo: MediaInfo | null;
  existingMediaInfo: MediaInfo | null;
  existingMediaSrc: string | null;
  newUploadedUrl: string | null;
  capturedGpsLat: number | null;
  capturedGpsLon: number | null;
  setSubmitStatus: (value: 'idle' | 'success' | 'error') => void;
  setSubmitMessage: (value: string) => void;
  setIsSubmitting: (value: boolean) => void;
};

export function useUploadSubmission(options: UseUploadSubmissionOptions) {
  const handleUploadAndCreateDraft = useCallback(async () => {
    if (!options.file || options.createdRecordingId) return;

    options.setIsUploadingMedia(true);
    options.setUploadProgress(0);
    options.setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });

    const progressInterval = setInterval(() => {
      options.setUploadProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + (95 - prev) * 0.1 + 1;
      });
    }, 500);

    try {
      let publicUrl = '';
      type AiInstrument = { name?: string };
      type AiAnalysisResult = {
        language?: string;
        recordingLocation?: string;
        lyricsOriginal?: string;
        lyricsVietnamese?: string;
        instruments?: AiInstrument[];
        ethnicGroup?: { name?: string };
        vocalStyle?: { name?: string };
        genre?: string;
        musicalScale?: { name?: string };
        ceremony?: { name?: string };
        performanceContext?: string;
      };
      let aiRes: AiAnalysisResult | null = null;

      if (options.useAiAnalysis) {
        const formData = new FormData();
        formData.append('audioFile', options.file);

        const [uploadResult, aiResult] = await Promise.allSettled([
          uploadFileToSupabase(options.file),
          legacyPost('/AIAnalysis/analyze-only', formData, {
            timeout: 300000,
          }),
        ]);

        if (uploadResult.status === 'fulfilled') {
          publicUrl = uploadResult.value as string;
        } else {
          throw uploadResult.reason;
        }

        if (aiResult.status === 'fulfilled' && aiResult.value) {
          const payload = aiResult.value as { data?: unknown };
          aiRes = (payload.data ?? aiResult.value) as AiAnalysisResult;
        } else {
          console.warn(
            'AI Analysis failed:',
            aiResult.status === 'rejected' ? aiResult.reason : 'No value',
          );
          uiToast.warning('upload.ai.partial_fail');
        }
      } else {
        publicUrl = await uploadFileToSupabase(options.file);
      }

      options.setUploadProgress(99);
      options.setNewUploadedUrl(publicUrl);

      if (!options.isEditMode) {
        const uploaderId = options.currentUserId ? options.currentUserId.toString() : '1';
        const res = await recordingService.createSubmission({
          audioFileUrl: publicUrl,
          videoFileUrl: options.mediaType === 'video' ? publicUrl : undefined,
          uploadedById: uploaderId,
        });
        const recordingId = res?.data?.recordingId;
        const submissionId = res?.data?.submissionId;
        if (!recordingId) throw new Error('Không nhận được ID bản thu từ hệ thống.');
        options.setCreatedRecordingId(recordingId);
        if (submissionId) options.setCurrentSubmissionId(submissionId);
      } else {
        options.setCreatedRecordingId('EDIT_MODE_UPLOADED');
      }

      if (aiRes) {
        uiToast.success('upload.ai.success_detail');
        let isInstrumental = false;
        if (aiRes.language) {
          const langLower = aiRes.language.toLowerCase();
          if (
            langLower === 'instrumental' ||
            langLower === 'nhạc cụ' ||
            langLower === 'không có ngôn ngữ' ||
            langLower === 'none' ||
            langLower === 'không'
          ) {
            isInstrumental = langLower === 'instrumental' || langLower === 'nhạc cụ';
            options.setNoLanguage(true);
            options.setLanguage('');
          } else {
            if (LANGUAGES.includes(aiRes.language)) {
              options.setLanguage(aiRes.language);
            } else {
              options.setLanguage('Khác');
              options.setCustomLanguage(aiRes.language);
            }
            options.setNoLanguage(false);
          }
        }
        if (aiRes.recordingLocation) options.setRecordingLocation(aiRes.recordingLocation);
        if (aiRes.lyricsOriginal) options.setTranscription(aiRes.lyricsOriginal);
        if (aiRes.lyricsVietnamese && document.getElementById('field-transcription')) {
          // Intentionally no-op: reserved for future dual-text handling.
        }
        if (aiRes.instruments && Array.isArray(aiRes.instruments)) {
          const names = aiRes.instruments
            .map((i) => i.name)
            .filter((name): name is string => Boolean(name));
          if (names.length > 0) options.setInstruments(names);
        }
        if (aiRes.ethnicGroup?.name) {
          const name = aiRes.ethnicGroup.name;
          if (options.ethnicGroupsData.find((e) => e.name === name)) {
            options.setEthnicity(name);
          } else {
            options.setEthnicity('Khác');
            options.setCustomEthnicity(name);
          }
        }
        if (aiRes.vocalStyle?.name || aiRes.genre) {
          options.setVocalStyle(aiRes.vocalStyle?.name ?? aiRes.genre ?? '');
        }
        if (aiRes.musicalScale?.name) options.setMusicalScale(aiRes.musicalScale.name);
        if (aiRes.ceremony?.name) {
          const name = aiRes.ceremony.name;
          if (options.ceremoniesData.find((c) => c.name === name)) {
            options.setEventType(name);
          } else {
            options.setEventType('Khác');
            options.setCustomEventType(name);
          }
        }
        if (isInstrumental) {
          options.setPerformanceType('instrumental');
        } else if (aiRes.performanceContext) {
          const pt = aiRes.performanceContext;
          if (
            [
              'vocal_accompaniment',
              'instrumental_solo',
              'instrumental_ensemble',
              'acappella',
              'instrumental',
            ].includes(pt)
          ) {
            options.setPerformanceType(pt);
          } else {
            options.setPerformanceType(
              pt === 'Hát với nhạc cụ' ? 'vocal_accompaniment' : pt === 'Nhạc cụ' ? 'instrumental' : '',
            );
          }
        }
        options.setTitle('');
        options.setComposer('');
        options.setComposerUnknown(false);
      }
      options.setUploadProgress(100);
    } catch (error: unknown) {
      console.error('Lỗi khi tải lên file hoặc tạo bản thu:', error);
      options.setErrors((prev) => ({ ...prev, file: 'Có lỗi khi tải lên. Vui lòng thử lại sau.' }));
    } finally {
      clearInterval(progressInterval);
      options.setIsUploadingMedia(false);
    }
  }, [options]);

  const handleConfirmSubmit = useCallback(
    async (isFinal: boolean) => {
      options.setIsSubmitting(true);
      options.setSubmitStatus('idle');
      options.setSubmitMessage('');

      const targetId = options.isEditMode ? options.editingRecordingId : options.createdRecordingId;
      if (!targetId) {
        options.setSubmitStatus('error');
        options.setSubmitMessage('Không tìm thấy ID bản thu. Vui lòng thử tải lại file ở Bước 1.');
        options.setIsSubmitting(false);
        return;
      }

      try {
        const finalEthnicity = options.ethnicity === 'Khác' ? options.customEthnicity : options.ethnicity;
        const ethnicGroupId = options.ethnicGroupsData.find((e) => e.name === finalEthnicity)?.id;
        const finalEventType = options.eventType === 'Khác' ? options.customEventType : options.eventType;
        const ceremonyId = options.ceremoniesData.find((c) => c.name === finalEventType)?.id;
        const provinceId = options.provincesData.find((p) => p.name === options.province)?.id;
        const districtId = options.districtsData.find(
          (d) => d.name === options.district && d.provinceId === provinceId,
        )?.id;
        const selectedCommuneId = options.communesData.find(
          (c) => c.name === options.commune && c.districtId === districtId,
        )?.id;
        const selectedVocalStyleId = options.vocalStylesData.find((v) => v.name === options.vocalStyle)?.id;
        const selectedMusicalScaleId = options.musicalScalesData.find(
          (m) => m.name === options.musicalScale,
        )?.id;
        const selectedInstrumentIds = options.instruments
          .map((name) => options.instrumentsData.find((i: InstrumentItem) => i.name === name)?.id)
          .filter((id): id is string => !!id);

        const durationSeconds = options.audioInfo?.duration || options.existingMediaInfo?.duration || 0;
        const audioFormat = options.audioInfo?.type || options.existingMediaInfo?.type || options.file?.type || '';
        const fileSizeBytes = options.audioInfo?.size || options.existingMediaInfo?.size || options.file?.size || 0;
        const finalMediaUrl = options.newUploadedUrl || options.existingMediaSrc || '';

        const payload: RecordingUploadDto = {
          title: options.title || undefined,
          description: options.description || undefined,
          audioFileUrl: finalMediaUrl,
          videoFileUrl: options.mediaType === 'video' ? finalMediaUrl : undefined,
          audioFormat: audioFormat || undefined,
          durationSeconds,
          fileSizeBytes,
          uploadedById: options.currentUserId ? options.currentUserId.toString() : '1',
          communeId: selectedCommuneId || undefined,
          ethnicGroupId: ethnicGroupId || undefined,
          ceremonyId: ceremonyId || undefined,
          vocalStyleId: selectedVocalStyleId || undefined,
          musicalScaleId: selectedMusicalScaleId || undefined,
          performanceContext: options.performanceType || undefined,
          lyricsOriginal: options.transcription || undefined,
          lyricsVietnamese: undefined,
          performerName: options.artistUnknown ? 'Không rõ nghệ sĩ' : options.artist || undefined,
          performerAge: 0,
          recordingDate: options.recordingDate
            ? new Date(options.recordingDate).toISOString()
            : new Date().toISOString(),
          gpsLatitude: options.capturedGpsLat ?? 0,
          gpsLongitude: options.capturedGpsLon ?? 0,
          tempo: 0,
          keySignature: undefined,
          instrumentIds: selectedInstrumentIds,
          composer: options.composerUnknown ? 'Dân gian/Không rõ' : options.composer || undefined,
          language: options.noLanguage
            ? 'Không có ngôn ngữ'
            : options.language === 'Khác'
              ? options.customLanguage
              : options.language || undefined,
          recordingLocation: options.recordingLocation || undefined,
          ...(isFinal ? { status: 1 } : {}),
        };

        await recordingService.updateRecording(targetId, payload);

        const createSubmissionVersionBestEffort = async () => {
          const isContributorEdit =
            options.isEditMode &&
            options.currentUserRole === UserRole.CONTRIBUTOR &&
            Boolean(targetId);
          if (!isContributorEdit) return;
          const changes = {
            note: isFinal
              ? 'Contributor submitted edited submission'
              : 'Contributor saved edited submission draft',
            fields: [
              { field: 'title', after: options.title || null },
              { field: 'description', after: options.description || null },
              {
                field: 'performerName',
                after: options.artistUnknown ? 'Không rõ nghệ sĩ' : options.artist || null,
              },
              { field: 'recordingLocation', after: options.recordingLocation || null },
              { field: 'updatedAt', after: new Date().toISOString() },
            ],
          };
          try {
            await submissionVersionApi.create({
              submissionId: targetId,
              changesJson: JSON.stringify(changes),
            });
          } catch (err) {
            console.warn('Submission version create failed:', err);
          }
        };

        if (isFinal) {
          const subIdToConfirm = options.currentSubmissionId || (options.isEditMode ? options.editingRecordingId : null);
          if (subIdToConfirm) {
            const confirmRes = await submissionService.confirmSubmission(subIdToConfirm);
            if (!confirmRes || !confirmRes.isSuccess) {
              throw new Error(confirmRes?.message || 'Không thể xác nhận bản đóng góp. Vui lòng thử lại.');
            }
            // Backend auto-notification: NewRecordingPending → tránh tạo thông báo kép ở FE.
            // NOTE: nhánh edit-mode có thể cần notification riêng (submission_updated) nếu backend KHÔNG gửi.
            // Hiện giữ behavior tối giản để tránh duplicate; UI vẫn báo submit thành công như trước.
          }
          await createSubmissionVersionBestEffort();
          options.setSubmitStatus('success');
          options.setSubmitMessage(
            options.isEditMode
              ? 'Cập nhật bản thu thành công!'
              : 'Tải lên thành công! Bản thu của bạn đã được gửi để duyệt.',
          );
        } else {
          await createSubmissionVersionBestEffort();
          uiToast.success(options.isEditMode ? 'upload.save.success_edit' : 'upload.save.success_draft');
        }
      } catch (error: unknown) {
        console.error('Lỗi khi lưu dữ liệu:', error);
        let errorDetail = 'Lỗi không xác định khi lưu dữ liệu. Vui lòng thử lại.';
        const serverData = (error as { response?: { data?: unknown } }).response?.data;
        if (serverData !== undefined) {
          const data = serverData;
          if (typeof data === 'string') {
            errorDetail = `Lỗi từ server: ${data}`;
          } else if (typeof data === 'object' && data !== null) {
            const rec = data as Record<string, unknown>;
            const rawErrors = rec.errors;
            if (Array.isArray(rawErrors)) {
              const msgs = rawErrors.map((e: unknown) => (typeof e === 'string' ? e : JSON.stringify(e)));
              const msg = typeof rec.message === 'string' ? rec.message : '';
              errorDetail = `Lỗi hệ thống: ${msg} - ${msgs.join(' | ')}`;
            } else if (rawErrors && typeof rawErrors === 'object') {
              const validationErrors = Object.entries(rawErrors as Record<string, unknown>)
                .map(([field, msgs]) =>
                  Array.isArray(msgs) ? `${field}: ${msgs.join(', ')}` : `${field}: ${JSON.stringify(msgs)}`,
                )
                .join(' | ');
              errorDetail = `Lỗi dữ liệu: ${validationErrors}`;
            } else if (typeof rec.message === 'string') {
              errorDetail = rec.message;
            } else {
              errorDetail = `Lỗi từ server: ${JSON.stringify(data)}`;
            }
          }
        } else if (error instanceof Error) {
          errorDetail = `Lỗi: ${error.message}. Vui lòng thử lại.`;
        }
        options.setSubmitStatus('error');
        options.setSubmitMessage(errorDetail);
      } finally {
        options.setIsSubmitting(false);
      }
    },
    [options],
  );

  return { handleUploadAndCreateDraft, handleConfirmSubmit };
}
