import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MediaUploadStep from '@/components/features/upload/steps/MediaUploadStep';
import type { DetectedInstrument, MetadataSuggestion } from '@/types/instrumentDetection';

const SectionHeaderStub = ({ title }: { title: string }) => <div>{title}</div>;

describe('MediaUploadStep', () => {
  it('shows detected instruments in step 1 AI panel after upload success', () => {
    const instrumentPredictions: DetectedInstrument[] = [{ name: 'Đàn tranh', confidence: 0.87 }];

    const aiMetadataSuggestions: MetadataSuggestion[] = [
      {
        field: 'region',
        value: 'Miền Bắc',
        sourceInstrument: 'Đàn tranh',
        confidence: 0.82,
      },
    ];

    render(
      <MediaUploadStep
        show
        isFormDisabled={false}
        isEditMode={false}
        existingMediaSrc={null}
        existingMediaInfo={null}
        mediaType="audio"
        file={new File(['a'], 'test.mp3', { type: 'audio/mpeg' })}
        audioInfo={{ name: 'test.mp3', size: 1000, type: 'audio/mpeg', duration: 12 }}
        title="test"
        artist="artist"
        isAnalyzing={false}
        errors={{}}
        createdRecordingId="rec-1"
        newUploadedUrl={null}
        useAiAnalysis
        instrumentPredictions={instrumentPredictions}
        aiMetadataSuggestions={aiMetadataSuggestions}
        isUploadingMedia={false}
        uploadProgress={100}
        fileInputRef={{ current: null }}
        SectionHeaderComponent={SectionHeaderStub}
        onFileChange={vi.fn()}
        onUploadAndCreateDraft={vi.fn()}
        onUseAiAnalysisChange={vi.fn()}
        onMediaTypeChange={vi.fn()}
        onResetSelectedFile={vi.fn()}
        formatFileSize={() => '1 KB'}
        formatDuration={() => '00:12'}
      />,
    );

    expect(screen.queryByText('AI Instrument Analysis')).not.toBeNull();
    expect(screen.queryByText('Đàn tranh')).not.toBeNull();
    expect(screen.queryByText('Suggested Metadata (Read-only)')).not.toBeNull();
  });
});
