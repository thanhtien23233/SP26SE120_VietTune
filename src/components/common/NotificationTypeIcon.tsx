import {
  ArrowRight,
  CheckCircle,
  Edit3,
  FileAudio,
  RefreshCw,
  Scale,
  Shield,
  Trash2,
  Unlock,
  UserCheck,
  UserMinus,
  UserX,
  X,
} from 'lucide-react';

import type { AppNotification } from '@/types';

type Props = {
  type: AppNotification['type'];
  className?: string;
};

const SW = 2.5;

export function NotificationTypeIcon({ type, className = 'h-5 w-5' }: Props) {
  const cn = `flex-shrink-0 ${className}`;

  switch (type) {
    case 'submission_pending_review':
      return <FileAudio className={`${cn} text-primary-600`} strokeWidth={SW} />;

    case 'submission_approved':
    case 'edit_submission_approved':
    case 'edit_request_approved':
      return <CheckCircle className={`${cn} text-emerald-500`} strokeWidth={SW} />;

    case 'submission_rejected':
      return <X className={`${cn} text-red-500`} strokeWidth={SW} />;

    case 'submission_updated':
      return <RefreshCw className={`${cn} text-blue-500`} strokeWidth={SW} />;

    case 'recording_deleted':
    case 'expert_account_deletion_approved':
      return <Trash2 className={`${cn} text-red-600`} strokeWidth={SW} />;

    case 'recording_edited':
      return <Edit3 className={`${cn} text-blue-500`} strokeWidth={SW} />;

    case 'delete_request_rejected':
      return <X className={`${cn} text-amber-500`} strokeWidth={SW} />;

    case 'delete_request_forwarded':
      return <ArrowRight className={`${cn} text-amber-500`} strokeWidth={SW} />;

    case 'expert_deletion_requested':
      return <UserMinus className={`${cn} text-amber-500`} strokeWidth={SW} />;

    case 'role_changed':
      return <Shield className={`${cn} text-blue-500`} strokeWidth={SW} />;

    case 'account_deactivated':
      return <UserX className={`${cn} text-red-500`} strokeWidth={SW} />;

    case 'dispute_resolved':
      return <Scale className={`${cn} text-emerald-500`} strokeWidth={SW} />;

    case 'embargo_lifted':
      return <Unlock className={`${cn} text-emerald-500`} strokeWidth={SW} />;

    case 'submission_claimed':
      return <ArrowRight className={`${cn} text-amber-500`} strokeWidth={SW} />;

    case 'submission_unassigned':
      return <UserMinus className={`${cn} text-amber-500`} strokeWidth={SW} />;

    case 'account_activated':
      return <UserCheck className={`${cn} text-emerald-500`} strokeWidth={SW} />;

    default:
      return <FileAudio className={`${cn} text-neutral-500`} strokeWidth={SW} />;
  }
}

export default NotificationTypeIcon;
