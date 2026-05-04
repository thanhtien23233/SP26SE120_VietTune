import BackButton from '@/components/common/BackButton';

export default function EthnicitiesPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Dân tộc Việt Nam
          </h1>
          <BackButton />
        </div>

        {/* Introduction */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Bức tranh đa sắc của các dân tộc
          </h2>
          <p className="text-neutral-600 font-medium leading-relaxed mb-4">
            Việt Nam có 54 dân tộc với những nét văn hóa độc đáo. Người Kinh chiếm 86% dân số, còn
            53 dân tộc khác (14%) chủ yếu sinh sống ở miền núi và cao nguyên.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Mỗi dân tộc có ngôn ngữ, nhạc cụ và phong cách âm nhạc riêng biệt, được truyền từ thế hệ
            này sang thế hệ khác qua nhiều thế kỷ.
          </p>
        </div>

        {/* Northern Region */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Dân tộc trung du và miền núi Bắc Bộ
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Tày (Tay)</h3>
              <p className="leading-relaxed">
                Người Tày là dân tộc thiểu số đông nhất Việt Nam, chủ yếu sống ở các tỉnh miền núi
                Bắc Bộ. Truyền thống âm nhạc bao gồm <em>đàn tính</em> (đàn hai dây) và hát{' '}
                <em>thần</em>, thực hành tâm linh do thầy cúng thực hiện trong nghi lễ tôn giáo. Sáo{' '}
                <em>sli</em> và nhạc cụ sậy <em>pí lè</em> cũng là trung tâm của nhạc dân gian.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Nùng (Nung)</h3>
              <p className="leading-relaxed">
                Có quan hệ gần gũi với người Tày, người Nùng có nhạc cụ tương tự như{' '}
                <em>đàn tính</em> và các nhạc cụ gõ. Bài hát <em>sli</em> đệm công việc nông nghiệp
                và nghi lễ tình yêu. Nhạc nghi lễ <em>thần</em> đóng vai trò quan trọng trong thực
                hành tâm linh.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Thái (Thai)</h3>
              <p className="leading-relaxed">
                Người Thái chia thành Thái Đen, Thái Trắng và Thái Đỏ, có truyền thống thanh nhạc
                phong phú gồm hát <em>khắp</em> và hát <em>xòe</em>. Nhạc cụ bao gồm{' '}
                <em>đàn tính</em>, <em>pí pắp</em> (sùng trâu) và các loại trống dùng trong múa vòng{' '}
                <em>xòe</em>.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">H'Mông (Hmong)</h3>
              <p className="leading-relaxed">
                Người H'Mông nổi tiếng với <em>khèn</em> (sáo mộc trực tiếp), tạo giai điệu đa thanh
                phức tạp trong lễ hội và nghi lễ tình yêu. Truyền thống thanh nhạc bao gồm{' '}
                <em>hát đối đáp</em> (hát luyn phiên) và truyện kể sử thi giữ gìn ký ức lịch sử và
                bản sắc văn hóa.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Dao (Yao)</h3>
              <p className="leading-relaxed">
                Người Dao duy trì thực hành âm nhạc đa dạng gồm sáo <em>tiêu</em>, <em>đàn nhị</em>{' '}
                (nhị hai dây) và các nhạc cụ gõ. Nhạc nghi lễ của họ, đặc biệt trong nghi lễ{' '}
                <em>cấp sắc</em> (thụ phong), kết hợp yếu tố Đạo giáo với truyền thống bảnđịa.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Mường (Muong)</h3>
              <p className="leading-relaxed">
                Người Mường, có quan hệ ngôn ngữ với người Kinh, giữ gìn các hình thức âm nhạc Việt
                cổ đại. Bài hát <em>mò mường</em> của thầy cúng và nhạc cồng chiêng phản ánh truyền
                thống phiphật giáo tin thần linh. <em>Chiêng</em> (cồng chiêng) đóng vai trò trung
                tâm trong nghi lễ cộng đồng.
              </p>
            </div>
          </div>
        </div>

        {/* Central Highlands */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Dân tộc cao nguyên Trung Bộ
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Ê Đê (Ede)</h3>
              <p className="leading-relaxed">
                Người Ê Đê nổi tiếng với văn hóa cồng chiêng, được UNESCO công nhận là Di sản Văn
                hóa Phi vật thể. Dàn cồng chiêng (<em>chiêng</em>) gồm nhiều kích cỡ tạo không gian
                âm thanh phức tạp trong lễ hội, đám tang và lễ nông nghiệp. <em>Đing năm</em> (đàn
                mộc cầm trúc) và <em>goong</em> (đàn tranh ống trúc) là đặc trưng truyền thống âm
                nhạc của họ.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Ba Na (Bahnar)</h3>
              <p className="leading-relaxed">
                Người Ba Na duy trì truyền thống cồng chiêng tinh xảo và nhạc cụ tre độc đáo như{' '}
                <em>đing tút</em> (ống trúc gõ bằng gchy) và <em>ta lốt</em> (đàn mộc cầm trúc).
                Nhạc nghi lễ đệm các nghi thức nhà rông (<em>rông</em>) và lễ cúng trâu.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Gia Rai (Jarai)</h3>
              <p className="leading-relaxed">
                Người Gia Rai nổi tiếng với dàn cồng chiêng tinh xảo và nhạc cụ tre đa dạng.{' '}
                <em>Klong put</em> (ống tre gõ xuống đất) tạo nhịp mạnh mẽ. Truyền thống thanh nhạc
                bao gồm truyện kể sử thi và ru ngủ với thang âm ngũ cung đặc trưng.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Sedang</h3>
              <p className="leading-relaxed">
                Người Sedang duy trì truyền thống cồng chiêng và nhạc cụ hơi độc đáo.{' '}
                <em>Ta-ri-ang</em> (khèn bầu) và các loại sáo tạo giai điệu ma mị trong nghi lễ tình
                yêu và lễ hội. Hòa tấu cồng chiêng cộng đồng đểm chu kỳ nông nghiệp và nghi lễ đời
                sống.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Co Ho (Koho)</h3>
              <p className="leading-relaxed">
                Người Co Ho dùng cồng chiêng, trống và nhạc cụ tre độc đáo. Phong cách hát{' '}
                <em>tà-linh</em> và nhạc sáo tre đệm các nghi lễ rượu cần và tụ họp cộng đồng.{' '}
                <em>Dung-kar</em> (kèn trâu) báo hiệu sự kiện quan trọng.
              </p>
            </div>
          </div>
        </div>

        {/* Southern and Coastal */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Dân tộc Nam Trung Bộ, Đông Nam Bộ và Tây Nam Bộ
          </h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Chăm (Cham)</h3>
              <p className="leading-relaxed">
                Người Chăm, hậu duệ Vương quốc Champa cổ đại, duy trì truyền thống âm nhạc Hindu và
                Hồi giáo. Nhạc cụ <em>saranai</em> (kèn), <em>ginang</em> (trống) và{' '}
                <em>paranung</em> (trống thùng) đệm nghi lễ tôn giáo, đặc biệt trong lễ hội{' '}
                <em>Kate</em>. Thanh nhạc của họ kết hợp truyền thống Austronesian cổ đại với ảnh
                hưởng Nam Á.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Khmer</h3>
              <p className="leading-relaxed">
                Người Khmer ở Đồng bằng Sông Cửu Long duy trì mối liên kết chặt chẽ với truyền thống
                âm nhạc cổ điển Campuchia. Nhạc cụ <em>tro</em> (nhị có cần dài), <em>skor</em>{' '}
                (trống) và <em>korng</em> (vòng cồng chiêng) đệm nghi lễ Phật giáo và sân khấu
                truyền thống. Phong cách hát dân gian <em>ayai</em> phổ biến trong lễ hội.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Hoa (Chinese)</h3>
              <p className="leading-relaxed">
                Người Hoa giữ gìn các truyền thống hát bội Trung Quốc vùng miền như <em>tuồng</em>{' '}
                và <em>hát bội</em>, cùng nhạc cụ gồm <em>erhu</em>, pipa và các nhạc cụ gõ. Nhạc
                đền thờ của họ đệm lễ hội tôn giáo và nghi lễ thờ cúng tổ tiên.
              </p>
            </div>
          </div>
        </div>

        {/* Musical Characteristics */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Đặc điểm âm nhạc chung</h2>
          <div className="space-y-4 text-neutral-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Văn hóa cồng chiêng</h3>
              <p className="leading-relaxed">
                Dàn cồng chiêng là trung tâm của nhiều dân tộc miền núi, đặc biệt ở cao nguyên Trung
                Bộ. Các cồng chiêng cỡ khác nhau tạo cao độ cụ thể tạo kết cấu đa nhịp và đa thanh
                phức tạp. Cồng chiêng được coi là vật thiêng liêng kết nối cộng đồng với linh hồn tổ
                tiên và lực lượng thiên nhiên.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">Nhạc cụ tre trúc</h3>
              <p className="leading-relaxed">
                Sự dồi dào của tre trúc dẫn đến sự đa dạng phi thường trong nhạc cụ tre của các dân
                tộc: đàn mộc cầm, đàn tranh ống trúc, sáo, khèn, ống gõ và nhiều loại khác. Mỗi nhạc
                cụ phản ánh sự thích nghi môi trường và thẩm mỹ văn hóa cụ thể.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Truyền thống thanh nhạc và văn học truyền miệng
              </h3>
              <p className="leading-relaxed">
                Truyền thống ca hát sử thi giữ gìn truyện kể lịch sử, thần thoại sáng thế và kiến
                thức văn hóa. Hát luân phiên (gọi và đáp) phổ biến trong thực hành tình yêu. Kỹ
                thuật thanh nhạc thường bao gồm trang trí, uốn luyến vi thanh và âm sắc mũi đặc
                trưng của từng dân tộc.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Nhạc nghi lễ và tâm linh
              </h3>
              <p className="leading-relaxed">
                Âm nhạc đóng vai trò thiết yếu trong nghi lễ đời sống (sinh, trưởng thành, kết hôn,
                tử), nghi lễ nông nghiệp (giá trồng, gat), thực hành tâm linh (thầy cúng, tin thần
                linh, Phật giáo) và lễ hội cộng đồng. Các buổi biểu diễn này duy trì gắn kết xã hội
                và truyền giá trị văn hóa qua các thế hệ.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-neutral-900">
                Hệ thống ngũ cung và điệu thức
              </h3>
              <p className="leading-relaxed">
                Mặc dù nhiều nhóm dùng thang âm ngũ cung (năm nốt), vẫn có sự khác biệt đáng kể
                trong hệ thống điệu, cấu trúc điệu thức và mẫu giai điệu. Một số nhóm dùng thang âm
                không có nửa cầu, trong khi nhóm khác kết hợp uốn luyến vi thanh và hệ thống điệu
                thức phức tạp.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Groups */}
        <div
          className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            Các dân tộc đáng chú ý khác
          </h2>
          <div className="text-neutral-700">
            <p className="leading-relaxed mb-4">
              Nhiều dân tộc khác duy trì truyền thống âm nhạc độc đáo bao gồm:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-2">Nhóm miền Bắc:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>La Chí, La Ha, Lự, Lô Lô</li>
                  <li>Phù Lá, Pa Thẻn, Giáy</li>
                  <li>Bố Y, Cống, Si La</li>
                  <li>Sán Chay, Sán Dìu</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Nhóm miền Trung và miền Nam:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Xơ Đăng, Brâu, Bru-Vân Kiều</li>
                  <li>Cơ Tu, Giẻ Triêng, Hrê</li>
                  <li>Mnông, Mạ, Rơ Măm</li>
                  <li>Ra Glai, Chơ Ro, Chu Ru</li>
                </ul>
              </div>
            </div>
            <p className="leading-relaxed mt-4">
              Mỗi nhóm đóng góp nhạc cụ, phong cách thanh nhạc và thực hành nghi lễ độc đáo vào sự
              đa dạng âm nhạc phi thường của Việt Nam. Nỗ lực tài liệu hóa và bảo tồn rất quan trọng
              vì nhiều nghệ nhân đã lớn tuổi và phương thức truyền thống đối mặt thách thức từ hiện
              đại hóa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
