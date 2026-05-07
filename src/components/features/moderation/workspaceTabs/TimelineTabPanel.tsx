import { memo } from 'react';

import SubmissionVersionTimeline from '@/components/features/submission/SubmissionVersionTimeline';

function TimelineTabPanelInner({ submissionId }: { submissionId: string }) {
  return (
    <div className="rounded-xl border border-neutral-200/70 bg-surface-panel p-3 shadow-sm sm:p-4">
      <SubmissionVersionTimeline submissionId={submissionId} canDelete={false} />
    </div>
  );
}

export default memo(TimelineTabPanelInner);
