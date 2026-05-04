import { Info, Shield, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useBlocker } from 'react-router-dom';

import UploadProgressDialog from '@/components/common/UploadProgressDialog';
import { MultiSelectTags } from '@/components/features/upload/MultiSelectTags';
import MediaUploadStep from '@/components/features/upload/steps/MediaUploadStep';
import UploadConfirmDialogs from '@/components/features/upload/UploadConfirmDialogs';
import { UploadDatePicker as DatePicker } from '@/components/features/upload/UploadDatePicker';
import UploadFormFields from '@/components/features/upload/UploadFormFields';
import {
  CollapsibleSection,
  FormField,
  SectionHeader,
  TextInput,
} from '@/components/features/upload/UploadFormPrimitives';
import UploadMediaPreview from '@/components/features/upload/UploadMediaPreview';
import { UploadSearchableDropdown } from '@/components/features/upload/UploadSearchableDropdown';
import UploadWizardActions from '@/components/features/upload/UploadWizardActions';
import UploadWizardStepper from '@/components/features/upload/UploadWizardStepper';
import { macroRegionDisplayNameFromProvinceRegionCode as getRegionName } from '@/config/provinceRegionCodes';
import { useMediaUpload } from '@/features/upload/hooks/useMediaUpload';
import { useUploadDialogChrome } from '@/features/upload/hooks/useUploadDialogChrome';
import {
  useUploadEditCommuneProvinceEffect,
  useUploadEditReferenceEffects,
} from '@/features/upload/hooks/useUploadEditReferenceEffects';
import { useUploadForm } from '@/features/upload/hooks/useUploadForm';
import { useUploadRecordingLoader } from '@/features/upload/hooks/useUploadRecordingLoader';
import { useUploadReferenceData } from '@/features/upload/hooks/useUploadReferenceData';
import { useUploadSubmission } from '@/features/upload/hooks/useUploadSubmission';
import { useUploadWizard } from '@/features/upload/hooks/useUploadWizard';
import {
  formatDuration,
  formatFileSize,
  GENRE_ETHNICITY_MAP,
  LANGUAGES,
  PERFORMANCE_TYPES,
} from '@/features/upload/uploadConstants';
import {
  isUploadFormComplete,
  scrollToFirstUploadError,
  validateUploadFormState,
} from '@/features/upload/uploadFormValidation';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';

// ===== MAIN COMPONENT =====
export interface UploadMusicProps {
  /** When provided (e.g. from EditRecordingPage), load recording by id from storage instead of session. */
  recordingId?: string;
  /** When true, save preserves moderation status APPROVED instead of resetting to PENDING_REVIEW. */
  isApprovedEdit?: boolean;
}

