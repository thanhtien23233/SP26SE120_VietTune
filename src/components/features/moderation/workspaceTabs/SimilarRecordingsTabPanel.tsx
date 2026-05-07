import { lazy, memo, Suspense } from 'react';

import { useSimilarRecordings } from '@/features/moderation/hooks/useSimilarRecordings';

const SimilarRecordingsPanel = lazy(
  () => import('@/components/features/moderation/SimilarRecordingsPanel'),
);

function SimilarRecordingsTabPanelInner({ recordingId }: { recordingId: string }) {
  const { data, loading, error } = useSimilarRecordings(recordingId, true);

  return (
    <Suspense fallback={null}>
      <SimilarRecordingsPanel items={data} loading={loading} error={error} />
    </Suspense>
  );
}

export default memo(SimilarRecordingsTabPanelInner);
