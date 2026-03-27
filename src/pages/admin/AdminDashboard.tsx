import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import BackButton from "@/components/common/BackButton";
import { Users, BarChart3, Shield, ChevronRight, ChevronDown, User as UserIcon, Music, MapPin, FileWarning, UserMinus, Trash2, FileEdit } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types";
import { USER_ROLE_NAMES } from "@/config/constants";
import { migrateVideoDataToVideoData } from "@/utils/helpers";
import type { LocalRecording } from "@/types";
import { ModerationStatus } from "@/types";
import { notify } from "@/stores/notificationStore";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import { getItem, setItem } from "@/services/storageService";
import { getLocalRecordingMetaList, removeLocalRecording } from "@/services/recordingStorage";
import { accountDeletionService } from "@/services/accountDeletionService";
import { recordingRequestService } from "@/services/recordingRequestService";
import type { ExpertAccountDeletionRequest, DeleteRecordingRequest, EditRecordingRequest } from "@/types";

type TabId = "users" | "analytics" | "moderation" | "expertDeletion" | "recordRequests";

interface AggregatedUser {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  role: string;
  contributionCount: number;
  approvedCount: number;
  rejectedCount: number;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: UserRole.CONTRIBUTOR, label: "Người đóng góp" },
  { value: UserRole.EXPERT, label: "Chuyên gia" },
  { value: UserRole.RESEARCHER, label: "Nhà nghiên cứu" },
];

const ROLE_NAMES_VI: Record<string, string> = {
  [UserRole.ADMIN]: "Quản trị viên",
  ADMIN: "Quản trị viên",
  MODERATOR: "Điều hành viên",
  [UserRole.RESEARCHER]: "Nhà nghiên cứu",
  [UserRole.CONTRIBUTOR]: "Người đóng góp",
  [UserRole.EXPERT]: "Chuyên gia",
  [UserRole.USER]: "Người dùng",
};

function getRoleNameVi(role: string): string {
  const normalized = role.trim();
  const lowerRoleAlias: Record<string, string> = {
    admin: "Quản trị viên",
    administrator: "Quản trị viên",
    researcher: "Nhà nghiên cứu",
    contributor: "Người đóng góp",
    expert: "Chuyên gia",
  };

  return (
    ROLE_NAMES_VI[normalized] ??
    ROLE_NAMES_VI[normalized.toUpperCase()] ??
    lowerRoleAlias[normalized.toLowerCase()] ??
    normalized
  );
}

const DELETE_ACTION = "__DELETE__" as const;

function isClickOnScrollbar(event: MouseEvent): boolean {
  const w = window.innerWidth - document.documentElement.clientWidth;
  return w > 0 && event.clientX >= document.documentElement.clientWidth;
}

