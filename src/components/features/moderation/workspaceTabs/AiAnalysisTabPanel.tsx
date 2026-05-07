import { lazy, memo, Suspense } from 'react';

const InstrumentConfidencePanel = lazy(
  () => import('@/components/features/moderation/InstrumentConfidencePanel'),
);
const DeclaredDetectedInstrumentPanel = lazy(
  () => import('@/components/features/moderation/DeclaredDetectedInstrumentPanel'),
);

function AiAnalysisTabPanelInner({
  recordingId,
  declaredInstruments,
}: {
  recordingId: string;
  declaredInstruments: string[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-600">
        Phân tích AI chỉ mang tính tham khảo; quyết định kiểm duyệt do chuyên gia đưa ra.
      </p>
      <Suspense fallback={<p className="text-xs text-neutral-500">Đang tải...</p>}>
        <InstrumentConfidencePanel recordingId={recordingId} />
        <DeclaredDetectedInstrumentPanel
          recordingId={recordingId}
          declaredInstruments={declaredInstruments}
        />
      </Suspense>
    </div>
  );
}

export default memo(AiAnalysisTabPanelInner);
