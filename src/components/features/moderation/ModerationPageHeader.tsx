import BackButton from '@/components/common/BackButton';

export function ModerationPageHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-5 sm:mb-6">
      <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900 min-w-0">
        Kiểm duyệt bản thu
      </h1>
      <BackButton />
    </div>
  );
}

export default ModerationPageHeader;
