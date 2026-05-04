import { format, parseISO } from 'date-fns';
import { BookOpen, Calendar, Link2, Pencil, RefreshCw, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import KBEntryForm from './KBEntryForm';
import KBEntryList from './KBEntryList';
import KBRevisionHistory from './KBRevisionHistory';

import BackButton from '@/components/common/BackButton';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { knowledgeBaseApi } from '@/services/knowledgeBaseApi';
import type { CreateKBEntryRequest, KBEntry, UpdateKBEntryRequest } from '@/types/knowledgeBase';
import { KB_CATEGORY_LABELS, KB_STATUS_MAP } from '@/types/knowledgeBase';
import { notifyLine, uiToast } from '@/uiToast';
import { toastApiError } from '@/uiToast/toastApiError';


type Screen = 'list' | 'create' | 'edit' | 'view';

function formatMetaDate(raw?: string): string {
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'dd/MM/yyyy HH:mm');
  } catch {
    return raw;
  }
}

export interface KnowledgeBasePanelProps {
  /** When set and screen is `list`, show `BackButton` with this `to` */
  listBackTo?: string;
  /** Render inside researcher tab — tighter chrome */
  embedded?: boolean;
  /** Open create form on mount (e.g. after navigation from admin dashboard) */
  openCreateOnMount?: boolean;
  /** Hide all mutation actions (create/edit/delete/status). */
  readOnly?: boolean;
  /** When readOnly, restrict list to a fixed status (e.g., published=1). */
  fixedStatus?: number;
}

