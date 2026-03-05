using Microsoft.EntityFrameworkCore;
using VietTuneArchive.Domain.Entities;

namespace VietTuneArchive.Domain.Context
{
    public static class SeedData
    {
        // ====== Pre-defined Guids for EthnicGroups (54 dân tộc) ======
        public static class EthnicGroupIds
        {
            public static readonly Guid Kinh = new("00000000-0000-0000-0001-000000000001");
            public static readonly Guid Tay = new("00000000-0000-0000-0001-000000000002");
            public static readonly Guid Thai = new("00000000-0000-0000-0001-000000000003");
            public static readonly Guid Muong = new("00000000-0000-0000-0001-000000000004");
            public static readonly Guid Khmer = new("00000000-0000-0000-0001-000000000005");
            public static readonly Guid Hoa = new("00000000-0000-0000-0001-000000000006");
            public static readonly Guid Nung = new("00000000-0000-0000-0001-000000000007");
            public static readonly Guid HMong = new("00000000-0000-0000-0001-000000000008");
            public static readonly Guid Dao = new("00000000-0000-0000-0001-000000000009");
            public static readonly Guid GiaRai = new("00000000-0000-0000-0001-000000000010");
            public static readonly Guid EDe = new("00000000-0000-0000-0001-000000000011");
            public static readonly Guid BaNa = new("00000000-0000-0000-0001-000000000012");
            public static readonly Guid XoDang = new("00000000-0000-0000-0001-000000000013");
            public static readonly Guid SanChay = new("00000000-0000-0000-0001-000000000014");
            public static readonly Guid CoHo = new("00000000-0000-0000-0001-000000000015");
            public static readonly Guid Cham = new("00000000-0000-0000-0001-000000000016");
            public static readonly Guid SanDiu = new("00000000-0000-0000-0001-000000000017");
            public static readonly Guid Hre = new("00000000-0000-0000-0001-000000000018");
            public static readonly Guid RaGlai = new("00000000-0000-0000-0001-000000000019");
            public static readonly Guid Mnong = new("00000000-0000-0000-0001-000000000020");
            public static readonly Guid Tho = new("00000000-0000-0000-0001-000000000021");
            public static readonly Guid Xtieng = new("00000000-0000-0000-0001-000000000022");
            public static readonly Guid KhoMu = new("00000000-0000-0000-0001-000000000023");
            public static readonly Guid BruVanKieu = new("00000000-0000-0000-0001-000000000024");
            public static readonly Guid CoTu = new("00000000-0000-0000-0001-000000000025");
            public static readonly Guid Giay = new("00000000-0000-0000-0001-000000000026");
            public static readonly Guid TaOi = new("00000000-0000-0000-0001-000000000027");
            public static readonly Guid Ma = new("00000000-0000-0000-0001-000000000028");
            public static readonly Guid GieTrieng = new("00000000-0000-0000-0001-000000000029");
            public static readonly Guid Co = new("00000000-0000-0000-0001-000000000030");
            public static readonly Guid ChoRo = new("00000000-0000-0000-0001-000000000031");
            public static readonly Guid XinhMun = new("00000000-0000-0000-0001-000000000032");
            public static readonly Guid HaNhi = new("00000000-0000-0000-0001-000000000033");
            public static readonly Guid ChuRu = new("00000000-0000-0000-0001-000000000034");
            public static readonly Guid Lao = new("00000000-0000-0000-0001-000000000035");
            public static readonly Guid LaChi = new("00000000-0000-0000-0001-000000000036");
            public static readonly Guid Khang = new("00000000-0000-0000-0001-000000000037");
            public static readonly Guid PhuLa = new("00000000-0000-0000-0001-000000000038");
            public static readonly Guid LaHu = new("00000000-0000-0000-0001-000000000039");
            public static readonly Guid LaHa = new("00000000-0000-0000-0001-000000000040");
            public static readonly Guid PaThen = new("00000000-0000-0000-0001-000000000041");
            public static readonly Guid Lu = new("00000000-0000-0000-0001-000000000042");
            public static readonly Guid Ngai = new("00000000-0000-0000-0001-000000000043");
            public static readonly Guid Chut = new("00000000-0000-0000-0001-000000000044");
            public static readonly Guid LoLo = new("00000000-0000-0000-0001-000000000045");
            public static readonly Guid Mang = new("00000000-0000-0000-0001-000000000046");
            public static readonly Guid CoLao = new("00000000-0000-0000-0001-000000000047");
            public static readonly Guid BoY = new("00000000-0000-0000-0001-000000000048");
            public static readonly Guid Cong = new("00000000-0000-0000-0001-000000000049");
            public static readonly Guid SiLa = new("00000000-0000-0000-0001-000000000050");
            public static readonly Guid PuPeo = new("00000000-0000-0000-0001-000000000051");
            public static readonly Guid Brau = new("00000000-0000-0000-0001-000000000052");
            public static readonly Guid RoMam = new("00000000-0000-0000-0001-000000000053");
            public static readonly Guid ODu = new("00000000-0000-0000-0001-000000000054");
        }

