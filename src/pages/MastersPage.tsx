import BackButton from '@/components/common/BackButton';

export default function MastersPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Nghệ nhân âm nhạc
          </h1>
          <BackButton />
        </div>

        {/* Introduction */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Những người giữ lửa truyền thống
          </h2>
          <p className="text-neutral-600 font-medium leading-relaxed mb-4">
            Các nghệ nhân là kho kiến thức sống về âm nhạc truyền thống. Họ nắm giữ cách làm nhạc
            cụ, kỹ thuật biểu diễn và ý nghĩa của từng giai điệu - đều được học qua nhiều đời.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Việc ghi chép lại công trình của họ là cấp thiết - đây có thể là thế hệ cuối còn kết nối
            trực tiếp với truyền thống xưa. VietTune là nơi tôn vinh và lưu giữ di sản quý báu này.
          </p>
        </div>

        {/* Roles and Significance */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Vai trò của nghệ nhân âm nhạc
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Chuyên gia nghi lễ và thầy cúng
              </h3>
              <p className="leading-relaxed">
                Ở nhiều dân tộc, nghệ nhân vừa là người trình diễn vừa là trung gian tâm linh. Thầy{' '}
                <em>thần</em> của người Tày và Nùng thực hiện nghi lễ chữa lành, giao tiếp với thần
                linh và giữ gìn sức khỏe cộng đồng qua âm nhạc. Kiến thức của họ bao gồm không chỉ
                kỹ thuật biểu diễn mà còn thảo dược, bói toán và hiểu biết về vũ trụ.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Thợ làm nhạc cụ và người đổi mới
              </h3>
              <p className="leading-relaxed">
                Thợ khéo sở hữu kiến thức chuyên sâu về lựa chọn vật liệu, kỹ thuật chế tác, hệ
                thống điệu và đặc tính âm học. Họ biết loại tre nào tạo âm thanh tốt nhất, pha mặt
                trăng ảnh hưởng đến chất lượng gỗ ra sao, và phương pháp truyền thống tạo âm sắc đặc
                trưng. Nhiều người còn đổi mới trong khuôn khổ truyền thống, thích nghi nhạc cụ với
                bối cảnh biểu diễn thay đổi.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Ca sử thi và sử gia truyền miệng
              </h3>
              <p className="leading-relaxed">
                Ca nhân sử thi giữ gìn kho văn học truyền miệng đồ sộ qua biểu diễn. Các truyện kể
                này chứa sự kiện lịch sử, phổ hệ, câu chuyện di cư, thần thoại sáng thế và bài học
                đạo đức. Nghệ nhân nhớ hàng ngàn câu thơ, hiểu cấu trúc thơ ca phức tạp và biết
                thích nghi biểu diễn theo bối cảnh nghi lễ và khán giả cụ thể.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Chỉ huy dàn cồng chiêng
              </h3>
              <p className="leading-relaxed">
                Ở cộng đồng cao nguyên Trung Bộ, nghệ nhân cồng chiêng điều phối biểu diễn hòa tấu
                phức tạp, giữ quy trình nghi lễ đúng đắn và bảo tồn kiến thức về ý nghĩa tâm linh
                của từng chiếc cồng chiêng. Họ hiểu nhịp đa phức hợp tinh vi, biết bối cảnh phù hợp
                cho từng bản nhạc và duy trì sự gắn kết xã hội qua lãnh đạo âm nhạc.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Giáo viên và người truyền văn hóa
              </h3>
              <p className="leading-relaxed">
                Ngoài biểu diễn, nghệ nhân còn là giáo viên truyền kỹ năng kỹ thuật, giá trị thẩm
                mỹ, kiến thức văn hóa và nguyên tắc đạo đức cho thế hệ trẻ. Phương pháp dạy học của
                họ nhấn mạnh bắt chước, hướng dẫn truyền miệng và học qua trải nghiệm trong bối cảnh
                văn hóa chân thực, thay vì phổ nhạc hay lớp học chính thức.
              </p>
            </div>
          </div>
        </div>

        {/* Notable Traditions */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Các truyền thống âm nhạc tiêu biểu và nghệ nhân
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Hát thần (Tày, Nùng, Thái)
              </h3>
              <p className="leading-relaxed">
                Thầy thần kết hợp biểu diễn âm nhạc với thực hành tâm linh. Họ chơi{' '}
                <em>đàn tính</em> trong khi hát để giao tiếp với thần linh, chẩn đoán bệnh và thực
                hiện nghi lễ chữa lành. Truyền thống đòi hỏi nhiều năm học việc, học hàng trăm bài
                hát nghi lễ, hiểu quy trình tâm linh và thành thạo kỹ thuật nhập thần.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Thổi khèn (H'Mông)</h3>
              <p className="leading-relaxed">
                Nghệ nhân <em>khèn</em> có thể thực hiện giai điệu đa thanh phức tạp đồng thời với
                âm trầm kéo dài, tạo không gian âm thanh tinh vi trong lễ hội và nghi lễ tình yêu.
                Nghệ nhân giỏi hiểu lựa chọn lá sậy, kỹ thuật kiểm soát hơi thở và ý nghĩa văn hóa
                được mã hóa trong các giai điệu. Nhạc cụ là "tiếng nói" biểu đạt cảm xúc không thể
                thể hiện bằng lời.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Hòa tấu cồng chiêng (Cao nguyên Trung Bộ)
              </h3>
              <p className="leading-relaxed">
                Nghệ nhân cồng chiêng ở Ê Đê, Ba Na, Gia Rai và các dân tộc Tây Nguyên khác điều
                phối nhịp đa phức hợp tinh vi qua nhiều cồng chiêng cỡ khác nhau. Mỗi chiếc cồng
                chiêng là thực thể tâm linh với tên riêng và cá tính riêng. Nghệ nhân biết kỹ thuật
                gó đúng cách, quy trình nghi lễ, phương pháp điều cồng chiêng và ý nghĩa tâm linh
                của các chu kỳ nhịp khác nhau.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Ca trù (Nhạc cổ điển miền Bắc)
              </h3>
              <p className="leading-relaxed">
                Nghệ nhân <em>ca trù</em> giữ gìn truyền thống nhạc tài tử tinh xảo với giọng nữ
                được đệm bởi <em>đàn đáy</em> (đàn ba dây), <em>phách</em> (phách gỗ) và{' '}
                <em>trống chầu</em> (trống khen). Đòi hỏi thành thạo trang trí giọng hát phức tạp,
                lời thơ và cảm thụ thẩm mỹ tinh tế. UNESCO công nhận ca trù là Di sản Văn hóa Phi
                vật thể cần bảo vệ khẩn cấp.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Đờn ca tài tử (Nhạc tài tử miền Nam)
              </h3>
              <p className="leading-relaxed">
                Nghệ nhân ở vùng Đồng bằng Sông Cửu Long trình diễn thể loại nhạc nghiệp dư này với
                việc nhắc hứng trong khuôn khổ điệu thức. Nghệ nhân chơi nhiều nhạc cụ như{' '}
                <em>đàn tranh</em> (đàn), <em>đàn kim</em> (đàn hình mặt trăng) và <em>đàn bầu</em>{' '}
                (đàn một dây), thể hiện kỹ thuật tinh tế và hiểu sâu về lý thuyết điệu thức. UNESCO
                công nhận truyền thống này năm 2013.
              </p>
            </div>
          </div>
        </div>

        {/* Challenges and Preservation */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Thách thức của việc truyền thống
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Nghệ nhân già cỗ</h3>
              <p className="leading-relaxed">
                Nhiều nghệ nhân đã ngoài 70, 80 tuổi hoặc hơn. Khi họ qua đời, kiến thức quý giá
                biến mất. Tính chất truyền miệng có nghĩa buổi diễn không ghi hình, kỹ thuật và bối
                cảnh văn hóa sẽ mất mãi mãi. Cần tài liệu hóa gấp trước khi thế hệ này ra đi.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Giới trẻ không quan tâm và di cư
              </h3>
              <p className="leading-relaxed">
                Thế hệ trẻ ngày càng theo đuổi giáo dục hiện đại và di cư lên thành phố để tìm kiếm
                cơ hội kinh tế. Đào tạo âm nhạc truyền thống đòi hỏi nhiều năm tận tuỵ không mang
                lại lợi nhuận kinh tế trực tiếp. Mô hình học việc khó cạnh tranh với giải trí hiện
                đại và con đường sự nghiệp.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Mất bối cảnh biểu diễn
              </h3>
              <p className="leading-relaxed">
                Khi nghi lễ truyền thống suy giảm và cộng đồng hiện đại hóa, bối cảnh biểu diễn chân
                thực biến mất. Âm nhạc tách khỏi bối cảnh nghi lễ, nông nghiệp hoặc xã hội sẽ mất ý
                nghĩa văn hóa và trở thành giải trí thuần túy. Nghệ nhân học trong bối cảnh truyền
                thống gặp khó khăn truyền hiểu biết văn hóa toàn diện.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Thiếu tài liệu và công nhận
              </h3>
              <p className="leading-relaxed">
                Hầu hết nghệ nhân vẫn không được biết đến ngoài cộng đồng địa phương. Thiếu tài liệu
                hóa hệ thống có nghĩa đóng góp của họ không được ghi nhận. Khó khăn kinh tế thường
                buộc nghệ nhân phải bỏ công việc văn hóa để muôn sinh. Công nhận là bảo vật văn hóa
                có thể mang lại cả hỗ trợ vật chất và động lực tiếp tục truyền thống.
              </p>
            </div>
          </div>
        </div>

        {/* How to Contribute */}
        <div
          className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Đóng góp tài liệu hóa nghệ nhân
          </h2>
          <div className="text-neutral-700">
            <p className="leading-relaxed mb-4">
              VietTune chào đón mọi đóng góp tài liệu hóa nghệ nhân và truyền thống của họ. Tài liệu
              giá trị bao gồm:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>
                <strong>Ghi hình biểu diễn:</strong> Âm thanh hoặc video nghệ nhân biểu diễn trong
                bối cảnh chân thực
              </li>
              <li>
                <strong>Tiểu sử:</strong> Lịch sử cuộc đời, quá trình đào tạo, dòng dõi và đóng góp
                văn hóa
              </li>
              <li>
                <strong>Kiến thức kỹ thuật:</strong> Kỹ thuật chế tác nhạc cụ, phương pháp biểu
                diễn, hệ thống điệu và nguyên tắc thẩm mỹ
              </li>
              <li>
                <strong>Bối cảnh văn hóa:</strong> Thông tin về sử dụng trong nghi lễ, chức năng xã
                hội, ý nghĩa biểu tượng và tầm quan trọng cộng đồng
              </li>
              <li>
                <strong>Tài liệu học việc:</strong> Phương pháp giảng dạy, quy trình học và truyền
                thống giữa các thế hệ
              </li>
              <li>
                <strong>Tài liệu lịch sử:</strong> Ảnh, bài báo, ghi chú chương trình và tài liệu
                lưu trữ khác
              </li>
            </ul>
            <p className="leading-relaxed">
              Khi tài liệu hóa nghệ nhân, luôn xin sự đồng ý, tôn trọng điều nhạy cảm văn hóa, thừa
              nhận quyền sở hữu trí tuệ và liên hệ với thành viên cộng đồng trong quá trình tài liệu
              hóa. Ghi rõ nguồn và tìm hiểu bối cảnh đúng đắn tôn vinh đóng góp của nghệ nhân và giữ
              gìn tính toàn vẹn văn hóa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
