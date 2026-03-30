import UploadMusic from "@/components/features/UploadMusic";
import { BookOpen, LogIn, FileText, Upload, CheckCircle, Lightbulb, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import BackButton from "@/components/common/BackButton";
import { UserRole } from "@/types";

const guideButtonClass =
  "inline-flex items-center justify-center gap-2 h-11 px-6 py-0 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none";

export default function UploadPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showGuidePopup, setShowGuidePopup] = useState(false);

  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  // Always scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const isNotContributor = !user || user.role !== UserRole.CONTRIBUTOR;

  return (
    <div className="min-h-screen min-w-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header — responsive; wraps on small screens */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            {isEditMode ? "Chỉnh sửa bản thu" : "Đóng góp bản thu"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowGuidePopup(true)}
              className={guideButtonClass}
              title={isEditMode ? "Hướng dẫn chỉnh sửa" : "Hướng dẫn đóng góp"}
            >
              <BookOpen className="h-5 w-5" strokeWidth={2.5} />
              <span>{isEditMode ? "Hướng dẫn chỉnh sửa" : "Hướng dẫn đóng góp"}</span>
            </button>
            <BackButton />
          </div>
        </div>

        {/* Notice for non-Contributor users (not dimmed, always visible) */}
        {isNotContributor && (
          <div className="mb-6 sm:mb-8 border border-primary-200/80 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm text-center transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFF1F3' }}>
            <h2 className="text-lg sm:text-2xl font-semibold mb-3 sm:mb-4 text-primary-700">Bạn cần có tài khoản Người đóng góp để đóng góp bản thu</h2>
            <div className="text-primary-700 text-base mb-4 font-medium">Vui lòng đăng nhập bằng tài khoản Người đóng góp để sử dụng chức năng này.</div>
            <button
              className="inline-flex items-center justify-center gap-2 h-11 px-6 py-0 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none mx-auto"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "auto" });
                navigate("/login?redirect=/upload");
              }}
              type="button"
            >
              <LogIn className="h-5 w-5" strokeWidth={2.5} />
              Đăng nhập
            </button>
          </div>
        )}

        {/* Main Upload Form (dimmed and disabled for non-Contributor) — responsive padding */}
        <div
          className={`rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 transition-all duration-300 hover:shadow-xl min-w-0 overflow-x-hidden ${isNotContributor ? "opacity-50 pointer-events-none select-none" : ""}`}
          style={{ backgroundColor: '#FFFCF5' }}
        >
          <UploadMusic />
        </div>
      </div>

      {/* Pop-up Hướng dẫn đóng góp (overlay giống ModerationPage) */}
      {showGuidePopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-popup-title"
          style={{
            animation: "fadeIn 0.3s ease-out",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            position: "fixed",
          }}
          onClick={() => setShowGuidePopup(false)}
        >
          <div
            className="rounded-2xl border border-neutral-300/80 shadow-2xl backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform bg-white"
            style={{ animation: "slideUp 0.3s ease-out", backgroundColor: "#FFFCF5" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200/80 flex-shrink-0">
              <h2 id="guide-popup-title" className="text-xl sm:text-2xl font-semibold text-neutral-900 flex items-center gap-3">
                <div className="p-2 bg-secondary-100/90 rounded-lg shadow-sm">
                  <BookOpen className="h-5 w-5 text-secondary-600" strokeWidth={2.5} />
                </div>
                Hướng dẫn đóng góp
              </h2>
              <button
                type="button"
                onClick={() => setShowGuidePopup(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 min-h-0">
              {/* Card 1: Chuẩn bị tài liệu */}
              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-primary-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary-100/90 shadow-sm">
                      <FileText className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Chuẩn bị tài liệu</h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 flex-shrink-0">•</span>
                      <span>Ghi âm hoặc quay video chất lượng tốt nhất có thể</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 flex-shrink-0">•</span>
                      <span>Chuẩn bị thông tin về nguồn gốc, nghệ nhân, bối cảnh</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 flex-shrink-0">•</span>
                      <span>Nếu có, chụp ảnh nhạc cụ và người biểu diễn</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-600 flex-shrink-0">•</span>
                      <span>Phiên âm lời bài hát (nếu biết chữ viết dân tộc)</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 2: Tải lên & Điền thông tin */}
              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-sky-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-sky-100/90 shadow-sm">
                      <Upload className="h-5 w-5 text-sky-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Tải lên & Điền thông tin</h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0">•</span>
                      <span>Làm theo 3 bước hướng dẫn trên hệ thống</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0">•</span>
                      <span>Điền đầy đủ metadata: dân tộc, vùng miền, nghi lễ,...</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0">•</span>
                      <span>Tải lên file audio (bắt buộc) và video (nếu có)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-600 flex-shrink-0">•</span>
                      <span>Bổ sung mọi thông tin hữu ích bạn biết</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 3: Xét duyệt bởi chuyên gia */}
              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-emerald-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-100/90 shadow-sm">
                      <CheckCircle className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Xét duyệt bởi chuyên gia</h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">•</span>
                      <span>Chuyên gia dân tộc học sẽ xem xét tài liệu</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">•</span>
                      <span>Kiểm tra tính xác thực và chất lượng</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">•</span>
                      <span>Có thể yêu cầu bổ sung thông tin nếu cần</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 flex-shrink-0">•</span>
                      <span>Thời gian xét duyệt: 5-10 ngày làm việc</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 4: Lời khuyên hữu ích */}
              <div className="flex rounded-xl border border-neutral-200/80 bg-white shadow-md overflow-hidden">
                <div className="w-1.5 sm:w-2 flex-shrink-0 bg-secondary-200/90" aria-hidden />
                <div className="flex-1 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-secondary-100/90 shadow-sm">
                      <Lightbulb className="h-5 w-5 text-secondary-600" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Lời khuyên hữu ích</h3>
                  </div>
                  <ul className="space-y-2 text-neutral-700 font-medium leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-secondary-600 flex-shrink-0">•</span>
                      <span>Ghi âm ở nơi yên tĩnh để giảm tiếng ồn nền</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-secondary-600 flex-shrink-0">•</span>
                      <span>Phỏng vấn nghệ nhân về câu chuyện, ý nghĩa bài hát</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-secondary-600 flex-shrink-0">•</span>
                      <span>Ghi chép chi tiết mọi thông tin bạn biết</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}