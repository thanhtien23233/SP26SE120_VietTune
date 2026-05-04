import { useCallback, useState } from 'react';

import { GENRE_ETHNICITY_MAP } from '@/features/upload/uploadConstants';
import { getAddressFromCoordinates } from '@/services/geocodeService';
import { suggestMetadata } from '@/services/metadataSuggestService';

/**
 * Metadata fields, GPS, AI suggest, and submit/error UI state for UploadMusic.
 * Media file state stays in `useMediaUpload`; `validateForm` / `isFormComplete` stay in the page
 * because they depend on `file` and `mediaType` from `useMediaUpload`.
 */
export function useUploadForm() {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [artistUnknown, setArtistUnknown] = useState(false);
  const [composer, setComposer] = useState('');
  const [composerUnknown, setComposerUnknown] = useState(false);
  const [language, setLanguage] = useState('');
  const [noLanguage, setNoLanguage] = useState(false);
  const [customLanguage, setCustomLanguage] = useState('');
  const [recordingDate, setRecordingDate] = useState('');
  const [dateEstimated, setDateEstimated] = useState(false);
  const [dateNote, setDateNote] = useState('');
  const [recordingLocation, setRecordingLocation] = useState('');

  const [ethnicity, setEthnicity] = useState('');
  const [customEthnicity, setCustomEthnicity] = useState('');

  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [commune, setCommune] = useState('');

  const [initialCommuneId, setInitialCommuneId] = useState<string | null>(null);
  const [initialEthnicGroupId, setInitialEthnicGroupId] = useState<string | null>(null);
  const [initialCeremonyId, setInitialCeremonyId] = useState<string | null>(null);
  const [initialVocalStyleId, setInitialVocalStyleId] = useState<string | null>(null);
  const [initialMusicalScaleId, setInitialMusicalScaleId] = useState<string | null>(null);
  const [initialInstrumentIds, setInitialInstrumentIds] = useState<string[]>([]);

  const [vocalStyle, setVocalStyle] = useState('');
  const [musicalScale, setMusicalScale] = useState('');

  const [eventType, setEventType] = useState('');
  const [customEventType, setCustomEventType] = useState('');
  const [performanceType, setPerformanceType] = useState('');
  const [instruments, setInstruments] = useState<string[]>([]);

  const [description, setDescription] = useState('');
  const [fieldNotes, setFieldNotes] = useState('');
  const [transcription, setTranscription] = useState('');
  const [lyricsFile, setLyricsFile] = useState<File | null>(null);
  const [instrumentImage, setInstrumentImage] = useState<File | null>(null);
  const [instrumentImagePreview, setInstrumentImagePreview] = useState<string>('');

  const handleInstrumentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    setInstrumentImage(picked);
    if (picked) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInstrumentImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(picked);
    } else {
      setInstrumentImagePreview('');
    }
  };

  const [collector, setCollector] = useState('');
  const [copyright, setCopyright] = useState('');
  const [archiveOrg, setArchiveOrg] = useState('');
  const [catalogId, setCatalogId] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [capturedGpsLat, setCapturedGpsLat] = useState<number | null>(null);
  const [capturedGpsLon, setCapturedGpsLon] = useState<number | null>(null);
  const [capturedGpsAccuracy, setCapturedGpsAccuracy] = useState<number | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);
  const [aiSuggestSuccess, setAiSuggestSuccess] = useState<string | null>(null);

  const requiresInstruments =
    performanceType === 'instrumental' || performanceType === 'vocal_accompaniment';
  const allowsLyrics = performanceType === 'acappella' || performanceType === 'vocal_accompaniment';

  const handleGetGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ GPS.');
      return;
    }
    setGpsError(null);
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          const { latitude, longitude } = pos.coords;
          setCapturedGpsLat(latitude);
          setCapturedGpsLon(longitude);
          setCapturedGpsAccuracy(
            typeof pos.coords.accuracy === 'number' && Number.isFinite(pos.coords.accuracy)
              ? pos.coords.accuracy
              : null,
          );
          const gpsText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          try {
            const res = await getAddressFromCoordinates(latitude, longitude);
            const display = res.address?.trim() || `Tọa độ: ${gpsText}`;
            setRecordingLocation((prev) => (prev ? `${prev}; ${display}` : display));
            if (res.addressFromService === false || display.startsWith('Tọa độ:')) {
              setGpsError(
                'Không lấy được tên địa chỉ từ dịch vụ; đã lưu tọa độ. Bạn có thể chỉnh sửa ô địa điểm ở bước Metadata.',
              );
            } else {
              setGpsError(null);
            }
          } catch {
            setRecordingLocation((prev) =>
              prev ? `${prev} (Tọa độ: ${gpsText})` : `Tọa độ: ${gpsText}`,
            );
            setGpsError(
              'Không kết nối được dịch vụ địa chỉ; đã lưu tọa độ. Bạn có thể chỉnh sửa ô địa điểm.',
            );
          }
          setGpsLoading(false);
        })();
      },
      (err) => {
        setGpsError(
          err.message === 'User denied Geolocation'
            ? 'Bạn đã từ chối quyền vị trí.'
            : 'Không lấy được tọa độ. Kiểm tra quyền vị trí hoặc kết nối.',
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const handleAiSuggestMetadata = useCallback(async () => {
    setAiSuggestError(null);
    setAiSuggestSuccess(null);
    setAiSuggestLoading(true);
    try {
      const res = await suggestMetadata({
        genre: vocalStyle || undefined,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
      });
      const hasSuggestions =
        res.ethnicity || res.region || (res.instruments && res.instruments.length > 0);
      if (res.message && !hasSuggestions) {
        setAiSuggestError(res.message);
      } else {
        const parts: string[] = [];
        if (res.ethnicity) {
          setEthnicity(res.ethnicity);
          parts.push(`Dân tộc: ${res.ethnicity}`);
        }
        if (res.region) {
          setRegion(res.region);
          parts.push(`Vùng: ${res.region}`);
        }
        if (res.instruments && res.instruments.length > 0) {
          setInstruments((prev) => {
            const combined = [...prev];
            for (const name of res.instruments!) {
              if (name && !combined.includes(name)) combined.push(name);
            }
            return combined.length > 0 ? combined : (res.instruments ?? []);
          });
          parts.push(`Nhạc cụ: ${res.instruments.join(', ')}`);
        }
        if (parts.length > 0) {
          setAiSuggestSuccess(`Đã áp dụng gợi ý: ${parts.join(' · ')}. Xem lại kết quả phía trên.`);
        }
      }
    } catch {
      if (vocalStyle && GENRE_ETHNICITY_MAP[vocalStyle]) {
        const suggested = GENRE_ETHNICITY_MAP[vocalStyle][0];
        if (suggested && !ethnicity) setEthnicity(suggested);
      }
      setAiSuggestError('Không kết nối được dịch vụ gợi ý. Kiểm tra backend và thử lại.');
    } finally {
      setAiSuggestLoading(false);
    }
  }, [vocalStyle, title, description, ethnicity]);

  return {
    title,
    setTitle,
    artist,
    setArtist,
    artistUnknown,
    setArtistUnknown,
    composer,
    setComposer,
    composerUnknown,
    setComposerUnknown,
    language,
    setLanguage,
    noLanguage,
    setNoLanguage,
    customLanguage,
    setCustomLanguage,
    recordingDate,
    setRecordingDate,
    dateEstimated,
    setDateEstimated,
    dateNote,
    setDateNote,
    recordingLocation,
    setRecordingLocation,
    ethnicity,
    setEthnicity,
    customEthnicity,
    setCustomEthnicity,
    region,
    setRegion,
    province,
    setProvince,
    district,
    setDistrict,
    commune,
    setCommune,
    initialCommuneId,
    setInitialCommuneId,
    initialEthnicGroupId,
    setInitialEthnicGroupId,
    initialCeremonyId,
    setInitialCeremonyId,
    initialVocalStyleId,
    setInitialVocalStyleId,
    initialMusicalScaleId,
    setInitialMusicalScaleId,
    initialInstrumentIds,
    setInitialInstrumentIds,
    vocalStyle,
    setVocalStyle,
    musicalScale,
    setMusicalScale,
    eventType,
    setEventType,
    customEventType,
    setCustomEventType,
    performanceType,
    setPerformanceType,
    instruments,
    setInstruments,
    description,
    setDescription,
    fieldNotes,
    setFieldNotes,
    transcription,
    setTranscription,
    lyricsFile,
    setLyricsFile,
    instrumentImage,
    setInstrumentImage,
    instrumentImagePreview,
    setInstrumentImagePreview,
    handleInstrumentImageChange,
    collector,
    setCollector,
    copyright,
    setCopyright,
    archiveOrg,
    setArchiveOrg,
    catalogId,
    setCatalogId,
    errors,
    setErrors,
    submitStatus,
    setSubmitStatus,
    submitMessage,
    setSubmitMessage,
    isSubmitting,
    setIsSubmitting,
    gpsLoading,
    setGpsLoading,
    gpsError,
    setGpsError,
    capturedGpsLat,
    setCapturedGpsLat,
    capturedGpsLon,
    setCapturedGpsLon,
    capturedGpsAccuracy,
    setCapturedGpsAccuracy,
    aiSuggestLoading,
    setAiSuggestLoading,
    aiSuggestError,
    setAiSuggestError,
    aiSuggestSuccess,
    setAiSuggestSuccess,
    requiresInstruments,
    allowsLyrics,
    handleGetGpsLocation,
    handleAiSuggestMetadata,
  };
}
