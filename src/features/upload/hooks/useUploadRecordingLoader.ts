import { useEffect, useRef } from 'react';

import { LANGUAGES } from '@/features/upload/uploadConstants';
import type { LoadedRecording, LocalRecordingStorage } from '@/features/upload/uploadRecordingTypes';
import { getLocalRecordingFull } from '@/services/recordingStorage';
import { sessionGetItem } from '@/services/storageService';

export type UploadRecordingLoaderSetters = {
  setEditingRecordingId: (v: string | null) => void;
  setCurrentSubmissionId: (v: string | null) => void;
  setMediaType: (v: 'audio' | 'video') => void;
  setTitle: (v: string) => void;
  setArtistUnknown: (v: boolean) => void;
  setArtist: (v: string) => void;
  setComposerUnknown: (v: boolean) => void;
  setComposer: (v: string) => void;
  setNoLanguage: (v: boolean) => void;
  setLanguage: (v: string) => void;
  setCustomLanguage: (v: string) => void;
  setVocalStyle: (v: string) => void;
  setRecordingDate: (v: string) => void;
  setDateEstimated: (v: boolean) => void;
  setDateNote: (v: string) => void;
  setRecordingLocation: (v: string) => void;
  setCapturedGpsLat: (v: number | null) => void;
  setCapturedGpsLon: (v: number | null) => void;
  setCapturedGpsAccuracy: (v: number | null) => void;
  setEthnicity: (v: string) => void;
  setRegion: (v: string) => void;
  setProvince: (v: string) => void;
  setEventType: (v: string) => void;
  setPerformanceType: (v: string) => void;
  setInitialInstrumentIds: (v: string[]) => void;
  setInstruments: (v: string[]) => void;
  setInitialCommuneId: (v: string | null) => void;
  setInitialEthnicGroupId: (v: string | null) => void;
  setInitialCeremonyId: (v: string | null) => void;
  setInitialVocalStyleId: (v: string | null) => void;
  setInitialMusicalScaleId: (v: string | null) => void;
  setDescription: (v: string) => void;
  setFieldNotes: (v: string) => void;
  setTranscription: (v: string) => void;
  setCollector: (v: string) => void;
  setCopyright: (v: string) => void;
  setArchiveOrg: (v: string) => void;
  setCatalogId: (v: string) => void;
  setExistingMediaSrc: (v: string | null) => void;
  setExistingMediaInfo: (v: {
    name: string;
    size: number;
    type: string;
    duration: number;
    bitrate?: number;
    sampleRate?: number;
  }) => void;
  setIsEditMode: (v: boolean) => void;
};

/**
 * Loads editing recording from storage (`recordingId`) or session (`editingRecording`).
 * Depends only on `isEditModeParam`, `recordingId`, `searchParams` — setters are stable.
 */
