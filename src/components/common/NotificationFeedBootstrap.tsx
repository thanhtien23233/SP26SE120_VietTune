import { useNotificationFeedEngine } from '@/hooks/useNotificationFeedEngine';
import { useAuthStore } from '@/stores/authStore';

export default function NotificationFeedBootstrap() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const enabled = isAuthenticated && !!user?.role;

  useNotificationFeedEngine({
    enabled,
    role: user?.role,
    showToastOnNew: true,
  });

  return null;
}
