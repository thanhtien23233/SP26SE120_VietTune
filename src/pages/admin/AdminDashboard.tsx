import { Users, BarChart3, Shield, ChevronRight, ChevronDown, BookOpen, Bot } from 'lucide-react';
import { useState, useMemo } from 'react';

import AdminDashboardAiMonitoringPanel from '@/components/admin/AdminDashboardAiMonitoringPanel';
import AdminDashboardAnalyticsPanel from '@/components/admin/AdminDashboardAnalyticsPanel';
import AdminDashboardModerationPanel from '@/components/admin/AdminDashboardModerationPanel';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import BackButton from '@/components/common/BackButton';
import Card from '@/components/common/Card';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import {
  getRoleNameVi,
  LegacyAdminPanelId,
  ROLE_NAMES_VI,
  StepId,
} from '@/features/admin/adminDashboardTypes';
import { useAdminDashboardData } from '@/features/admin/hooks/useAdminDashboardData';
import { accountDeletionService } from '@/services/accountDeletionService';
import { adminApi } from '@/services/adminApi';
import { recordingRequestService } from '@/services/recordingRequestService';
import { removeLocalRecording } from '@/services/recordingStorage';
import { getItem, setItem } from '@/services/storageService';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';
import type { ExpertAccountDeletionRequest } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<StepId>('users');
  const [showAdminGuide, setShowAdminGuide] = useState(false);
  const [legacyPanel, setLegacyPanel] = useState<LegacyAdminPanelId | null>(null);
  const {
    load,
    recordings,
    remoteKbCount,
    aiFlaggedCount,
    setAiFlaggedCount,
    expertPerformanceRows,
    avgExpertAccuracy,
    remoteTotalRecordings,
    remoteInstrumentCount,
    remoteInstruments,
    remoteUsersLoadState,
    showUsersLoadingHint,
    setShowUsersLoadingHint,
    remoteEthnicGroupsLoadState,
    setUsersOverrides,
    usersOverrides,
    pendingExpertDeletions,
    setPendingExpertDeletions,
    deleteRecordingRequests,
    setDeleteRecordingRequests,
    editRecordingRequests,
    setEditRecordingRequests,
    deletedUserIds,
    setDeletedUserIds,
    usersForTable,
    allUsers,
    monthlyCountsFinal,
    ethnicGroupsFromApi,
  } = useAdminDashboardData();

  const [removeTarget, setRemoveTarget] = useState<{ id: string; title?: string } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [expertDeletionApproveTarget, setExpertDeletionApproveTarget] =
    useState<ExpertAccountDeletionRequest | null>(null);
  const [forwardDeleteExpertId, setForwardDeleteExpertId] = useState<{
    requestId: string;
    expertId: string;
  } | null>(null);

  const stepIndex = useMemo(() => {
    const order: StepId[] = ['users', 'analytics', 'aiMonitoring', 'moderation'];
    return Math.max(0, order.indexOf(step));
  }, [step]);

  const setStepByIndex = (idx: number) => {
    const order: StepId[] = ['users', 'analytics', 'aiMonitoring', 'moderation'];
    const next = order[Math.max(0, Math.min(order.length - 1, idx))];
    setStep(next);
  };

  const handleAssignRole = async (userId: string, newRole: string) => {
    try {
      // Prefer backend, fallback to local overrides
      try {
        await adminApi.updateUserRole(userId, newRole);
      } catch {
        // ignore and fallback
      }
      const oRaw = getItem('users_overrides');
      const o = oRaw ? (JSON.parse(oRaw) as Record<string, Record<string, unknown>>) : {};
      if (!o[userId]) o[userId] = {};
      o[userId].role = newRole;
      void setItem('users_overrides', JSON.stringify(o));
      setUsersOverrides((prev) => ({ ...prev, [userId]: { ...prev[userId], role: newRole } }));
      // Backend auto-notification: RoleChanged → tránh tạo thông báo kép ở FE.
      uiToast.success(
        notifyLine(
          'Thành công',
          `Đã gán vai trò "${ROLE_NAMES_VI[newRole] ?? newRole}" cho người dùng.`,
        ),
      );
    } catch (e) {
      uiToast.error(notifyLine('Lỗi', 'Không thể cập nhật vai trò.'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Prefer deactivating on backend; keep UI removal locally as well
      try {
        await adminApi.updateUserStatus(userId, false);
      } catch {
        // ignore and fallback
      }
      // Backend auto-notification: AccountDeactivated → tránh tạo thông báo kép ở FE.
      const next = new Set(deletedUserIds);
      next.add(userId);
      setDeletedUserIds(next);
      void setItem('admin_deleted_user_ids', JSON.stringify([...next]));
      setDeleteUserTarget(null);
      uiToast.success(notifyLine('Thành công', 'Đã vô hiệu hóa người dùng.'));
    } catch (e) {
      uiToast.error(notifyLine('Lỗi', 'Không thể xóa người dùng.'));
    }
  };

  const handleRemoveRecording = async () => {
    const target = removeTarget;
    if (!target) return;
    const recordingTitle = target.title?.trim() || 'Bản thu';
    try {
      await removeLocalRecording(target.id);
      void recordingRequestService.addNotification({
        type: 'recording_deleted',
        title: 'Bản thu đã bị xóa',
        body: `"${recordingTitle}" đã bị xóa bởi quản trị viên.`,
        forRoles: [UserRole.CONTRIBUTOR, UserRole.EXPERT],
        recordingId: target.id,
      });
      setRemoveTarget(null);
      void load();
      uiToast.success(notifyLine('Thành công', 'Đã xóa bản ghi khỏi hệ thống.'));
    } catch (e) {
      uiToast.error(notifyLine('Lỗi', 'Không thể xóa bản ghi.'));
    }
  };

  const expertOptions = useMemo(() => {
    const o = usersOverrides;
    const experts: { id: string; username: string; fullName?: string }[] = [];
    ['expert_a', 'expert_b', 'expert_c'].forEach((id) => {
      const u = o[id];
      if (u?.role === UserRole.EXPERT || !u)
        experts.push({ id, username: u?.username ?? id, fullName: u?.fullName });
    });
    Object.entries(o).forEach(([id, u]) => {
      if (u?.role === UserRole.EXPERT && !experts.some((e) => e.id === id))
        experts.push({ id, username: u.username ?? id, fullName: u.fullName });
    });
    return experts;
  }, [usersOverrides]);

  const steps: { id: StepId; label: string; icon: React.ElementType }[] = useMemo(
    () => [
      { id: 'users', label: 'Quản lý người dùng', icon: Users },
      { id: 'analytics', label: 'Phân tích & thống kê', icon: BarChart3 },
      { id: 'aiMonitoring', label: 'Giám sát hệ thống AI', icon: Bot },
      { id: 'moderation', label: 'Kiểm duyệt nội dung', icon: Shield },
    ],
    [],
  );

  if (!user || user.role !== UserRole.ADMIN) return null;

  const guideButtonClass =
    'inline-flex items-center justify-center gap-2 h-11 px-6 py-0 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none';

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Quản trị hệ thống
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowAdminGuide(true)}
              className={guideButtonClass}
              title="Hướng dẫn Quản trị viên"
            >
              <BookOpen className="h-5 w-5" strokeWidth={2.5} />
              <span>Hướng dẫn Quản trị viên</span>
            </button>
            <BackButton />
          </div>
        </div>

        {/* Wizard stepper — aligned with UploadMusic.tsx */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-4 sm:p-6 mb-6 sm:mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <p className="text-sm font-semibold text-primary-800 mb-3">Điều hướng quản trị</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {steps.map(({ id, label, icon: Icon }) => {
              const isActive = step === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setLegacyPanel(null);
                    setStep(id);
                    window.scrollTo({ top: 0, behavior: 'auto' });
                  }}
                  className={`inline-flex items-center justify-center gap-2 h-11 px-5 py-0 rounded-full text-sm font-semibold border transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white border-primary-600 shadow-primary-600/30'
                      : 'border-neutral-300/80 text-neutral-800 hover:border-primary-300 cursor-pointer bg-surface-panel'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Card variant="bordered" className="!p-0 overflow-hidden">
          {step === 'users' && (
            <AdminUserManagement
              remoteUsersLoadState={remoteUsersLoadState}
              usersForTable={usersForTable}
              showUsersLoadingHint={showUsersLoadingHint}
              setShowUsersLoadingHint={setShowUsersLoadingHint}
              load={load}
              onOpenGuide={() => setShowAdminGuide(true)}
              getRoleNameVi={getRoleNameVi}
              onAssignRole={handleAssignRole}
              onRequestDeleteUser={(p) => setDeleteUserTarget(p)}
            />
          )}

          {step === 'analytics' && (
            <AdminDashboardAnalyticsPanel
              remoteTotalRecordings={remoteTotalRecordings}
              recordingsLength={recordings.length}
              remoteEthnicGroupsLoadState={remoteEthnicGroupsLoadState}
              ethnicGroupCount={ethnicGroupsFromApi.length}
              allUsersCount={allUsers.length}
              remoteInstrumentCount={remoteInstrumentCount}
              remoteInstruments={remoteInstruments}
              monthlyCountsFinal={monthlyCountsFinal}
            />
          )}

          {step === 'aiMonitoring' && (
            <AdminDashboardAiMonitoringPanel
              avgExpertAccuracy={avgExpertAccuracy}
              aiFlaggedCount={aiFlaggedCount}
              remoteKbCount={remoteKbCount}
              expertPerformanceRows={expertPerformanceRows}
              onFlaggedCountChange={setAiFlaggedCount}
              currentUserId={user?.id}
            />
          )}

          {step === 'moderation' && (
            <AdminDashboardModerationPanel
              legacyPanel={legacyPanel}
              setLegacyPanel={setLegacyPanel}
              deleteRecordingRequests={deleteRecordingRequests}
              setDeleteRecordingRequests={setDeleteRecordingRequests}
              editRecordingRequests={editRecordingRequests}
              setEditRecordingRequests={setEditRecordingRequests}
              expertOptions={expertOptions}
              forwardDeleteExpertId={forwardDeleteExpertId}
              setForwardDeleteExpertId={setForwardDeleteExpertId}
              pendingExpertDeletions={pendingExpertDeletions}
              onRequestExpertDeletionApprove={setExpertDeletionApproveTarget}
              recordings={recordings}
              onRequestRemoveRecording={({ id, title }) => setRemoveTarget({ id, title })}
            />
          )}
        </Card>

        {/* Footer navigation — similar feel to UploadMusic wizard actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <button
            type="button"
            onClick={() => setStepByIndex(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 py-0 rounded-full border-2 border-neutral-300/90 text-neutral-900 font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 cursor-pointer focus:outline-none disabled:cursor-not-allowed disabled:opacity-90 disabled:text-neutral-700 disabled:border-neutral-200/80 disabled:hover:scale-100 bg-surface-panel"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={() => {
              setLegacyPanel(null);
              setStepByIndex(stepIndex + 1);
              window.scrollTo({ top: 0, behavior: 'auto' });
            }}
            disabled={stepIndex >= steps.length - 1}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 py-0 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Tiếp theo
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void handleRemoveRecording()}
        title="Xóa bản ghi"
        message={removeTarget ? `Bạn có chắc muốn xóa "${removeTarget.title}" khỏi hệ thống?` : ''}
        description="Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        confirmButtonStyle="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95"
      />

      <ConfirmationDialog
        isOpen={!!deleteUserTarget}
        onClose={() => setDeleteUserTarget(null)}
        onConfirm={() => deleteUserTarget && handleDeleteUser(deleteUserTarget.id)}
        title="Xóa người dùng khỏi hệ thống"
        message={
          deleteUserTarget
            ? `Bạn có chắc muốn xóa "${deleteUserTarget.username}" khỏi hệ thống?`
            : ''
        }
        description="Người dùng sẽ không còn hiển thị trong danh sách quản lý. Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        confirmButtonStyle="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95"
      />

      {/* Guide popup — aligned with UploadPage.tsx */}
      {showAdminGuide && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-guide-title"
          style={{
            animation: 'fadeIn 0.3s ease-out',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            position: 'fixed',
          }}
          onClick={() => setShowAdminGuide(false)}
        >
          <div
            className="rounded-2xl border border-neutral-300/80 shadow-2xl backdrop-blur-sm max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform bg-surface-panel animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200/80 flex-shrink-0">
              <h2
                id="admin-guide-title"
                className="text-xl sm:text-2xl font-semibold text-neutral-900 flex items-center gap-3"
              >
                <div className="p-2 bg-secondary-100/90 rounded-lg shadow-sm">
                  <BookOpen className="h-5 w-5 text-secondary-600" strokeWidth={2.5} />
                </div>
                Hướng dẫn Quản trị viên
              </h2>
              <button
                type="button"
                onClick={() => setShowAdminGuide(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <span className="sr-only">Đóng</span>
                <ChevronDown className="w-5 h-5 -rotate-90" strokeWidth={2.5} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 min-h-0">
              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-primary-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary-100/90 shadow-sm">
                      <Users className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                      Quản lý người dùng
                    </h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 flex-shrink-0">•</span>
                      <span>Phân công vai trò dựa trên hồ sơ bằng cấp/thành tích.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 flex-shrink-0">•</span>
                      <span>Theo dõi điểm đóng góp qua số bản thu, tỉ lệ duyệt/từ chối.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-sky-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-sky-100/90 shadow-sm">
                      <BarChart3 className="h-5 w-5 text-sky-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                      Phân tích & thống kê
                    </h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0">•</span>
                      <span>Nhận diện vùng khuyết dữ liệu theo dân tộc/vùng miền.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0">•</span>
                      <span>Theo dõi xu hướng gửi bài theo tháng.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0">•</span>
                      <span>Liệt kê người đóng góp tích cực nhất.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-amber-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-amber-100/90 shadow-sm">
                      <Bot className="h-5 w-5 text-amber-700" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                      Giám sát hệ thống AI
                    </h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-700 flex-shrink-0">•</span>
                      <span>Theo dõi accuracy metrics (khi backend sẵn sàng).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-700 flex-shrink-0">•</span>
                      <span>Rà soát phản hồi bị cắm cờ và xử lý cảnh báo.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-700 flex-shrink-0">•</span>
                      <span>Quản lý cập nhật cơ sở tri thức để huấn luyện lại.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-emerald-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-100/90 shadow-sm">
                      <Shield className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">
                      Kiểm duyệt nội dung
                    </h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">•</span>
                      <span>Giải quyết tranh chấp bản quyền.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">•</span>
                      <span>Xóa nội dung vi phạm, không phù hợp.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">•</span>
                      <span>
                        Quản lý thời hạn hạn chế công bố cho bản ghi nhạy cảm (khi backend sẵn
                        sàng).
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!expertDeletionApproveTarget}
        onClose={() => setExpertDeletionApproveTarget(null)}
        onConfirm={async () => {
          if (!expertDeletionApproveTarget) return;
          try {
            await accountDeletionService.approveExpertAccountDeletion(
              expertDeletionApproveTarget.expertId,
              user?.id,
              user?.role,
            );
            await recordingRequestService.addNotification({
              type: 'expert_account_deletion_approved',
              title: 'Đã duyệt xóa tài khoản Chuyên gia',
              body: `Tài khoản ${expertDeletionApproveTarget.expertFullName ?? expertDeletionApproveTarget.expertUsername} đã được xóa khỏi hệ thống.`,
              forRoles: [UserRole.EXPERT],
            });
            setExpertDeletionApproveTarget(null);
            setPendingExpertDeletions(accountDeletionService.getPendingExpertDeletionRequests());
            uiToast.success(
              notifyLine('Thành công', 'Đã duyệt xóa tài khoản Chuyên gia khỏi hệ thống.'),
            );
            void load();
          } catch (e) {
            uiToast.error(notifyLine('Lỗi', 'Không thể duyệt xóa tài khoản.'));
          }
        }}
        title="Duyệt xóa tài khoản Chuyên gia"
        message={
          expertDeletionApproveTarget
            ? `Bạn có chắc chắn duyệt xóa tài khoản "${expertDeletionApproveTarget.expertFullName ?? expertDeletionApproveTarget.expertUsername}" khỏi hệ thống?`
            : ''
        }
        description="Chuyên gia này sẽ bị xóa khỏi hệ thống. Nếu đang đăng nhập bằng tài khoản đó, họ sẽ bị đăng xuất. Hành động không thể hoàn tác."
        confirmText="Duyệt xóa"
        cancelText="Hủy"
        confirmButtonStyle="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-xl hover:shadow-2xl shadow-red-600/40 hover:scale-110 active:scale-95"
      />
    </div>
  );
}
