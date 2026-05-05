import { ArrowRight, TrendingUp, Clock, X, Music, Upload, BookOpen } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ExploreSearchHeader from '@/components/features/ExploreSearchHeader';
import RecordingCardCompact from '@/components/features/RecordingCardCompact';
import logo from '@/components/image/viettune_logo_img';
import { recordingService } from '@/services/recordingService';
import { getLocalRecordingFull, getLocalRecordingMetaList } from '@/services/recordingStorage';
import { fetchVerifiedSubmissionsAsRecordings } from '@/services/researcherArchiveService';
import { Recording, ModerationStatus, VerificationStatus, type LocalRecording } from '@/types';
import { migrateVideoDataToVideoData } from '@/utils/helpers';
import { convertLocalToRecording } from '@/utils/localRecordingToRecording';
import { SURFACE_PANEL_GRADIENT } from '@/utils/surfaceTokens';

const MemoRecordingCardCompact = memo(RecordingCardCompact);

/** Khối nội dung cùng họ với Explore (PLAN-homepage-explore Phase 1). */
const exploreLikePanel = SURFACE_PANEL_GRADIENT;

/** Hiển thị 2 panel lưới bản thu (phổ biến / mới). Đặt `true` nếu muốn bật lại + gọi API. */
const SHOW_HOME_RECORDING_HIGHLIGHTS = false;

const FEATURE_CARDS = [
  { icon: Music, title: 'Khám phá bản thu', subtitle: 'Nghe và tìm kiếm bản ghi', to: '/explore' },
  { icon: Upload, title: 'Đóng góp bản thu', subtitle: 'Chia sẻ di sản của bạn', to: '/upload' },
  { icon: BookOpen, title: 'Tra cứu tri thức', subtitle: 'Khám phá kho tri thức', to: '/chatbot' },
];

