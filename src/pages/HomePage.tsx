import { Link } from "react-router-dom";
import { Upload, ArrowRight, Compass, TrendingUp, Clock, FileText, ShieldCheck, FileCheck, UserPlus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Recording,
  UserRole,
  ModerationStatus,
  VerificationStatus,
  type LocalRecording,
} from "@/types";
import { recordingService } from "@/services/recordingService";
import RecordingCard from "@/components/features/RecordingCard";
import logo from "@/components/image/VietTune logo.png";
import { useAuthStore } from "@/stores/authStore";
import { fetchVerifiedSubmissionsAsRecordings } from "@/services/researcherArchiveService";
import { getLocalRecordingFull, getLocalRecordingMetaList } from "@/services/recordingStorage";
import { migrateVideoDataToVideoData } from "@/utils/helpers";
import { convertLocalToRecording } from "@/utils/localRecordingToRecording";

function pickRecordingRows(input: unknown): Recording[] {
  if (!input || typeof input !== "object") return [];
  const root = input as Record<string, unknown>;
  if (Array.isArray(root.items)) return root.items as Recording[];
  if (Array.isArray(root.data)) return root.data as Recording[];
  if (Array.isArray(root.Items)) return root.Items as Recording[];
  if (Array.isArray(root.Data)) return root.Data as Recording[];
  const nested = root.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const d = nested as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as Recording[];
    if (Array.isArray(d.data)) return d.data as Recording[];
    if (Array.isArray(d.Items)) return d.Items as Recording[];
    if (Array.isArray(d.Data)) return d.Data as Recording[];
  }
  const nestedPascal = root.Data;
  if (nestedPascal && typeof nestedPascal === "object" && !Array.isArray(nestedPascal)) {
    const d = nestedPascal as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as Recording[];
    if (Array.isArray(d.data)) return d.data as Recording[];
    if (Array.isArray(d.Items)) return d.Items as Recording[];
    if (Array.isArray(d.Data)) return d.Data as Recording[];
  }
  return [];
}

function pickVerified(rows: Recording[]): Recording[] {
  return rows.filter((r) => {
    const row = r as unknown as Record<string, unknown>;
    const raw =
      row.verificationStatus ??
      row.VerificationStatus ??
      row.status ??
      row.Status ??
      "";

    // Accepted "verified" markers across mixed API shapes.
    if (typeof raw === "number") return raw === 2;
    const normalized = String(raw).trim().toUpperCase();
    return normalized === VerificationStatus.VERIFIED || normalized === "APPROVED" || normalized === "2";
  });
}

async function fetchApprovedLocalRecordings(): Promise<Recording[]> {
  const meta = await getLocalRecordingMetaList();
  const migrated = migrateVideoDataToVideoData(meta as LocalRecording[]);
  const approved = migrated.filter(
    (r) =>
      r.moderation &&
      typeof r.moderation === "object" &&
      "status" in r.moderation &&
      (r.moderation as { status?: string }).status === ModerationStatus.APPROVED,
  );
  const full = await Promise.all(
    approved.map((r) => getLocalRecordingFull(r.id ?? "")),
  );
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
        <div className="p-2 bg-primary-100 rounded-lg">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-neutral-800">{title}</h2>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <Link
          to={action.to}
          className="text-sm text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group p-8 rounded-xl border border-neutral-200/80 hover:border-primary-300/80 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center text-center cursor-pointer"
      style={{ backgroundColor: "#FFFCF5" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FFF7E6")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFCF5")}
    >
      <div className="p-3 bg-primary-100/90 rounded-xl w-fit mb-4 group-hover:bg-primary-200/90 transition-all duration-300 shadow-sm group-hover:shadow-md">
        <Icon className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
      </div>
      <h3 className={`text-xl font-semibold text-neutral-900 mb-3 group-hover:text-primary-600 transition-colors duration-300 ${title === "Quản lý bản thu đã được kiểm duyệt" ? "whitespace-nowrap" : ""}`}>
        {title}
      </h3>
      <p className="text-neutral-600 font-medium leading-relaxed flex-grow line-clamp-2 text-sm">{description}</p>
    </Link>
  );
}



