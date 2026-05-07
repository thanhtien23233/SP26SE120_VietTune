import { memo } from 'react';

import { ModerationClaimActions } from '@/components/features/moderation/ModerationClaimActions';
import { ModerationDetailMedia } from '@/components/features/moderation/ModerationDetailMedia';
import { ModerationStageChecklistPreview } from '@/components/features/moderation/ModerationStageChecklistPreview';
import { ModerationStageProgressBar } from '@/components/features/moderation/ModerationStageProgressBar';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import type { Recording } from '@/types';

export type ModerationHeroSectionProps = {
  item: LocalRecordingMini;
  displayTitle: string;
  headerMetaLine: string;
  metadataHealthLabel: string;
  metadataHealthOk: boolean;
  claimedByCurrentUser: boolean;
  stageStep: number;
  verificationData?: ModerationVerificationData;
  currentUserId?: string;
  onAssign: (id?: string) => void | Promise<void>;
  onUnclaim: (id?: string) => void;
  onOpenWizard: (id?: string) => void;
  onRequestDelete: (id: string) => void;
  mediaSrc: string | undefined;
  isVideo: boolean;
  convertedForPlayer: (Recording & { _originalLocalData?: LocalRecordingMini }) | null;
  mediaTitle?: string;
  mediaArtist?: string;
};

export const ModerationHeroSection = memo(function ModerationHeroSection({
  item,
  displayTitle,
  headerMetaLine,
  metadataHealthLabel,
  metadataHealthOk,
  claimedByCurrentUser,
  stageStep,
  verificationData,
  currentUserId,
  onAssign,
  onUnclaim,
  onOpenWizard,
  onRequestDelete,
  mediaSrc,
  isVideo,
  convertedForPlayer,
  mediaTitle,
  mediaArtist,
}: ModerationHeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-gradient-to-br from-neutral-800 to-neutral-900 text-white shadow-md">
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="mb-1 text-lg font-semibold sm:text-xl">{displayTitle}</h2>
            <p className="text-sm text-white/80">{headerMetaLine}</p>
            <p
              className={`mt-1 text-xs ${metadataHealthOk ? 'text-emerald-200/90' : 'text-amber-200/95'}`}
            >
              {metadataHealthLabel}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:max-w-md lg:items-stretch">
            {claimedByCurrentUser ? (
              <div className="w-full rounded-xl border border-white/10 bg-white/95 p-3 text-neutral-900 shadow-sm sm:rounded-2xl sm:p-4">
                <ModerationStageProgressBar currentStep={stageStep} verificationData={verificationData} />
                <div className="mt-2 border-t border-neutral-200/80 pt-2">
                  <ModerationStageChecklistPreview
                    currentStep={stageStep}
                    verificationData={verificationData}
                  />
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/10 bg-neutral-900/95 px-4 py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none lg:px-0">
              <ModerationClaimActions
                item={item}
                currentUserId={currentUserId}
                onAssign={onAssign}
                onUnclaim={onUnclaim}
                onOpenWizard={onOpenWizard}
                onRequestDelete={onRequestDelete}
              />
            </div>
          </div>
        </div>

        <ModerationDetailMedia
          mediaSrc={mediaSrc}
          isVideo={isVideo}
          title={mediaTitle}
          artist={mediaArtist}
          recording={convertedForPlayer}
        />
      </div>
    </div>
  );
});

export default ModerationHeroSection;
