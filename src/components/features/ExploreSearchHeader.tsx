import type { KeyboardEvent, LegacyRef, ReactNode } from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { cn } from "@/utils/helpers";

export type ExploreSearchMode = "keyword" | "semantic";

export type ExploreSearchHeaderProps = {
  mode: ExploreSearchMode;
  onModeChange: (mode: ExploreSearchMode) => void;
  keywordValue: string;
  onKeywordChange: (value: string) => void;
  onKeywordSubmit: () => void;
  semanticValue: string;
  onSemanticChange: (value: string) => void;
  onSemanticSubmit: () => void;
  keywordBusy?: boolean;
  semanticBusy?: boolean;
  /** Gộp thêm class (vd. `mb-0` khi nhúng trong hero trang Chủ). */
  className?: string;
  /**
   * `home-semantic-only`: trang Chủ — chỉ ô ngữ nghĩa, không tab từ khóa, không link /semantic-search.
   */
  layout?: "default" | "home-semantic-only";
};

export default function ExploreSearchHeader({
  mode,
  onModeChange,
  keywordValue,
  onKeywordChange,
  onKeywordSubmit,
  semanticValue,
  onSemanticChange,
  onSemanticSubmit,
  keywordBusy = false,
  semanticBusy = false,
  className,
  layout = "default",
}: ExploreSearchHeaderProps) {
  const homeSemanticOnly = layout === "home-semantic-only";
  const tabKeywordRef = useRef<HTMLButtonElement | null>(null);
  const tabSemanticRef = useRef<HTMLButtonElement | null>(null);

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, m: ExploreSearchMode) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next: ExploreSearchMode = m === "keyword" ? "semantic" : "keyword";
      onModeChange(next);
      queueMicrotask(() => (next === "keyword" ? tabKeywordRef : tabSemanticRef).current?.focus());
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const next: ExploreSearchMode = m === "semantic" ? "keyword" : "semantic";
      onModeChange(next);
      queueMicrotask(() => (next === "keyword" ? tabKeywordRef : tabSemanticRef).current?.focus());
    } else if (e.key === "Home") {
      e.preventDefault();
      onModeChange("keyword");
      tabKeywordRef.current?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      onModeChange("semantic");
      tabSemanticRef.current?.focus();
    }
  };

  const tabBtn = (
    m: ExploreSearchMode,
    label: string,
    icon: ReactNode,
    ref: LegacyRef<HTMLButtonElement>,
  ) => (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={m === "keyword" ? "explore-search-tab-keyword" : "explore-search-tab-semantic"}
      aria-selected={mode === m}
      aria-controls={m === "keyword" ? "explore-search-panel-keyword" : "explore-search-panel-semantic"}
      tabIndex={mode === m ? 0 : -1}
      onClick={() => onModeChange(m)}
      onKeyDown={(e) => onTabKeyDown(e, m)}
      className={cn(
        "inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 sm:text-base",
        mode === m
          ? "bg-gradient-to-br from-white to-secondary-50 text-primary-900 shadow-md ring-2 ring-secondary-300/70"
          : "text-neutral-700 hover:bg-secondary-50/90 hover:text-neutral-900",
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-[#FFFCF5] via-cream-50/90 to-secondary-100/50 p-5 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl sm:p-6",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4",
          !homeSemanticOnly && "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <h2 className="text-lg font-semibold text-neutral-900 sm:text-xl">Tìm kiếm</h2>
        {!homeSemanticOnly ? (
          <Link
            to="/semantic-search"
            className="text-sm font-semibold text-secondary-800 underline-offset-2 hover:text-secondary-900 hover:underline"
          >
            Giao diện tìm theo nghĩa đầy đủ →
          </Link>
        ) : null}
      </div>

      {!homeSemanticOnly ? (
        <div
          className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-secondary-200/60 bg-secondary-100/60 p-1.5"
          role="tablist"
          aria-label="Chế độ tìm kiếm"
        >
          {tabBtn(
            "keyword",
            "Tìm theo từ khóa",
            <Search className="h-4 w-4 shrink-0 text-secondary-700" strokeWidth={2.25} aria-hidden />,
            tabKeywordRef,
          )}
          {tabBtn(
            "semantic",
            "Tìm theo ngữ nghĩa",
            <Sparkles className="h-4 w-4 shrink-0 text-secondary-700" strokeWidth={2.25} aria-hidden />,
            tabSemanticRef,
          )}
        </div>
      ) : null}

      {!homeSemanticOnly ? (
      <div
        id="explore-search-panel-keyword"
        role="tabpanel"
        aria-labelledby="explore-search-tab-keyword"
        hidden={mode !== "keyword"}
      >
          <p className="mb-3 text-sm font-medium text-neutral-600">
            Gõ từ khóa rồi nhấn Enter hoặc <span className="text-neutral-800">Tìm</span> — kết hợp với bộ lọc bên
            trái khi cần.
          </p>
          <div className="relative w-full min-h-[52px] rounded-xl border border-secondary-200/80 bg-gradient-to-r from-secondary-50/80 to-cream-50/90 px-3 py-2 shadow-sm transition-all focus-within:border-secondary-400 focus-within:ring-2 focus-within:ring-secondary-300/40 sm:min-h-[56px] sm:px-4 sm:py-2.5">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary-700/80 sm:left-5"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              value={keywordValue}
              onChange={(e) => onKeywordChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onKeywordSubmit();
              }}
              placeholder="Tên bài, nhạc cụ, dân tộc, mô tả…"
              className="w-full min-h-[44px] bg-transparent pl-11 pr-[7rem] text-base text-neutral-900 placeholder-neutral-500 focus:outline-none sm:pl-12 sm:pr-36"
              aria-label="Từ khóa tìm kiếm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onKeywordSubmit}
              disabled={keywordBusy}
              aria-busy={keywordBusy}
              className="absolute right-2 top-1/2 flex min-h-[40px] -translate-y-1/2 items-center gap-1.5 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-secondary-600/25 transition hover:from-secondary-400 hover:to-secondary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:px-4"
            >
              {keywordBusy ? <LoadingSpinner size="sm" /> : null}
              Tìm
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
      </div>
      ) : null}

      <div
        id="explore-search-panel-semantic"
        role={homeSemanticOnly ? undefined : "tabpanel"}
        aria-labelledby={homeSemanticOnly ? undefined : "explore-search-tab-semantic"}
        aria-label={homeSemanticOnly ? "Tìm kiếm theo ngữ nghĩa" : undefined}
        hidden={homeSemanticOnly ? false : mode !== "semantic"}
      >
          <p className="mb-3 text-sm font-medium text-neutral-600">
            Mô tả bằng câu tự nhiên; hệ thống xếp hạng bản thu theo độ khớp nghĩa trên tập đang tải (có thể kết
            hợp bộ lọc).
          </p>
          <div className="relative w-full min-h-[52px] rounded-xl border border-secondary-200/80 bg-gradient-to-r from-secondary-50/80 to-cream-50/90 px-3 py-2 shadow-sm transition-all focus-within:border-secondary-400 focus-within:ring-2 focus-within:ring-secondary-300/40 sm:min-h-[56px] sm:px-4 sm:py-2.5">
            <Sparkles
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary-600 sm:left-5"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="text"
              value={semanticValue}
              onChange={(e) => onSemanticChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSemanticSubmit();
              }}
              placeholder="Ví dụ: dân ca quan họ, đàn bầu miền Bắc, hát then Tày…"
              className="w-full min-h-[44px] bg-transparent pl-11 pr-[7.5rem] text-base text-neutral-900 placeholder-neutral-500 focus:outline-none sm:pl-12 sm:pr-40"
              aria-label="Mô tả tìm kiếm theo ngữ nghĩa"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onSemanticSubmit}
              disabled={semanticBusy || !semanticValue.trim()}
              aria-busy={semanticBusy}
              className="absolute right-2 top-1/2 flex min-h-[40px] -translate-y-1/2 items-center gap-1.5 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-secondary-600/25 transition hover:from-secondary-400 hover:to-secondary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:px-4"
            >
              {semanticBusy ? <LoadingSpinner size="sm" /> : null}
              Tìm
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
      </div>
    </div>
  );
}
