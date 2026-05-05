import BackButton from '@/components/common/BackButton';

export function ModerationPageHeader({
  selectedStageInfo,
}: {
  selectedStageInfo?: { step: number; stepName: string } | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900 min-w-0">
          Kiểm duyệt bản thu
        </h1>
        {selectedStageInfo ? (
          <p className="mt-1 inline-flex rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800">
            Đang ở Bước {selectedStageInfo.step}/3: {selectedStageInfo.stepName}
          </p>
        ) : null}
      </div>
      <BackButton />
    </div>
  );
}

export default ModerationPageHeader;
