import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Pause, Play } from "lucide-react";
import type { Recording } from "@/types";
import logo from "@/components/image/VietTune logo.png";
import { cn, formatDuration } from "@/utils/helpers";

export type RecordingCardCompactProps = {
  recording: Recording;
  to: string;
  linkState?: Record<string, unknown>;
  /** Short provenance hint under stats (e.g. "Search API"). */
  sourceLabel?: string;
  className?: string;
};

export default function RecordingCardCompact({
  recording,
  to,
  linkState,
  sourceLabel,
  className,
}: RecordingCardCompactProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const src = (recording.audioUrl ?? "").trim();

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    return () => {
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || !src) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play().catch(() => {
        setPlaying(false);
      });
    }
  };

  const ethnicityLabel =
    typeof recording.ethnicity === "object" && recording.ethnicity !== null
      ? recording.ethnicity.nameVietnamese || recording.ethnicity.name
      : "";

  const instrumentBadges = (recording.instruments ?? [])
    .map((i) => (i.nameVietnamese || i.name || "").trim())
    .filter(Boolean)
    .slice(0, 2);

  const durationSec = Number.isFinite(recording.duration) ? recording.duration : 0;
  const titleForAlt = recording.titleVietnamese || recording.title || "Bản thu";

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-secondary-200/70 bg-gradient-to-b from-[#FFFCF5] via-cream-50/80 to-secondary-50/45 shadow-md transition-all duration-300",
        "hover:border-secondary-300/80 hover:shadow-lg",
        "focus-within:ring-2 focus-within:ring-secondary-400 focus-within:ring-offset-2 focus-within:ring-offset-cream-50",
        className,
      )}
    >
      {src ? <audio ref={audioRef} src={src} preload="metadata" className="hidden" /> : null}

      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-neutral-100">
        {recording.coverImage ? (
          <img
            src={recording.coverImage}
            alt={titleForAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <img src={logo} alt="" className="h-16 w-16 object-contain opacity-35" aria-hidden />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900/35 via-transparent to-transparent" />
        <button
          type="button"
          onClick={togglePlay}
          disabled={!src}
          className={cn(
            "absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition",
            "hover:bg-primary-500 hover:scale-105 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700",
            "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100",
          )}
          aria-label={playing ? "Tạm dừng" : "Phát"}
        >
          {playing ? <Pause className="h-5 w-5" strokeWidth={2.25} /> : <Play className="ml-0.5 h-5 w-5" strokeWidth={2.25} />}
        </button>
        {durationSec > 0 ? (
          <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(durationSec)}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-bold leading-snug text-neutral-900">
          {recording.titleVietnamese || recording.title || "Không có tiêu đề"}
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {ethnicityLabel ? (
            <span className="inline-flex max-w-full items-center rounded-lg bg-gradient-to-r from-primary-100/95 to-secondary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-800 ring-1 ring-secondary-200/50">
              <span className="truncate">{ethnicityLabel}</span>
            </span>
          ) : null}
          {instrumentBadges.map((label) => (
            <span
              key={label}
              className="inline-flex max-w-[10rem] items-center rounded-lg border border-secondary-200/80 bg-secondary-50/95 px-2 py-0.5 text-[11px] font-medium text-neutral-800"
            >
              <span className="truncate">{label}</span>
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
            <span className="sr-only">Lượt xem: </span>
            {recording.viewCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
            <span className="sr-only">Lượt tải: </span>
            {recording.downloadCount ?? 0}
          </span>
          {sourceLabel ? <span className="truncate text-neutral-400">{sourceLabel}</span> : null}
        </div>

        <Link
          to={to}
          state={linkState}
          className="mt-1 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-secondary-300/70 bg-gradient-to-br from-secondary-100 to-secondary-200/75 px-3 py-2 text-center text-xs font-semibold text-primary-900 shadow-sm transition hover:from-secondary-200 hover:to-secondary-300/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400"
        >
          Xem chi tiết
        </Link>
      </div>
    </article>
  );
}