        // ====== Pre-defined Guids for Instruments ======
        public static class InstrumentIds
        {
            public static readonly Guid DanBau = new("00000000-0000-0000-0002-000000000001");
            public static readonly Guid DanTranh = new("00000000-0000-0000-0002-000000000002");
            public static readonly Guid DanNguyet = new("00000000-0000-0000-0002-000000000003");
            public static readonly Guid DanNhi = new("00000000-0000-0000-0002-000000000004");
            public static readonly Guid DanTyBa = new("00000000-0000-0000-0002-000000000005");
            public static readonly Guid DanDay = new("00000000-0000-0000-0002-000000000006");
            public static readonly Guid SaoTruc = new("00000000-0000-0000-0002-000000000007");
            public static readonly Guid Tieu = new("00000000-0000-0000-0002-000000000008");
            public static readonly Guid KenBau = new("00000000-0000-0000-0002-000000000009");
            public static readonly Guid TrongCom = new("00000000-0000-0000-0002-000000000010");
            public static readonly Guid TrongDong = new("00000000-0000-0000-0002-000000000011");
            public static readonly Guid Phach = new("00000000-0000-0000-0002-000000000012");
            public static readonly Guid Trung = new("00000000-0000-0000-0002-000000000013");
            public static readonly Guid CongChieng = new("00000000-0000-0000-0002-000000000014");
            public static readonly Guid DingNam = new("00000000-0000-0000-0002-000000000015");
            public static readonly Guid KlongPut = new("00000000-0000-0000-0002-000000000016");
            public static readonly Guid Khen = new("00000000-0000-0000-0002-000000000017");
            public static readonly Guid DanTinh = new("00000000-0000-0000-0002-000000000018");
            public static readonly Guid DanChapi = new("00000000-0000-0000-0002-000000000019");
            public static readonly Guid DanKni = new("00000000-0000-0000-0002-000000000020");
        }

        // ====== Pre-defined Guids for Ceremonies ======
        public static class CeremonyIds
        {
            public static readonly Guid LeCuoi = new("00000000-0000-0000-0003-000000000001");
            public static readonly Guid LeTang = new("00000000-0000-0000-0003-000000000002");
            public static readonly Guid MungLuaMoi = new("00000000-0000-0000-0003-000000000003");
            public static readonly Guid GauTao = new("00000000-0000-0000-0003-000000000004");
            public static readonly Guid LongTong = new("00000000-0000-0000-0003-000000000005");
            public static readonly Guid CungBenNuoc = new("00000000-0000-0000-0003-000000000006");
            public static readonly Guid HatThen = new("00000000-0000-0000-0003-000000000007");
            public static readonly Guid CaTru = new("00000000-0000-0000-0003-000000000008");
            public static readonly Guid NhaNhac = new("00000000-0000-0000-0003-000000000009");
            public static readonly Guid DamGio = new("00000000-0000-0000-0003-000000000010");
            public static readonly Guid CapSac = new("00000000-0000-0000-0003-000000000011");
            public static readonly Guid BoMa = new("00000000-0000-0000-0003-000000000012");
        }

