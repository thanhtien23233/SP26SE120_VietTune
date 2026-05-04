import BackButton from '@/components/common/BackButton';

export default function InstrumentsPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Nhạc cụ truyền thống
          </h1>
          <BackButton />
        </div>

        {/* Introduction */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Kể chuyện qua nhạc cụ</h2>
          <p className="text-neutral-600 font-medium leading-relaxed mb-4">
            54 dân tộc Việt Nam có kho nhạc cụ đa dạng đặc sắc. Từ dàn chiêng đồng hùng vĩ đến sáo
            trúc thanh tao, từ kèn sừng trâu mạnh mẽ đến đàn dây du dương - mỗi nhạc cụ kể một câu
            chuyện văn hóa riêng.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Nhạc cụ không chỉ tạo ra âm thanh - chúng mang theo niềm tin tâm linh, kết nối cộng đồng
            và trí tuệ làm nghề truyền thống. Mỗi âm sắc, mỗi giai điệu đều có ý nghĩa văn hóa riêng
            và phản ánh sự thích nghi với môi trường. Nhiều nhạc cụ được coi là thiêng liêng, có
            liên kết giới tính cụ thể, hoặc chỉ có thể được chơi trong các bối cảnh nghi lễ cụ thể.
            Hiểu nhạc cụ đòi hỏi đánh giá cao ý nghĩa văn hóa bên cạnh thuộc tính âm học của chúng.
          </p>
        </div>

        {/* Classification */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Hệ thống phân loại</h2>
          <div className="text-neutral-700">
            <p className="leading-relaxed mb-4">
              Nhạc cụ truyền thống Việt Nam có thể phân loại theo hệ thống Hornbostel-Sachs dựa trên
              phương thức tạo âm thanh:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                  Thể rắn (Cơ thể nhạc cụ tự rung)
                </h3>
                <p className="leading-relaxed mb-2">
                  Âm thanh tạo ra từ sự rung động của bản thân nhạc cụ, không cần dây, màng hay cột
                  khí:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    <strong>Cồng chiêng:</strong> <em>Chiêng</em> (chiêng phẳng),{' '}
                    <em>cồng chiêng</em> (bộ cồng chiêng), <em>thanh la</em> (chát nhỏ)
                  </li>
                  <li>
                    <strong>Đàn mộc cầm:</strong> <em>Đàn t'rưng</em> (đàn mộc cầm trúc),{' '}
                    <em>đing năm</em> (ống trúc gắn trên khung)
                  </li>
                  <li>
                    <strong>Nhạc cụ gõ:</strong> <em>Mõ</em> (mõ gỗ), <em>sinh tiền</em> (đĩa kim
                    loại), <em>song loan</em> (chuông đôi)
                  </li>
                  <li>
                    <strong>Cạo và phách:</strong> <em>Phách</em> (phách gỗ), <em>ve sầu</em> (cạo
                    trúc)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                  Màng rắn (Trống với màng căng)
                </h3>
                <p className="leading-relaxed mb-2">
                  Âm thanh tạo ra từ sự rung động của màng căng:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    <strong>Trống thùng:</strong> <em>Trống</em> (tên chung), <em>trống cơm</em>{' '}
                    (trống gạo), <em>trống chầu</em> (trống ca ngợi)
                  </li>
                  <li>
                    <strong>Trống khung:</strong> <em>Trống nguyệt</em> (trống mặt trăng),{' '}
                    <em>trống quân</em> (trống quân đội)
                  </li>
                  <li>
                    <strong>Trống nghi lễ:</strong> <em>Trống đồng</em> (trống đồng - cũng là thể
                    rắn), <em>cồng chiên</em> (trống nghi lễ lớn)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                  Hòa rắn (Nhạc cụ dây)
                </h3>
                <p className="leading-relaxed mb-2">Âm thanh tạo ra từ sự rung động của dây:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    <strong>Đàn tranh:</strong> <em>Đàn tranh</em> (đàn 16 dây), <em>đàn bầu</em>{' '}
                    (đàn độc huyền), <em>đàn đáy</em> (đàn ba dây)
                  </li>
                  <li>
                    <strong>Đàn tỳnh:</strong> <em>Đàn tính</em> (đàn hai dây), <em>đàn nguyệt</em>{' '}
                    (đàn hình trăng), <em>đàn tam</em> (đàn ba dây)
                  </li>
                  <li>
                    <strong>Đàn kéo:</strong> <em>Đàn nhị</em> (đàn kéo hai dây), <em>đàn gáo</em>{' '}
                    (đàn kéo dừa), <em>K'ni</em> (đàn kéo dân tộc)
                  </li>
                  <li>
                    <strong>Đàn tranh ống:</strong> <em>Đàn goong</em> (đàn tranh ống trúc),{' '}
                    <em>guôc</em> (đàn tranh trúc)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                  Khí rắn (Nhạc cụ hơi)
                </h3>
                <p className="leading-relaxed mb-2">Âm thanh tạo ra từ cột khí rung động:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    <strong>Sáo:</strong> <em>Sáo</em> (sáo trúc), <em>tiêu</em> (sáo đứng),{' '}
                    <em>sli</em> (sáo dân tộc)
                  </li>
                  <li>
                    <strong>Nhạc cụ lưỡi gà tự do:</strong> <em>Khèn</em> (khèn môi),{' '}
                    <em>đing buốt</em> (khèn bầu), <em>đing pút</em> (sáo bè)
                  </li>
                  <li>
                    <strong>Kèn ôboa và kèn sừng:</strong> <em>Kèn bầu</em> (kèn ôboa bầu),{' '}
                    <em>kèn lá</em> (kèn lá), <em>tù và</em> (sừng trâu)
                  </li>
                  <li>
                    <strong>Kèn trumpet:</strong> <em>Tù và</em> (kèn dài), <em>pí pắp</em> (sừng
                    ngắn), <em>saranai</em> (kèn ôboa Chăm)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bamboo Instruments */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Nhạc cụ tre trúc: Sáng tạo và thích nghi
          </h2>
          <div className="space-y-4 text-neutral-700">
            <p className="leading-relaxed">
              Tre trúc dồi dào ở Việt Nam đã tạo nên sự đa dạng nhạc cụ phi thường. Các loài tre
              khác nhau tạo ra âm sắc riêng biệt, và các dân tộc đã phát triển kỹ thuật tinh vi để
              chọn lựa, xử lý và chế tác tre thành nhạc cụ.
            </p>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Đàn t'rưng (Đàn mộc cầm trúc)
              </h3>
              <p className="leading-relaxed">
                Nhạc cụ cao nguyên Trung Bộ gồm các ống trúc có độ dài khác nhau xếp trên khung gỗ.
                Người chơi dùng dùi gỗ đánh vào ống tạo giai điệu ngũ cung rõ ràng. Độ dài, đường
                kính và vị trí mắt của mỗi ống quyết định cao độ. Thợ khéo hiểu âm học tre và hệ
                thống điều thức truyền thống.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Đàn goong (Đàn tranh ống trúc)
              </h3>
              <p className="leading-relaxed">
                Nhạc cụ độc đáo với dây gắn vào hộp cộng hưởng bằng ống trúc. Người chơi gảy dây
                trong khi ôm nhạc cụ vào người, dùng cơ thể làm hộp cộng hưởng bổ sung. Các dân tộc
                khác nhau phát triển biến thể vùng miền với hệ thống điều âm và kỹ thuật chơi riêng.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Đing păng (Ống tre gõ)
              </h3>
              <p className="leading-relaxed">
                Ống trúc gõ xuống đất hoặc đập vào nhau tạo nhịp điệu mạnh mẽ. Các kích cỡ ống khác
                nhau tạo cao độ khác nhau. Dùng trong hòa tấu cồng chiêng và lễ nông nghiệp. Người
                chơi phối hợp các nhịp đa tạp phức hợp qua nhiều người.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">Sáo trúc (Nhiều loại)</h3>
              <p className="leading-relaxed">
                Mỗi dân tộc đều phát triển biến thể sáo: sáo ngang, sáo đứng, sáo khía, sáo vòng,
                sáo mũi. Mỗi thiết kế tạo âm sắc riêng và đòi hỏi kỹ thuật chơi cụ thể. Sáo thường
                đệm cho nhạc thanh nhạc, dùng trong nghi lễ tình yêu, hoặc giải trí chăn trâu.
              </p>
            </div>
          </div>
        </div>

        {/* Gong Culture */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Văn hóa cồng chiêng: Nhạc cụ thiêng liêng của cao nguyên Trung Bộ
          </h2>
          <div className="space-y-4 text-neutral-700">
            <p className="leading-relaxed">
              UNESCO công nhận Không gian văn hóa cồng chiêng cao nguyên Trung Bộ Việt Nam là Kiệt
              tác Di sản truyền khẩu và phi vật thể của Nhân loại vào năm 2005. Cồng chiêng không
              chỉ là nhạc cụ mà còn là vật thiêng liêng với sức mạnh tâm linh, ý nghĩa xã hội và vũ
              trụ quan sâu sắc.
            </p>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">Các loại cồng chiêng</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Chiêng:</strong> Chiêng phẳng không có núm, tạo âm thanh vang dài. Các
                  kích thước khác nhau tạo ra các cao độ khác nhau trong hòa tấu.
                </li>
                <li>
                  <strong>Cồng:</strong> Cồng có núm ở giữa, tạo âm thanh ngắn và mạnh hơn. Thường
                  được dùng làm chủ đạo giai điệu trong hòa tấu.
                </li>
                <li>
                  <strong>Độc tấu và tập thể:</strong> Một số cồng được gióng riêng cho nghi lễ cụ
                  thể; số khác chỉ hoạt động trong hòa tấu.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">Ý nghĩa văn hóa</h3>
              <p className="leading-relaxed">
                Cồng chiêng được coi là sinh linh có tính cách riêng. Mỗi chiếc có tên, giới tính và
                sức mạnh tâm linh. Sở hữu cồng chiêng thể hiện giàu có và uy tín. Cộng đồng tổ chức
                lễ hội cồng chiêng trong chu kỳ nông nghiệp, nghi lễ đời sống và các dịp cộng đồng.
                Âm nhạc cồng chiêng kết nối cộng đồng với tổ tiên, thiên nhiên và thế giới tâm linh.
                Mất đi tri thức cồng chiêng đồng nghĩa với việc đe dọa cả hệ thống vũ trụ quan.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">Nghệ thuật trình diễn</h3>
              <p className="leading-relaxed">
                Hòa tấu cồng chiêng đòi hỏi sự phối hợp của nhiều nghệ nhân, mỗi người phụ trách các
                chiếc cồng cụ thể và nhịp điệu riêng. Người chơi dùng dùi có đệm đánh cồng, điều
                khiển âm thanh qua vị trí đánh và kỹ thuật tắt tiếng. Các nhịp đa phức hợp xuất hiện
                từ sự tương tác các nhịp riêng lẻ. Trình diễn đúng đòi hỏi hiểu cả cấu trúc âm nhạc
                lẫn nghi thức.
              </p>
            </div>
          </div>
        </div>

        {/* String Instruments */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Nhạc cụ dây: Thẩm mỹ tinh tế và kỹ thuật điêu luyện
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">Đàn bầu (Đàn một dây)</h3>
              <p className="leading-relaxed">
                Nhạc cụ độc đáo một dây với cần đàn mềm và bầu cộng hưởng. Người chơi gảy dây trong
                khi bẻ cong cần, tạo biến đổi cao độ liên tục và rung nhẹ đặc trưng. Có thể tạo hiệu
                ứng portamento bắt chước giọng người và âm thanh thiên nhiên. Được coi là biểu tượng
                thẩm mỹ âm nhạc Việt nhấn mạnh trang trí tinh tế và biểu cảm.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Đàn tranh (Đàn 16 dây)
              </h3>
              <p className="leading-relaxed">
                Đàn tranh tinh xảo với giá đỡ di động cho phép điều chỉnh cao độ theo các hệ thống
                điệu thức khác nhau. Người chơi gảy dây bằng tay phải trong khi ấn sau giá bằng tay
                trái để tạo trang trí, rung giọng và uốn cao độ. Cần nhiều năm luyện tập để thành
                thạo kỹ thuật phức tạp và lý thuyết điệu thức. Trung tâm của nhạc tài tử miền Nam và
                bối cảnh nghi lễ.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Đàn tính (Đàn hai dây)
              </h3>
              <p className="leading-relaxed">
                Nhạc cụ thiết yếu ở các dân tộc thiểu số miền Bắc (Tày, Nùng, Thái). Hộp cộng hưởng
                hình thang với hai dây điều hòa quãng tư hoặc quãng năm. Được thầy cúng dùng trong
                nghi lễ <em>thần</em>, đệm hát kể sử thi và đàn tình yêu. Các dân tộc khác nhau phát
                triển phong cách chơi, hệ thống điệu và tiết mục riêng.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Đàn nhị (Đàn hai dây kéo)
              </h3>
              <p className="leading-relaxed">
                Nhị có cần dài với hai dây chơi bằng cung lông ngựa xuyên qua hai dây. Da rắn bọc
                hộp cộng hưởng lục giác. Người chơi điều khiển cao độ bằng lực ngón tay không ấn dây
                xuống phím đàn, cho phép uốn luyến vi thanh tinh tế. Thiết yếu trong dàn nhạc cổ
                điển, đệm hát bội và nhạc nghi lễ.
              </p>
            </div>
          </div>
        </div>

        {/* Construction and Materials */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Tri thức truyền thống: Chế tác và vật liệu
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Lựa chọn và chuẩn bị vật liệu
              </h3>
              <p className="leading-relaxed">
                Thợ khéo có kiến thức sâu về đặc tính vật liệu. Họ biết loại tre nào tạo âm thanh
                tốt nhất, thời điểm thu hoạch (pha mặt trăng, mùa), cách ủ ảnh hưởng đến chất lượng
                gỗ, và cách xử lý truyền thống cho độ bền. Lựa chọn vật liệu ảnh hưởng trực tiếp đến
                âm học nhạc cụ, đòi hỏi cả hiểu biết khoa học lẫn chuyên môn trực giác.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Hệ thống điệu và âm luật
              </h3>
              <p className="leading-relaxed">
                Nhạc cụ Việt Nam dùng nhiều hệ thống điệu khác âm luật bình quân phương Tây. Các
                điệu thức ngũ cung chiếm ưu thế, nhưng biến thể vùng miền, khác biệt dân tộc và sở
                thích cá nhân tạo thực hành điệu đa dạng. Nghệ nhân hiểu mối quan hệ quãng, đặc điểm
                điệu thức và cách điều chỉnh điệu cho các tiết mục và bối cảnh khác nhau.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Nguyên lý âm học và đổi mới
              </h3>
              <p className="leading-relaxed">
                Thợ truyền thống hiểu về cộng hưởng, hoạ âm, thiết kế hộp cộng hưởng và cách các
                thông số vật lý ảnh hưởng âm sắc. Thợ đương đại cân bằng thẩm mỹ truyền thống với
                vật liệu hiện đại và kỹ thuật chế tạo. Đổi mới diễn ra trong khuôn khổ truyền thống,
                thích nghi nhạc cụ với bối cảnh biểu diễn thay đổi nhưng giữ tính chân thực văn hóa.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-800">
                Trang trí biểu tượng và ý nghĩa văn hóa
              </h3>
              <p className="leading-relaxed">
                Trang trí nhạc cụ thường mang ý nghĩa biểu tượng: rồng tượng trưng quyền lực, phượng
                tượng trưng thanh nhã, hoa sen chỉ sự trong sáng. Lựa chọn trang trí phản ánh giá
                trị văn hóa, địa vị xã hội và sở thích thẩm mỹ. Hiểu biểu tượng giúp khám phá ý
                nghĩa văn hóa sâu sắc ẩn chứa trong truyền thống nhạc cụ. Nghệ nhân cân bằng chức
                năng với thẩm mỹ, đảm bảo trang trí không làm tổn hại âm học.
              </p>
            </div>
          </div>
        </div>

        {/* Preservation Challenges */}
        <div
          className="border border-neutral-200 rounded-2xl p-8 shadow-md bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
            Bảo tồn và nhu cầu tài liệu hóa
          </h2>
          <div className="text-neutral-700">
            <p className="leading-relaxed mb-4">
              Nhiều nhạc cụ truyền thống đối mặt thách thức bảo tồn:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>
                <strong>Nhạc cụ nguy cấp:</strong> Một số nhạc cụ hiếm khi được chơi, ít người thợ
                hoặc nghệ nhân còn lại
              </li>
              <li>
                <strong>Mất kiến thức chế tác:</strong> Kỹ thuật chế tác truyền thống biến mất khi
                thợ lão thành qua đời không có đệ tử
              </li>
              <li>
                <strong>Khan hiếm vật liệu:</strong> Vật liệu cụ thể trở nên khan hiếm do thay đổi
                môi trường hoặc quy định
              </li>
              <li>
                <strong>Mất bối cảnh:</strong> Nhạc cụ mất ý nghĩa khi bị tách khỏi bối cảnh văn hóa
              </li>
              <li>
                <strong>Tài liệu hạn chế:</strong> Hầu hết nhạc cụ thiếu tài liệu toàn diện về chế
                tác, kỹ thuật chơi và ý nghĩa văn hóa
              </li>
            </ul>
            <p className="leading-relaxed">
              VietTune nhằm tài liệu hóa nhạc cụ toàn diện: phương pháp chế tác, đặc tính âm học, kỹ
              thuật chơi, bối cảnh văn hóa, biến thể vùng miền và ví dụ âm thanh. Tài liệu này bảo
              tồn kiến thức cho thế hệ tương lai, nhà nghiên cứu, thợ làm nhạc cụ và người thực hành
              văn hóa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
