import type { LucideIcon } from 'lucide-react';
import { Compass, Upload, UserPlus, ShieldCheck, FileCheck } from 'lucide-react';

import type { User } from '@/types';
import { UserRole } from '@/types';

export type LayoutFeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
};

/** Cùng logic với HomePage (hero features) — dùng cho header strip. */
export function getLayoutFeatureItems(user: User | null): LayoutFeatureItem[] {
  const isExpert = user?.role === UserRole.EXPERT;
  const useGuestFeatures = !user || user?.role === UserRole.ADMIN || !isExpert;
  const isAdmin = user?.role === UserRole.ADMIN;

  if (useGuestFeatures) {
    return [
      {
        icon: Compass,
        title: 'Khám phá âm nhạc dân tộc',
        description: 'Duyệt qua kho tàng âm nhạc truyền thống phong phú từ khắp mọi miền đất nước',
        to: '/explore',
      },
      ...(isAdmin
        ? [
            {
              icon: UserPlus,
              title: 'Cấp tài khoản Chuyên gia',
              description:
                'Tạo tài khoản Chuyên gia mới để kiểm duyệt và xác minh bản thu âm nhạc truyền thống',
              to: '/admin/create-expert',
            },
          ]
        : []),
      ...(isAdmin
        ? [
            {
              icon: ShieldCheck,
              title: 'Quản trị hệ thống',
              description: 'Quản lý người dùng, phân tích bộ sưu tập và kiểm duyệt nội dung',
              to: '/admin',
            },
          ]
        : [
            {
              icon: Upload,
              title: 'Đóng góp bản thu',
              description:
                'Chia sẻ bản thu âm nhạc truyền thống của bạn để cùng gìn giữ di sản văn hóa',
              to: '/upload',
            },
          ]),
    ];
  }

  return [
    {
      icon: ShieldCheck,
      title: 'Kiểm duyệt bản thu',
      description:
        'Xem xét và phê duyệt các bản thu âm nhạc truyền thống được đóng góp bởi cộng đồng',
      to: '/moderation',
    },
    {
      icon: FileCheck,
      title: 'Quản lý bản thu đã được kiểm duyệt',
      description: 'Quản lý và theo dõi các bản thu đã được phê duyệt trong hệ thống',
      to: '/approved-recordings',
    },
  ];
}