        // ====== Pre-defined Guids for VocalStyles ======
        public static class VocalStyleIds
        {
            public static readonly Guid HatThen = new("00000000-0000-0000-0004-000000000001");
            public static readonly Guid HatXoan = new("00000000-0000-0000-0004-000000000002");
            public static readonly Guid HatChauVan = new("00000000-0000-0000-0004-000000000003");
            public static readonly Guid HatQuanHo = new("00000000-0000-0000-0004-000000000004");
            public static readonly Guid CaTru = new("00000000-0000-0000-0004-000000000005");
            public static readonly Guid HatVi = new("00000000-0000-0000-0004-000000000006");
            public static readonly Guid HatRuNghe = new("00000000-0000-0000-0004-000000000007");
            public static readonly Guid DonCaTaiTu = new("00000000-0000-0000-0004-000000000008");
            public static readonly Guid HatBoi = new("00000000-0000-0000-0004-000000000009");
            public static readonly Guid CaiLuong = new("00000000-0000-0000-0004-000000000010");
            public static readonly Guid HatADay = new("00000000-0000-0000-0004-000000000011");
            public static readonly Guid HatKhap = new("00000000-0000-0000-0004-000000000012");
        }

        // ====== Pre-defined Guids for MusicalScales ======
        public static class MusicalScaleIds
        {
            public static readonly Guid NamBac = new("00000000-0000-0000-0005-000000000001");
            public static readonly Guid NamNam = new("00000000-0000-0000-0005-000000000002");
            public static readonly Guid NamXuan = new("00000000-0000-0000-0005-000000000003");
            public static readonly Guid NamAi = new("00000000-0000-0000-0005-000000000004");
            public static readonly Guid OanDieu = new("00000000-0000-0000-0005-000000000005");
            public static readonly Guid BacDieu = new("00000000-0000-0000-0005-000000000006");
            public static readonly Guid PentatonicDoMinor = new("00000000-0000-0000-0005-000000000007");
            public static readonly Guid PentatonicDoMajor = new("00000000-0000-0000-0005-000000000008");
        }

        // ====== Pre-defined Guids for Tags ======
        public static class TagIds
        {
            public static readonly Guid DiSanUNESCO = new("00000000-0000-0000-0006-000000000001");
            public static readonly Guid DiSanQuocGia = new("00000000-0000-0000-0006-000000000002");
            public static readonly Guid NhacCuHiem = new("00000000-0000-0000-0006-000000000003");
            public static readonly Guid BanGhiGoc = new("00000000-0000-0000-0006-000000000004");
            public static readonly Guid NgheNhanUuTu = new("00000000-0000-0000-0006-000000000005");
            public static readonly Guid NhacCungDinh = new("00000000-0000-0000-0006-000000000006");
            public static readonly Guid NhacDanGian = new("00000000-0000-0000-0006-000000000007");
            public static readonly Guid NhacLeTet = new("00000000-0000-0000-0006-000000000008");
            public static readonly Guid NhacTayNguyen = new("00000000-0000-0000-0006-000000000009");
            public static readonly Guid NhacTayBac = new("00000000-0000-0000-0006-000000000010");
            public static readonly Guid NhacNamBo = new("00000000-0000-0000-0006-000000000011");
            public static readonly Guid NhacTrungBo = new("00000000-0000-0000-0006-000000000012");
            public static readonly Guid NhacBacBo = new("00000000-0000-0000-0006-000000000013");
            public static readonly Guid HatRuConNgu = new("00000000-0000-0000-0006-000000000014");
            public static readonly Guid NhacNguyenThuy = new("00000000-0000-0000-0006-000000000015");
        }

        /// <summary>
        /// Gọi method này trong OnModelCreating để seed toàn bộ metadata
        /// </summary>
        public static void Seed(ModelBuilder modelBuilder)
        {
            SeedEthnicGroups(modelBuilder);
            SeedInstruments(modelBuilder);
            SeedCeremonies(modelBuilder);
            SeedVocalStyles(modelBuilder);
            SeedMusicalScales(modelBuilder);
            SeedTags(modelBuilder);
            SeedEthnicGroupCeremonies(modelBuilder);
            SeedInstrumentEthnicGroups(modelBuilder);
        }

