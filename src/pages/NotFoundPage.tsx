import { Link } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-transparent">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="text-3xl font-semibold text-neutral-900 mb-4">Không tìm thấy trang</h2>
        <p className="text-neutral-600 font-medium mb-8">
          Trang bạn tìm kiếm không tồn tại hoặc đã bị chuyển đi.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <BackButton />
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
