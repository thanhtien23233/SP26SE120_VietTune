import { lazy, memo, Suspense, useEffect, useState } from 'react';

import EmbargoTabPanel from '@/components/features/moderation/workspaceTabs/EmbargoTabPanel';
import MetadataTabPanel from '@/components/features/moderation/workspaceTabs/MetadataTabPanel';
import TimelineTabPanel from '@/components/features/moderation/workspaceTabs/TimelineTabPanel';
import type {
  ModerationInfoRow,
  ModerationWorkspaceTabId,
} from '@/features/moderation/hooks/useModerationDetailViewModel';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';

const SimilarRecordingsTabPanel = lazy(
  () => import('@/components/features/moderation/workspaceTabs/SimilarRecordingsTabPanel'),
);
const AiAnalysisTabPanel = lazy(
  () => import('@/components/features/moderation/workspaceTabs/AiAnalysisTabPanel'),
);

const TAB_LABELS: Record<ModerationWorkspaceTabId, string> = {
  metadata: 'Metadata',
  similar: 'Tương tự',
  ai: 'AI',
  timeline: 'Lịch sử',
  embargo: 'Embargo',
};

export type ModerationWorkspaceTabsProps = {
  item: LocalRecordingMini;
  currentUserId?: string;
  expertReviewNotesDraft: string;
  onExpertReviewNotesChange: (submissionId: string, text: string) => void;
  infoRows: readonly ModerationInfoRow[];
  crossCaseWarning: string | null;
  tabVisibility: Record<ModerationWorkspaceTabId, boolean>;
  defaultTab: ModerationWorkspaceTabId;
  canEditEmbargo: boolean;
  recordingId: string;
  declaredInstruments: string[];
};

function visibleTabs(visibility: Record<ModerationWorkspaceTabId, boolean>): ModerationWorkspaceTabId[] {
  const order: ModerationWorkspaceTabId[] = ['metadata', 'similar', 'ai', 'timeline', 'embargo'];
  return order.filter((id) => visibility[id]);
}

export const ModerationWorkspaceTabs = memo(function ModerationWorkspaceTabs({
  item,
  currentUserId,
  expertReviewNotesDraft,
  onExpertReviewNotesChange,
  infoRows,
  crossCaseWarning,
  tabVisibility,
  defaultTab,
  canEditEmbargo,
  recordingId,
  declaredInstruments,
}: ModerationWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<ModerationWorkspaceTabId>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, recordingId]);

  useEffect(() => {
    if (!tabVisibility[activeTab]) {
      setActiveTab(defaultTab);
    }
  }, [activeTab, defaultTab, tabVisibility]);

  const tabs = visibleTabs(tabVisibility);

  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-surface-panel/80 shadow-sm">
      <div className="border-b border-neutral-200/80 px-1 pt-1 sm:px-2">
        <div
          role="tablist"
          aria-label="Không gian làm việc kiểm duyệt"
          className="-mx-1 flex gap-0.5 overflow-x-auto overscroll-x-contain px-1 pb-1 scrollbar-thin sm:flex-wrap sm:overflow-visible"
        >
          {tabs.map((id) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`moderation-tab-${id}`}
                aria-controls={`moderation-tabpanel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                  selected
                    ? 'bg-white text-neutral-900 ring-1 ring-neutral-200/90 ring-b-0'
                    : 'text-neutral-500 hover:bg-neutral-100/80 hover:text-neutral-800'
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {tabs.map((id) => {
          if (id !== activeTab) return null;
          return (
            <div
              key={id}
              role="tabpanel"
              id={`moderation-tabpanel-${id}`}
              aria-labelledby={`moderation-tab-${id}`}
            >
              {id === 'metadata' ? (
                <MetadataTabPanel
                  item={item}
                  currentUserId={currentUserId}
                  expertReviewNotesDraft={expertReviewNotesDraft}
                  onExpertReviewNotesChange={onExpertReviewNotesChange}
                  infoRows={infoRows}
                  crossCaseWarning={crossCaseWarning}
                />
              ) : null}
              {id === 'similar' ? (
                <Suspense fallback={<p className="text-xs text-neutral-500">Đang tải...</p>}>
                  <SimilarRecordingsTabPanel recordingId={recordingId} />
                </Suspense>
              ) : null}
              {id === 'ai' ? (
                <Suspense fallback={<p className="text-xs text-neutral-500">Đang tải...</p>}>
                  <AiAnalysisTabPanel recordingId={recordingId} declaredInstruments={declaredInstruments} />
                </Suspense>
              ) : null}
              {id === 'timeline' ? <TimelineTabPanel submissionId={recordingId} /> : null}
              {id === 'embargo' ? (
                <EmbargoTabPanel recordingId={recordingId} canEdit={canEditEmbargo} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ModerationWorkspaceTabs;