        // ============================================================
        // ETHNIC GROUPS - 54 Dân tộc Việt Nam
        // ============================================================
        private static void SeedEthnicGroups(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<EthnicGroup>().HasData(
                new EthnicGroup { Id = EthnicGroupIds.Kinh, Name = "Kinh (Việt)", LanguageFamily = "Austroasiatic", PrimaryRegion = "Toàn quốc" },
                new EthnicGroup { Id = EthnicGroupIds.Tay, Name = "Tày", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Thai, Name = "Thái", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Muong, Name = "Mường", LanguageFamily = "Austroasiatic", PrimaryRegion = "Bắc Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.Khmer, Name = "Khmer", LanguageFamily = "Austroasiatic", PrimaryRegion = "Đồng bằng sông Cửu Long" },
                new EthnicGroup { Id = EthnicGroupIds.Hoa, Name = "Hoa", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "TP.HCM, Đông Nam Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.Nung, Name = "Nùng", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.HMong, Name = "H'Mông", LanguageFamily = "Hmong-Mien", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Dao, Name = "Dao", LanguageFamily = "Hmong-Mien", PrimaryRegion = "Bắc Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.GiaRai, Name = "Gia Rai", LanguageFamily = "Austronesian", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.EDe, Name = "Ê Đê", LanguageFamily = "Austronesian", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.BaNa, Name = "Ba Na", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.XoDang, Name = "Xơ Đăng", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.SanChay, Name = "Sán Chay", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.CoHo, Name = "Cơ Ho", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.Cham, Name = "Chăm", LanguageFamily = "Austronesian", PrimaryRegion = "Nam Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.SanDiu, Name = "Sán Dìu", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Hre, Name = "Hrê", LanguageFamily = "Austroasiatic", PrimaryRegion = "Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.RaGlai, Name = "Ra Glai", LanguageFamily = "Austronesian", PrimaryRegion = "Nam Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.Mnong, Name = "Mnông", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.Tho, Name = "Thổ", LanguageFamily = "Austroasiatic", PrimaryRegion = "Bắc Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.Xtieng, Name = "Xtiêng", LanguageFamily = "Austroasiatic", PrimaryRegion = "Đông Nam Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.KhoMu, Name = "Khơ Mú", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.BruVanKieu, Name = "Bru - Vân Kiều", LanguageFamily = "Austroasiatic", PrimaryRegion = "Bắc Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.CoTu, Name = "Cơ Tu", LanguageFamily = "Austroasiatic", PrimaryRegion = "Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.Giay, Name = "Giáy", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.TaOi, Name = "Tà Ôi", LanguageFamily = "Austroasiatic", PrimaryRegion = "Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.Ma, Name = "Mạ", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.GieTrieng, Name = "Giẻ Triêng", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.Co, Name = "Co", LanguageFamily = "Austroasiatic", PrimaryRegion = "Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.ChoRo, Name = "Chơ Ro", LanguageFamily = "Austroasiatic", PrimaryRegion = "Đông Nam Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.XinhMun, Name = "Xinh Mun", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.HaNhi, Name = "Hà Nhì", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.ChuRu, Name = "Chu Ru", LanguageFamily = "Austronesian", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.Lao, Name = "Lào", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.LaChi, Name = "La Chí", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Khang, Name = "Kháng", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.PhuLa, Name = "Phù Lá", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.LaHu, Name = "La Hủ", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.LaHa, Name = "La Ha", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.PaThen, Name = "Pà Thẻn", LanguageFamily = "Hmong-Mien", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Lu, Name = "Lự", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Ngai, Name = "Ngái", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Chut, Name = "Chứt", LanguageFamily = "Austroasiatic", PrimaryRegion = "Bắc Trung Bộ" },
                new EthnicGroup { Id = EthnicGroupIds.LoLo, Name = "Lô Lô", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Mang, Name = "Mảng", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.CoLao, Name = "Cơ Lao", LanguageFamily = "Hmong-Mien", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.BoY, Name = "Bố Y", LanguageFamily = "Tai-Kadai", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Cong, Name = "Cống", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.SiLa, Name = "Si La", LanguageFamily = "Sino-Tibetan", PrimaryRegion = "Tây Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.PuPeo, Name = "Pu Péo", LanguageFamily = "Hmong-Mien", PrimaryRegion = "Đông Bắc" },
                new EthnicGroup { Id = EthnicGroupIds.Brau, Name = "Brâu", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.RoMam, Name = "Rơ Măm", LanguageFamily = "Austroasiatic", PrimaryRegion = "Tây Nguyên" },
                new EthnicGroup { Id = EthnicGroupIds.ODu, Name = "Ơ Đu", LanguageFamily = "Austroasiatic", PrimaryRegion = "Bắc Trung Bộ" }
            );
        }

        // ============================================================
        // INSTRUMENTS - 20 Nhạc cụ truyền thống
        // ============================================================
        private static void SeedInstruments(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Instrument>().HasData(
                new Instrument { Id = InstrumentIds.DanBau, Name = "Đàn bầu", Category = "String", Description = "Đàn một dây, biểu tượng âm nhạc Việt Nam", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.DanTranh, Name = "Đàn tranh", Category = "String", Description = "Đàn 16 dây, zither truyền thống", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.DanNguyet, Name = "Đàn nguyệt", Category = "String", Description = "Đàn hai dây mặt tròn như mặt trăng", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.DanNhi, Name = "Đàn nhị", Category = "String", Description = "Đàn hai dây kéo cung, fiddle truyền thống", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.DanTyBa, Name = "Đàn tỳ bà", Category = "String", Description = "Đàn bốn dây giống pipa", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.DanDay, Name = "Đàn đáy", Category = "String", Description = "Đàn ba dây phím dài, dùng trong ca trù", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.SaoTruc, Name = "Sáo trúc", Category = "Wind", Description = "Sáo ngang bằng trúc", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.Tieu, Name = "Tiêu", Category = "Wind", Description = "Sáo dọc bằng trúc", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.KenBau, Name = "Kèn bầu", Category = "Wind", Description = "Kèn ống bầu truyền thống", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.TrongCom, Name = "Trống cơm", Category = "Percussion", Description = "Trống hai mặt dùng trong nhạc cung đình", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.TrongDong, Name = "Trống đồng", Category = "Percussion", Description = "Trống đồng cổ, biểu tượng văn hóa Đông Sơn", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.Phach, Name = "Phách", Category = "Percussion", Description = "Nhạc cụ gõ bằng tre, dùng trong ca trù", OriginEthnicGroupId = EthnicGroupIds.Kinh },
                new Instrument { Id = InstrumentIds.Trung, Name = "T'rưng", Category = "Percussion", Description = "Đàn tre xylophone của Tây Nguyên", OriginEthnicGroupId = EthnicGroupIds.GiaRai },
                new Instrument { Id = InstrumentIds.CongChieng, Name = "Cồng chiêng", Category = "Percussion", Description = "Bộ cồng chiêng Tây Nguyên - Di sản UNESCO", OriginEthnicGroupId = EthnicGroupIds.GiaRai },
                new Instrument { Id = InstrumentIds.DingNam, Name = "Đing năm", Category = "Wind", Description = "Sáo mũi của người Ê Đê", OriginEthnicGroupId = EthnicGroupIds.EDe },
                new Instrument { Id = InstrumentIds.KlongPut, Name = "Klong put", Category = "Wind", Description = "Ống tre vỗ tay của Tây Nguyên", OriginEthnicGroupId = EthnicGroupIds.BaNa },
                new Instrument { Id = InstrumentIds.Khen, Name = "Khèn", Category = "Wind", Description = "Kèn bầu nhiều ống của người H'Mông", OriginEthnicGroupId = EthnicGroupIds.HMong },
                new Instrument { Id = InstrumentIds.DanTinh, Name = "Đàn tính", Category = "String", Description = "Đàn hai dây của người Tày", OriginEthnicGroupId = EthnicGroupIds.Tay },
                new Instrument { Id = InstrumentIds.DanChapi, Name = "Đàn Chapi", Category = "String", Description = "Đàn tre môi của người Ra Glai", OriginEthnicGroupId = EthnicGroupIds.RaGlai },
                new Instrument { Id = InstrumentIds.DanKni, Name = "Đàn K'ní", Category = "String", Description = "Đàn kéo cung một dây của Tây Nguyên", OriginEthnicGroupId = EthnicGroupIds.GiaRai }
            );
        }

        // ============================================================
        // CEREMONIES - 12 Nghi lễ truyền thống
        // ============================================================
        private static void SeedCeremonies(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Ceremony>().HasData(
                new Ceremony { Id = CeremonyIds.LeCuoi, Name = "Lễ cưới", Type = "Wedding", Description = "Nghi lễ cưới hỏi truyền thống" },
                new Ceremony { Id = CeremonyIds.LeTang, Name = "Lễ tang", Type = "Funeral", Description = "Nghi lễ tiễn đưa người mất" },
                new Ceremony { Id = CeremonyIds.MungLuaMoi, Name = "Lễ mừng lúa mới", Type = "Harvest", Description = "Lễ mừng thu hoạch lúa, phổ biến ở Tây Nguyên", Season = "Thu" },
                new Ceremony { Id = CeremonyIds.GauTao, Name = "Lễ hội Gầu Tào", Type = "Festival", Description = "Lễ hội lớn nhất của người H'Mông", Season = "Xuân" },
                new Ceremony { Id = CeremonyIds.LongTong, Name = "Lễ hội Lồng Tồng", Type = "Festival", Description = "Lễ hội xuống đồng của người Tày", Season = "Xuân" },
                new Ceremony { Id = CeremonyIds.CungBenNuoc, Name = "Lễ cúng bến nước", Type = "Ritual", Description = "Lễ cúng thần nước của các dân tộc Tây Nguyên" },
                new Ceremony { Id = CeremonyIds.HatThen, Name = "Hát then", Type = "Ritual", Description = "Nghi lễ then - Di sản UNESCO, người Tày/Nùng" },
                new Ceremony { Id = CeremonyIds.CaTru, Name = "Ca trù", Type = "Daily", Description = "Nghệ thuật ca trù - Di sản UNESCO" },
                new Ceremony { Id = CeremonyIds.NhaNhac, Name = "Nhã nhạc cung đình Huế", Type = "Ritual", Description = "Nhạc cung đình Huế - Di sản UNESCO" },
                new Ceremony { Id = CeremonyIds.DamGio, Name = "Đám giỗ", Type = "Ritual", Description = "Lễ giỗ tổ tiên, cúng ông bà" },
                new Ceremony { Id = CeremonyIds.CapSac, Name = "Lễ cấp sắc", Type = "Ritual", Description = "Lễ trưởng thành của người Dao" },
                new Ceremony { Id = CeremonyIds.BoMa, Name = "Lễ bỏ mả", Type = "Funeral", Description = "Lễ bỏ mả của các dân tộc Tây Nguyên" }
            );
        }

        // ============================================================
        // VOCAL STYLES - 12 Phong cách hát
        // ============================================================
        private static void SeedVocalStyles(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<VocalStyle>().HasData(
                new VocalStyle { Id = VocalStyleIds.HatThen, Name = "Hát then", Description = "Hát then của người Tày, Nùng - Di sản UNESCO", EthnicGroupId = EthnicGroupIds.Tay },
                new VocalStyle { Id = VocalStyleIds.HatXoan, Name = "Hát xoan", Description = "Hát xoan Phú Thọ - Di sản UNESCO", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.HatChauVan, Name = "Hát chầu văn", Description = "Hát văn trong nghi lễ hầu đồng", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.HatQuanHo, Name = "Hát quan họ", Description = "Dân ca quan họ Bắc Ninh - Di sản UNESCO", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.CaTru, Name = "Ca trù", Description = "Nghệ thuật ca trù - Di sản UNESCO", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.HatVi, Name = "Hát ví", Description = "Ví, giặm Nghệ Tĩnh - Di sản UNESCO", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.HatRuNghe, Name = "Hát ru", Description = "Hát ru con ngủ, phổ biến toàn quốc", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.DonCaTaiTu, Name = "Đờn ca tài tử", Description = "Đờn ca tài tử Nam Bộ - Di sản UNESCO", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.HatBoi, Name = "Hát bội", Description = "Hát bội (tuồng) miền Trung", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.CaiLuong, Name = "Cải lương", Description = "Cải lương Nam Bộ", EthnicGroupId = EthnicGroupIds.Kinh },
                new VocalStyle { Id = VocalStyleIds.HatADay, Name = "Hát A Đay", Description = "Hát A Đay của người Ê Đê", EthnicGroupId = EthnicGroupIds.EDe },
                new VocalStyle { Id = VocalStyleIds.HatKhap, Name = "Hát khắp", Description = "Hát khắp của người Thái", EthnicGroupId = EthnicGroupIds.Thai }
            );
        }

        // ============================================================
        // MUSICAL SCALES - 8 Thang âm
        // ============================================================
        private static void SeedMusicalScales(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<MusicalScale>().HasData(
                new MusicalScale { Id = MusicalScaleIds.NamBac, Name = "Điệu Bắc", Description = "Thang âm ngũ cung Bắc, tính chất vui tươi sáng sủa", NotePattern = "Hò-Xự-Xang-Xê-Cống" },
                new MusicalScale { Id = MusicalScaleIds.NamNam, Name = "Điệu Nam", Description = "Thang âm ngũ cung Nam, tính chất buồn ai oán", NotePattern = "Hò-Xự-Xang-Xê-Cống (biến thể Nam)" },
                new MusicalScale { Id = MusicalScaleIds.NamXuan, Name = "Nam Xuân", Description = "Hơi Xuân trong nhạc tài tử, tươi sáng", NotePattern = "Hò-Xự-Xang-Xê-Cống (Xuân)" },
                new MusicalScale { Id = MusicalScaleIds.NamAi, Name = "Nam Ai", Description = "Hơi Ai trong nhạc tài tử, buồn thương", NotePattern = "Hò-Xự-Xang-Xê-Cống (Ai)" },
                new MusicalScale { Id = MusicalScaleIds.OanDieu, Name = "Oán điệu", Description = "Hơi Oán trong nhạc tài tử, bi thương sâu lắng", NotePattern = "Hò-Xự-Xang-Xê-Cống (Oán)" },
                new MusicalScale { Id = MusicalScaleIds.BacDieu, Name = "Bắc điệu", Description = "Hơi Bắc trong nhạc cải lương, vui sáng", NotePattern = "Hò-Xự-Xang-Xê-Cống (Bắc)" },
                new MusicalScale { Id = MusicalScaleIds.PentatonicDoMinor, Name = "Ngũ cung thứ", Description = "Thang ngũ cung Đô thứ, phổ biến trong nhạc dân tộc thiểu số", NotePattern = "C-Eb-F-G-Bb" },
                new MusicalScale { Id = MusicalScaleIds.PentatonicDoMajor, Name = "Ngũ cung trưởng", Description = "Thang ngũ cung Đô trưởng", NotePattern = "C-D-E-G-A" }
            );
        }

        // ============================================================
        // TAGS - 15 Nhãn phân loại
        // ============================================================
        private static void SeedTags(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Tag>().HasData(
                new Tag { Id = TagIds.DiSanUNESCO, Name = "Di sản UNESCO", Category = "Heritage" },
                new Tag { Id = TagIds.DiSanQuocGia, Name = "Di sản quốc gia", Category = "Heritage" },
                new Tag { Id = TagIds.NhacCuHiem, Name = "Nhạc cụ hiếm", Category = "Rarity" },
                new Tag { Id = TagIds.BanGhiGoc, Name = "Bản ghi gốc", Category = "Source" },
                new Tag { Id = TagIds.NgheNhanUuTu, Name = "Nghệ nhân ưu tú", Category = "Performer" },
                new Tag { Id = TagIds.NhacCungDinh, Name = "Nhạc cung đình", Category = "Genre" },
                new Tag { Id = TagIds.NhacDanGian, Name = "Nhạc dân gian", Category = "Genre" },
                new Tag { Id = TagIds.NhacLeTet, Name = "Nhạc lễ Tết", Category = "Genre" },
                new Tag { Id = TagIds.NhacTayNguyen, Name = "Nhạc Tây Nguyên", Category = "Region" },
                new Tag { Id = TagIds.NhacTayBac, Name = "Nhạc Tây Bắc", Category = "Region" },
                new Tag { Id = TagIds.NhacNamBo, Name = "Nhạc Nam Bộ", Category = "Region" },
                new Tag { Id = TagIds.NhacTrungBo, Name = "Nhạc Trung Bộ", Category = "Region" },
                new Tag { Id = TagIds.NhacBacBo, Name = "Nhạc Bắc Bộ", Category = "Region" },
                new Tag { Id = TagIds.HatRuConNgu, Name = "Hát ru con ngủ", Category = "Genre" },
                new Tag { Id = TagIds.NhacNguyenThuy, Name = "Nhạc nguyên thủy", Category = "Rarity" }
            );
        }

        // ============================================================
        // ETHNIC GROUP - CEREMONY (Many-to-Many)
        // ============================================================
        private static void SeedEthnicGroupCeremonies(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<EthnicGroupCeremony>().HasData(
                // Lễ cưới - nhiều dân tộc
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Kinh, CeremonyId = CeremonyIds.LeCuoi },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Tay, CeremonyId = CeremonyIds.LeCuoi },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Thai, CeremonyId = CeremonyIds.LeCuoi },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.HMong, CeremonyId = CeremonyIds.LeCuoi },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Khmer, CeremonyId = CeremonyIds.LeCuoi },