function asObject(input: unknown): Record<string, unknown> | null {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

function pickRecordingRows(input: unknown): Recording[] {
  const root = asObject(input);
  if (!root) return [];
  if (Array.isArray(root.items)) return root.items as Recording[];
  if (Array.isArray(root.data)) return root.data as Recording[];
  if (Array.isArray(root.Items)) return root.Items as Recording[];
  if (Array.isArray(root.Data)) return root.Data as Recording[];
  const nested = root.data;
  const d = asObject(nested);
  if (d) {
    if (Array.isArray(d.items)) return d.items as Recording[];
    if (Array.isArray(d.data)) return d.data as Recording[];
    if (Array.isArray(d.Items)) return d.Items as Recording[];
    if (Array.isArray(d.Data)) return d.Data as Recording[];
  }
  const nestedPascal = root.Data;
  const dPascal = asObject(nestedPascal);
  if (dPascal) {
    const d = dPascal;
    if (Array.isArray(d.items)) return d.items as Recording[];
    if (Array.isArray(d.data)) return d.data as Recording[];
    if (Array.isArray(d.Items)) return d.Items as Recording[];
    if (Array.isArray(d.Data)) return d.Data as Recording[];
  }
  return [];
}

function pickVerified(rows: Recording[]): Recording[] {
  return rows.filter((r) => {
    const row = asObject(r) ?? {};
    const raw = row.verificationStatus ?? row.VerificationStatus ?? row.status ?? row.Status ?? '';

    // Accepted "verified" markers across mixed API shapes.
    if (typeof raw === 'number') return raw === 2;
    const normalized = String(raw).trim().toUpperCase();
    return (
      normalized === VerificationStatus.VERIFIED || normalized === 'APPROVED' || normalized === '2'
    );
  });
}

async function fetchApprovedLocalRecordings(): Promise<Recording[]> {
  const meta = await getLocalRecordingMetaList();
  const migrated = migrateVideoDataToVideoData(meta as LocalRecording[]);
  const approved = migrated.filter(
    (r) =>
      r.moderation &&
      typeof r.moderation === 'object' &&
      'status' in r.moderation &&
      (r.moderation as { status?: string }).status === ModerationStatus.APPROVED,
  );
  const full = await Promise.all(approved.map((r) => getLocalRecordingFull(r.id ?? '')));
  const locals = full.filter((r): r is LocalRecording => r != null);
  return Promise.all(locals.map((r) => convertLocalToRecording(r)));
}

// Section Header Component
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-primary-100/90 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/40">
          <Icon className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-neutral-800">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex items-center gap-1 text-sm font-semibold text-secondary-800 transition-colors hover:text-secondary-900"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [popularRecordings, setPopularRecordings] = useState<Recording[]>([]);
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);
  const [semanticInput, setSemanticInput] = useState('');
  const [isSimulatingSearch, setIsSimulatingSearch] = useState(false);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const simulateTimerRef = useRef<number | null>(null);
  const loginCtaRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (SHOW_HOME_RECORDING_HIGHLIGHTS) {
      void fetchRecordings();
    }
    return () => {
      if (simulateTimerRef.current) {
        window.clearTimeout(simulateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isGatewayModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    loginCtaRef.current?.focus();
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsGatewayModalOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onEsc);
    };
  }, [isGatewayModalOpen]);

  /** Giữ luồng marketing: không gọi API; mở modal đăng nhập sau delay. */
  const handleHomeSemanticSubmit = useCallback(() => {
    if (isSimulatingSearch) return;
    if (!semanticInput.trim()) return;
    setIsSimulatingSearch(true);
    if (simulateTimerRef.current) {
      window.clearTimeout(simulateTimerRef.current);
    }
    simulateTimerRef.current = window.setTimeout(() => {
      setIsSimulatingSearch(false);
      setIsGatewayModalOpen(true);
    }, 1500);
  }, [isSimulatingSearch, semanticInput]);

  const fetchRecordings = async () => {
    try {
      const [popular, recent] = await Promise.all([
        recordingService.getPopularRecordings(6),
        recordingService.getRecentRecordings(6),
      ]);

      const popularRows = pickVerified(pickRecordingRows(popular));
      const recentRows = pickVerified(pickRecordingRows(recent));

      if (popularRows.length > 0 || recentRows.length > 0) {
        setPopularRecordings(popularRows.slice(0, 6));
        setRecentRecordings(recentRows.slice(0, 6));
        return;
      }

      // Some environments return empty for "popular/recent"; fallback to generic recordings.
      const generic = await recordingService.getRecordings(1, 20);
      const genericRows = pickVerified(pickRecordingRows(generic)).sort(
        (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
      );
      if (genericRows.length > 0) {
        setRecentRecordings(genericRows.slice(0, 6));
        setPopularRecordings(genericRows.slice(0, 6));
        return;
      }

      // Final fallback for guest/listening UX.
      const fallback = await fetchVerifiedSubmissionsAsRecordings();
      const sorted = [...fallback].sort(
        (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
      );
      if (sorted.length > 0) {
        setRecentRecordings(sorted.slice(0, 6));
        setPopularRecordings(sorted.slice(0, 6));
        return;
      }

      const localApproved = await fetchApprovedLocalRecordings();
      const sortedLocal = [...localApproved].sort(
        (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
      );
      setRecentRecordings(sortedLocal.slice(0, 6));
      setPopularRecordings(sortedLocal.slice(0, 6));
    } catch (err) {
      console.error('Error fetching recordings:', err);
      // Guest fallback: keep listening experience available without login.
      try {
        const generic = await recordingService.getRecordings(1, 50);
        const genericRows = pickVerified(pickRecordingRows(generic)).sort(
          (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        if (genericRows.length > 0) {
          setRecentRecordings(genericRows.slice(0, 6));
          setPopularRecordings(genericRows.slice(0, 6));
          return;
        }

        const fallback = await fetchVerifiedSubmissionsAsRecordings();
        const sorted = [...fallback].sort(
          (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        if (sorted.length > 0) {
          setRecentRecordings(sorted.slice(0, 6));
          setPopularRecordings(sorted.slice(0, 6));
          return;
        }
        const localApproved = await fetchApprovedLocalRecordings();
        const sortedLocal = [...localApproved].sort(
          (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        setRecentRecordings(sortedLocal.slice(0, 6));
        setPopularRecordings(sortedLocal.slice(0, 6));
      } catch {
        setPopularRecordings([]);
        setRecentRecordings([]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section with Features */}
        <section className="mx-auto max-w-[1040px] bg-surface-panel rounded-2xl shadow-lg border border-secondary-200/50 px-8 sm:px-12 py-12 sm:py-16 mb-10">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <img
                src={logo}
                alt="VietTune Logo"
                className="h-16 w-16 object-contain rounded-2xl shadow-sm"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={64}
                height={64}
              />
            </div>

            <p className="text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-primary-600/80 mb-3">
              Kho tri thức âm nhạc dân tộc
            </p>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold text-neutral-900 mb-5 leading-tight">
              VietTune
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-primary-700 font-semibold mb-5">
              Hệ thống lưu giữ âm nhạc truyền thống Việt Nam
            </p>

            {/* Description */}
            <p className="text-neutral-600 leading-relaxed max-w-2xl mx-auto text-center text-base md:text-lg mb-0">
              Gìn giữ và lan tỏa di sản âm nhạc của 54 dân tộc Việt Nam
              <br />
              qua nền tảng chia sẻ cộng đồng với công nghệ tìm kiếm thông minh
            </p>

            {/* Search Bar Block */}
            <div className="mt-8 rounded-xl border border-neutral-200/70 shadow-sm overflow-hidden text-left">
              <ExploreSearchHeader
                layout="home-semantic-only"
                className="mb-0"
                mode="semantic"
                onModeChange={() => {}}
                keywordValue=""
                onKeywordChange={() => {}}
                onKeywordSubmit={() => {}}
                semanticValue={semanticInput}
                onSemanticChange={setSemanticInput}
                onSemanticSubmit={handleHomeSemanticSubmit}
                semanticBusy={isSimulatingSearch}
              />
            </div>

            {/* Feature Cards Row */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
              {FEATURE_CARDS.map((card, idx) => (
                <Link
                  key={idx}
                  to={card.to}
                  className="group flex flex-col items-start rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary-300/70 hover:bg-cream-50/60 hover:shadow-md"
                >
                  <div className="mb-3 rounded-lg bg-primary-50 p-2.5 transition-transform duration-200 group-hover:scale-110">
                    <card.icon className="h-5 w-5 text-primary-500 transition-colors duration-200 group-hover:text-primary-600" strokeWidth={2.5} />
                  </div>
                  <h3 className="mb-1 text-base font-bold text-neutral-800 transition-colors duration-150 group-hover:text-primary-700">
                    {card.title}
                  </h3>
                  <p className="text-xs font-medium text-neutral-500">
                    {card.subtitle}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Quote Separator Block */}
        <section className="py-10 sm:py-12 text-center">
          <blockquote className="italic text-neutral-500 text-lg max-w-[640px] mx-auto leading-relaxed px-4">
            "Âm nhạc là ký ức của dân tộc, là nhịp cầu kết nối quá khứ và tương lai."
          </blockquote>
          <div className="mt-4 text-primary-400 text-2xl" aria-hidden="true">
            ❀
          </div>
        </section>

        {/* Popular / Recent grids — tắt mặc định (SHOW_HOME_RECORDING_HIGHLIGHTS) */}
        {SHOW_HOME_RECORDING_HIGHLIGHTS && popularRecordings.length > 0 && (
          <div className={`${exploreLikePanel} mb-8 p-8`}>
            <SectionHeader
              icon={TrendingUp}
              title="Bản thu phổ biến"
              subtitle="Được nghe nhiều nhất trong tuần"
              action={{ label: 'Xem tất cả', to: '/explore' }}
            />

            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {popularRecordings
                .filter((r) => r.id)
                .map((recording) => (
                  <li key={recording.id} className="min-w-0">
                    <MemoRecordingCardCompact
                      recording={recording}
                      to={`/recordings/${recording.id}`}
                      linkState={{ from: '/' }}
                    />
                  </li>
                ))}
            </ul>
          </div>
        )}

        {SHOW_HOME_RECORDING_HIGHLIGHTS && recentRecordings.length > 0 && (
          <div className={`${exploreLikePanel} mb-8 p-8`}>
            <SectionHeader
              icon={Clock}
              title="Tải lên gần đây"
              subtitle="Bản thu mới nhất từ cộng đồng"
              action={{ label: 'Xem tất cả', to: '/explore' }}
            />

            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentRecordings
                .filter((r) => r.id)
                .map((recording) => (
                  <li key={recording.id} className="min-w-0">
                    <MemoRecordingCardCompact
                      recording={recording}
                      to={`/recordings/${recording.id}`}
                      linkState={{ from: '/' }}
                    />
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* Login/Register Gateway Modal */}
      {isGatewayModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/30 p-4 backdrop-blur-[1px]"
          onClick={() => setIsGatewayModalOpen(false)}
          role="presentation"
        >
          <div
            className={`${SURFACE_PANEL_GRADIENT} relative w-full max-w-[640px] rounded-2xl shadow-lg animate-in fade-in zoom-in-95 duration-200 p-8 text-center`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gateway-modal-title"
            aria-describedby="gateway-modal-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setIsGatewayModalOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-neutral-600/70 transition-colors hover:bg-neutral-100/80 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <h3
              id="gateway-modal-title"
              className="mx-auto mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl"
            >
              Yêu cầu đăng nhập để tiếp tục
            </h3>
            <p
              id="gateway-modal-desc"
              className="mx-auto max-w-[520px] font-medium leading-relaxed text-neutral-700"
            >
              Đã tìm thấy nội dung phù hợp. Đăng nhập để xem chi tiết bản ghi và truy cập kho lưu trữ
              VietTune.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                ref={loginCtaRef}
                type="button"
                onClick={() => {
                  setIsGatewayModalOpen(false);
                  navigate('/login');
                }}
                className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 sm:w-auto"
              >
                Đăng nhập
              </button>
              <Link
                to="/register"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-secondary-300/70 bg-secondary-50 px-5 py-3 font-semibold text-primary-900 shadow-sm transition-colors hover:bg-secondary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 sm:w-auto"
              >
                Tạo tài khoản
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