export default function KnowledgeBasePanel({
  listBackTo,
  embedded = false,
  openCreateOnMount = false,
  readOnly = false,
  fixedStatus,
}: KnowledgeBasePanelProps) {
  const [screen, setScreen] = useState<Screen>('list');
  const [focusEntry, setFocusEntry] = useState<KBEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KBEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editPreviewContent, setEditPreviewContent] = useState('');

  const bumpRefresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    if (openCreateOnMount && !readOnly) {
      setScreen('create');
    }
  }, [openCreateOnMount, readOnly]);

  useEffect(() => {
    if (readOnly && screen !== 'list') {
      setScreen('list');
      setFocusEntry(null);
    }
  }, [readOnly, screen]);

  useEffect(() => {
    if (screen === 'edit' && focusEntry) {
      setEditPreviewContent(focusEntry.content ?? '');
    }
  }, [screen, focusEntry]);

  const goList = useCallback(() => {
    setScreen('list');
    setFocusEntry(null);
  }, []);

  const loadEntry = useCallback(async (row: KBEntry, next: 'edit' | 'view') => {
    setLoadingEntry(true);
    try {
      const full = await knowledgeBaseApi.getEntryById(row.id);
      setFocusEntry(full);
      setScreen(next);
    } catch (e) {
      toastApiError(e, 'Không tải được bài viết.');
    } finally {
      setLoadingEntry(false);
    }
  }, []);

  const handleCreate = async (payload: CreateKBEntryRequest) => {
    setSubmitting(true);
    try {
      await knowledgeBaseApi.createEntry(payload);
      uiToast.success(notifyLine('Thành công', 'Đã tạo bài viết cơ sở tri thức.'));
      bumpRefresh();
      goList();
    } catch (e) {
      toastApiError(e, 'Không tạo được bài viết.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (payload: UpdateKBEntryRequest) => {
    if (!focusEntry) return;
    setSubmitting(true);
    try {
      await knowledgeBaseApi.updateEntry(focusEntry.id, payload);
      uiToast.success(notifyLine('Thành công', 'Đã cập nhật bài viết.'));
      bumpRefresh();
      goList();
    } catch (e) {
      toastApiError(e, 'Không cập nhật được bài viết.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (entry: KBEntry, status: number) => {
    if (status === entry.status) return;
    try {
      await knowledgeBaseApi.updateEntryStatus(entry.id, { status });
      uiToast.success(notifyLine('Thành công', 'Đã cập nhật trạng thái.'));
      bumpRefresh();
    } catch (e) {
      toastApiError(e, 'Không đổi được trạng thái.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    const deletedId = deleteTarget.id;
    setDeleting(true);
    try {
      await knowledgeBaseApi.deleteEntry(deletedId);
      uiToast.success(notifyLine('Thành công', 'Đã xóa bài viết.'));
      setDeleteTarget(null);
      bumpRefresh();
      if (focusEntry?.id === deletedId) goList();
    } catch (e) {
      toastApiError(e, 'Không xóa được bài viết.');
    } finally {
      setDeleting(false);
    }
  };

  const statusBadgeVariant = (s: number): 'warning' | 'success' | 'secondary' => {
    if (s === 1) return 'success';
    if (s === 2) return 'secondary';
    return 'warning';
  };

  const outerClass = embedded ? '' : 'min-h-screen';
  const innerPad = embedded ? '' : 'py-8';

  return (
    <div className={outerClass} style={embedded ? undefined : { backgroundColor: '#FFF7E6' }}>
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${innerPad}`}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100/90 shadow-sm">
              <BookOpen className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
            </div>
            <div>
              <h2
                className={`font-bold text-neutral-900 ${embedded ? 'text-lg sm:text-xl' : 'text-xl sm:text-3xl'}`}
              >
                Cơ sở tri thức (KB)
              </h2>
              <p className="text-sm font-medium text-neutral-600">
                Tạo, xem, sửa và quản lý bài viết cho hệ thống AI.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {screen === 'list' && listBackTo != null && listBackTo !== '' && (
              <BackButton to={listBackTo} />
            )}
            {screen !== 'list' && (
              <Button type="button" variant="outline" size="sm" onClick={goList}>
                Về danh sách
              </Button>
            )}
            {screen === 'list' && !readOnly && (
              <Button type="button" variant="primary" size="sm" onClick={() => setScreen('create')}>
                Tạo bài mới
              </Button>
            )}
          </div>
        </div>

        {loadingEntry && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!loadingEntry && screen === 'list' && (
          <Card variant="bordered" className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-6">
            <KBEntryList
              refreshToken={refreshToken}
              onView={(e) => void loadEntry(e, 'view')}
              onEdit={readOnly ? undefined : (e) => void loadEntry(e, 'edit')}
              onDelete={readOnly ? undefined : (e) => setDeleteTarget(e)}
              onChangeStatus={readOnly ? undefined : handleChangeStatus}
              onCreateFirst={readOnly ? undefined : () => setScreen('create')}
              readOnly={readOnly}
              fixedStatus={fixedStatus}
            />
          </Card>
        )}

        {!loadingEntry && screen === 'create' && !readOnly && (
          <Card variant="bordered" className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-8">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Tạo bài viết mới</h3>
            <KBEntryForm
              key="create"
              mode="create"
              isSubmitting={submitting}
              onSubmitCreate={handleCreate}
              onCancel={goList}
            />
          </Card>
        )}

        {!loadingEntry && screen === 'edit' && focusEntry && !readOnly && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="bordered" className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-8">
              <h3 className="mb-4 text-lg font-semibold text-neutral-900">Sửa bài viết</h3>
              <KBEntryForm
                key={focusEntry.id}
                mode="edit"
                initialTitle={focusEntry.title}
                initialCategory={focusEntry.category}
                initialContent={focusEntry.content}
                showCitations={false}
                isSubmitting={submitting}
                onSubmitUpdate={handleUpdate}
                onContentChange={setEditPreviewContent}
                onCancel={goList}
              />
            </Card>

            <Card variant="bordered" className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-6">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Xem trước nội dung</h3>
              <div
                className="prose prose-sm max-w-none min-h-[320px] rounded-2xl border border-secondary-100 bg-white p-4 text-neutral-800 [&_img]:max-w-full"
                dangerouslySetInnerHTML={{
                  __html:
                    editPreviewContent || '<p class="text-neutral-500">(Chưa có nội dung để xem trước)</p>',
                }}
              />
            </Card>
          </div>
        )}

        {!loadingEntry && screen === 'view' && focusEntry && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card
              variant="bordered"
              className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-6 lg:col-span-2"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-xl font-bold text-neutral-900">{focusEntry.title}</h3>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void loadEntry(focusEntry, 'edit')}
                  >
                    <Pencil className="mr-1 inline h-3.5 w-3.5" />
                    Sửa
                  </Button>
                )}
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="info" size="sm">
                  {KB_CATEGORY_LABELS[focusEntry.category] ?? focusEntry.category}
                </Badge>
                <Badge variant={statusBadgeVariant(focusEntry.status)} size="sm">
                  {KB_STATUS_MAP[focusEntry.status] ?? focusEntry.status}
                </Badge>
              </div>
              <div
                className="prose prose-sm max-w-none rounded-2xl border border-secondary-100 bg-white p-4 text-neutral-800 [&_img]:max-w-full"
                dangerouslySetInnerHTML={{
                  __html: focusEntry.content || '<p class="text-neutral-500">(Không có nội dung)</p>',
                }}
              />
            </Card>
            <div className="space-y-4">
              <Card
                variant="bordered"
                className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-5"
              >
                <h4 className="mb-3 text-sm font-semibold text-neutral-900">Thông tin bài viết</h4>
                <div className="space-y-2 rounded-xl border border-secondary-100 bg-cream-50/60 p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Tạo bởi</p>
                      <p className="truncate text-neutral-900">{focusEntry.createdBy ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Ngày tạo</p>
                      <p className="truncate text-neutral-900">{formatMetaDate(focusEntry.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Cập nhật bởi</p>
                      <p className="truncate text-neutral-900">{focusEntry.updatedBy ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Ngày cập nhật</p>
                      <p className="truncate text-neutral-900">{formatMetaDate(focusEntry.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Slug</p>
                      <p className="truncate text-neutral-900">{focusEntry.slug ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                variant="bordered"
                className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-6"
              >
                <KBRevisionHistory entryId={focusEntry.id} />
              </Card>
            </div>
          </div>
        )}

        <ConfirmationDialog
          isOpen={deleteTarget != null}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          title="Xóa bài viết KB?"
          message={
            deleteTarget ? (
              <>
                Bạn có chắc muốn xóa <strong>{deleteTarget.title}</strong>? Hành động này không
                thể hoàn tác.
              </>
            ) : (
              ''
            )
          }
          confirmText={deleting ? 'Đang xóa…' : 'Xóa'}
          confirmButtonStyle="bg-red-600 text-white hover:bg-red-500"
          closeOnBackdropClick={!deleting}
        />
      </div>
    </div>
  );
}
