import { AlertCircle } from 'lucide-react';
import { memo } from 'react';

import { ModerationSubmissionDetailPanels } from '@/components/features/moderation/ModerationSubmissionDetailPanels';
import type { ModerationInfoRow } from '@/features/moderation/hooks/useModerationDetailViewModel';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';

type MetadataTabPanelProps = {
  item: LocalRecordingMini;
  currentUserId?: string;
  expertReviewNotesDraft: string;
  onExpertReviewNotesChange: (submissionId: string, text: string) => void;
  infoRows: readonly ModerationInfoRow[];
  crossCaseWarning: string | null;
};

function MetadataTabPanelInner({
  item,
  currentUserId,
  expertReviewNotesDraft,
  onExpertReviewNotesChange,
  infoRows,
  crossCaseWarning,
}: MetadataTabPanelProps) {
  return (
    <div className="space-y-4">
      {crossCaseWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2">
          <p className="flex items-start gap-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {crossCaseWarning}
          </p>
        </div>
      ) : null}
      <ModerationSubmissionDetailPanels
        item={item}
        currentUserId={currentUserId}
        expertReviewNotesDraft={expertReviewNotesDraft}
        onExpertReviewNotesChange={onExpertReviewNotesChange}
        infoRows={infoRows}
      />
    </div>
  );
}

export default memo(MetadataTabPanelInner);
