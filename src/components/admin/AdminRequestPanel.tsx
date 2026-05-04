import { FileEdit, Trash2, UserMinus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ExpertSelectDropdown } from '@/components/admin/AdminDashboardDropdowns';
import { recordingRequestService } from '@/services/recordingRequestService';
import {
  UserRole,
  type DeleteRecordingRequest,
  type EditRecordingRequest,
  type ExpertAccountDeletionRequest,
} from '@/types';
import { notifyLine, uiToast } from '@/uiToast';

export type AdminRecordingRequestsPanelProps = {
  deleteRecordingRequests: DeleteRecordingRequest[];
  setDeleteRecordingRequests: (r: DeleteRecordingRequest[]) => void;
  editRecordingRequests: EditRecordingRequest[];
  setEditRecordingRequests: (r: EditRecordingRequest[]) => void;
  expertOptions: { id: string; username: string; fullName?: string }[];
  forwardDeleteExpertId: { requestId: string; expertId: string } | null;
  setForwardDeleteExpertId: (v: { requestId: string; expertId: string } | null) => void;
};

export function AdminRecordingRequestsPanel({
  deleteRecordingRequests,
  setDeleteRecordingRequests,
  editRecordingRequests,
  setEditRecordingRequests,
  expertOptions,
  forwardDeleteExpertId,
  setForwardDeleteExpertId,
}: AdminRecordingRequestsPanelProps) {
  return (
    <div
      className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 mb-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
    >
      <h3 className="text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
        <FileEdit className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
        Yêu cầu xóa / chỉnh sửa bản thu
      </h3>
      <p className="text-neutral-700 font-medium leading-relaxed mb-4">
        Yêu cầu xóa bản thu được Quản trị viên chuyển cho Chuyên gia duyệt. Yêu cầu chỉnh sửa được
        Quản trị viên duyệt để Người đóng góp chỉnh sửa và gửi Chuyên gia kiểm duyệt.
      </p>

      <div className="space-y-8">
        <div>
          <h4 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" strokeWidth={2.5} />
            Yêu cầu xóa bản thu (chờ chuyển Chuyên gia)
          </h4>
          {deleteRecordingRequests.filter((r) => r.status === 'pending_admin').length === 0 ? (
            <p className="text-neutral-500 font-medium text-sm">Chưa có yêu cầu.</p>
          ) : (
            <div className="space-y-3">
              {deleteRecordingRequests
                .filter((r) => r.status === 'pending_admin')
                .map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 p-4 bg-surface-panel"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{req.recordingTitle}</p>
                      <p className="text-sm text-neutral-600">
                        Người đóng góp: {req.contributorName} ·{' '}
                        {new Date(req.requestedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExpertSelectDropdown
                        options={expertOptions.map((ex) => ({
                          id: ex.id,
                          label: ex.fullName ?? ex.username,
                        }))}
                        value={
                          forwardDeleteExpertId?.requestId === req.id
                            ? forwardDeleteExpertId.expertId
                            : ''
                        }
                        onChange={(id) =>
                          setForwardDeleteExpertId(
                            id ? { requestId: req.id, expertId: id } : null,
                          )
                        }
                        placeholder=" -- Chọn Chuyên gia -- "
                      />
                      <button
                        type="button"
                        disabled={
                          !forwardDeleteExpertId ||
                          forwardDeleteExpertId.requestId !== req.id ||
                          !forwardDeleteExpertId.expertId
                        }
                        onClick={async () => {
                          if (!forwardDeleteExpertId || forwardDeleteExpertId.requestId !== req.id)
                            return;
                          try {
                            await recordingRequestService.forwardDeleteToExpert(
                              req.id,
                              forwardDeleteExpertId.expertId,
                            );
                            await recordingRequestService.addNotification({
                              type: 'delete_request_forwarded',
                              title: 'Yêu cầu xóa bản thu',
                              body: `Quản trị viên chuyển yêu cầu xóa "${req.recordingTitle}" cho bạn xem xét.`,
                              forRoles: [UserRole.EXPERT],
                              recordingId: req.recordingId,
                            });
                            setForwardDeleteExpertId(null);
                            setDeleteRecordingRequests(
                              await recordingRequestService.getDeleteRecordingRequests(),
                            );
                            uiToast.success(
                              notifyLine('Thành công', 'Đã chuyển yêu cầu xóa đến Chuyên gia.'),
                            );
                          } catch {
                            uiToast.error(notifyLine('Lỗi', 'Không thể chuyển yêu cầu.'));
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
          <h4 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            Yêu cầu chỉnh sửa bản thu (chờ duyệt)
          </h4>
          {editRecordingRequests.filter((r) => r.status === 'pending').length === 0 ? (
            <p className="text-neutral-500 font-medium text-sm">Chưa có yêu cầu.</p>
          ) : (
            <div className="space-y-3">
              {editRecordingRequests
                .filter((r) => r.status === 'pending')
                .map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 p-4 bg-surface-panel"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{req.recordingTitle}</p>
                      <p className="text-sm text-neutral-600">
                        Người đóng góp: {req.contributorName} ·{' '}
                        {new Date(req.requestedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/recordings/${req.recordingId}/edit`}
                        className="px-4 py-2 rounded-full border border-primary-200/80 text-primary-700 hover:text-primary-800 hover:border-primary-300 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer bg-surface-panel"
                      >
                        Chỉnh sửa ngay
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await recordingRequestService.approveEditRequest(req.id);
                            await recordingRequestService.addNotification({
                              type: 'edit_request_approved',
                              title: 'Yêu cầu chỉnh sửa được duyệt',
                              body: `Yêu cầu chỉnh sửa "${req.recordingTitle}" đã được quản trị viên duyệt.`,
                              forRoles: [UserRole.CONTRIBUTOR],
                              recordingId: req.recordingId,
                            });
                            setEditRecordingRequests(
                              await recordingRequestService.getEditRecordingRequests(),
                            );
                            uiToast.success(
                              notifyLine(
                                'Thành công',
                                'Đã duyệt yêu cầu chỉnh sửa bản thu. Người đóng góp có thể chỉnh sửa bản thu.',
                              ),
                            );
                          } catch {
                            uiToast.error(
                              notifyLine(
                                'Lỗi',
                                'Không thể duyệt yêu cầu chỉnh sửa bản thu. Vui lòng thử lại.',
                              ),
                            );
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
  );
}

export type AdminExpertDeletionPanelProps = {
  pendingExpertDeletions: ExpertAccountDeletionRequest[];
  onRequestApprove: (req: ExpertAccountDeletionRequest) => void;
};

export function AdminExpertDeletionPanel({
  pendingExpertDeletions,
  onRequestApprove,
}: AdminExpertDeletionPanelProps) {
  return (
    <div
      className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 mb-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
    >
      <h3 className="text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
        <UserMinus className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
        Yêu cầu xóa tài khoản Chuyên gia
      </h3>
      <p className="text-neutral-700 font-medium leading-relaxed mb-4">
        Chuyên gia gửi yêu cầu xóa tài khoản sẽ hiển thị tại đây. Sau khi bạn duyệt, tài khoản Chuyên
        gia đó sẽ bị xóa khỏi hệ thống.
      </p>
      {pendingExpertDeletions.length === 0 ? (
        <div
          className="rounded-2xl border border-neutral-200/80 p-6 text-center bg-surface-panel"
        >
          <p className="text-neutral-500 font-medium">Chưa có yêu cầu xóa tài khoản Chuyên gia nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingExpertDeletions.map((req) => (
            <div
              key={req.expertId}
              className="flex items-center justify-between rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
            >
              <div>
                <p className="font-semibold text-neutral-900 mb-1">
                  {req.expertFullName ?? req.expertUsername}
                </p>
                <p className="text-sm text-neutral-600 font-medium">
                  @{req.expertUsername} · Yêu cầu lúc:{' '}
                  {new Date(req.requestedAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRequestApprove(req)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-red-600 hover:bg-red-700 text-white border border-red-200/80 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
              >
                Duyệt xóa tài khoản
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
