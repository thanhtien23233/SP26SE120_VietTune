import { Trash2, AlertTriangle } from 'lucide-react';

import type { ReferenceEntity } from '../types/masterDataTypes';

import ConfirmationDialog from '@/components/common/ConfirmationDialog';

interface EntityDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entity: ReferenceEntity<Record<string, unknown>> | null;
  entityName: string;
}

export function EntityDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  entity,
  entityName,
}: EntityDeleteDialogProps) {
  if (!entity) return null;

  // Assuming we might have usage counts fetched. If it's a hard delete with usages, it's blocked.
  // For Phase 1, we just do standard delete/deactivate.
  
  const hasUsage = entity.usageCount && entity.usageCount > 0;
  
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Xóa ${entityName}`}
      message={`Bạn có chắc chắn muốn xóa ${entityName.toLowerCase()} "${entity.name}"?`}
      description={
        hasUsage ? (
          <span className="text-destructive flex items-center justify-center gap-2 mt-2">
            <AlertTriangle className="w-4 h-4" />
            Đang được sử dụng trong {entity.usageCount} bản ghi. Việc xóa có thể gây lỗi.
          </span>
        ) : (
          'Hành động này không thể hoàn tác.'
        )
      }
      confirmText="Xóa dữ liệu"
      confirmButtonStyle="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      icon={
        <div className="p-3 bg-destructive/10 rounded-xl flex-shrink-0">
          <Trash2 className="h-8 w-8 text-destructive" strokeWidth={2.5} />
        </div>
      }
    />
  );
}