export default function HomePage() {
  const [popularRecordings, setPopularRecordings] = useState<Recording[]>([]);
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);
  const { user } = useAuthStore();
  const isExpert = user?.role === UserRole.EXPERT;
  // Admin sees same HomePage as guest (khách vãng lai)
  const useGuestFeatures = !user || user?.role === UserRole.ADMIN || !isExpert;

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const [popular, recent] = await Promise.all([
        recordingService.getPopularRecordings(4),
        recordingService.getRecentRecordings(4),
      ]);

      const popularRows = pickVerified(pickRecordingRows(popular));
      const recentRows = pickVerified(pickRecordingRows(recent));

      if (popularRows.length > 0 || recentRows.length > 0) {
        setPopularRecordings(popularRows.slice(0, 4));
        setRecentRecordings(recentRows.slice(0, 4));
        return;
      }

      // Some environments return empty for "popular/recent"; fallback to generic recordings.
      const generic = await recordingService.getRecordings(1, 20);
      const genericRows = pickVerified(pickRecordingRows(generic)).sort(
        (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
      );
      if (genericRows.length > 0) {
        setRecentRecordings(genericRows.slice(0, 4));
        setPopularRecordings(genericRows.slice(0, 4));
        return;
      }

      // Final fallback for guest/listening UX.
      const fallback = await fetchVerifiedSubmissionsAsRecordings();
      const sorted = [...fallback].sort(
        (a, b) =>
          new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
      );
      if (sorted.length > 0) {
        setRecentRecordings(sorted.slice(0, 4));
        setPopularRecordings(sorted.slice(0, 4));
        return;
      }

      const localApproved = await fetchApprovedLocalRecordings();
      const sortedLocal = [...localApproved].sort(
        (a, b) =>
          new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
      );
      setRecentRecordings(sortedLocal.slice(0, 4));
      setPopularRecordings(sortedLocal.slice(0, 4));
    } catch (err) {
      console.error("Error fetching recordings:", err);
      // Guest fallback: keep listening experience available without login.
      try {
        const generic = await recordingService.getRecordings(1, 50);
        const genericRows = pickVerified(pickRecordingRows(generic)).sort(
          (a, b) =>
            new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        if (genericRows.length > 0) {
          setRecentRecordings(genericRows.slice(0, 4));
          setPopularRecordings(genericRows.slice(0, 4));
          return;
        }

        const fallback = await fetchVerifiedSubmissionsAsRecordings();
        const sorted = [...fallback].sort(
          (a, b) =>
            new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        if (sorted.length > 0) {
          setRecentRecordings(sorted.slice(0, 4));
          setPopularRecordings(sorted.slice(0, 4));
          return;
        }
        const localApproved = await fetchApprovedLocalRecordings();
        const sortedLocal = [...localApproved].sort(
          (a, b) =>
            new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        setRecentRecordings(sortedLocal.slice(0, 4));
        setPopularRecordings(sortedLocal.slice(0, 4));
      } catch {
        setPopularRecordings([]);
        setRecentRecordings([]);
      }
    }
  };

  // Features data: Expert → expert set; Guest / Admin (and others) → guest set
  const isAdmin = user?.role === UserRole.ADMIN;
  const features = useGuestFeatures
    ? [
      {
        icon: Compass,
        title: "Khám phá âm nhạc dân tộc",
        description:
          "Duyệt qua kho tàng âm nhạc truyền thống phong phú từ khắp mọi miền đất nước",
        to: "/explore",
      },
      ...(isAdmin
        ? [
          {
            icon: UserPlus,
            title: "Cấp tài khoản Chuyên gia",
            description:
              "Tạo tài khoản Chuyên gia mới để kiểm duyệt và xác minh bản thu âm nhạc truyền thống",
            to: "/admin/create-expert",
          },
        ]
        : [
          {
            icon: Sparkles,
            title: "Tìm theo ý nghĩa",
            description:
              "Mô tả bằng ngôn ngữ tự nhiên để tìm bản thu phù hợp theo nghĩa",
            to: "/semantic-search",
          },
        ]),
      ...(isAdmin
        ? [
          {
            icon: ShieldCheck,
            title: "Quản trị hệ thống",
            description:
              "Quản lý người dùng, phân tích bộ sưu tập và kiểm duyệt nội dung",
            to: "/admin",
          },
        ]
        : [
          {
            icon: Upload,
            title: "Đóng góp bản thu",
            description:
              "Chia sẻ bản thu âm nhạc truyền thống của bạn để cùng gìn giữ di sản văn hóa",
            to: "/upload",
          },
        ]),
    ]
    : [
      {
        icon: ShieldCheck,
        title: "Kiểm duyệt bản thu",
        description:
          "Xem xét và phê duyệt các bản thu âm nhạc truyền thống được đóng góp bởi cộng đồng",
        to: "/moderation",
      },
      {
        icon: Sparkles,
        title: "Tìm theo ý nghĩa",
        description:
          "Mô tả bằng ngôn ngữ tự nhiên để tìm bản thu phù hợp theo nghĩa",
        to: "/semantic-search",
      },
      {
        icon: FileCheck,
        title: "Quản lý bản thu đã được kiểm duyệt",
        description:
          "Quản lý và theo dõi các bản thu đã được phê duyệt trong hệ thống",
        to: "/approved-recordings",
      },
    ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Features */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 md:p-12 mb-8 transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <img
                src={logo}
                alt="VietTune Logo"
                className="h-20 w-20 object-contain rounded-2xl"
              />
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              VietTune
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-primary-700 font-medium mb-4">
              Hệ thống lưu giữ âm nhạc truyền thống Việt Nam
            </p>

            {/* Description */}
            <p className="text-neutral-800 leading-relaxed max-w-2xl mx-auto mb-8">
              Gìn giữ và lan tỏa di sản âm nhạc của 54 dân tộc Việt Nam
              <br />
              qua nền tảng chia sẻ cộng đồng với công nghệ tìm kiếm thông minh
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                to={feature.to}
              />
            ))}
          </div>

        </div>

        {/* Popular Recordings Section */}
        {popularRecordings.length > 0 && (
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl"
            style={{ backgroundColor: "#FFFCF5" }}
          >
            <SectionHeader
              icon={TrendingUp}
              title="Bản thu phổ biến"
              subtitle="Được nghe nhiều nhất trong tuần"
              action={{ label: "Xem tất cả", to: "/explore" }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularRecordings.map((recording) => (
                <RecordingCard key={recording.id} recording={recording} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Recordings Section */}
        {recentRecordings.length > 0 && (
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl"
            style={{ backgroundColor: "#FFFCF5" }}
          >
            <SectionHeader
              icon={Clock}
              title="Tải lên gần đây"
              subtitle="Bản thu mới nhất từ cộng đồng"
              action={{ label: "Xem tất cả", to: "/explore" }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentRecordings.map((recording) => (
                <RecordingCard key={recording.id} recording={recording} />
              ))}
            </div>
          </div>
        )}

        {/* Terms and Conditions Section */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 text-center transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <div className="bg-neutral-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto shadow-sm">
            <FileText className="h-6 w-6 text-neutral-600" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-neutral-900">
            Điều khoản và Điều kiện
          </h3>
          <p className="text-neutral-700 mb-6 font-medium">
            Tìm hiểu các quy định và chính sách khi sử dụng nền tảng VietTune.
          </p>
          <Link
            to="/terms"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <FileText className="h-5 w-5" strokeWidth={2.5} />
            Xem Điều khoản và Điều kiện
          </Link>
        </div>
      </div>
    </div>
  );
}