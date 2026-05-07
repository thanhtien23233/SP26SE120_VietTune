import { memo } from 'react';

import EmbargoSection from '@/components/features/moderation/EmbargoSection';

function EmbargoTabPanelInner({ recordingId, canEdit }: { recordingId: string; canEdit: boolean }) {
  return <EmbargoSection recordingId={recordingId} canEdit={canEdit} />;
}

export default memo(EmbargoTabPanelInner);
