import BackButton from '@/components/common/BackButton';

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Điều khoản và Điều kiện
          </h1>
          <BackButton />
        </div>

        <div className="prose max-w-none space-y-6">
          {/* Preamble */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <p className="text-neutral-700 font-medium leading-relaxed">
              <strong className="text-neutral-900">Lưu ý quan trọng:</strong> Vui lòng đọc kỹ các
              Điều khoản và Điều kiện này trước khi sử dụng Nền tảng VietTune. Bằng việc truy cập,
              đăng ký tài khoản hoặc sử dụng bất kỳ tính năng nào của Nền tảng, Người dùng được xem
              là đã đọc, hiểu rõ và đồng ý ràng buộc bởi toàn bộ nội dung của văn bản này.
            </p>
          </div>

          {/* 1. Definitions */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 1. Định nghĩa và giải thích thuật ngữ
            </h2>
            <p className="text-neutral-700 font-medium leading-relaxed mb-4">
              Trong văn bản Điều khoản và Điều kiện này, các thuật ngữ dưới đây được hiểu như sau:
            </p>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>1.1. "Nền tảng" hoặc "VietTune"</strong>: Hệ thống lưu trữ âm nhạc truyền
                thống Việt Nam trực tuyến, bao gồm website, ứng dụng di động và các dịch vụ liên
                quan do VietTune vận hành.
              </p>
              <p className="leading-relaxed">
                <strong>1.2. "Người dùng"</strong>: Cá nhân hoặc tổ chức truy cập, đăng ký và/hoặc
                sử dụng Nền tảng, bao gồm nhưng không giới hạn ở người đóng góp nội dung, người
                nghiên cứu và người xem.
              </p>
              <p className="leading-relaxed">
                <strong>1.3. "Nội dung"</strong>: Toàn bộ dữ liệu, thông tin, tài liệu được tải lên,
                chia sẻ hoặc công bố trên Nền tảng, bao gồm nhưng không giới hạn ở: bản ghi âm
                thanh, hình ảnh, video, văn bản mô tả, siêu dữ liệu và bình luận.
              </p>
              <p className="leading-relaxed">
                <strong>1.4. "Di sản văn hóa phi vật thể"</strong>: Các giá trị văn hóa truyền thống
                được truyền từ thế hệ này sang thế hệ khác, bao gồm âm nhạc, bài hát, điệu múa, nghi
                lễ và các hình thức biểu đạt văn hóa của 54 dân tộc Việt Nam.
              </p>
              <p className="leading-relaxed">
                <strong>1.5. "Quản trị viên"</strong>: Cá nhân được VietTune ủy quyền quản lý, kiểm
                duyệt và xác minh nội dung trên Nền tảng.
              </p>
              <p className="leading-relaxed">
                <strong>1.6. "Tài khoản"</strong>: Hồ sơ điện tử được tạo lập khi Người dùng đăng ký
                sử dụng Nền tảng, bao gồm thông tin định danh và quyền truy cập tương ứng.
              </p>
            </div>
          </div>

          {/* 2. General Provisions */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">Điều 2. Quy định chung</h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>2.1. Phạm vi điều chỉnh:</strong> Điều khoản và Điều kiện này điều chỉnh mọi
                hoạt động truy cập, sử dụng Nền tảng VietTune và mối quan hệ pháp lý giữa VietTune
                với Người dùng.
              </p>
              <p className="leading-relaxed">
                <strong>2.2. Đối tượng áp dụng:</strong> Văn bản này áp dụng cho tất cả cá nhân, tổ
                chức truy cập và sử dụng Nền tảng, không phân biệt mục đích sử dụng hay phương thức
                truy cập.
              </p>
              <p className="leading-relaxed">
                <strong>2.3. Hiệu lực:</strong> Điều khoản và Điều kiện này có hiệu lực kể từ thời
                điểm Người dùng lần đầu truy cập Nền tảng và duy trì hiệu lực trong suốt thời gian
                sử dụng.
              </p>
              <p className="leading-relaxed">
                <strong>2.4. Nguyên tắc cơ bản:</strong> VietTune hoạt động trên nguyên tắc phi lợi
                nhuận, hướng đến mục tiêu bảo tồn và phát huy giá trị di sản văn hóa phi vật thể của
                các dân tộc Việt Nam.
              </p>
            </div>
          </div>

          {/* 3. Mission and Purpose */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 3. Sứ mệnh và mục đích hoạt động
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>3.1.</strong> VietTune là nền tảng số hóa và lưu trữ chuyên biệt, được xây
                dựng với sứ mệnh gìn giữ, bảo tồn và phát huy giá trị âm nhạc truyền thống của 54
                dân tộc Việt Nam cho các thế hệ mai sau.
              </p>
              <p className="leading-relaxed">
                <strong>3.2.</strong> Nền tảng cung cấp các dịch vụ và tính năng sau:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Kho lưu trữ bản ghi âm nhạc truyền thống có hệ thống và khoa học</li>
                <li>Hệ thống tìm kiếm và phân loại thông minh theo nhiều tiêu chí</li>
                <li>Công cụ quản lý và đóng góp nội dung dựa trên cộng đồng</li>
                <li>Cơ sở dữ liệu về nhạc cụ truyền thống, nghệ nhân và vùng văn hóa</li>
                <li>Tài nguyên phục vụ nghiên cứu, giáo dục và truyền thông văn hóa</li>
              </ul>
              <p className="leading-relaxed">
                <strong>3.3.</strong> VietTune cam kết hoạt động minh bạch, tôn trọng bản sắc văn
                hóa và quyền lợi của các cộng đồng dân tộc là chủ nhân của di sản văn hóa.
              </p>
            </div>
          </div>

          {/* 4. User Account */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 4. Đăng ký và quản lý Tài khoản
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>4.1. Điều kiện đăng ký:</strong> Người dùng phải đủ 16 tuổi trở lên hoặc có
                sự đồng ý của người giám hộ hợp pháp để đăng ký Tài khoản. Đối với tổ chức, người
                đăng ký phải có thẩm quyền đại diện hợp pháp.
              </p>
              <p className="leading-relaxed">
                <strong>4.2. Nghĩa vụ khi đăng ký:</strong> Người dùng cam kết:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Cung cấp thông tin đăng ký chính xác, đầy đủ và trung thực</li>
                <li>Cập nhật kịp thời khi có thay đổi về thông tin cá nhân</li>
                <li>Không sử dụng thông tin giả mạo hoặc mạo danh người khác</li>
                <li>Không đăng ký nhiều tài khoản cho cùng một mục đích</li>
              </ul>
              <p className="leading-relaxed">
                <strong>4.3. Bảo mật Tài khoản:</strong> Người dùng có trách nhiệm:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Bảo mật thông tin đăng nhập và mật khẩu</li>
                <li>Không chia sẻ quyền truy cập Tài khoản cho bên thứ ba</li>
                <li>Thông báo ngay cho VietTune khi phát hiện truy cập trái phép</li>
                <li>Chịu trách nhiệm về mọi hoạt động phát sinh từ Tài khoản</li>
              </ul>
              <p className="leading-relaxed">
                <strong>4.4. Quyền của VietTune:</strong> VietTune có quyền từ chối đăng ký, tạm
                khóa hoặc xóa Tài khoản vi phạm các điều khoản này mà không cần thông báo trước.
              </p>
            </div>
          </div>

          {/* 5. Content Contribution */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 5. Đóng góp và sử dụng Nội dung
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>5.1. Tiêu chuẩn Nội dung:</strong> Nội dung đóng góp phải đáp ứng các tiêu
                chuẩn sau:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Liên quan trực tiếp đến âm nhạc truyền thống các dân tộc Việt Nam</li>
                <li>Có tính xác thực và giá trị bảo tồn văn hóa</li>
                <li>Không vi phạm quyền sở hữu trí tuệ của bên thứ ba</li>
                <li>Không chứa nội dung vi phạm pháp luật, đạo đức xã hội</li>
                <li>Được mô tả đầy đủ, chính xác theo mẫu quy định</li>
              </ul>
              <p className="leading-relaxed">
                <strong>5.2. Cam kết của Người đóng góp:</strong> Khi tải Nội dung lên Nền tảng,
                Người dùng cam kết và bảo đảm:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Là chủ sở hữu hợp pháp hoặc được ủy quyền sử dụng Nội dung</li>
                <li>Đã có sự đồng ý của các bên liên quan (nghệ nhân, cộng đồng...)</li>
                <li>Chịu trách nhiệm pháp lý về tính hợp pháp của Nội dung</li>
                <li>Thông tin mô tả là trung thực trong phạm vi hiểu biết</li>
              </ul>
              <p className="leading-relaxed">
                <strong>5.3. Nội dung bị cấm:</strong> Nghiêm cấm đóng góp các nội dung:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Xuyên tạc, bôi nhọ văn hóa, tín ngưỡng của các dân tộc</li>
                <li>Chứa thông tin sai lệch, gây hiểu nhầm về nguồn gốc văn hóa</li>
                <li>Vi phạm bản quyền, quyền liên quan của bên thứ ba</li>
                <li>Có tính chất thương mại, quảng cáo không được phép</li>
                <li>Chứa mã độc, virus hoặc gây hại cho hệ thống</li>
              </ul>
            </div>
          </div>

          {/* 6. Intellectual Property */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 6. Quyền sở hữu trí tuệ
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>6.1. Quyền của Người đóng góp:</strong> Người đóng góp giữ nguyên quyền sở
                hữu trí tuệ đối với Nội dung do mình tạo ra. Việc đóng góp không cấu thành việc
                chuyển nhượng quyền sở hữu.
              </p>
              <p className="leading-relaxed">
                <strong>6.2. Giấy phép sử dụng:</strong> Bằng việc đóng góp Nội dung, Người dùng cấp
                cho VietTune giấy phép không độc quyền, không thể thu hồi, miễn phí bản quyền, có
                hiệu lực toàn cầu để:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Lưu trữ, sao chép, hiển thị và phân phối Nội dung trên Nền tảng</li>
                <li>Chuyển đổi định dạng nhằm mục đích bảo tồn và tăng khả năng tiếp cận</li>
                <li>Cung cấp Nội dung cho mục đích nghiên cứu, giáo dục phi thương mại</li>
                <li>Tạo bản sao lưu và bảo vệ dữ liệu</li>
              </ul>
              <p className="leading-relaxed">
                <strong>6.3. Tôn trọng di sản cộng đồng:</strong> VietTune thừa nhận và tôn trọng
                quyền của các cộng đồng dân tộc đối với di sản văn hóa phi vật thể của họ. Nền tảng
                cam kết:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Ghi nhận nguồn gốc cộng đồng của các di sản văn hóa</li>
                <li>Tham vấn cộng đồng khi cần thiết về việc sử dụng nội dung nhạy cảm</li>
                <li>Bảo vệ kiến thức truyền thống khỏi việc sử dụng không phù hợp</li>
              </ul>
              <p className="leading-relaxed">
                <strong>6.4. Quyền sở hữu của VietTune:</strong> VietTune sở hữu độc quyền các quyền
                sở hữu trí tuệ đối với: giao diện, thiết kế, mã nguồn, thuật toán, cơ sở dữ liệu
                tổng hợp và các yếu tố đặc trưng khác của Nền tảng.
              </p>
            </div>
          </div>

          {/* 7. Verification Process */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 7. Quy trình xác minh và kiểm duyệt
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>7.1. Nguyên tắc xác minh:</strong> Mọi Nội dung đóng góp đều trải qua quy
                trình xác minh nhằm đảm bảo tính xác thực, chính xác và phù hợp với tiêu chuẩn của
                Nền tảng.
              </p>
              <p className="leading-relaxed">
                <strong>7.2. Quy trình xác minh:</strong> Bao gồm các bước:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Kiểm tra sơ bộ: Đánh giá tính đầy đủ và phù hợp của thông tin</li>
                <li>Xác minh chuyên môn: Đánh giá bởi chuyên gia và cộng đồng</li>
                <li>Phê duyệt: Quyết định công bố hoặc yêu cầu bổ sung, chỉnh sửa</li>
              </ul>
              <p className="leading-relaxed">
                <strong>7.3. Quyền của VietTune:</strong> VietTune có toàn quyền quyết định:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Phê duyệt, từ chối hoặc yêu cầu chỉnh sửa Nội dung</li>
                <li>Gỡ bỏ Nội dung vi phạm mà không cần thông báo trước</li>
                <li>Thay đổi trạng thái xác minh khi có thông tin mới</li>
              </ul>
              <p className="leading-relaxed">
                <strong>7.4. Phân loại Nội dung:</strong> Nội dung trên Nền tảng được phân loại theo
                trạng thái xác minh: "Đã xác minh", "Chờ xác minh" và "Cần bổ sung thông tin".
              </p>
            </div>
          </div>

          {/* 8. Privacy and Data Protection */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 8. Quyền riêng tư và bảo vệ dữ liệu cá nhân
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>8.1. Cam kết bảo vệ:</strong> VietTune cam kết bảo vệ quyền riêng tư và dữ
                liệu cá nhân của Người dùng theo quy định pháp luật Việt Nam về bảo vệ dữ liệu cá
                nhân và thông lệ quốc tế.
              </p>
              <p className="leading-relaxed">
                <strong>8.2. Thu thập dữ liệu:</strong> VietTune thu thập dữ liệu cá nhân cần thiết
                cho việc:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Tạo lập và quản lý Tài khoản người dùng</li>
                <li>Vận hành và cải thiện chất lượng Nền tảng</li>
                <li>Liên lạc và hỗ trợ người dùng</li>
                <li>Thực hiện nghĩa vụ pháp lý khi được yêu cầu</li>
              </ul>
              <p className="leading-relaxed">
                <strong>8.3. Nguyên tắc xử lý:</strong> Dữ liệu cá nhân được xử lý theo các nguyên
                tắc:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Chỉ thu thập dữ liệu cần thiết cho mục đích đã xác định</li>
                <li>Không bán, trao đổi dữ liệu với bên thứ ba vì mục đích thương mại</li>
                <li>Áp dụng biện pháp bảo mật kỹ thuật và tổ chức phù hợp</li>
                <li>Lưu trữ dữ liệu trong thời gian cần thiết theo quy định</li>
              </ul>
              <p className="leading-relaxed">
                <strong>8.4. Quyền của Người dùng:</strong> Người dùng có quyền yêu cầu truy cập,
                chỉnh sửa, xóa dữ liệu cá nhân theo quy định của pháp luật.
              </p>
            </div>
          </div>

          {/* 9. Community Standards */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 9. Quy tắc ứng xử cộng đồng
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>9.1. Nguyên tắc chung:</strong> Người dùng cam kết duy trì môi trường cộng
                đồng lành mạnh, tôn trọng và xây dựng trên Nền tảng.
              </p>
              <p className="leading-relaxed">
                <strong>9.2. Nghĩa vụ của Người dùng:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Tôn trọng người dùng khác và đa dạng văn hóa</li>
                <li>Đóng góp ý kiến mang tính xây dựng và thiện chí</li>
                <li>Tôn trọng tính thiêng liêng và nhạy cảm của di sản văn hóa</li>
                <li>Báo cáo hành vi vi phạm cho Quản trị viên</li>
                <li>Tuân thủ hướng dẫn và chỉ đạo của Quản trị viên</li>
              </ul>
              <p className="leading-relaxed">
                <strong>9.3. Hành vi bị cấm:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Quấy rối, đe dọa, xúc phạm người dùng khác</li>
                <li>Phân biệt đối xử dựa trên dân tộc, tôn giáo, giới tính</li>
                <li>Phát tán thông tin sai lệch, gây hoang mang</li>
                <li>Xúc phạm văn hóa, tín ngưỡng của bất kỳ cộng đồng nào</li>
                <li>Lợi dụng Nền tảng cho mục đích chính trị, tôn giáo cực đoan</li>
              </ul>
            </div>
          </div>

          {/* 10. Prohibited Activities */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 10. Các hành vi bị nghiêm cấm
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>10.1.</strong> Người dùng không được thực hiện các hành vi sau:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Truy cập trái phép vào hệ thống, dữ liệu hoặc Tài khoản của người khác</li>
                <li>Tải lên, phát tán mã độc, virus hoặc phần mềm gây hại</li>
                <li>Tấn công, làm gián đoạn hoặc gây quá tải hệ thống</li>
                <li>Thu thập dữ liệu tự động (scraping) mà không được phép</li>
                <li>Khai thác lỗ hổng bảo mật của Nền tảng</li>
              </ul>
              <p className="leading-relaxed">
                <strong>10.2.</strong> Nghiêm cấm các hành vi sử dụng sai mục đích:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Sử dụng Nội dung cho mục đích thương mại mà không được phép</li>
                <li>Sao chép, phân phối lại Nội dung vi phạm điều khoản bản quyền</li>
                <li>Mạo danh cá nhân, tổ chức hoặc cộng đồng khác</li>
                <li>Đăng tải thông tin sai lệch về nguồn gốc, xuất xứ Nội dung</li>
                <li>Lợi dụng Nền tảng để thực hiện hành vi vi phạm pháp luật</li>
              </ul>
            </div>
          </div>

          {/* 11-20 Combined */}
          <div
            className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
              Điều 11. Ghi nhận nguồn và trích dẫn
            </h2>
            <div className="space-y-3 text-neutral-700 mb-6">
              <p className="leading-relaxed">
                <strong>11.1. Nguyên tắc ghi nhận:</strong> Khi sử dụng Nội dung từ VietTune cho
                nghiên cứu, giáo dục hoặc các mục đích phi thương mại được phép, Người dùng phải ghi
                nhận đầy đủ nguồn.
              </p>
              <p className="leading-relaxed">
                <strong>11.2. Các thành phần cần ghi nhận:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Người đóng góp/tải lên Nội dung</li>
                <li>Nghệ nhân, người biểu diễn (nếu có thông tin)</li>
                <li>Cộng đồng dân tộc sở hữu di sản văn hóa</li>
                <li>Nền tảng VietTune và đường dẫn truy cập</li>
                <li>Ngày truy cập thông tin</li>
              </ul>
              <p className="leading-relaxed">
                <strong>11.3. Định dạng trích dẫn đề xuất:</strong> "[Tên bản thu]. Người đóng góp:
                [Tên]. Nghệ nhân: [Tên]. Dân tộc: [Tên dân tộc]. VietTune, [URL]. Truy cập ngày
                [dd/mm/yyyy]."
              </p>
            </div>

            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 pt-6 border-t border-neutral-200">
              Điều 12. Tuyên bố miễn trừ bảo đảm
            </h2>
            <div className="space-y-3 text-neutral-700 mb-6">
              <p className="leading-relaxed">
                <strong>12.1.</strong> Nền tảng VietTune được cung cấp trên cơ sở "nguyên trạng" (as
                is) và "sẵn có" (as available). VietTune không đưa ra bất kỳ bảo đảm nào, dù rõ ràng
                hay ngầm định.
              </p>
              <p className="leading-relaxed">
                <strong>12.2.</strong> Mặc dù VietTune nỗ lực xác minh Nội dung, chúng tôi không thể
                bảo đảm tính chính xác tuyệt đối của thông tin văn hóa, lịch sử được cung cấp bởi
                cộng đồng.
              </p>
            </div>

            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 pt-6 border-t border-neutral-200">
              Điều 13. Giới hạn trách nhiệm pháp lý
            </h2>
            <div className="space-y-3 text-neutral-700 mb-6">
              <p className="leading-relaxed">
                Trong phạm vi pháp luật cho phép, VietTune và các bên liên quan sẽ không chịu trách
                nhiệm về thiệt hại trực tiếp, gián tiếp, ngẫu nhiên, đặc biệt hoặc hệ quả phát sinh
                từ việc sử dụng Nền tảng.
              </p>
            </div>

            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 pt-6 border-t border-neutral-200">
              Điều 14-16. Bồi thường, Sửa đổi và Chấm dứt
            </h2>
            <div className="space-y-3 text-neutral-700 mb-6">
              <p className="leading-relaxed">
                <strong>14.</strong> Người dùng đồng ý bồi thường và bảo vệ VietTune khỏi mọi khiếu
                nại phát sinh từ vi phạm Điều khoản này.
              </p>
              <p className="leading-relaxed">
                <strong>15.</strong> VietTune có quyền sửa đổi Điều khoản này vào bất kỳ thời điểm
                nào. Thay đổi sẽ được thông báo qua email hoặc trên Nền tảng.
              </p>
              <p className="leading-relaxed">
                <strong>16.</strong> Người dùng có thể chấm dứt Tài khoản bất kỳ lúc nào. VietTune
                có quyền tạm ngừng hoặc chấm dứt Tài khoản vi phạm mà không cần thông báo trước.
              </p>
            </div>

            <h2 className="text-2xl font-semibold mb-4 text-neutral-800 pt-6 border-t border-neutral-200">
              Điều 17-20. Điều khoản chung
            </h2>
            <div className="space-y-3 text-neutral-700">
              <p className="font-medium leading-relaxed">
                <strong>17. Luật áp dụng:</strong> Điều khoản này được điều chỉnh theo pháp luật
                Việt Nam. Tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền tại Việt Nam.
              </p>
              <p className="leading-relaxed">
                <strong>18. Điều khoản tách rời:</strong> Nếu điều khoản nào bị vô hiệu, các điều
                khoản còn lại vẫn có hiệu lực.
              </p>
              <p className="leading-relaxed">
                <strong>19. Toàn bộ thỏa thuận:</strong> Văn bản này cấu thành toàn bộ thỏa thuận
                giữa Người dùng và VietTune.
              </p>
              <p className="leading-relaxed">
                <strong>20. Liên hệ:</strong> Email: contact@viettune.com | Hotline: 1900-xxxx-xx
              </p>
            </div>
          </div>

          {/* Last Updated */}
          <div
            className="rounded-2xl shadow-md border border-neutral-200 p-6 bg-surface-panel"
          >
            <p className="text-neutral-700">
              <strong className="text-neutral-900">Ngày có hiệu lực:</strong> 20 tháng 1 năm 2026
            </p>
            <p className="text-neutral-600 mt-3 italic">
              Bằng việc tiếp tục sử dụng Nền tảng VietTune, Người dùng xác nhận đã đọc, hiểu rõ và
              đồng ý ràng buộc bởi toàn bộ nội dung của Điều khoản và Điều kiện này.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
