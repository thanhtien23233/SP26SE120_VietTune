import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, User, LogOut, Menu, X, MessageCircle, CheckCircle, Edit3, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import type { AppNotification } from "@/types";
import { APP_NAME, INTELLIGENCE_NAME } from "@/config/constants";
import logo from "@/components/image/VietTune logo.png";
import { sessionSetItem } from "@/services/storageService";
import { recordingRequestService } from "@/services/recordingRequestService";
import { formatDateTime } from "@/utils/helpers";
import { buildLoginRedirectPath } from "@/utils/routeAccess";
import { getLayoutFeatureItems } from "@/utils/layoutFeatureItems";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Account dropdown refs/state
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const firstMenuItemRef = useRef<HTMLAnchorElement | null>(null);

  // Notifications dropdown refs/state
  const notiButtonRef = useRef<HTMLButtonElement | null>(null);
  const notiMenuRef = useRef<HTMLDivElement | null>(null);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      recordingRequestService.getNotificationsForRole(user.role).then(setNotifications);
      const t = setInterval(() => {
        recordingRequestService.getNotificationsForRole(user.role).then(setNotifications);
      }, 30000); // refresh every 30s
      return () => clearInterval(t);
    }
  }, [isAuthenticated, user?.role]);

  const handleLogout = () => {
    // Set fromLogout before navigate so LoginPage sees it on mount and hides "Trở về".
    sessionSetItem("fromLogout", "1");
    // Navigate first so we never render a "logged out" state on the current
    // page (which can show blank, e.g. AdminGuard returns null when !user).
    navigate(buildLoginRedirectPath(location.pathname), { replace: true });
    queueMicrotask(() => logout());
  };

  // Close menu on outside click and Escape key; update position on resize/scroll
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setIsMenuOpen(false);
      }
      if (!notiMenuRef.current?.contains(target) && !notiButtonRef.current?.contains(target)) {
        setIsNotiOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setIsNotiOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Focus first menu item when opened
  useEffect(() => {
    if (isMenuOpen) {
      // small delay to ensure portal element mounted
      setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 0);
    }
  }, [isMenuOpen]);
  const headerFeatureItems = getLayoutFeatureItems(user ?? null);

  return (
    <header className="fixed top-0 left-0 right-0 z-[60] pt-4 px-4">
      {/* overflow-visible: dropdown tài khoản + thông báo (absolute) nằm dưới nút; overflow-hidden sẽ cắt mất menu */}
      <nav className="overflow-visible rounded-2xl bg-gradient-to-br from-primary-700 to-primary-800 shadow-lg backdrop-blur-sm">
        <div className="px-6 py-2.5">
          <div className="flex items-center justify-between gap-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-5 xl:gap-8">
            {/* Logo */}
            <div className="flex shrink-0 items-center justify-self-start">
              <Link to="/" className="group flex items-center space-x-2 text-white transition-colors hover:text-secondary-300">
                <img
                  src={logo}
                  alt="VietTune Logo"
                  className="h-9 w-9 object-contain rounded-lg"
                />
                <span className="text-xl font-bold text-white transition-colors group-hover:text-secondary-300">
                  {APP_NAME}
                </span>
              </Link>
            </div>

            {/* Desktop: cột giữa — lối tắt căn giữa theo bề ngang thanh */}
            <div className="hidden min-w-0 justify-center justify-self-stretch px-2 lg:flex">
              <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 xl:gap-x-4">
                {headerFeatureItems.map((item, index) => (
                  <Link
                    key={`${item.to}-${index}`}
                    to={item.to}
                    className="max-w-[10rem] truncate px-1.5 py-1 text-center text-xs font-medium text-white/95 visited:text-white/95 transition-colors hover:text-secondary-300 active:text-secondary-400 xl:max-w-[12rem] xl:text-sm 2xl:max-w-none 2xl:whitespace-nowrap"
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                ))}
                {user?.role === UserRole.CONTRIBUTOR && user?.isActive ? (
                  <Link
                    to="/contributions"
                    className="whitespace-nowrap px-1.5 py-1 text-xs font-medium text-white/95 visited:text-white/95 transition-colors hover:text-secondary-300 active:text-secondary-400 xl:text-sm"
                  >
                    Đóng góp của bạn
                  </Link>
                ) : null}
                {user?.role === UserRole.RESEARCHER && user?.isActive ? (
                  <Link
                    to="/researcher"
                    className="whitespace-nowrap px-1.5 py-1 text-xs font-medium text-white/95 visited:text-white/95 transition-colors hover:text-secondary-300 active:text-secondary-400 xl:text-sm"
                  >
                    Cổng nghiên cứu
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Right: chat + thông báo + tài khoản — cùng chiều cao hàng với logo (h-9), tránh nút cao hơn nền đỏ */}
            <div className="hidden shrink-0 items-center justify-end gap-0.5 sm:gap-1 lg:flex xl:gap-2 justify-self-end min-h-0">
              <Link
                to="/chatbot"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white transition-colors duration-200 hover:bg-white/10 hover:text-secondary-300 active:text-secondary-400"
                aria-label={INTELLIGENCE_NAME}
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
              </Link>
              {(user?.role === UserRole.CONTRIBUTOR || user?.role === UserRole.EXPERT || user?.role === UserRole.ADMIN) && user?.isActive && (
                <div className="relative flex shrink-0 items-center">
                  <button
                    ref={(el) => (notiButtonRef.current = el)}
                    type="button"
                    onClick={() => setIsNotiOpen(!isNotiOpen)}
                    className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white transition-colors duration-200 hover:bg-white/10 hover:text-secondary-300 active:text-secondary-400"
                    aria-label="Thông báo"
                  >
                    <Bell className="h-5 w-5" strokeWidth={2.5} />
                    {notifications.some(n => !n.read) && (
                      <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-primary-800 bg-red-500" />
                    )}
                  </button>
                  {isNotiOpen && (
                    <div
                      ref={(el) => (notiMenuRef.current = el)}
                      className="absolute right-0 mt-2 rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden bg-[#FFFCF5] z-[70] w-80 sm:w-96 transition-all duration-300 flex flex-col"
                      style={{ top: '100%' }}
                    >
                      <div className="px-5 py-3 border-b border-neutral-200 flex justify-between items-center bg-white shadow-sm z-10">
                        <span className="font-semibold text-neutral-900">Thông báo mới</span>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length > 0 ? (
                          <ul className="divide-y divide-neutral-100">
                            {notifications.slice(0, 8).map((n) => (
                              <li
                                key={n.id}
                                className={`p-4 hover:bg-neutral-50 transition-colors ${!n.read ? 'bg-primary-50/50' : 'bg-white'}`}
                              >
                                <div className="flex gap-3">
                                  <div className="mt-0.5 flex-shrink-0">
                                    {n.type === "recording_deleted" ? <Trash2 className="h-5 w-5 text-red-600" strokeWidth={2.5} /> :
                                      n.type === "recording_edited" ? <Edit3 className="h-5 w-5 text-primary-600" strokeWidth={2.5} /> :
                                        n.type === "edit_submission_approved" || n.type === "expert_account_deletion_approved" ? <CheckCircle className="h-5 w-5 text-green-600" strokeWidth={2.5} /> :
                                          n.type === "delete_request_rejected" ? <X className="h-5 w-5 text-neutral-600" strokeWidth={2.5} /> :
                                            <Bell className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <p className="text-sm font-semibold text-neutral-900 truncate" title={n.title}>{n.title}</p>
                                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" title="Chưa đọc" />}
                                    </div>
                                    <p className="text-xs text-neutral-600 line-clamp-2" title={n.body}>{n.body}</p>
                                    <p className="text-[11px] text-neutral-400 mt-1">{formatDateTime(n.createdAt)}</p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-6 text-center text-neutral-500 text-sm">
                            Chưa có thông báo nào.
                          </div>
                        )}
                      </div>
                      <Link
                        to="/notifications"
                        onClick={() => setIsNotiOpen(false)}
                        className="block px-5 py-3 text-center text-sm font-medium text-primary-600 bg-neutral-50 hover:bg-primary-50 transition-colors border-t border-neutral-200 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
                      >
                        Xem tất cả thông báo
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated ? (
                <>
                  {/* Account menu - open on click, rendered into portal and styled like SearchableDropdown */}
                  <div className="relative flex shrink-0 items-center">
                    {/* Button - click toggles menu */}
                    <button
                      ref={(el) => (buttonRef.current = el)}
                      type="button"
                      onClick={() => setIsMenuOpen((s) => !s)}
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      className="flex h-9 max-w-[11rem] min-w-0 cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-2.5 text-left text-white shadow-sm transition-colors duration-200 hover:bg-white/25 sm:max-w-[13rem] sm:px-3"
                    >
                      <User className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                      <span className="min-w-0 truncate text-xs font-medium leading-none sm:text-sm">
                        {user?.username || user?.fullName || "Người dùng"}
                      </span>
                    </button>

                    {/* Menu anchored to header (non-portal so it moves with header and never shifts) */}
                    {isMenuOpen && (
                      <div
                        ref={(el) => (menuRef.current = el)}
                        className="absolute right-0 mt-2 rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden bg-[#FFFCF5] z-[70] w-56 transition-all duration-300"
                        style={{
                          top: '100%',
                        }}
                      >
                        <div className="max-h-60 overflow-y-auto">
                          <Link
                            to="/profile"
                            ref={firstMenuItemRef}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center px-5 py-3 text-sm text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700 transition-all duration-200 cursor-pointer"
                          >
                            <User className="h-4 w-4 mr-2 text-current" strokeWidth={2.5} />
                            Hồ sơ
                          </Link>
                          <button
                            onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                            className="w-full text-left px-5 py-3 text-sm text-primary-600 hover:bg-primary-100/90 hover:text-primary-700 transition-all duration-200 flex items-center cursor-pointer"
                          >
                            <LogOut className="h-4 w-4 mr-2" strokeWidth={2.5} />
                            Đăng xuất
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex h-9 items-center px-3 text-sm font-semibold text-white transition-colors hover:text-secondary-300 active:text-secondary-400"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="flex h-9 items-center rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 px-3 text-sm font-semibold text-white shadow-md transition-colors duration-300 hover:from-secondary-400 hover:to-secondary-500 hover:shadow-lg cursor-pointer"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center justify-end lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="cursor-pointer p-1.5 text-white transition-colors duration-200 hover:text-secondary-300 active:text-secondary-400"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" strokeWidth={2.5} />
                ) : (
                  <Menu className="h-6 w-6" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          {/* Mobile: cùng nền đỏ — lối tắt cuộn ngang */}
          <div className="border-t border-white/15 lg:hidden">
            <div className="flex gap-1 overflow-x-auto py-2 [-webkit-overflow-scrolling:touch]">
              {headerFeatureItems.map((item, index) => (
                <Link
                  key={`m-${item.to}-${index}`}
                  to={item.to}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white/95 transition-colors hover:bg-white/10 hover:text-secondary-300"
                >
                  {item.title}
                </Link>
              ))}
              {user?.role === UserRole.CONTRIBUTOR && user?.isActive ? (
                <Link
                  to="/contributions"
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white/95 transition-colors hover:bg-white/10 hover:text-secondary-300"
                >
                  Đóng góp của bạn
                </Link>
              ) : null}
              {user?.role === UserRole.RESEARCHER && user?.isActive ? (
                <Link
                  to="/researcher"
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white/95 transition-colors hover:bg-white/10 hover:text-secondary-300"
                >
                  Cổng nghiên cứu
                </Link>
              ) : null}
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden pt-4 mt-4 space-y-2 border-t border-white/20">
              {user?.role === UserRole.ADMIN && user?.isActive && (
                <Link
                  to="/admin"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Quản trị hệ thống
                </Link>
              )}
              {user?.role === UserRole.CONTRIBUTOR && user?.isActive && (
                <Link
                  to="/upload"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Đóng góp
                </Link>
              )}
              {user?.role === UserRole.CONTRIBUTOR && user?.isActive && (
                <Link
                  to="/contributions"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Đóng góp của bạn
                </Link>
              )}
               {user?.role === UserRole.RESEARCHER && user?.isActive && (
                <Link
                  to="/researcher"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Cổng nghiên cứu
                </Link>
              )}
              <Link
                to="/search"
                className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tìm kiếm
              </Link>
              <Link
                to="/chatbot"
                className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {INTELLIGENCE_NAME}
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/upload"
                    className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Tải lên
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Hồ sơ
                  </Link>
                  {(user?.role === UserRole.CONTRIBUTOR || user?.role === UserRole.EXPERT || user?.role === UserRole.ADMIN) && (
                    <Link
                      to="/notifications"
                      className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Thông báo
                    </Link>
                  )}
                  {user?.role === UserRole.ADMIN && (
                    <Link
                      to="/admin"
                      className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Quản trị hệ thống
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-secondary-300 font-medium hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 text-secondary-300 font-medium hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}