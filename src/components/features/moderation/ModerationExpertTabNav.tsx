import { BookOpen, FileText, MessageSquare, PenLine } from 'lucide-react';

export type ExpertTabId = 'review' | 'ai' | 'knowledge' | 'annotation';

const TABS: Array<{ id: ExpertTabId; label: string; icon: typeof FileText }> = [
  { id: 'review', label: 'Xem duyệt bản thu', icon: FileText },
  { id: 'ai', label: 'Giám sát phản hồi của AI', icon: MessageSquare },
  { id: 'knowledge', label: 'Kho tri thức', icon: BookOpen },
  { id: 'annotation', label: 'Chú thích học thuật', icon: PenLine },
];

const ORDER: ExpertTabId[] = ['review', 'ai', 'knowledge', 'annotation'];

export function ModerationExpertTabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: ExpertTabId;
  onTabChange: (tab: ExpertTabId) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-2 p-4 sm:p-5 lg:p-6 bg-gradient-to-b from-white to-amber-50/40"
      aria-label="Cổng chuyên gia"
      role="tablist"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`moderation-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`moderation-panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => {
            const i = ORDER.indexOf(tab.id);
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              const next = ORDER[(i + 1) % ORDER.length];
              onTabChange(next);
              document.getElementById(`moderation-tab-${next}`)?.focus();
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              const next = ORDER[(i - 1 + ORDER.length) % ORDER.length];
              onTabChange(next);
              document.getElementById(`moderation-tab-${next}`)?.focus();
            }
            if (e.key === 'Home') {
              e.preventDefault();
              onTabChange('review');
              document.getElementById('moderation-tab-review')?.focus();
            }
            if (e.key === 'End') {
              e.preventDefault();
              onTabChange('annotation');
              document.getElementById('moderation-tab-annotation')?.focus();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
            activeTab === tab.id
              ? 'bg-primary-600 text-white border-primary-600 shadow-md'
              : 'text-neutral-700 bg-white border-neutral-200/80 hover:border-primary-300 hover:bg-primary-50/80'
          }`}
        >
          <tab.icon className="w-5 h-5 flex-shrink-0" aria-hidden strokeWidth={2.5} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ModerationExpertTabNav;
