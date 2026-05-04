import { FileEdit, Lock, Scale, Shield, UserMinus } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import AdminRecordingTable from '@/components/admin/AdminRecordingTable';
import { AdminExpertDeletionPanel, AdminRecordingRequestsPanel } from '@/components/admin/AdminRequestPanel';
import DisputeListPanel from '@/components/features/moderation/DisputeListPanel';
import EmbargoListPanel from '@/components/features/moderation/EmbargoListPanel';
import type { LegacyAdminPanelId } from '@/features/admin/adminDashboardTypes';
import type {
  DeleteRecordingRequest,
  EditRecordingRequest,
  ExpertAccountDeletionRequest,
  LocalRecording,
} from '@/types';

export default function AdminDashboardModerationPanel({
  legacyPanel,
  setLegacyPanel,
  deleteRecordingRequests,
  setDeleteRecordingRequests,
  editRecordingRequests,
  setEditRecordingRequests,
  expertOptions,
  forwardDeleteExpertId,
  setForwardDeleteExpertId,
  pendingExpertDeletions,
  onRequestExpertDeletionApprove,
  recordings,
  onRequestRemoveRecording,
}: {
  legacyPanel: LegacyAdminPanelId | null;
  setLegacyPanel: Dispatch<SetStateAction<LegacyAdminPanelId | null>>;
  deleteRecordingRequests: DeleteRecordingRequest[];
  setDeleteRecordingRequests: Dispatch<SetStateAction<DeleteRecordingRequest[]>>;
  editRecordingRequests: EditRecordingRequest[];
  setEditRecordingRequests: Dispatch<SetStateAction<EditRecordingRequest[]>>;
  expertOptions: { id: string; username: string; fullName?: string }[];
  forwardDeleteExpertId: { requestId: string; expertId: string } | null;
  setForwardDeleteExpertId: Dispatch<
    SetStateAction<{ requestId: string; expertId: string } | null>
  >;
  pendingExpertDeletions: ExpertAccountDeletionRequest[];
  onRequestExpertDeletionApprove: Dispatch<SetStateAction<ExpertAccountDeletionRequest | null>>;
  recordings: LocalRecording[];
  onRequestRemoveRecording: (p: { id: string; title?: string }) => void;
}) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
        <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
          <Shield className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
        </div>
        Kiểm duyệt nội dung
      </h2>
      <p className="text-neutral-700 font-medium leading-relaxed mb-6">
        Xử lý tranh chấp bản quyền, xóa nội dung không phù hợp, và quản lý thời hạn hạn chế công bố
        đối với tài liệu nhạy cảm.
      </p>

      <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-4 sm:p-6 lg:p-8 mb-6 transition-all duration-300 hover:shadow-xl bg-surface-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-700">Bảng xử lý nhanh</div>
            <div className="text-neutral-600 font-medium text-sm leading-relaxed">
              Các luồng nâng cao (xóa tài khoản Chuyên gia, yêu cầu xóa/chỉnh sửa bản thu) được gom tại
              đây để Quản trị viên xử lý tập trung.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLegacyPanel((p) => (p === 'recordRequests' ? null : 'recordRequests'))}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all shadow-sm hover:shadow-md ${
                legacyPanel === 'recordRequests'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-neutral-200/80 text-neutral-800 bg-surface-panel'
              } cursor-pointer`}
              title="Yêu cầu xóa/chỉnh sửa bản thu"
            >
              <FileEdit className="h-4 w-4" strokeWidth={2.5} />
              Yêu cầu bản thu
            </button>
            <button
              type="button"
              onClick={() => setLegacyPanel((p) => (p === 'expertDeletion' ? null : 'expertDeletion'))}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all shadow-sm hover:shadow-md ${
                legacyPanel === 'expertDeletion'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-neutral-200/80 text-neutral-800 bg-surface-panel'
              } cursor-pointer`}
              title="Yêu cầu xóa tài khoản Chuyên gia"
            >
              <UserMinus className="h-4 w-4" strokeWidth={2.5} />
              Xóa tài khoản Chuyên gia
            </button>
            <button
              type="button"
              onClick={() => setLegacyPanel((p) => (p === 'embargo' ? null : 'embargo'))}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all shadow-sm hover:shadow-md ${
                legacyPanel === 'embargo'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'border-neutral-200/80 text-neutral-800 bg-surface-panel'
              } cursor-pointer`}
              title="Quản lý hạn chế công bố"
            >
              <Lock className="h-4 w-4" strokeWidth={2.5} />
              Hạn chế công bố
            </button>
            <button
              type="button"
              onClick={() =>
                setLegacyPanel((p) => (p === 'copyrightDispute' ? null : 'copyrightDispute'))
              }
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all shadow-sm hover:shadow-md ${
                legacyPanel === 'copyrightDispute'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'border-neutral-200/80 text-neutral-800 bg-surface-panel'
              } cursor-pointer`}
              title="Quản lý tranh chấp bản quyền"
            >
              <Scale className="h-4 w-4" strokeWidth={2.5} />
              Tranh chấp bản quyền
            </button>
          </div>
        </div>
      </div>

      {legacyPanel === 'embargo' && (
        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 mb-6 transition-all duration-300 hover:shadow-xl bg-surface-panel">
          <EmbargoListPanel />
        </div>
      )}

      {legacyPanel === 'copyrightDispute' && (
        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 mb-6 transition-all duration-300 hover:shadow-xl bg-surface-panel">
          <DisputeListPanel />
        </div>
      )}

      {legacyPanel === 'recordRequests' && (
        <AdminRecordingRequestsPanel
          deleteRecordingRequests={deleteRecordingRequests}
          setDeleteRecordingRequests={setDeleteRecordingRequests}
          editRecordingRequests={editRecordingRequests}
          setEditRecordingRequests={setEditRecordingRequests}
          expertOptions={expertOptions}
          forwardDeleteExpertId={forwardDeleteExpertId}
          setForwardDeleteExpertId={setForwardDeleteExpertId}
        />
      )}

      {legacyPanel === 'expertDeletion' && (
        <AdminExpertDeletionPanel
          pendingExpertDeletions={pendingExpertDeletions}
          onRequestApprove={onRequestExpertDeletionApprove}
        />
      )}

      <AdminRecordingTable recordings={recordings} onRequestRemove={onRequestRemoveRecording} />
    </div>
  );
}