                // Lễ tang
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Kinh, CeremonyId = CeremonyIds.LeTang },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Tay, CeremonyId = CeremonyIds.LeTang },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Thai, CeremonyId = CeremonyIds.LeTang },

                // Lễ mừng lúa mới - Tây Nguyên
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.GiaRai, CeremonyId = CeremonyIds.MungLuaMoi },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.EDe, CeremonyId = CeremonyIds.MungLuaMoi },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.BaNa, CeremonyId = CeremonyIds.MungLuaMoi },

                // Gầu Tào - H'Mông
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.HMong, CeremonyId = CeremonyIds.GauTao },

                // Lồng Tồng - Tày
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Tay, CeremonyId = CeremonyIds.LongTong },

                // Cúng bến nước - Tây Nguyên
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.GiaRai, CeremonyId = CeremonyIds.CungBenNuoc },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.EDe, CeremonyId = CeremonyIds.CungBenNuoc },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.BaNa, CeremonyId = CeremonyIds.CungBenNuoc },

                // Hát then - Tày, Nùng
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Tay, CeremonyId = CeremonyIds.HatThen },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Nung, CeremonyId = CeremonyIds.HatThen },

                // Ca trù, Nhã nhạc, Đám giỗ - Kinh
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Kinh, CeremonyId = CeremonyIds.CaTru },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Kinh, CeremonyId = CeremonyIds.NhaNhac },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Kinh, CeremonyId = CeremonyIds.DamGio },

                // Lễ cấp sắc - Dao
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.Dao, CeremonyId = CeremonyIds.CapSac },

                // Lễ bỏ mả - Tây Nguyên
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.GiaRai, CeremonyId = CeremonyIds.BoMa },
                new EthnicGroupCeremony { EthnicGroupId = EthnicGroupIds.BaNa, CeremonyId = CeremonyIds.BoMa }
            );
        }

        // ============================================================
        // INSTRUMENT - ETHNIC GROUP (Many-to-Many)
        // ============================================================
        private static void SeedInstrumentEthnicGroups(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<InstrumentEthnicGroup>().HasData(
                // Đàn bầu, Đàn tranh, Sáo trúc... dùng rộng rãi
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanBau, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanTranh, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanNguyet, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanNhi, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanTyBa, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanDay, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.SaoTruc, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.Tieu, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.KenBau, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.TrongCom, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.TrongDong, EthnicGroupId = EthnicGroupIds.Kinh },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.Phach, EthnicGroupId = EthnicGroupIds.Kinh },

                // Sáo trúc dùng bởi nhiều dân tộc
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.SaoTruc, EthnicGroupId = EthnicGroupIds.Tay },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.SaoTruc, EthnicGroupId = EthnicGroupIds.Thai },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.SaoTruc, EthnicGroupId = EthnicGroupIds.Muong },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.SaoTruc, EthnicGroupId = EthnicGroupIds.HMong },

                // Cồng chiêng - nhiều dân tộc Tây Nguyên
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.CongChieng, EthnicGroupId = EthnicGroupIds.GiaRai },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.CongChieng, EthnicGroupId = EthnicGroupIds.EDe },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.CongChieng, EthnicGroupId = EthnicGroupIds.BaNa },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.CongChieng, EthnicGroupId = EthnicGroupIds.XoDang },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.CongChieng, EthnicGroupId = EthnicGroupIds.Mnong },

                // T'rưng
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.Trung, EthnicGroupId = EthnicGroupIds.GiaRai },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.Trung, EthnicGroupId = EthnicGroupIds.BaNa },

                // Đing năm - Ê Đê
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DingNam, EthnicGroupId = EthnicGroupIds.EDe },

                // Klong put - Ba Na
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.KlongPut, EthnicGroupId = EthnicGroupIds.BaNa },

                // Khèn - H'Mông
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.Khen, EthnicGroupId = EthnicGroupIds.HMong },

                // Đàn tính - Tày, Nùng
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanTinh, EthnicGroupId = EthnicGroupIds.Tay },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanTinh, EthnicGroupId = EthnicGroupIds.Nung },

                // Đàn Chapi - Ra Glai
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanChapi, EthnicGroupId = EthnicGroupIds.RaGlai },

                // Đàn K'ní - Gia Rai, Ba Na
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanKni, EthnicGroupId = EthnicGroupIds.GiaRai },
                new InstrumentEthnicGroup { InstrumentId = InstrumentIds.DanKni, EthnicGroupId = EthnicGroupIds.BaNa }
            );
        }
    }
}