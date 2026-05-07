import { ModerationStage, moderationStageLabelVi } from '@/features/moderation/constants/moderationStage';

const CONFIG: Record<ModerationStage, { className: string; ariaShort: string }> = {
  [ModerationStage.SCREENING]: {
    ariaShort: 'Giai đoạn sàng lọc',
    className: 'bg-blue-50 text-blue-900 border-blue-200/90',
  },
  [ModerationStage.VERIFICATION]: {
    ariaShort: 'Giai đoạn xác minh',
    className: 'bg-amber-50 text-amber-900 border-amber-200/90',
  },
  [ModerationStage.PUBLICATION]: {
    ariaShort: 'Giai đoạn phê duyệt',
    className: 'bg-emerald-50 text-emerald-900 border-emerald-200/90',
  },
};

/** Compact Review 3 stage pill for queue rows and summaries. */
export default function ModerationStageBadge({ stage }: { stage: ModerationStage }) {
  const { ariaShort, className } = CONFIG[stage];
  const label = moderationStageLabelVi(stage);
  return (
    <span
      aria-label={`Vị trí quy trình: ${ariaShort}`}
      className={`inline-flex w-fit items-center rounded border px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
