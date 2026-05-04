import { BookOpen, FileWarning, RefreshCcw, User as UserIcon, Users } from 'lucide-react';

import { RoleSelectDropdown } from '@/components/admin/AdminDashboardDropdowns';
import { DELETE_ACTION, type AggregatedUser } from '@/features/admin/adminDashboardTypes';
import { UserRole } from '@/types';
import { notifyLine, uiToast } from '@/uiToast';

export type AdminUserManagementProps = {
  remoteUsersLoadState: 'idle' | 'loading' | 'ok' | 'error';
  usersForTable: AggregatedUser[];
  showUsersLoadingHint: boolean;
  setShowUsersLoadingHint: (v: boolean) => void;
  load: (opts?: { showUserLoadingHint?: boolean }) => Promise<void>;
  onOpenGuide: () => void;
  getRoleNameVi: (role: string) => string;
  onAssignRole: (userId: string, newRole: string) => void | Promise<void>;
  onRequestDeleteUser: (payload: { id: string; username: string }) => void;
};

export default function AdminUserManagement({
  remoteUsersLoadState,
  usersForTable,
  showUsersLoadingHint,
  setShowUsersLoadingHint,
  load,
  onOpenGuide,
  getRoleNameVi,
  onAssignRole,
  onRequestDeleteUser,
}: AdminUserManagementProps) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
        <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
          <Users className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
        </div>
        Quản lý người dùng
      </h2>
      <p className="text-neutral-700 font-medium leading-relaxed mb-6">
        Phân công vai trò (dựa trên bằng cấp/thành tích) và theo dõi chất lượng đóng góp (số bản thu,
        đã duyệt, từ chối).
      </p>

      {remoteUsersLoadState === 'error' && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50/90 border border-red-300/80 rounded-2xl shadow-sm backdrop-blur-sm">
          <FileWarning className="h-5 w-5 text-red-600 flex-shrink-0" strokeWidth={2.5} />
          <p className="text-red-800 font-medium">
            Không thể lấy danh sách người dùng từ API{' '}
            <span className="font-semibold">/api/User/GetAll</span>. Vui lòng kiểm tra mock/backend.
          </p>
        </div>
      )}

      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-4 sm:p-6 lg:p-8 mb-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-700">Gợi ý quy trình</div>
            <div className="text-neutral-600 font-medium text-sm leading-relaxed">
              Ưu tiên gán vai trò <span className="text-neutral-900 font-semibold">Chuyên gia</span>{' '}
              cho người dùng có hồ sơ học thuật phù hợp; theo dõi tỉ lệ duyệt/từ chối để đánh giá chất
              lượng đóng góp.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGuide}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              title="Mở hướng dẫn"
            >
              <BookOpen className="h-4 w-4" strokeWidth={2.5} />
              Xem hướng dẫn
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  setShowUsersLoadingHint(true);
                  await load({ showUserLoadingHint: true });
                  uiToast.success(notifyLine('Đã làm mới', 'Dữ liệu quản trị đã được cập nhật.'));
                } finally {
                  setShowUsersLoadingHint(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200/80 text-neutral-800 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-surface-panel"
              title="Làm mới dữ liệu"
            >
              <RefreshCcw className="h-4 w-4" strokeWidth={2.5} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="py-3 px-4 font-semibold text-neutral-800">Người dùng</th>
              <th className="py-3 px-4 font-semibold text-neutral-800">Vai trò</th>
              <th className="py-3 px-4 font-semibold text-neutral-800">Điểm đóng góp</th>
              <th className="py-3 px-4 font-semibold text-neutral-800">Đã duyệt</th>
              <th className="py-3 px-4 font-semibold text-neutral-800">Từ chối</th>
              <th className="py-3 px-4 font-semibold text-neutral-800">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {usersForTable.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-neutral-400" />
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-900 truncate">
                        {u.fullName ?? u.username}
                      </div>
                      <div className="text-neutral-500 text-sm font-medium break-all">
                        {u.email ?? u.username}
                      </div>
                    </div>
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
                        if (v === DELETE_ACTION) onRequestDeleteUser({ id: u.id, username: u.username });
                        else void onAssignRole(u.id, v);
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showUsersLoadingHint && remoteUsersLoadState !== 'ok' && (
        <div className="mt-4 text-sm text-neutral-600 font-medium">
          Đang tải danh sách người dùng từ API…
        </div>
      )}

      {remoteUsersLoadState === 'ok' && usersForTable.length === 0 && (
        <div
          className="mt-4 rounded-2xl border border-neutral-200/80 shadow-sm p-6 text-center bg-surface-panel"
        >
          <p className="text-neutral-700 font-semibold">Không có người dùng để hiển thị.</p>
          <p className="text-neutral-600 font-medium text-sm mt-1">
            (Danh sách này lấy trực tiếp từ <span className="font-semibold">/api/Admin/users</span>.)
          </p>
        </div>
      )}
    </div>
  );
}