export function useUploadRecordingLoader(
  isEditModeParam: boolean,
  recordingId: string | undefined,
  searchParams: URLSearchParams,
  setters: UploadRecordingLoaderSetters,
) {
  const settersRef = useRef(setters);
  settersRef.current = setters;

  useEffect(() => {
    const s = settersRef.current;
    let effectiveMediaType: 'audio' | 'video' = 'audio';
    if (recordingId) {
      let cancelled = false;
      void (async () => {
        try {
          const existing = (await getLocalRecordingFull(
            recordingId,
          )) as LocalRecordingStorage | null;
          if (cancelled || !existing) return;
          const recording = existing as LoadedRecording;

          s.setEditingRecordingId(recording.recordingId || recording.id || null);
          s.setCurrentSubmissionId(recording.submissionId || null);
          effectiveMediaType = (recording.mediaType || 'audio') as 'audio' | 'video';
          s.setMediaType(effectiveMediaType);
          s.setTitle(recording.basicInfo?.title || '');

          const artistVal = recording.basicInfo?.artist || '';
          if (artistVal === 'Không rõ nghệ sĩ') {
            s.setArtistUnknown(true);
            s.setArtist('');
          } else {
            s.setArtist(artistVal);
            s.setArtistUnknown(false);
          }

          const composerVal = recording.basicInfo?.composer || '';
          if (composerVal === 'Dân gian/Không rõ') {
            s.setComposerUnknown(true);
            s.setComposer('');
          } else {
            s.setComposer(composerVal);
            s.setComposerUnknown(false);
          }

          const langVal = recording.basicInfo?.language || '';
          if (langVal === 'Không có ngôn ngữ') {
            s.setNoLanguage(true);
            s.setLanguage('');
          } else if (langVal && !LANGUAGES.includes(langVal)) {
            s.setLanguage('Khác');
            s.setCustomLanguage(langVal);
          } else {
            s.setLanguage(langVal);
          }

          s.setVocalStyle(recording.basicInfo?.genre || '');
          s.setRecordingDate(recording.basicInfo?.recordingDate || '');
          s.setDateEstimated(recording.basicInfo?.dateEstimated || false);
          s.setDateNote(recording.basicInfo?.dateNote || '');
          s.setRecordingLocation(recording.basicInfo?.recordingLocation || '');
          s.setCapturedGpsLat(typeof recording.gpsLatitude === 'number' ? recording.gpsLatitude : null);
          s.setCapturedGpsLon(typeof recording.gpsLongitude === 'number' ? recording.gpsLongitude : null);
          s.setCapturedGpsAccuracy(null);
          s.setEthnicity(recording.culturalContext?.ethnicity || '');
          s.setRegion(recording.culturalContext?.region || '');
          s.setProvince(recording.culturalContext?.province || '');
          s.setEventType(recording.culturalContext?.eventType || '');
          s.setPerformanceType(recording.culturalContext?.performanceType || '');

          const incomingInst = recording.culturalContext?.instruments || [];
          if (incomingInst.length > 0 && incomingInst[0].length === 36) {
            s.setInitialInstrumentIds(incomingInst);
            s.setInstruments([]);
          } else {
            s.setInstruments(incomingInst);
          }

          s.setInitialCommuneId(recording.culturalContext?.communeId || null);
          s.setInitialEthnicGroupId(recording.culturalContext?.ethnicGroupId || null);
          s.setInitialCeremonyId(recording.culturalContext?.ceremonyId || null);
          s.setInitialVocalStyleId(recording.culturalContext?.vocalStyleId || null);
          s.setInitialMusicalScaleId(recording.culturalContext?.musicalScaleId || null);

          s.setDescription(recording.additionalNotes?.description || '');
          s.setFieldNotes(recording.additionalNotes?.fieldNotes || '');
          s.setTranscription(recording.additionalNotes?.transcription || '');
          s.setCollector(recording.adminInfo?.collector || '');
          s.setCopyright(recording.adminInfo?.copyright || '');
          s.setArchiveOrg(recording.adminInfo?.archiveOrg || '');
          s.setCatalogId(recording.adminInfo?.catalogId || '');

          effectiveMediaType = (recording.mediaType || 'audio') as 'audio' | 'video';
          const lr = recording as LoadedRecording;
          const src =
            lr.youtubeUrl && typeof lr.youtubeUrl === 'string' && lr.youtubeUrl.trim()
              ? lr.youtubeUrl.trim()
              : effectiveMediaType === 'video'
                ? lr.videoFileUrl || lr.videoData || null
                : lr.audioFileUrl || lr.audioUrl || lr.audioData || null;

          s.setExistingMediaSrc(typeof src === 'string' && src.trim().length > 0 ? src : null);
          s.setExistingMediaInfo({
            name:
              lr.audioFileUrl || lr.videoFileUrl
                ? 'Tệp tin từ máy chủ'
                : recording.file?.name ||
                  (effectiveMediaType === 'video' ? 'Video đã tải lên' : 'Âm thanh đã tải lên'),
            size: Number(recording.file?.size || 0),
            type: recording.file?.type || '',
            duration: Number(recording.file?.duration || 0),
            bitrate: recording.file?.bitrate,
            sampleRate: recording.file?.sampleRate,
          });

          s.setIsEditMode(true);
        } catch (err) {
          console.error('Error loading recording by id:', err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (isEditModeParam && !recordingId) {
      let cancelled = false;
      void (async () => {
        try {
          const editingData = sessionGetItem('editingRecording');
          if (!editingData) return;

          const recording = JSON.parse(editingData) as LoadedRecording;
          if (cancelled) return;

          s.setEditingRecordingId(recording.recordingId || null);
          s.setCurrentSubmissionId(recording.id || null);
          effectiveMediaType = (recording.mediaType || 'audio') as 'audio' | 'video';
          s.setMediaType(effectiveMediaType);
          s.setTitle(recording.basicInfo?.title || '');

          const artistVal = recording.basicInfo?.artist || '';
          if (artistVal === 'Không rõ nghệ sĩ') {
            s.setArtistUnknown(true);
            s.setArtist('');
          } else {
            s.setArtist(artistVal);
            s.setArtistUnknown(false);
          }

          const composerVal = recording.basicInfo?.composer || '';
          if (composerVal === 'Dân gian/Không rõ') {
            s.setComposerUnknown(true);
            s.setComposer('');
          } else {
            s.setComposer(composerVal);
            s.setComposerUnknown(false);
          }

          const langVal = recording.basicInfo?.language || '';
          if (langVal === 'Không có ngôn ngữ') {
            s.setNoLanguage(true);
            s.setLanguage('');
          } else if (langVal && !LANGUAGES.includes(langVal)) {
            s.setLanguage('Khác');
            s.setCustomLanguage(langVal);
          } else {
            s.setLanguage(langVal);
          }

          s.setVocalStyle(recording.basicInfo?.genre || '');
          s.setRecordingDate(recording.basicInfo?.recordingDate || '');
          s.setDateEstimated(recording.basicInfo?.dateEstimated || false);
          s.setDateNote(recording.basicInfo?.dateNote || '');
          s.setRecordingLocation(recording.basicInfo?.recordingLocation || '');
          s.setCapturedGpsLat(typeof recording.gpsLatitude === 'number' ? recording.gpsLatitude : null);
          s.setCapturedGpsLon(typeof recording.gpsLongitude === 'number' ? recording.gpsLongitude : null);
          s.setCapturedGpsAccuracy(null);
          s.setEthnicity(recording.culturalContext?.ethnicity || '');
          s.setRegion(recording.culturalContext?.region || '');
          s.setProvince(recording.culturalContext?.province || '');
          s.setEventType(recording.culturalContext?.eventType || '');
          s.setPerformanceType(recording.culturalContext?.performanceType || '');

          const incomingInst = recording.culturalContext?.instruments || [];
          if (incomingInst.length > 0 && incomingInst[0].length === 36) {
            s.setInitialInstrumentIds(incomingInst);
            s.setInstruments([]);
          } else {
            s.setInstruments(incomingInst);
          }

          s.setInitialCommuneId(recording.culturalContext?.communeId || null);
          s.setInitialEthnicGroupId(recording.culturalContext?.ethnicGroupId || null);
          s.setInitialCeremonyId(recording.culturalContext?.ceremonyId || null);
          s.setInitialVocalStyleId(recording.culturalContext?.vocalStyleId || null);
          s.setInitialMusicalScaleId(recording.culturalContext?.musicalScaleId || null);

          s.setDescription(recording.additionalNotes?.description || '');
          s.setFieldNotes(recording.additionalNotes?.fieldNotes || '');
          s.setTranscription(recording.additionalNotes?.transcription || '');
          s.setCollector(recording.adminInfo?.collector || '');
          s.setCopyright(recording.adminInfo?.copyright || '');
          s.setArchiveOrg(recording.adminInfo?.archiveOrg || '');
          s.setCatalogId(recording.adminInfo?.catalogId || '');

          const storageKey = recording.recordingId ?? recording.id;
          const existing = storageKey
            ? ((await getLocalRecordingFull(storageKey)) as LocalRecordingStorage | null)
            : null;
          if (cancelled) return;
          const existingLoaded = existing as LoadedRecording | null;
          const recordingLoaded = recording;

          effectiveMediaType = (existing?.mediaType || recording.mediaType || 'audio') as
            | 'audio'
            | 'video';
          const lr = recording as LoadedRecording;
          const src =
            existing?.youtubeUrl &&
            typeof existing.youtubeUrl === 'string' &&
            existing.youtubeUrl.trim()
              ? existing.youtubeUrl.trim()
              : effectiveMediaType === 'video'
                ? lr.videoFileUrl || existing?.videoData || recording.videoData || null
                : lr.audioFileUrl ||
                  lr.audioUrl ||
                  existing?.audioData ||
                  recording.audioData ||
                  null;

          s.setExistingMediaSrc(typeof src === 'string' && src.trim().length > 0 ? src : null);
          s.setExistingMediaInfo({
            name:
              lr.audioFileUrl || lr.videoFileUrl
                ? 'Tệp tin từ máy chủ'
                : existingLoaded?.file?.name ||
                  recordingLoaded?.file?.name ||
                  (effectiveMediaType === 'video' ? 'Video đã tải lên' : 'Âm thanh đã tải lên'),
            size: Number(existingLoaded?.file?.size || recordingLoaded?.file?.size || 0),
            type: existingLoaded?.file?.type || recordingLoaded?.file?.type || '',
            duration: Number(
              existingLoaded?.file?.duration || recordingLoaded?.file?.duration || 0,
            ),
            bitrate: existingLoaded?.file?.bitrate || recordingLoaded?.file?.bitrate,
            sampleRate: existingLoaded?.file?.sampleRate || recordingLoaded?.file?.sampleRate,
          });

          s.setIsEditMode(true);
        } catch (err) {
          console.error('Error loading editing recording:', err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [isEditModeParam, recordingId, searchParams]);
}
