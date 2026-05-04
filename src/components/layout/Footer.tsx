import { Mail, Facebook, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

import logo from '@/components/image/VietTune logo.png';
import { APP_NAME } from '@/config/constants';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';
import { uiToast, notifyLine } from '@/uiToast';

export default function Footer() {
  const user = useAuthStore((s) => s.user);
  const isExpert = user?.role === UserRole.EXPERT;
  const handleCopyEmail = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const email = 'contact@viettune.com';

    navigator.clipboard
      .writeText(email)
      .then(() => {
        uiToast.success(
          notifyLine('Thành công', 'Đã sao chép địa chỉ email thành công!'),
          undefined,
          { duration: 2000 },
        );
      })
      .catch(() => {
        uiToast.error(notifyLine('Lỗi', 'Không thể copy email. Vui lòng thử lại!'));
      });
  };
  return (
    <footer className="pb-4 px-4">
      <div className="bg-gradient-to-br from-primary-700 to-primary-800 rounded-2xl px-8 py-12 shadow-lg backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr_1fr] gap-8 sm:gap-12 lg:gap-16 gap-y-10">
          {/* About */}
          <div className="min-w-0">
            <Link
              to="/"
              className="group flex items-center space-x-3 mb-4 w-fit text-white transition-colors hover:text-secondary-300"
            >
              <img src={logo} alt="VietTune Logo" className="h-10 w-10 object-contain rounded-xl" />
              <span className="text-xl font-bold text-white transition-colors group-hover:text-secondary-300">
                {APP_NAME}
              </span>
            </Link>
            <p className="text-white/90 text-sm leading-relaxed">
              Hệ thống lưu giữ âm nhạc truyền thống Việt Nam
              <br />
              qua nền tảng chia sẻ và lưu trữ cộng đồng
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center lg:ml-8">
            <div className="text-left w-full max-w-[200px]">
              <h3 className="font-bold text-lg mb-4 text-white">Liên kết nhanh</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to={isExpert ? '/moderation' : '/upload'}
                    className="text-white/90 font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors"
                  >
                    {isExpert ? 'Kiểm duyệt bản thu' : 'Đóng góp bản thu'}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/instruments"
                    className="text-white/90 font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors"
                  >
                    Nhạc cụ truyền thống
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ethnicities"
                    className="text-white/90 font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors"
                  >
                    Dân tộc Việt Nam
                  </Link>
                </li>
                <li>
                  <Link
                    to="/masters"
                    className="text-white/90 font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors"
                  >
                    Nghệ nhân âm nhạc
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Resources */}
          <div className="flex flex-col items-center lg:ml-8">
            <div className="text-left w-full max-w-[200px]">
              <h3 className="font-bold text-lg mb-4 text-white">Về VietTune</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    to="/about"
                    className="text-white/90 font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors"
                  >
                    Giới thiệu VietTune
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-white/90 font-medium hover:text-secondary-300 active:text-secondary-400 transition-colors"
                  >
                    Điều khoản và Điều kiện
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-center lg:ml-20">
            <div className="text-left w-full max-w-[200px]">
              <h3 className="font-bold text-lg mb-4 text-white">Kết nối</h3>
              <div className="flex space-x-4 mb-6">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white/10 hover:bg-secondary-500 text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                  title="Facebook"
                >
                  <Facebook className="h-5 w-5" strokeWidth={2.5} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white/10 hover:bg-secondary-500 text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                  title="YouTube"
                >
                  <Youtube className="h-5 w-5" strokeWidth={2.5} />
                </a>
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white/10 hover:bg-secondary-500 text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 cursor-pointer"
                  title="Email"
                >
                  <Mail className="h-5 w-5" strokeWidth={2.5} />
                </a>
              </div>
              <div className="space-y-2">
                <p className="text-white text-sm font-medium">Email:</p>
                <a
                  href="mailto:contact@viettune.com"
                  onClick={handleCopyEmail}
                  className="text-white/90 text-sm hover:text-secondary-300 transition-colors cursor-pointer"
                  title="Nhấn để sao chép địa chỉ email"
                >
                  contact@viettune.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-10 pt-8 text-center">
          <p className="text-white/90 text-sm font-medium">
            Bản quyền © {new Date().getFullYear()} {APP_NAME}. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
}
