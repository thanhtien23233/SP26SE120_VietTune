import { Target, Users, Heart, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Giới thiệu VietTune
          </h1>
          <BackButton />
        </div>

        <div className="prose max-w-none">
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">Sứ mệnh</h2>
            <p className="text-neutral-700 font-medium leading-relaxed mb-4">
              54 dân tộc Việt Nam có kho tàng âm nhạc phong phú được truyền miệng qua nhiều đời.
              Nhiều nghệ nhân lớn tuổi nắm giữ kiến thức quý báu về nhạc cụ, kỹ thuật biểu diễn, bài
              hát nghi lễ và phong cách vùng miền. Đáng tiếc là các bản thu hầu hết chỉ là băng
              cassette rải rác ở các trung tâm văn hóa tỉnh, khó tiếp cận và chưa được lưu giữ bài
              bản.
            </p>
            <p className="text-neutral-700 font-medium leading-relaxed">
              VietTune ra đời để giải quyết vấn đề này - một nền tảng cộng đồng chuyên biệt giúp lưu
              giữ di sản âm nhạc trước khi quá muộn. Chúng tôi cung cấp công cụ tìm kiếm thông minh
              và quản lý nội dung để xây dựng kho tư liệu đáng tin cậy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div
              className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
            >
              <div className="bg-primary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
                <Target className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Điểm khác biệt</h3>
              <p className="text-neutral-700 font-medium">
                Khác với các nền tảng nhạc giải trí, âm nhạc truyền thống cần thông tin chuyên sâu:
                hệ thống điệu thức, ngữ cảnh nghi lễ, cách chế tác nhạc cụ và đặc trưng vùng miền.
                Đó là điều chúng tôi tập trung.
              </p>
            </div>

            <div
              className="rounded-2xl shadow-md border border-neutral-200 p-6 bg-surface-panel"
            >
              <div className="bg-secondary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
                <Users className="h-6 w-6 text-secondary-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Sức mạnh cộng đồng</h3>
              <p className="text-neutral-700 font-medium">
                Mọi người có thể đóng góp, các chuyên gia sẽ kiểm duyệt. Cùng nhau chúng ta gìn giữ
                di sản văn hóa cho thế hệ mai sau.
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl border border-neutral-200/80 p-6 mb-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <div className="bg-primary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
              <Heart className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-neutral-900">Mục đích</h3>
            <p className="text-neutral-700">
              Đây là đồ án tốt nghiệp đại học với sứ mệnh bảo tồn di sản âm nhạc Việt Nam. Mỗi đóng
              góp của bạn giúp lưu giữ những kiến thức văn hóa quý báu.
            </p>
          </div>

          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">Tính năng chính</h2>
            <ul className="space-y-3 text-neutral-700">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>
                  <strong>Thông tin chi tiết:</strong> Dữ liệu chuyên sâu về hệ thống điệu thức, ngữ
                  cảnh nghi lễ và ý nghĩa văn hóa
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>
                  <strong>Tìm kiếm linh hoạt:</strong> Lọc theo dân tộc, vùng miền, nhạc cụ và ngữ
                  cảnh biểu diễn
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>
                  <strong>Kiểm duyệt chuyên nghiệp:</strong> Nội dung được xác minh bởi các chuyên
                  gia và nghệ nhân
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>
                  <strong>Lưu trữ bền vững:</strong> Âm thanh chất lượng cao cùng hồ sơ đầy đủ
                </span>
              </li>
            </ul>
          </div>

          {/* Terms and Conditions Link */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 text-center transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <div className="bg-neutral-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto shadow-sm">
              <FileText className="h-6 w-6 text-neutral-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-neutral-900">Điều khoản và Điều kiện</h3>
            <p className="text-neutral-700 mb-6">
              Tìm hiểu các quy định và chính sách khi sử dụng nền tảng VietTune.
            </p>
            <Link
              to="/terms"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <FileText className="h-5 w-5" strokeWidth={2.5} />
              Xem Điều khoản và Điều kiện
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