function RoleSelectDropdown({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const outDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const outMenu = menuRef.current && !menuRef.current.contains(target);
      if (outDropdown && (menuRef.current ? outMenu : true)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen]);

  const label =
    ROLE_OPTIONS.find((o) => o.value === value)?.label ??
    getRoleNameVi((USER_ROLE_NAMES as Record<string, string>)[value] ?? value);

  return (
    <div ref={dropdownRef} className="relative min-w-[140px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400/80 rounded-full focus:outline-none focus:border-primary-500 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-md ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        style={{ backgroundColor: "#FFFCF5" }}
      >
        <span className={value ? "text-neutral-900 font-medium" : "text-neutral-400"}>{label}</span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: "#FFFCF5",
              position: "absolute",
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: Math.max(menuRect.width, 180),
              zIndex: 40,
            }}
          >
            <div
              className="max-h-60 overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#9B2C2C rgba(255, 255, 255, 0.3)",
              }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${value === opt.value
                    ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium"
                    : "text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onChange(DELETE_ACTION);
                  setIsOpen(false);
                }}
                className="w-full px-5 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 cursor-pointer"
              >
                Xóa khỏi hệ thống
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Dropdown UI/UX aligned with UploadMusic.tsx: pill trigger, rounded-2xl panel, primary gradient selected, hover primary-100. */
function ExpertSelectDropdown({
  options,
  value,
  onChange,
  placeholder = " -- Chọn Chuyên gia -- ",
  disabled,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const outDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const outMenu = menuRef.current && !menuRef.current.contains(target);
      if (outDropdown && (menuRef.current ? outMenu : true)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen]);

  const selectedLabel = value ? options.find((o) => o.id === value)?.label ?? placeholder : placeholder;

  return (
    <div ref={dropdownRef} className="relative min-w-[180px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400/80 rounded-full focus:outline-none focus:border-primary-500 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-md ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        style={{ backgroundColor: "#FFFCF5" }}
      >
        <span className={value ? "text-neutral-900 font-medium" : "text-neutral-400"}>{selectedLabel}</span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: "#FFFCF5",
              position: "absolute",
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: Math.max(menuRect.width, 200),
              zIndex: 40,
            }}
          >
            <div className="max-h-60 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#9B2C2C rgba(255, 255, 255, 0.3)" }}>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${!value ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium" : "text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700"}`}
              >
                {placeholder}
              </button>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${value === opt.id ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium" : "text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<TabId>("users");
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [usersOverrides, setUsersOverrides] = useState<Record<string, { role?: string; username?: string; fullName?: string }>>({});
  const [removeTarget, setRemoveTarget] = useState<{ id: string; title?: string } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; username: string } | null>(null);
  const [expertDeletionApproveTarget, setExpertDeletionApproveTarget] = useState<ExpertAccountDeletionRequest | null>(null);
  const [pendingExpertDeletions, setPendingExpertDeletions] = useState<ExpertAccountDeletionRequest[]>([]);
  const [deleteRecordingRequests, setDeleteRecordingRequests] = useState<DeleteRecordingRequest[]>([]);
  const [editRecordingRequests, setEditRecordingRequests] = useState<EditRecordingRequest[]>([]);
  const [forwardDeleteExpertId, setForwardDeleteExpertId] = useState<{ requestId: string; expertId: string } | null>(null);
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const metaList = await getLocalRecordingMetaList();
      const migrated = migrateVideoDataToVideoData(metaList as LocalRecording[]);
      setRecordings(migrated);
    } catch {
      setRecordings([]);
    }
    try {
      const oRaw = getItem("users_overrides");
      const o = oRaw ? (JSON.parse(oRaw) as Record<string, { role?: string; username?: string; fullName?: string }>) : {};
      setUsersOverrides(o);
    } catch {
      setUsersOverrides({});
    }
    try {
      const dRaw = getItem("admin_deleted_user_ids");
      const arr = dRaw ? (JSON.parse(dRaw) as string[]) : [];
      setDeletedUserIds(new Set(arr));
    } catch {
      setDeletedUserIds(new Set());
    }
    setPendingExpertDeletions(accountDeletionService.getPendingExpertDeletionRequests());
    recordingRequestService.getDeleteRecordingRequests().then(setDeleteRecordingRequests);
    recordingRequestService.getEditRecordingRequests().then(setEditRecordingRequests);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const demoUsers: AggregatedUser[] = [
    { id: "contrib_demo", username: "contributor_demo", role: UserRole.CONTRIBUTOR, contributionCount: 0, approvedCount: 0, rejectedCount: 0 },
    { id: "expert_a", username: "expertA", role: UserRole.EXPERT, contributionCount: 0, approvedCount: 0, rejectedCount: 0 },
    { id: "expert_b", username: "expertB", role: UserRole.EXPERT, contributionCount: 0, approvedCount: 0, rejectedCount: 0 },
    { id: "expert_c", username: "expertC", role: UserRole.EXPERT, contributionCount: 0, approvedCount: 0, rejectedCount: 0 },
    { id: "admin_demo", username: "admin_demo", role: UserRole.ADMIN, contributionCount: 0, approvedCount: 0, rejectedCount: 0 },
  ];

  const uploaderCounts: Record<string, { total: number; approved: number; rejected: number }> = {};
  recordings.forEach((r) => {
    const uid = (r.uploader as { id?: string })?.id ?? "anonymous";
    if (!uploaderCounts[uid]) uploaderCounts[uid] = { total: 0, approved: 0, rejected: 0 };
    uploaderCounts[uid].total += 1;
    const st = (r.moderation as { status?: string })?.status;
    if (st === ModerationStatus.APPROVED) uploaderCounts[uid].approved += 1;
    else if (st === ModerationStatus.REJECTED || st === ModerationStatus.TEMPORARILY_REJECTED) uploaderCounts[uid].rejected += 1;
  });

  const aggregated: AggregatedUser[] = demoUsers.map((u) => {
    const counts = uploaderCounts[u.id] ?? { total: 0, approved: 0, rejected: 0 };
    const override = usersOverrides[u.id];
    const overRole = override?.role;
    const overUsername = override?.username;
    const overFullName = override?.fullName;
    return {
      ...u,
      username: overUsername ?? u.username,
      fullName: overFullName ?? u.fullName,
      role: overRole ?? u.role,
      contributionCount: counts.total,
      approvedCount: counts.approved,
      rejectedCount: counts.rejected,
    };
  });

  const uploaderIds = new Set(recordings.map((r) => (r.uploader as { id?: string })?.id).filter(Boolean));
  const extraUsers: AggregatedUser[] = [];
  uploaderIds.forEach((id) => {
    if (id && !demoUsers.some((d) => d.id === id)) {
      const r0 = recordings.find((r) => (r.uploader as { id?: string })?.id === id);
      const u = r0?.uploader as { id?: string; username?: string; email?: string; fullName?: string; role?: string };
      const counts = uploaderCounts[id] ?? { total: 0, approved: 0, rejected: 0 };
      const override = usersOverrides[id];
      const overRole = override?.role;
      const overUsername = override?.username;
      const overFullName = override?.fullName;
      extraUsers.push({
        id: id!,
        username: overUsername ?? u?.username ?? id,
        email: u?.email,
        fullName: overFullName ?? u?.fullName,
        role: overRole ?? u?.role ?? UserRole.USER,
        contributionCount: counts.total,
        approvedCount: counts.approved,
        rejectedCount: counts.rejected,
      });
    }
  });
  const allUsers = [...aggregated.filter((u) => u.role !== UserRole.ADMIN), ...extraUsers].filter(
    (u) => !deletedUserIds.has(u.id)
  );

  const ethnicityCounts: Record<string, number> = {};
  const regionCounts: Record<string, number> = {};
  const monthlyCounts: Record<string, number> = {};
  recordings.forEach((r) => {
    const rec = r as LocalRecording & { culturalContext?: { ethnicity?: string; region?: string }; basicInfo?: { genre?: string } };
    const eth = rec.culturalContext?.ethnicity ?? rec.basicInfo?.genre ?? "Khác";
    ethnicityCounts[eth] = (ethnicityCounts[eth] ?? 0) + 1;
    const reg = rec.culturalContext?.region ?? "Chưa xác định";
    regionCounts[reg] = (regionCounts[reg] ?? 0) + 1;
    const up = r.uploadedDate ? new Date(r.uploadedDate) : null;
    if (up) {
      const key = `${up.getFullYear()}-${String(up.getMonth() + 1).padStart(2, "0")}`;
      monthlyCounts[key] = (monthlyCounts[key] ?? 0) + 1;
    }
  });

  const byUploaderNewestFirst = [...recordings]
    .filter((r) => (r.uploader as { id?: string })?.id)
    .sort((a, b) => {
      const da = a.uploadedDate ? new Date(a.uploadedDate).getTime() : 0;
      const db = b.uploadedDate ? new Date(b.uploadedDate).getTime() : 0;
      return db - da;
    });
  const latestUsernameByUploader: Record<string, string> = {};
  byUploaderNewestFirst.forEach((r) => {
    const uid = (r.uploader as { id?: string })?.id;
    const uname = (r.uploader as { username?: string })?.username;
    if (uid && uname !== undefined && uname !== null && !(uid in latestUsernameByUploader)) {
      latestUsernameByUploader[uid] = String(uname);
    }
  });

  const prolific = [...allUsers]
    .filter((u) => u.role === UserRole.CONTRIBUTOR || u.role === UserRole.USER)
    .sort((a, b) => b.contributionCount - a.contributionCount)
    .slice(0, 10);
  const gapEthnicities = ["Kinh", "Tày", "Thái", "Mường", "Khmer", "H'Mông", "Nùng", "Dao", "Gia Rai", "Ê Đê", "Ba Na", "Chăm", "Khác"];
  const gapData = gapEthnicities.map((e) => ({ name: e, count: ethnicityCounts[e] ?? 0 }));

  const handleAssignRole = (userId: string, newRole: string) => {
    try {
      const oRaw = getItem("users_overrides");
      const o = oRaw ? (JSON.parse(oRaw) as Record<string, Record<string, unknown>>) : {};
      if (!o[userId]) o[userId] = {};
      o[userId].role = newRole;
      void setItem("users_overrides", JSON.stringify(o));
      setUsersOverrides((prev) => ({ ...prev, [userId]: { ...prev[userId], role: newRole } }));
      notify.success("Thành công", `Đã gán vai trò "${ROLE_NAMES_VI[newRole] ?? newRole}" cho người dùng.`);
    } catch (e) {
      notify.error("Lỗi", "Không thể cập nhật vai trò.");
    }
  };

  const handleDeleteUser = (userId: string) => {
    try {
      const next = new Set(deletedUserIds);
      next.add(userId);
      setDeletedUserIds(next);
      void setItem("admin_deleted_user_ids", JSON.stringify([...next]));
      setDeleteUserTarget(null);
      notify.success("Thành công", "Đã xóa người dùng khỏi hệ thống.");
    } catch (e) {
      notify.error("Lỗi", "Không thể xóa người dùng.");
    }
  };

  const handleRemoveRecording = async (id: string) => {
    try {
      await removeLocalRecording(id);
      setRemoveTarget(null);
      void load();
      notify.success("Thành công", "Đã xóa bản ghi khỏi hệ thống.");
    } catch (e) {
      notify.error("Lỗi", "Không thể xóa bản ghi.");
    }
  };

  if (!user || user.role !== UserRole.ADMIN) return null;

  const expertOptions = (() => {
    const oRaw = getItem("users_overrides");
    const o = oRaw ? (JSON.parse(oRaw) as Record<string, { id?: string; username?: string; fullName?: string; role?: string }>) : {};
    const experts: { id: string; username: string; fullName?: string }[] = [];
    ["expert_a", "expert_b", "expert_c"].forEach((id) => {
      const u = o[id];
      if (u?.role === UserRole.EXPERT || !u) experts.push({ id, username: u?.username ?? id, fullName: u?.fullName });
    });
    Object.entries(o).forEach(([id, u]) => {
      if (u?.role === UserRole.EXPERT && !experts.some((e) => e.id === id)) experts.push({ id, username: u.username ?? id, fullName: u.fullName });
    });
    return experts;
  })();

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "users", label: "Quản lý người dùng", icon: Users },
    { id: "analytics", label: "Phân tích bộ sưu tập", icon: BarChart3 },
    { id: "moderation", label: "Kiểm duyệt nội dung", icon: Shield },
    { id: "expertDeletion", label: "Yêu cầu xóa tài khoản Chuyên gia", icon: UserMinus },
    { id: "recordRequests", label: "Yêu cầu xóa / chỉnh sửa bản thu", icon: FileEdit },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">Quản trị hệ thống</h1>
          <BackButton />
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4 mb-8">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <Button
                key={id}
                type="button"
                variant={isActive ? "primary" : "outline"}
                size="lg"
                onClick={() => setTab(id)}
                className="gap-2"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
                <ChevronRight className="h-4 w-4 opacity-70" />
              </Button>
            );
          })}
        </div>

        <Card variant="bordered" className="!p-0 overflow-hidden">
          {tab === "users" && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
                <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
                  <Users className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                </div>
                Quản lý người dùng
              </h2>
              <p className="text-neutral-700 font-medium leading-relaxed mb-6">
                Gán vai trò Chuyên gia hoặc Người đóng góp và theo dõi điểm đóng góp (số bản thu, đã duyệt, từ chối).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-3 px-4 font-semibold text-neutral-800">Người dùng</th>
                      <th className="py-3 px-4 font-semibold text-neutral-800">Vai trò</th>
                      <th className="py-3 px-4 font-semibold text-neutral-800">Đóng góp</th>
                      <th className="py-3 px-4 font-semibold text-neutral-800">Đã duyệt</th>
                      <th className="py-3 px-4 font-semibold text-neutral-800">Từ chối</th>
                      <th className="py-3 px-4 font-semibold text-neutral-800">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b border-neutral-100">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium text-neutral-900">{u.username}</span>
                            {u.fullName && <span className="text-neutral-500 text-sm">({u.fullName})</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-700">{getRoleNameVi(u.role)}</td>
                        <td className="py-3 px-4 text-neutral-700">{u.contributionCount}</td>
                        <td className="py-3 px-4 text-green-600 font-medium">{u.approvedCount}</td>
                        <td className="py-3 px-4 text-red-600 font-medium">{u.rejectedCount}</td>
                        <td className="py-3 px-4">
                          {u.role !== UserRole.ADMIN && (
                            <RoleSelectDropdown
                              value={u.role}
                              onChange={(v) => {
                                if (v === DELETE_ACTION) setDeleteUserTarget({ id: u.id, username: u.username });
                                else handleAssignRole(u.id, v);
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "analytics" && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
                <div className="p-2 bg-secondary-100/90 rounded-lg shadow-sm">
                  <BarChart3 className="h-5 w-5 text-secondary-600" strokeWidth={2.5} />
                </div>
                Phân tích bộ sưu tập
              </h2>
              <p className="text-neutral-700 font-medium leading-relaxed mb-6">
                Khoảng trống theo dân tộc, xu hướng đóng góp theo tháng, người đóng góp tích cực.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
                  <div className="bg-primary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
                    <Music className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
                  </div>
                  <div className="text-neutral-600 font-medium mb-2">Tổng bản ghi</div>
                  <p className="text-3xl font-bold text-primary-600">{recordings.length}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
                  <div className="bg-secondary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
                    <MapPin className="h-6 w-6 text-secondary-600" strokeWidth={2.5} />
                  </div>
                  <div className="text-neutral-600 font-medium mb-2">Dân tộc có dữ liệu</div>
                  <p className="text-3xl font-bold text-primary-600">{Object.keys(ethnicityCounts).length}</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
                  <div className="bg-primary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
                    <Users className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
                  </div>
                  <div className="text-neutral-600 font-medium mb-2">Người đóng góp</div>
                  <p className="text-3xl font-bold text-primary-600">{allUsers.length}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-4">Khoảng trống theo dân tộc (mẫu)</h3>
                  <div className="flex flex-wrap gap-2">
                    {gapData.map(({ name, count }) => (
                      <span
                        key={name}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${count === 0 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                          }`}
                      >
                        {name}: {count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-4">Đóng góp theo tháng</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(monthlyCounts)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 12)
                      .map(([k, v]) => (
                        <span key={k} className="inline-flex px-3 py-1.5 rounded-full bg-primary-100 text-primary-800 text-sm font-medium">
                          {k}: {v}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-4">Người đóng góp tích cực</h3>
                  <ul className="space-y-3">
                    {prolific.map((u, i) => {
                      const displayUsername = usersOverrides[u.id]?.username ?? latestUsernameByUploader[u.id] ?? u.username;
                      return (
                        <li key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-neutral-200/80" style={{ backgroundColor: "#FFFCF5" }}>
                          <span className="font-medium text-neutral-900">
                            #{i + 1} {displayUsername}
                          </span>
                          <span className="text-neutral-700 font-medium">{u.contributionCount} bản thu</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === "recordRequests" && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
                <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
                  <FileEdit className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                </div>
                Yêu cầu xóa / chỉnh sửa bản thu
              </h2>
              <p className="text-neutral-700 font-medium leading-relaxed mb-6">
                Yêu cầu xóa bản thu từ Người đóng góp được Quản trị viên chuyển đến Chuyên gia để chấp nhận hoặc từ chối xóa bản thu.
                <br />
                Yêu cầu chỉnh sửa bản thu từ Người đóng góp được Quản trị viên duyệt để Người đóng góp chỉnh sửa bản thu và gửi Chuyên gia kiểm duyệt bản thu.
              </p>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600" strokeWidth={2.5} />
                    Yêu cầu xóa bản thu (chờ chuyển Chuyên gia)
                  </h3>
                  {deleteRecordingRequests.filter((r) => r.status === "pending_admin").length === 0 ? (
                    <p className="text-neutral-500 font-medium text-sm">Chưa có yêu cầu.</p>
                  ) : (
                    <div className="space-y-3">
                      {deleteRecordingRequests
                        .filter((r) => r.status === "pending_admin")
                        .map((req) => (
                          <div
                            key={req.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 p-4"
                            style={{ backgroundColor: "#FFFCF5" }}
                          >
                            <div>
                              <p className="font-medium text-neutral-900">{req.recordingTitle}</p>
                              <p className="text-sm text-neutral-600">Người đóng góp: {req.contributorName} · {new Date(req.requestedAt).toLocaleString("vi-VN")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <ExpertSelectDropdown
                                options={expertOptions.map((ex) => ({ id: ex.id, label: ex.fullName ?? ex.username }))}
                                value={forwardDeleteExpertId?.requestId === req.id ? forwardDeleteExpertId.expertId : ""}
                                onChange={(id) => setForwardDeleteExpertId(id ? { requestId: req.id, expertId: id } : null)}
                                placeholder=" -- Chọn Chuyên gia -- "
                              />
                              <button
                                type="button"
                                disabled={!forwardDeleteExpertId || forwardDeleteExpertId.requestId !== req.id || !forwardDeleteExpertId.expertId}
                                onClick={async () => {
                                  if (!forwardDeleteExpertId || forwardDeleteExpertId.requestId !== req.id) return;
                                  try {
                                    await recordingRequestService.forwardDeleteToExpert(req.id, forwardDeleteExpertId.expertId);
                                    setForwardDeleteExpertId(null);
                                    setDeleteRecordingRequests(await recordingRequestService.getDeleteRecordingRequests());
                                    notify.success("Thành công", "Đã chuyển yêu cầu xóa đến Chuyên gia.");
                                  } catch (e) {
                                    notify.error("Lỗi", "Không thể chuyển yêu cầu.");
                                  }
                                }}
                                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium cursor-pointer"
                              >
                                Chuyển đến Chuyên gia
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <FileEdit className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                    Yêu cầu chỉnh sửa bản thu (chờ duyệt)
                  </h3>
                  {editRecordingRequests.filter((r) => r.status === "pending").length === 0 ? (
                    <p className="text-neutral-500 font-medium text-sm">Chưa có yêu cầu.</p>
                  ) : (
                    <div className="space-y-3">
                      {editRecordingRequests
                        .filter((r) => r.status === "pending")
                        .map((req) => (
                          <div
                            key={req.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 p-4"
                            style={{ backgroundColor: "#FFFCF5" }}
                          >
                            <div>
                              <p className="font-medium text-neutral-900">{req.recordingTitle}</p>
                              <p className="text-sm text-neutral-600">Người đóng góp: {req.contributorName} · {new Date(req.requestedAt).toLocaleString("vi-VN")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/recordings/${req.recordingId}/edit`}
                                className="px-4 py-2 rounded-full border border-primary-200/80 text-primary-700 hover:text-primary-800 hover:border-primary-300 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                style={{ backgroundColor: "#FFFCF5" }}
                              >
                                Chỉnh sửa ngay
                              </Link>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await recordingRequestService.approveEditRequest(req.id);
                                    setEditRecordingRequests(await recordingRequestService.getEditRecordingRequests());
                                    notify.success("Thành công", "Đã duyệt yêu cầu chỉnh sửa bản thu. Người đóng góp có thể chỉnh sửa bản thu.");
                                  } catch (e) {
                                    notify.error("Lỗi", "Không thể duyệt yêu cầu chỉnh sửa bản thu. Vui lòng thử lại.");
                                  }
                                }}
                                className="px-4 py-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium cursor-pointer"
                              >
                                Duyệt yêu cầu chỉnh sửa bản thu
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "expertDeletion" && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
                <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
                  <UserMinus className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                </div>
                Yêu cầu xóa tài khoản Chuyên gia
              </h2>
              <p className="text-neutral-700 font-medium leading-relaxed mb-6">
                Chuyên gia gửi yêu cầu xóa tài khoản sẽ hiển thị tại đây. Sau khi bạn duyệt, tài khoản Chuyên gia đó sẽ bị xóa khỏi hệ thống.
              </p>
              {pendingExpertDeletions.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 text-center transition-all duration-300" style={{ backgroundColor: "#FFFCF5" }}>
                  <p className="text-neutral-500 font-medium">Chưa có yêu cầu xóa tài khoản Chuyên gia nào.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingExpertDeletions.map((req) => (
                    <div
                      key={req.expertId}
                      className="flex items-center justify-between rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl"
                      style={{ backgroundColor: "#FFFCF5" }}
                    >
                      <div>
                        <p className="font-semibold text-neutral-900 mb-1">{req.expertFullName ?? req.expertUsername}</p>
                        <p className="text-sm text-neutral-600 font-medium">
                          @{req.expertUsername} · Yêu cầu lúc: {new Date(req.requestedAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpertDeletionApproveTarget(req)}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-red-600 hover:bg-red-700 text-white border border-red-200/80 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                      >
                        Duyệt xóa tài khoản
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "moderation" && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
                <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
                  <Shield className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                </div>
                Kiểm duyệt nội dung
              </h2>
              <p className="text-neutral-700 font-medium leading-relaxed mb-6">
                Xóa bản ghi vi phạm bản quyền hoặc không phù hợp. Quản lý embargo (triển khai đầy đủ khi có backend).
              </p>
              <div className="space-y-4">
                {recordings.length === 0 ? (
                  <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 text-center transition-all duration-300" style={{ backgroundColor: "#FFFCF5" }}>
                    <p className="text-neutral-500 font-medium">Chưa có bản ghi nào.</p>
                  </div>
                ) : (
                  recordings
                    .filter((r) => r.id)
                    .map((r) => {
                      const st = (r.moderation as { status?: string })?.status ?? "PENDING_REVIEW";
                      const title = r.basicInfo?.title ?? r.title ?? "Không có tiêu đề";
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl"
                          style={{ backgroundColor: "#FFFCF5" }}
                        >
                          <div>
                            <p className="font-semibold text-neutral-900 mb-1">{title}</p>
                            <p className="text-sm text-neutral-600 font-medium">
                              Người đóng góp: {(r.uploader as { username?: string })?.username ?? "Khách"} · Trạng thái: {st}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/recordings/${r.id}`}
                              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200/80 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                              style={{ backgroundColor: "#FFFCF5" }}
                            >
                              Xem
                            </Link>
                            <button
                              onClick={() => setRemoveTarget({ id: r.id!, title })}
                              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-red-600 hover:text-red-700 border border-red-200/80 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                              style={{ backgroundColor: "#FFFCF5" }}
                            >
                              <FileWarning className="h-4 w-4" />
                              Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmationDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && handleRemoveRecording(removeTarget.id)}
        title="Xóa bản ghi"
        message={removeTarget ? `Bạn có chắc muốn xóa "${removeTarget.title}" khỏi hệ thống?` : ""}
        description="Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        confirmButtonStyle="bg-red-600 hover:bg-red-500 text-white"
      />

      <ConfirmationDialog
        isOpen={!!deleteUserTarget}
        onClose={() => setDeleteUserTarget(null)}
        onConfirm={() => deleteUserTarget && handleDeleteUser(deleteUserTarget.id)}
        title="Xóa người dùng khỏi hệ thống"
        message={deleteUserTarget ? `Bạn có chắc muốn xóa "${deleteUserTarget.username}" khỏi hệ thống?` : ""}
        description="Người dùng sẽ không còn hiển thị trong danh sách quản lý. Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        confirmButtonStyle="bg-red-600 hover:bg-red-500 text-white"
      />

      <ConfirmationDialog
        isOpen={!!expertDeletionApproveTarget}
        onClose={() => setExpertDeletionApproveTarget(null)}
        onConfirm={async () => {
          if (!expertDeletionApproveTarget) return;
          try {
            await accountDeletionService.approveExpertAccountDeletion(
              expertDeletionApproveTarget.expertId,
              user?.id,
              user?.role
            );
            await recordingRequestService.addNotification({
              type: "expert_account_deletion_approved",
              title: "Đã duyệt xóa tài khoản Chuyên gia",
              body: `Tài khoản ${expertDeletionApproveTarget.expertFullName ?? expertDeletionApproveTarget.expertUsername} đã được xóa khỏi hệ thống.`,
              forRoles: [UserRole.ADMIN],
            });
            setExpertDeletionApproveTarget(null);
            setPendingExpertDeletions(accountDeletionService.getPendingExpertDeletionRequests());
            notify.success("Thành công", "Đã duyệt xóa tài khoản Chuyên gia khỏi hệ thống.");
            void load();
          } catch (e) {
            notify.error("Lỗi", "Không thể duyệt xóa tài khoản.");
          }
        }}
        title="Duyệt xóa tài khoản Chuyên gia"
        message={expertDeletionApproveTarget ? `Bạn có chắc chắn duyệt xóa tài khoản "${expertDeletionApproveTarget.expertFullName ?? expertDeletionApproveTarget.expertUsername}" khỏi hệ thống?` : ""}
        description="Chuyên gia này sẽ bị xóa khỏi hệ thống. Nếu đang đăng nhập bằng tài khoản đó, họ sẽ bị đăng xuất. Hành động không thể hoàn tác."
        confirmText="Duyệt xóa"
        cancelText="Hủy"
        confirmButtonStyle="bg-red-600 hover:bg-red-500 text-white"
      />
    </div>
  );
}