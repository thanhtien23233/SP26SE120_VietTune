import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, User, LogOut, Menu, X, MessageCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types";
import { APP_NAME, INTELLIGENCE_NAME } from "@/config/constants";
import logo from "@/components/image/VietTune logo.png";
import { sessionSetItem } from "@/services/storageService";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  // Account dropdown refs/state
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const firstMenuItemRef = useRef<HTMLAnchorElement | null>(null);

  const handleLogout = () => {
    // Set fromLogout before navigate so LoginPage sees it on mount and hides "Trở về".
    sessionSetItem("fromLogout", "1");
    // Navigate first so we never render a "logged out" state on the current
    // page (which can show blank, e.g. AdminGuard returns null when !user).
    navigate("/login", { replace: true });
    queueMicrotask(() => logout());
  };

  // Close menu on outside click and Escape key; update position on resize/scroll
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setIsMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
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
  return (
    <header className="fixed top-0 left-0 right-0 z-[60] pt-4 px-4">
      <nav className="bg-gradient-to-br from-primary-700 to-primary-800 rounded-full shadow-lg backdrop-blur-sm">
        <div className="px-6 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
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

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:justify-center lg:gap-3 xl:gap-4 flex-1 mx-4">
              {user?.role === "ADMIN" ? (
                <Link
                  to="/admin"
                  className="text-white text-sm font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors whitespace-nowrap px-2 py-1"
                >
                  Quản trị hệ thống
                </Link>
              ) : (
                <Link
                  to="/upload"
                  className="text-white text-sm font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors whitespace-nowrap px-2 py-1"
                >
                  Đóng góp bản thu
                </Link>
              )}
              {user?.role === "EXPERT" || !user || user?.role === "ADMIN" || user?.role === UserRole.RESEARCHER ? (
                <Link
                  to="/instruments"
                  className="text-white text-sm font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors whitespace-nowrap px-2 py-1"
                >
                  Nhạc cụ truyền thống
                </Link>
              ) : (
                <Link
                  to="/contributions"
                  className="text-white text-sm font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors whitespace-nowrap px-2 py-1"
                >
                  Đóng góp của bạn
                </Link>
              )}
              <Link
                to="/ethnicities"
                className="text-white text-sm font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors whitespace-nowrap px-2 py-1"
              >
                Dân tộc Việt Nam
              </Link>
              <Link
                to="/masters"
                className="text-white text-sm font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors whitespace-nowrap px-2 py-1"
              >
                Nghệ nhân âm nhạc
              </Link>
              <Link
                to="/about"
                className="text-white text-sm font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors whitespace-nowrap px-2 py-1"
              >
                Giới thiệu VietTune
              </Link>
            </div>

            {/* Right side buttons */}
            <div className="hidden lg:flex lg:items-center lg:space-x-3 flex-shrink-0">
              <Link
                to="/search"
                className="p-2 text-white hover:text-secondary-300 active:text-secondary-400 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              >
                <Search className="h-5 w-5" strokeWidth={2.5} />
              </Link>
              <Link
                to="/chatbot"
                className="p-2 text-white hover:text-secondary-300 active:text-secondary-400 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                aria-label={INTELLIGENCE_NAME}
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
              </Link>
              {(user?.role === UserRole.CONTRIBUTOR || user?.role === UserRole.EXPERT || user?.role === UserRole.ADMIN) && (
                <Link
                  to="/notifications"
                  className="p-2 text-white hover:text-secondary-300 active:text-secondary-400 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Thông báo"
                >
                  <Bell className="h-5 w-5" strokeWidth={2.5} />
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  {/* Account menu - open on click, rendered into portal and styled like SearchableDropdown */}
                  <div className="relative">
                    {/* Button - click toggles menu */}
                    <button
                      ref={(el) => (buttonRef.current = el)}
                      type="button"
                      onClick={() => setIsMenuOpen((s) => !s)}
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      className="flex items-center gap-1.5 text-sm px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer min-w-[140px] justify-center"
                    >
                      <User className="h-4 w-4" strokeWidth={2.5} />
                      <span className="text-xs font-medium">{user?.username}</span>
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
                    className="px-4 py-2 text-sm text-white font-semibold hover:text-secondary-300 active:text-secondary-400 transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm px-4 py-2 bg-gradient-to-br from-secondary-500 to-secondary-600 hover:from-secondary-400 hover:to-secondary-500 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-secondary-500/40 hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center justify-end">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 text-white hover:text-secondary-300 active:text-secondary-400 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" strokeWidth={2.5} />
                ) : (
                  <Menu className="h-6 w-6" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden pt-4 mt-4 space-y-2 border-t border-white/20">
              {user?.role === "ADMIN" ? (
                <Link
                  to="/admin"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Quản trị hệ thống
                </Link>
              ) : (
                <Link
                  to="/upload"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Đóng góp
                </Link>
              )}
              {user?.role === "EXPERT" || !user || user?.role === "ADMIN" || user?.role === UserRole.RESEARCHER ? (
                <Link
                  to="/instruments"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Nhạc cụ truyền thống
                </Link>
              ) : (
                <Link
                  to="/contributions"
                  className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Đóng góp của bạn
                </Link>
              )}
              <Link
                to="/ethnicities"
                className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dân tộc Việt Nam
              </Link>
              <Link
                to="/masters"
                className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Nghệ nhân âm nhạc
              </Link>
              <Link
                to="/about"
                className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Về VietTune
              </Link>
              <Link
                to="/search"
                className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tìm kiếm
              </Link>
              <Link
                to="/semantic-search"
                className="block px-4 py-3 text-white font-medium hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tìm theo ý nghĩa
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
                  {user?.role === "ADMIN" && (
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