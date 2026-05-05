import { Link } from 'react-router-dom';

import logo from '@/components/image/viettune_logo_img';
import { APP_NAME } from '@/config/constants';

interface AuthHeaderProps {
  className?: string;
  hideHomeLink?: boolean;
}

export default function AuthHeader({ className = '', hideHomeLink = false }: AuthHeaderProps) {
  return (
    <header className={`w-full px-4 pt-4 ${className}`.trim()}>
      <nav className="rounded-2xl bg-gradient-to-br from-primary-700 to-primary-800 shadow-lg backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="group flex min-w-0 items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-secondary-300 sm:text-base"
            >
              <img
                src={logo}
                alt="VietTune Logo"
                className="h-9 w-9 rounded-lg object-contain"
                loading="eager"
                // @ts-expect-error -- fetchpriority is valid HTML but React types lag behind
                fetchpriority="high"
                decoding="async"
                width={36}
                height={36}
              />
              <span className="truncate font-bold text-white transition-colors group-hover:text-secondary-300">
                {APP_NAME}
              </span>
            </Link>

            {!hideHomeLink && (
              <Link
                to="/"
                className="hidden text-sm font-medium text-white/95 transition-colors hover:text-secondary-300 sm:inline-flex"
              >
                Trang chủ
              </Link>
            )}
          </div>

          <Link
            to="/login"
            className="inline-flex items-center rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 hover:text-secondary-300"
          >
            Đăng nhập
          </Link>
        </div>
      </nav>
    </header>
  );
}
