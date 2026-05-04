import { Target, Users, Heart, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';

import BackButton from '@/components/common/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { getItem, setItem } from '@/services/storageService';
import { User, UserRole } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';
import { cn } from '@/utils/helpers';
import { SURFACE_CARD } from '@/utils/surfaceTokens';

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  // Edit profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Validation state
  const [touchedFullName, setTouchedFullName] = useState(false);
  const [touchedUsername, setTouchedUsername] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; username?: string; email?: string }>(
    {},
  );

  const validate = () => {
    const e: { fullName?: string; username?: string; email?: string } = {};
    const fullNameTrim = formFullName.trim();
    if (!fullNameTrim) e.fullName = 'Họ và tên là bắt buộc.';
    else if (fullNameTrim.length < 2) e.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';

    const usernameTrim = formUsername.trim();
    if (!usernameTrim) e.username = 'Tên người dùng là bắt buộc.';
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameTrim))
      e.username = 'Tên người dùng 3-20 ký tự, chỉ chữ, số và dấu gạch dưới.';

    const emailTrim = formEmail.trim();
    if (!emailTrim) e.email = 'Email là bắt buộc.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) e.email = 'Email không hợp lệ.';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isValidSnapshot = () => {
    const fullNameTrim = formFullName.trim();
    const usernameTrim = formUsername.trim();
    const emailTrim = formEmail.trim();
    return (
      fullNameTrim.length >= 2 &&
      /^[a-zA-Z0-9_]{3,20}$/.test(usernameTrim) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)
    );
  };

  const openEdit = () => {
    setFormFullName(user?.fullName || '');
    setFormUsername(user?.username || '');
    setFormEmail(user?.email || '');
    // reset validation
    setTouchedFullName(false);
    setTouchedUsername(false);
    setTouchedEmail(false);
    setErrors({});
    setIsEditOpen(true);
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setTouchedFullName(true);
    setTouchedUsername(true);
    setTouchedEmail(true);
    if (!validate()) {
      uiToast.error(notifyLine('Lỗi', 'Vui lòng sửa các lỗi trong biểu mẫu trước khi lưu.'));
      return;
    }

    const updated: User = {
      ...user,
      fullName: formFullName.trim(),
      username: formUsername.trim(),
      email: formEmail.trim(),
    };

    // If authenticated with real backend, try to persist remotely
    if (authService.isAuthenticated()) {
      try {
        const res = await authService.updateProfile({
          fullName: updated.fullName,
          username: updated.username,
          email: updated.email,
        });
        if (res && res.data) {
          const serverUser = res.data as User;
          void setItem('user', JSON.stringify(serverUser));
          setUser(serverUser);
        } else {
          // fallback to local update
          void setItem('user', JSON.stringify(updated));
          setUser(updated);
        }
      } catch (err) {
        console.error('Failed to save profile on server', err);
        // Queue update for background retry and persist locally
        void authService.queuePendingProfileUpdate(updated.id, {
          fullName: updated.fullName,
          username: updated.username,
          email: updated.email,
        });
        void setItem('user', JSON.stringify(updated));
        setUser(updated);
        // Inform user that changes were saved locally and queued for sync
        uiToast.info(
          notifyLine(
            'Thông báo',
            'Không thể lưu hồ sơ lên server ngay bây giờ. Thay đổi đã được lưu cục bộ và sẽ tự động đồng bộ khi có kết nối.',
          ),
        );
      }
    } else {
      // Local/demo mode: persist locally and into overrides so it survives logout/login demo
      void setItem('user', JSON.stringify(updated));
      setUser(updated);

      try {
        const oRaw = getItem('users_overrides');
        const overrides = oRaw ? (JSON.parse(oRaw) as Record<string, User>) : {};
        if (updated.id) {
          overrides[updated.id] = updated;
          void setItem('users_overrides', JSON.stringify(overrides));
        }
      } catch (err) {
        console.error('Failed to write user override', err);
      }
    }

    setIsEditOpen(false);
    uiToast.success(notifyLine('Thành công', 'Lưu hồ sơ thành công'));
  };

  // Helper: normalize role to friendly Vietnamese label
  const formatRole = (r?: string) => {
    if (!r) return 'Khách';
    const s = String(r).toLowerCase();
    if (s === UserRole.EXPERT.toLowerCase() || s.includes('expert')) return 'Chuyên gia';
    if (s === UserRole.CONTRIBUTOR.toLowerCase() || s.includes('contrib')) return 'Người đóng góp';
    if (s === UserRole.RESEARCHER.toLowerCase() || s.includes('research')) return 'Nhà nghiên cứu';
    if (s === UserRole.ADMIN.toLowerCase() || s.includes('admin')) return 'Quản trị viên';
    return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  };

  /** Tránh kẹt position:fixed / overflow từ modal trang khác khi vào Hồ sơ */
  useLayoutEffect(() => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
  }, []);

  // Disable body scroll when dialogs are open
  useEffect(() => {
    if (isEditOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        const n = parseInt(scrollY.replace('px', ''), 10);
        if (!Number.isNaN(n)) window.scrollTo(0, -n);
      }
    }
    return () => {
      // Cleanup
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isEditOpen]);

  // Handle ESC key to close dialogs
  useEffect(() => {
    if (!isEditOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditOpen) setIsEditOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isEditOpen]);

  const profileSurfaceClassName = cn(
    SURFACE_CARD,
    'rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl',
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">Hồ sơ</h1>
          <BackButton />
        </div>

        <div className="prose max-w-none">
          <div
            className={cn(profileSurfaceClassName, 'p-8 mb-8')}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-semibold mb-4 text-neutral-900">Thông tin tài khoản</h2>
              <button
                type="button"
                onClick={openEdit}
                className="px-4 py-2 rounded-xl bg-secondary-100/90 hover:bg-secondary-200/90 text-secondary-800 font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              >
                Chỉnh sửa hồ sơ
              </button>
            </div>

            <p className="text-neutral-700 font-medium leading-relaxed mb-4">
              <strong>Tên:</strong> {user?.fullName || user?.username} <br />
              <strong>Vai trò:</strong> {formatRole(user?.role)} <br />
              <strong>Email:</strong> {user?.email || '—'}
            </p>
            <p className="text-neutral-700 font-medium leading-relaxed">
              Tại đây bạn có thể quản lý thông tin cá nhân và theo dõi trạng thái các đóng góp mà
              bạn đã gửi tới VietTune.
            </p>
          </div>

          {/* Edit Profile Modal */}
          {isEditOpen &&
            createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsEditOpen(false);
                }}
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
              >
                <div
                  className="rounded-2xl border border-neutral-300/80 bg-surface-panel shadow-2xl backdrop-blur-sm max-w-lg w-full p-6 pointer-events-auto transform"
                  style={{
                    animation: 'slideUp 0.3s ease-out',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900">Chỉnh sửa hồ sơ</h3>
                    <button
                      onClick={() => setIsEditOpen(false)}
                      className="p-1.5 rounded-xl hover:bg-neutral-200/50 transition-colors duration-200 text-neutral-600 hover:text-neutral-800 cursor-pointer"
                      aria-label="Đóng"
                    >
                      <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                  </div>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label
                        htmlFor="profile-edit-fullname"
                        className="block text-sm font-medium text-neutral-800 mb-2"
                      >
                        Họ và tên
                      </label>
                      <input
                        id="profile-edit-fullname"
                        type="text"
                        value={formFullName}
                        onChange={(e) => {
                          setFormFullName(e.target.value);
                          if (touchedFullName) validate();
                        }}
                        onBlur={() => {
                          setTouchedFullName(true);
                          validate();
                        }}
                        className="w-full px-5 py-3 text-neutral-900 placeholder-neutral-500 border border-neutral-400 focus:outline-none focus:border-primary-500 transition-colors rounded-xl bg-surface-panel"
                      />
                      {touchedFullName && errors.fullName && (
                        <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="profile-edit-username"
                        className="block text-sm font-medium text-neutral-800 mb-2"
                      >
                        Tên người dùng
                      </label>
                      <input
                        id="profile-edit-username"
                        type="text"
                        value={formUsername}
                        onChange={(e) => {
                          setFormUsername(e.target.value);
                          if (touchedUsername) validate();
                        }}
                        onBlur={() => {
                          setTouchedUsername(true);
                          validate();
                        }}
                        className="w-full px-5 py-3 text-neutral-900 placeholder-neutral-500 border border-neutral-400 focus:outline-none focus:border-primary-500 transition-colors rounded-xl bg-surface-panel"
                      />
                      {touchedUsername && errors.username && (
                        <p className="text-sm text-red-600 mt-1">{errors.username}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="profile-edit-email"
                        className="block text-sm font-medium text-neutral-800 mb-2"
                      >
                        Email
                      </label>
                      <input
                        id="profile-edit-email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => {
                          setFormEmail(e.target.value);
                          if (touchedEmail) validate();
                        }}
                        onBlur={() => {
                          setTouchedEmail(true);
                          validate();
                        }}
                        className="w-full px-5 py-3 text-neutral-900 placeholder-neutral-500 border border-neutral-400 focus:outline-none focus:border-primary-500 transition-colors rounded-xl bg-surface-panel"
                      />
                      {touchedEmail && errors.email && (
                        <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditOpen(false)}
                        className="px-4 py-2 rounded-xl bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        disabled={!isValidSnapshot()}
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        Lưu
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body,
            )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div
              className={cn(profileSurfaceClassName, 'p-6')}
            >
              <div className="bg-primary-100/90 rounded-xl w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
                <Target className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Giới thiệu bản thân</h3>
              <p className="text-neutral-700 font-medium">
                Một nơi để giới thiệu bản thân, chia sẻ động lực đóng góp và tôn vinh truyền thống
                âm nhạc của cộng đồng.
              </p>
            </div>

            <div
              className={cn(profileSurfaceClassName, 'p-6')}
            >
              <div className="bg-secondary-100/90 rounded-xl w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
                <Users className="h-6 w-6 text-secondary-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Sức mạnh cộng đồng</h3>
              <p className="text-neutral-700 font-medium">
                Kết nối với chuyên gia và người yêu nhạc để xác minh, duy trì và lan tỏa giá trị văn
                hóa.
              </p>
            </div>
          </div>

          <div
            className={cn(profileSurfaceClassName, 'p-6 mb-8')}
          >
            <div className="bg-primary-100/90 rounded-xl w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
              <Heart className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-neutral-900">Mục tiêu</h3>
            <p className="text-neutral-700 font-medium">
              Hỗ trợ việc thu thập, lưu trữ và phổ biến các bản thu truyền thống theo chuẩn khoa học
              và tôn trọng bản quyền.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