export default function UploadMusic({ recordingId, isApprovedEdit }: UploadMusicProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditModeParam =
    searchParams.get('edit') === 'true' || !!recordingId || !!searchParams.get('id');
  const [isEditMode, setIsEditMode] = useState(isEditModeParam);
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(
    recordingId || searchParams.get('id'),
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentUser = useAuthStore((s) => s.user);
  // Upload: only CONTRIBUTOR. Edit (isApprovedEdit): CONTRIBUTOR or EXPERT — same UI/UX and logic for both.
  const isFormDisabled =
    !currentUser ||
    (isApprovedEdit
      ? currentUser.role !== UserRole.CONTRIBUTOR && currentUser.role !== UserRole.EXPERT
      : currentUser.role !== UserRole.CONTRIBUTOR);

  const {
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
    gpsError,
    capturedGpsLat,
    setCapturedGpsLat,
    capturedGpsLon,
    setCapturedGpsLon,
    capturedGpsAccuracy,
    setCapturedGpsAccuracy,
    aiSuggestLoading,
    aiSuggestError,
    aiSuggestSuccess,
    requiresInstruments,
    allowsLyrics,
    handleGetGpsLocation,
    handleAiSuggestMetadata,
  } = useUploadForm();

  const {
    ETHNICITIES,
    ethnicGroupsData,
    REGIONS,
    EVENT_TYPES,
    ceremoniesData,
    INSTRUMENTS,
    instrumentsData,
    provincesData,
    districtsData,
    communesData,
    vocalStylesData,
    musicalScalesData,
  } = useUploadReferenceData({
    isEditModeParam,
    recordingId: recordingId ?? null,
    province,
    district,
  });

  const {
    mediaType,
    setMediaType,
    file,
    setFile,
    audioInfo,
    setAudioInfo,
    existingMediaSrc,
    setExistingMediaSrc,
    existingMediaInfo,
    setExistingMediaInfo,
    isAnalyzing,
    isUploadingMedia,
    setIsUploadingMedia,
    createdRecordingId,
    setCreatedRecordingId,
    useAiAnalysis,
    setUseAiAnalysis,
    currentSubmissionId,
    setCurrentSubmissionId,
    uploadProgress,
    setUploadProgress,
    newUploadedUrl,
    setNewUploadedUrl,
    fileInputRef,
    handleFileChange,
  } = useMediaUpload({ title, setTitle, setErrors });

  // Check for genre-ethnicity mismatch
  const genreEthnicityWarning = useMemo(() => {
    if (!vocalStyle || !ethnicity) return null;

    const expectedEthnicities = GENRE_ETHNICITY_MAP[vocalStyle];
    if (expectedEthnicities && !expectedEthnicities.includes(ethnicity)) {
      return `Lưu ý: Lối hát "${vocalStyle}" thường là đặc trưng của người ${expectedEthnicities.join(', ')}. Tuy nhiên, giao lưu văn hóa giữa các dân tộc là điều bình thường.`;
    }
    return null;
  }, [vocalStyle, ethnicity]);

  const showWizard = !isEditMode;
  const {
    uploadWizardStep,
    setUploadWizardStep,
    canNavigateToStep,
    goNext,
    goPrev,
    reset: resetUploadWizard,
  } = useUploadWizard({
    isFormDisabled,
    isEditMode,
    file,
    existingMediaSrc,
    createdRecordingId,
    title,
    artist,
    artistUnknown,
    composer,
    composerUnknown,
    performanceType,
    vocalStyle,
    requiresInstruments,
    instruments,
  });

  useUploadRecordingLoader(isEditModeParam, recordingId, searchParams, {
    setEditingRecordingId,
    setCurrentSubmissionId,
    setMediaType,
    setTitle,
    setArtistUnknown,
    setArtist,
    setComposerUnknown,
    setComposer,
    setNoLanguage,
    setLanguage,
    setCustomLanguage,
    setVocalStyle,
    setRecordingDate,
    setDateEstimated,
    setDateNote,
    setRecordingLocation,
    setCapturedGpsLat,
    setCapturedGpsLon,
    setCapturedGpsAccuracy,
    setEthnicity,
    setRegion,
    setProvince,
    setEventType,
    setPerformanceType,
    setInitialInstrumentIds,
    setInstruments,
    setInitialCommuneId,
    setInitialEthnicGroupId,
    setInitialCeremonyId,
    setInitialVocalStyleId,
    setInitialMusicalScaleId,
    setDescription,
    setFieldNotes,
    setTranscription,
    setCollector,
    setCopyright,
    setArchiveOrg,
    setCatalogId,
    setExistingMediaSrc,
    setExistingMediaInfo,
    setIsEditMode,
  });

  useUploadEditReferenceEffects({
    isEditMode,
    initialEthnicGroupId,
    ethnicGroupsData,
    ethnicity,
    setEthnicity,
    initialCeremonyId,
    ceremoniesData,
    eventType,
    setEventType,
    initialVocalStyleId,
    vocalStylesData,
    vocalStyle,
    setVocalStyle,
    initialMusicalScaleId,
    musicalScalesData,
    musicalScale,
    setMusicalScale,
    initialInstrumentIds,
    instrumentsData,
    instruments,
    setInstruments,
  });

  useUploadEditCommuneProvinceEffect({
    isEditMode,
    initialCommuneId,
    communesData,
    districtsData,
    provincesData,
    commune,
    setCommune,
    setDistrict,
    setProvince,
    setRegion,
  });

  const handleMediaTypeChange = useCallback(
    (nextType: 'audio' | 'video') => {
      setMediaType(nextType);
      setFile(null);
      setAudioInfo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [setMediaType, setFile, setAudioInfo, fileInputRef],
  );

  const handleResetSelectedFile = useCallback(() => {
    setFile(null);
    setAudioInfo(null);
    setCreatedRecordingId(null);
    setNewUploadedUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [setFile, setAudioInfo, setCreatedRecordingId, setNewUploadedUrl, setUploadProgress, fileInputRef]);

  const handleLyricsFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setLyricsFile(selected);
    }
  }, [setLyricsFile]);

  const validateForm = (): boolean => {
    const result = validateUploadFormState({
      isEditMode,
      file,
      mediaType,
      title,
      artist,
      artistUnknown,
      composer,
      composerUnknown,
      performanceType,
      vocalStyle,
      requiresInstruments,
      instruments,
    });
    if (result.ok) {
      setErrors({});
      return true;
    }
    setErrors(result.errors);
    setSubmitStatus('error');
    setSubmitMessage(
      `Vui lòng hoàn thành các trường bắt buộc: ${result.missingFields.join(', ')}`,
    );
    scrollToFirstUploadError(result.errors);
    return false;
  };

  const { handleUploadAndCreateDraft, handleConfirmSubmit } = useUploadSubmission({
    isEditMode,
    currentUserId: currentUser?.id,
    currentUserRole: currentUser?.role,
    mediaType,
    file,
    createdRecordingId,
    setCreatedRecordingId,
    setCurrentSubmissionId,
    currentSubmissionId,
    editingRecordingId,
    setIsUploadingMedia,
    setUploadProgress,
    setErrors,
    setNewUploadedUrl,
    useAiAnalysis,
    setNoLanguage,
    setLanguage,
    setCustomLanguage,
    setRecordingLocation,
    setTranscription,
    setInstruments,
    setEthnicity,
    setCustomEthnicity,
    setVocalStyle,
    setMusicalScale,
    setEventType,
    setCustomEventType,
    setPerformanceType,
    setTitle,
    setComposer,
    setComposerUnknown,
    ethnicGroupsData,
    ceremoniesData,
    provincesData,
    districtsData,
    communesData,
    vocalStylesData,
    musicalScalesData,
    instrumentsData,
    title,
    description,
    artist,
    artistUnknown,
    composer,
    composerUnknown,
    language,
    noLanguage,
    customLanguage,
    recordingDate,
    recordingLocation,
    performanceType,
    transcription,
    ethnicity,
    customEthnicity,
    eventType,
    customEventType,
    commune,
    district,
    province,
    vocalStyle,
    musicalScale,
    instruments,
    audioInfo,
    existingMediaInfo,
    existingMediaSrc,
    newUploadedUrl,
    capturedGpsLat,
    capturedGpsLon,
    setSubmitStatus,
    setSubmitMessage,
    setIsSubmitting,
  });

  const handleNextStep = async () => {
    const newErrors: Record<string, string> = {};

    if (uploadWizardStep === 1) {
      if (!file && !(isEditMode && !!existingMediaSrc)) {
        newErrors.file =
          mediaType === 'audio' ? 'Vui lòng chọn file âm thanh' : 'Vui lòng chọn file video';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...newErrors }));
        return;
      }
    } else if (uploadWizardStep === 2) {
      if (!isEditMode) {
        if (!title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề';
        if (!artistUnknown && !artist.trim()) {
          newErrors.artist = "Vui lòng nhập tên nghệ sĩ hoặc chọn 'Không rõ'";
        }
        if (!performanceType) {
          newErrors.performanceType = 'Vui lòng chọn loại hình biểu diễn';
        }
        if (
          (performanceType === 'vocal_accompaniment' || performanceType === 'acappella') &&
          !vocalStyle
        ) {
          newErrors.vocalStyle = 'Vui lòng chọn lối hát / thể loại';
        }
        if (requiresInstruments && instruments.length === 0) {
          newErrors.instruments = 'Vui lòng chọn ít nhất một nhạc cụ';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));

      // Auto scroll to first error field based on error key
      setTimeout(() => {
        const firstErrorKey = Object.keys(newErrors)[0];
        const errorElement =
          document.getElementById(`field-${firstErrorKey}`) ||
          document.querySelector(`[name="${firstErrorKey}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    // Clear errors for current step
    setErrors((prev) => {
      const remainingErrors = { ...prev };
      if (uploadWizardStep === 1) delete remainingErrors.file;
      if (uploadWizardStep === 2) {
        delete remainingErrors.title;
        delete remainingErrors.artist;
        delete remainingErrors.composer;
        delete remainingErrors.vocalStyle;
      }
      return remainingErrors;
    });

    goNext();
  };

  // Navigation guard for Step 2 (Metadata entry)
  // Triggers browser confirmation if leaving during meaningful progress
  useEffect(() => {
    // Guard in edit mode or during Step 2-4 of the wizard
    const shouldBlock = isEditMode || uploadWizardStep >= 2;
    if (!shouldBlock || isSubmitting || submitStatus === 'success') return;

    // Only alert if some data has actually been entered
    const hasEnteredData =
      title.trim() !== '' ||
      (artist.trim() !== '' && !artistUnknown) ||
      (composer.trim() !== '' && !composerUnknown) ||
      vocalStyle !== '' ||
      description.trim() !== '';

    if (!hasEnteredData) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Modern browsers require preventDefault and setting returnValue to show the dialog
      e.preventDefault();
      e.returnValue = 'Thay đổi chưa được lưu của bạn sẽ bị mất. Bạn có chắc chắn muốn rời đi?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    uploadWizardStep,
    isEditMode,
    isSubmitting,
    submitStatus,
    title,
    artist,
    artistUnknown,
    composer,
    composerUnknown,
    vocalStyle,
    description,
  ]);

  // Internal navigation blocker (for navbar links etc.)
  // Only available since we migrated to Data Router (createBrowserRouter)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // Guard in edit mode or during Step 2-4 of the wizard
    const shouldBlock = isEditMode || uploadWizardStep >= 2;
    if (!shouldBlock || isSubmitting || submitStatus === 'success') return false;

    // Only alert if some data has actually been entered
    const hasEnteredData =
      title.trim() !== '' ||
      (artist.trim() !== '' && !artistUnknown) ||
      (composer.trim() !== '' && !composerUnknown) ||
      vocalStyle !== '' ||
      description.trim() !== '';

    // Only block if moving to a different page
    return hasEnteredData && currentLocation.pathname !== nextLocation.pathname;
  });

  // Handle the blocker state
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = window.confirm(
        'Thay đổi chưa được lưu của bạn sẽ bị mất. Bạn có chắc chắn muốn rời đi?',
      );
      if (proceed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  const uploadDialogChromeActive = showConfirmDialog || submitStatus === 'success';
  useUploadDialogChrome({
    active: uploadDialogChromeActive,
    onEscape: () => {
      if (showConfirmDialog) setShowConfirmDialog(false);
      if (submitStatus === 'success') setSubmitStatus('idle');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      // Message is already set inside validateForm
      setTimeout(() => {
        setSubmitStatus('idle');
        setSubmitMessage('');
      }, 8000);
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleSaveDraft = async () => {
    if (isSubmitting) return;

    if (!validateForm()) {
      // Message is already set inside validateForm
      setTimeout(() => {
        setSubmitStatus('idle');
        setSubmitMessage('');
      }, 8000);
      return;
    }

    await handleConfirmSubmit(false);
  };

  const handleConfirmFinalSubmit = async () => {
    setShowConfirmDialog(false);
    await handleConfirmSubmit(true);
  };

  const resetForm = () => {
    if (showWizard) resetUploadWizard();
    setMediaType('audio');
    setFile(null);
    setAudioInfo(null);
    setTitle('');
    setArtist('');
    setArtistUnknown(false);
    setComposer('');
    setComposerUnknown(false);
    setLanguage('');
    setNoLanguage(false);
    setCustomLanguage('');
    setRecordingDate('');
    setDateEstimated(false);
    setDateNote('');
    setRecordingLocation('');
    setEthnicity('');
    setCustomEthnicity('');
    setRegion('');
    setProvince('');
    setEventType('');
    setCustomEventType('');
    setPerformanceType('');
    setInstruments([]);
    setDescription('');
    setFieldNotes('');
    setTranscription('');
    setLyricsFile(null);
    setCollector('');
    setCopyright('');
    setArchiveOrg('');
    setCatalogId('');
    setErrors({});
    setSubmitStatus('idle');
    setSubmitMessage('');
    setCreatedRecordingId(null);
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFormComplete = useMemo(
    () =>
      isUploadFormComplete({
        isFormDisabled,
        isEditMode,
        file,
        mediaType,
        title,
        artist,
        artistUnknown,
        composer,
        composerUnknown,
        performanceType,
        vocalStyle,
        requiresInstruments,
        instruments,
      }),
    [
      file,
      isEditMode,
      mediaType,
      title,
      artist,
      artistUnknown,
      composer,
      composerUnknown,
      vocalStyle,
      performanceType,
      requiresInstruments,
      instruments,
      isFormDisabled,
    ],
  );

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {/* Required Fields Note */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 font-medium">
          <span className="text-red-500">*</span>
          <span>Trường bắt buộc</span>
        </div>

        <UploadWizardStepper
          showWizard={showWizard}
          uploadWizardStep={uploadWizardStep}
          canNavigateToStep={canNavigateToStep}
          onStepChange={setUploadWizardStep}
        />

        {/* Removed duplicate yellow notice for non-Contributor users */}

        {submitStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-50/90 border border-red-300/80 rounded-2xl shadow-sm backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" strokeWidth={2.5} />
            <p className="text-red-800 font-medium">{submitMessage}</p>
          </div>
        )}

        <MediaUploadStep
          show={uploadWizardStep === 1 || !showWizard}
          isFormDisabled={isFormDisabled}
          isEditMode={isEditMode}
          existingMediaSrc={existingMediaSrc}
          existingMediaInfo={existingMediaInfo}
          mediaType={mediaType}
          file={file}
          audioInfo={audioInfo}
          title={title}
          artist={artist}
          isAnalyzing={isAnalyzing}
          errors={errors}
          createdRecordingId={createdRecordingId}
          newUploadedUrl={newUploadedUrl}
          useAiAnalysis={useAiAnalysis}
          isUploadingMedia={isUploadingMedia}
          uploadProgress={uploadProgress}
          fileInputRef={fileInputRef}
          SectionHeaderComponent={SectionHeader}
          onFileChange={handleFileChange}
          onUploadAndCreateDraft={handleUploadAndCreateDraft}
          onUseAiAnalysisChange={setUseAiAnalysis}
          onMediaTypeChange={handleMediaTypeChange}
          onResetSelectedFile={handleResetSelectedFile}
          formatFileSize={formatFileSize}
          formatDuration={formatDuration}
        />

        <UploadMediaPreview
          show={!isEditMode && uploadWizardStep === 2}
          mediaType={mediaType}
          src={newUploadedUrl}
          mediaName={audioInfo?.name || ''}
          title={title}
          artist={artist || 'Người đóng góp'}
        />

        <UploadFormFields
          show={uploadWizardStep === 2 || !showWizard}
          isFormDisabled={isFormDisabled}
          errors={errors}
          title={title}
          setTitle={setTitle}
          artist={artist}
          setArtist={setArtist}
          artistUnknown={artistUnknown}
          setArtistUnknown={setArtistUnknown}
          composer={composer}
          setComposer={setComposer}
          composerUnknown={composerUnknown}
          setComposerUnknown={setComposerUnknown}
          language={language}
          setLanguage={setLanguage}
          customLanguage={customLanguage}
          setCustomLanguage={setCustomLanguage}
          noLanguage={noLanguage}
          setNoLanguage={setNoLanguage}
          recordingDate={recordingDate}
          setRecordingDate={setRecordingDate}
          dateEstimated={dateEstimated}
          setDateEstimated={setDateEstimated}
          dateNote={dateNote}
          setDateNote={setDateNote}
          recordingLocation={recordingLocation}
          setRecordingLocation={setRecordingLocation}
          performanceType={performanceType}
          setPerformanceType={setPerformanceType}
          instruments={instruments}
          setInstruments={setInstruments}
          vocalStyle={vocalStyle}
          setVocalStyle={setVocalStyle}
          requiresInstruments={requiresInstruments}
          allowsLyrics={allowsLyrics}
          instrumentImage={instrumentImage}
          instrumentImagePreview={instrumentImagePreview}
          setInstrumentImage={setInstrumentImage}
          setInstrumentImagePreview={setInstrumentImagePreview}
          handleInstrumentImageChange={handleInstrumentImageChange}
          lyricsFile={lyricsFile}
          setLyricsFile={setLyricsFile}
          handleLyricsFileChange={handleLyricsFileChange}
          genreEthnicityWarning={genreEthnicityWarning}
          ethnicity={ethnicity}
          setEthnicity={setEthnicity}
          customEthnicity={customEthnicity}
          setCustomEthnicity={setCustomEthnicity}
          ETHNICITIES={ETHNICITIES}
          region={region}
          setRegion={setRegion}
          REGIONS={REGIONS}
          province={province}
          setProvince={setProvince}
          districtsData={districtsData}
          district={district}
          setDistrict={setDistrict}
          commune={commune}
          setCommune={setCommune}
          communesData={communesData}
          eventType={eventType}
          setEventType={setEventType}
          customEventType={customEventType}
          setCustomEventType={setCustomEventType}
          EVENT_TYPES={EVENT_TYPES}
          musicalScale={musicalScale}
          setMusicalScale={setMusicalScale}
          provincesData={provincesData}
          vocalStylesData={vocalStylesData}
          musicalScalesData={musicalScalesData}
          INSTRUMENTS={INSTRUMENTS}
          LANGUAGES={LANGUAGES}
          PERFORMANCE_TYPES={PERFORMANCE_TYPES}
          getRegionName={getRegionName}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
          capturedGpsLat={capturedGpsLat}
          capturedGpsLon={capturedGpsLon}
          capturedGpsAccuracy={capturedGpsAccuracy}
          handleGetGpsLocation={handleGetGpsLocation}
          aiSuggestLoading={aiSuggestLoading}
          aiSuggestError={aiSuggestError}
          aiSuggestSuccess={aiSuggestSuccess}
          handleAiSuggestMetadata={handleAiSuggestMetadata}
          SectionHeaderComponent={SectionHeader}
          FormFieldComponent={FormField}
          TextInputComponent={TextInput}
          DatePickerComponent={DatePicker}
          SearchableDropdownComponent={UploadSearchableDropdown}
          MultiSelectTagsComponent={MultiSelectTags}
          CollapsibleSectionComponent={CollapsibleSection}
        />

        {(uploadWizardStep === 3 || !showWizard) && (
          <>
            <CollapsibleSection icon={Info} title="Ghi chú bổ sung" optional defaultOpen={false}>
              <div className="space-y-4">
                <FormField label="Mô tả nội dung" hint="Lời bài hát, chủ đề, ý nghĩa văn hóa">
                  <TextInput
                    value={description}
                    onChange={setDescription}
                    placeholder="Mô tả chi tiết về bản nhạc..."
                    multiline
                    rows={4}
                  />
                </FormField>

                <FormField
                  label="Ghi chú thực địa"
                  hint="Quan sát về bối cảnh, phong cách trình diễn"
                >
                  <TextInput
                    value={fieldNotes}
                    onChange={setFieldNotes}
                    placeholder="Những quan sát đặc biệt..."
                    multiline
                    rows={3}
                  />
                </FormField>

                <FormField label="Phiên âm/Bản dịch" hint="Nếu sử dụng ngôn ngữ dân tộc thiểu số">
                  <TextInput
                    value={transcription}
                    onChange={setTranscription}
                    placeholder="Phiên âm hoặc bản dịch tiếng Việt..."
                    multiline
                    rows={3}
                  />
                </FormField>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              icon={Shield}
              title="Thông tin quản trị và bản quyền"
              optional
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Người thu thập/Ghi âm">
                  <TextInput
                    value={collector}
                    onChange={setCollector}
                    placeholder="Tên người hoặc tổ chức ghi âm"
                  />
                </FormField>

                <FormField label="Bản quyền">
                  <TextInput
                    value={copyright}
                    onChange={setCopyright}
                    placeholder="Thông tin về quyền sở hữu, giấy phép"
                  />
                </FormField>

                <FormField label="Tổ chức lưu trữ">
                  <TextInput
                    value={archiveOrg}
                    onChange={setArchiveOrg}
                    placeholder="Nơi bảo quản bản gốc"
                  />
                </FormField>

                <FormField label="Mã định danh" hint="ISRC hoặc mã catalog riêng">
                  <TextInput
                    value={catalogId}
                    onChange={setCatalogId}
                    placeholder="VD: ISRC-VN-XXX-00-00000"
                  />
                </FormField>
              </div>
            </CollapsibleSection>

            <UploadWizardActions
              showFinalActions={true}
              showWizard={false}
              uploadWizardStep={uploadWizardStep}
              isAnalyzing={isAnalyzing}
              isSubmitting={isSubmitting}
              isFormDisabled={isFormDisabled}
              isApprovedEdit={isApprovedEdit}
              isFormComplete={isFormComplete}
              canNavigateToStep={canNavigateToStep}
              onReset={resetForm}
              onSaveDraft={handleSaveDraft}
              onPrev={goPrev}
              onNext={handleNextStep}
            />
          </>
        )}

        <UploadWizardActions
          showFinalActions={false}
          showWizard={showWizard}
          uploadWizardStep={uploadWizardStep}
          isAnalyzing={isAnalyzing}
          isSubmitting={isSubmitting}
          isFormDisabled={isFormDisabled}
          isApprovedEdit={isApprovedEdit}
          isFormComplete={isFormComplete}
          canNavigateToStep={canNavigateToStep}
          onReset={resetForm}
          onSaveDraft={handleSaveDraft}
          onPrev={goPrev}
          onNext={handleNextStep}
        />
      </form>

      <UploadProgressDialog isOpen={isSubmitting} />

      <UploadConfirmDialogs
        showConfirmDialog={showConfirmDialog}
        onCloseConfirm={() => setShowConfirmDialog(false)}
        onConfirmFinalSubmit={handleConfirmFinalSubmit}
        isApprovedEdit={isApprovedEdit}
        submitStatus={submitStatus}
        submitMessage={submitMessage}
        onDismissSuccess={() => setSubmitStatus('idle')}
        onSuccessHome={() => {
          resetForm();
          setSubmitStatus('idle');
          setSubmitMessage('');
          navigate('/');
        }}
        onSuccessContributions={() => {
          resetForm();
          setSubmitStatus('idle');
          setSubmitMessage('');
          navigate('/contributions');
        }}
      />
    </React.Fragment>
  );
}
