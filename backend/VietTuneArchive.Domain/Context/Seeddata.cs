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
        // ====== Pre-defined Guids for Provinces (63 tỉnh/thành phố) ======
        public static class ProvinceIds
        {
            // Bắc Bộ (Northern Vietnam)
            public static readonly Guid HaNoi = new("00000000-0000-0000-0008-000000000001");
            public static readonly Guid HaGiang = new("00000000-0000-0000-0008-000000000002");
            public static readonly Guid CaoBang = new("00000000-0000-0000-0008-000000000003");
            public static readonly Guid BacKan = new("00000000-0000-0000-0008-000000000004");
            public static readonly Guid TuyenQuang = new("00000000-0000-0000-0008-000000000005");
            public static readonly Guid LaoCai = new("00000000-0000-0000-0008-000000000006");
            public static readonly Guid DienBien = new("00000000-0000-0000-0008-000000000007");
            public static readonly Guid LaiChau = new("00000000-0000-0000-0008-000000000008");
            public static readonly Guid SonLa = new("00000000-0000-0000-0008-000000000009");
            public static readonly Guid YenBai = new("00000000-0000-0000-0008-000000000010");
            public static readonly Guid HoaBinh = new("00000000-0000-0000-0008-000000000011");
            public static readonly Guid ThaiNguyen = new("00000000-0000-0000-0008-000000000012");
            public static readonly Guid LangSon = new("00000000-0000-0000-0008-000000000013");
            public static readonly Guid QuangNinh = new("00000000-0000-0000-0008-000000000014");
            public static readonly Guid BacGiang = new("00000000-0000-0000-0008-000000000015");
            public static readonly Guid PhuTho = new("00000000-0000-0000-0008-000000000016");
            public static readonly Guid VinhPhuc = new("00000000-0000-0000-0008-000000000017");
            public static readonly Guid BacNinh = new("00000000-0000-0000-0008-000000000018");
            public static readonly Guid HaiDuong = new("00000000-0000-0000-0008-000000000019");
            public static readonly Guid HaiPhong = new("00000000-0000-0000-0008-000000000020");
            public static readonly Guid HungYen = new("00000000-0000-0000-0008-000000000021");
            public static readonly Guid ThaiBinh = new("00000000-0000-0000-0008-000000000022");
            public static readonly Guid HaNam = new("00000000-0000-0000-0008-000000000023");
            public static readonly Guid NamDinh = new("00000000-0000-0000-0008-000000000024");
            public static readonly Guid NinhBinh = new("00000000-0000-0000-0008-000000000025");

            // Bắc Trung Bộ (North Central)
            public static readonly Guid ThanhHoa = new("00000000-0000-0000-0008-000000000026");
            public static readonly Guid NgheAn = new("00000000-0000-0000-0008-000000000027");
            public static readonly Guid HaTinh = new("00000000-0000-0000-0008-000000000028");
            public static readonly Guid QuangBinh = new("00000000-0000-0000-0008-000000000029");
            public static readonly Guid QuangTri = new("00000000-0000-0000-0008-000000000030");
            public static readonly Guid ThuaThienHue = new("00000000-0000-0000-0008-000000000031");

            // Nam Trung Bộ (South Central)
            public static readonly Guid DaNang = new("00000000-0000-0000-0008-000000000032");
            public static readonly Guid QuangNam = new("00000000-0000-0000-0008-000000000033");
            public static readonly Guid QuangNgai = new("00000000-0000-0000-0008-000000000034");
            public static readonly Guid BinhDinh = new("00000000-0000-0000-0008-000000000035");
            public static readonly Guid PhuYen = new("00000000-0000-0000-0008-000000000036");
            public static readonly Guid KhanhHoa = new("00000000-0000-0000-0008-000000000037");
            public static readonly Guid NinhThuan = new("00000000-0000-0000-0008-000000000038");
            public static readonly Guid BinhThuan = new("00000000-0000-0000-0008-000000000039");

            // Tây Nguyên (Central Highlands)
            public static readonly Guid KonTum = new("00000000-0000-0000-0008-000000000040");
            public static readonly Guid GiaLai = new("00000000-0000-0000-0008-000000000041");
            public static readonly Guid DakLak = new("00000000-0000-0000-0008-000000000042");
            public static readonly Guid DakNong = new("00000000-0000-0000-0008-000000000043");
            public static readonly Guid LamDong = new("00000000-0000-0000-0008-000000000044");

            // Đông Nam Bộ (Southeast)
            public static readonly Guid BinhPhuoc = new("00000000-0000-0000-0008-000000000045");
            public static readonly Guid TayNinh = new("00000000-0000-0000-0008-000000000046");
            public static readonly Guid BinhDuong = new("00000000-0000-0000-0008-000000000047");
            public static readonly Guid DongNai = new("00000000-0000-0000-0008-000000000048");
            public static readonly Guid BaRiaVungTau = new("00000000-0000-0000-0008-000000000049");
            public static readonly Guid HoChiMinh = new("00000000-0000-0000-0008-000000000050");

            // Đồng bằng sông Cửu Long (Mekong Delta)
            public static readonly Guid LongAn = new("00000000-0000-0000-0008-000000000051");
            public static readonly Guid TienGiang = new("00000000-0000-0000-0008-000000000052");
            public static readonly Guid BenTre = new("00000000-0000-0000-0008-000000000053");
            public static readonly Guid TraVinh = new("00000000-0000-0000-0008-000000000054");
            public static readonly Guid VinhLong = new("00000000-0000-0000-0008-000000000055");
            public static readonly Guid DongThap = new("00000000-0000-0000-0008-000000000056");
            public static readonly Guid AnGiang = new("00000000-0000-0000-0008-000000000057");
            public static readonly Guid KienGiang = new("00000000-0000-0000-0008-000000000058");
            public static readonly Guid CanTho = new("00000000-0000-0000-0008-000000000059");
            public static readonly Guid HauGiang = new("00000000-0000-0000-0008-000000000060");
            public static readonly Guid SocTrang = new("00000000-0000-0000-0008-000000000061");
            public static readonly Guid BacLieu = new("00000000-0000-0000-0008-000000000062");
            public static readonly Guid CaMau = new("00000000-0000-0000-0008-000000000063");
        }

        // ====== Pre-defined Guids for Districts ======
        public static class DistrictIds
        {
            // Hà Nội
            public static readonly Guid HoanKiem = new("00000000-0000-0000-0009-000000000001");
            public static readonly Guid DongDa = new("00000000-0000-0000-0009-000000000002");
            public static readonly Guid BaDinh = new("00000000-0000-0000-0009-000000000003");
            public static readonly Guid HaiBaTrung = new("00000000-0000-0000-0009-000000000004");
            public static readonly Guid CauGiay = new("00000000-0000-0000-0009-000000000005");
            public static readonly Guid TayHo = new("00000000-0000-0000-0009-000000000006");

            // Hà Giang
            public static readonly Guid TPHaGiang = new("00000000-0000-0000-0009-000000000007");
            public static readonly Guid DongVan = new("00000000-0000-0000-0009-000000000008");
            public static readonly Guid MeoVac = new("00000000-0000-0000-0009-000000000009");

            // Lào Cai
            public static readonly Guid TPLaoCai = new("00000000-0000-0000-0009-000000000010");
            public static readonly Guid SaPa = new("00000000-0000-0000-0009-000000000011");
            public static readonly Guid BacHa = new("00000000-0000-0000-0009-000000000012");

            // Điện Biên
            public static readonly Guid TPDienBienPhu = new("00000000-0000-0000-0009-000000000013");
            public static readonly Guid DienBienDong = new("00000000-0000-0000-0009-000000000014");

            // Sơn La
            public static readonly Guid TPSonLa = new("00000000-0000-0000-0009-000000000015");
            public static readonly Guid MocChau = new("00000000-0000-0000-0009-000000000016");

            // Hòa Bình
            public static readonly Guid TPHoaBinh = new("00000000-0000-0000-0009-000000000017");
            public static readonly Guid MaiChau = new("00000000-0000-0000-0009-000000000018");

            // Bắc Ninh
            public static readonly Guid TPBacNinh = new("00000000-0000-0000-0009-000000000019");
            public static readonly Guid TienDu = new("00000000-0000-0000-0009-000000000020");

            // Phú Thọ
            public static readonly Guid TPVietTri = new("00000000-0000-0000-0009-000000000021");
            public static readonly Guid LamThao = new("00000000-0000-0000-0009-000000000022");

            // Thừa Thiên Huế
            public static readonly Guid TPHue = new("00000000-0000-0000-0009-000000000023");
            public static readonly Guid PhongDien = new("00000000-0000-0000-0009-000000000024");

            // Nghệ An
            public static readonly Guid TPVinh = new("00000000-0000-0000-0009-000000000025");
            public static readonly Guid ConCuong = new("00000000-0000-0000-0009-000000000026");

            // Gia Lai
            public static readonly Guid TPPleiku = new("00000000-0000-0000-0009-000000000027");
            public static readonly Guid ChuSe = new("00000000-0000-0000-0009-000000000028");
            public static readonly Guid IaGrai = new("00000000-0000-0000-0009-000000000029");

            // Đắk Lắk
            public static readonly Guid TPBuonMaThuot = new("00000000-0000-0000-0009-000000000030");
            public static readonly Guid CuMGar = new("00000000-0000-0000-0009-000000000031");
            public static readonly Guid LakDistrict = new("00000000-0000-0000-0009-000000000032");

            // Kon Tum
            public static readonly Guid TPKonTum = new("00000000-0000-0000-0009-000000000033");
            public static readonly Guid DakGlei = new("00000000-0000-0000-0009-000000000034");

            // Lâm Đồng
            public static readonly Guid TPDaLat = new("00000000-0000-0000-0009-000000000035");
            public static readonly Guid LacDuong = new("00000000-0000-0000-0009-000000000036");

            // Ninh Thuận
            public static readonly Guid TPPhanRangThapChamNT = new("00000000-0000-0000-0009-000000000037");
            public static readonly Guid NinhPhuoc = new("00000000-0000-0000-0009-000000000038");

            // TP.HCM
            public static readonly Guid Quan1 = new("00000000-0000-0000-0009-000000000039");
            public static readonly Guid Quan5 = new("00000000-0000-0000-0009-000000000040");
            public static readonly Guid ThuDuc = new("00000000-0000-0000-0009-000000000041");

            // Cần Thơ
            public static readonly Guid NinhKieu = new("00000000-0000-0000-0009-000000000042");
            public static readonly Guid PhongDienCT = new("00000000-0000-0000-0009-000000000043");

            // Sóc Trăng
            public static readonly Guid TPSocTrang = new("00000000-0000-0000-0009-000000000044");
            public static readonly Guid VinhChau = new("00000000-0000-0000-0009-000000000045");

            // Trà Vinh
            public static readonly Guid TPTraVinh = new("00000000-0000-0000-0009-000000000046");
            public static readonly Guid CauKe = new("00000000-0000-0000-0009-000000000047");

            // Lạng Sơn
            public static readonly Guid TPLangSon = new("00000000-0000-0000-0009-000000000048");
            public static readonly Guid BacSon = new("00000000-0000-0000-0009-000000000049");

            // Cao Bằng
            public static readonly Guid TPCaoBang = new("00000000-0000-0000-0009-000000000050");
            public static readonly Guid NguyenBinh = new("00000000-0000-0000-0009-000000000051");

            // Đắk Nông
            public static readonly Guid GiaNghia = new("00000000-0000-0000-0009-000000000052");
            public static readonly Guid DakSong = new("00000000-0000-0000-0009-000000000053");

            // Quảng Nam
            public static readonly Guid TPHoiAn = new("00000000-0000-0000-0009-000000000054");
            public static readonly Guid DienBanQN = new("00000000-0000-0000-0009-000000000055");

            // Bình Định
            public static readonly Guid TPQuyNhon = new("00000000-0000-0000-0009-000000000056");
            public static readonly Guid TaysonBD = new("00000000-0000-0000-0009-000000000057");

            // An Giang
            public static readonly Guid TPLongXuyen = new("00000000-0000-0000-0009-000000000058");
            public static readonly Guid TriTon = new("00000000-0000-0000-0009-000000000059");
        }

        // ====== Pre-defined Guids for Communes ======
        public static class CommuneIds
        {
            // Hoàn Kiếm, Hà Nội
            public static readonly Guid HangBac = new("00000000-0000-0000-0010-000000000001");
            public static readonly Guid CuaDong = new("00000000-0000-0000-0010-000000000002");

            // Đống Đa, Hà Nội
            public static readonly Guid CatLinh = new("00000000-0000-0000-0010-000000000003");
            public static readonly Guid VanMieu = new("00000000-0000-0000-0010-000000000004");

            // Đồng Văn, Hà Giang
            public static readonly Guid TTDongVan = new("00000000-0000-0000-0010-000000000005");
            public static readonly Guid LungCu = new("00000000-0000-0000-0010-000000000006");
            public static readonly Guid SaPhìn = new("00000000-0000-0000-0010-000000000007");

            // Mèo Vạc, Hà Giang
            public static readonly Guid TTMeoVac = new("00000000-0000-0000-0010-000000000008");
            public static readonly Guid PaiLung = new("00000000-0000-0000-0010-000000000009");

            // Sa Pa, Lào Cai
            public static readonly Guid TTSaPa = new("00000000-0000-0000-0010-000000000010");
            public static readonly Guid TaVan = new("00000000-0000-0000-0010-000000000011");
            public static readonly Guid CatCat = new("00000000-0000-0000-0010-000000000012");
            public static readonly Guid TaPhin = new("00000000-0000-0000-0010-000000000013");

            // Bắc Hà, Lào Cai
            public static readonly Guid TTBacHa = new("00000000-0000-0000-0010-000000000014");
            public static readonly Guid BanPho = new("00000000-0000-0000-0010-000000000015");

            // Mộc Châu, Sơn La
            public static readonly Guid TTMocChau = new("00000000-0000-0000-0010-000000000016");
            public static readonly Guid ChiengHac = new("00000000-0000-0000-0010-000000000017");

            // Mai Châu, Hòa Bình
            public static readonly Guid TTMaiChau = new("00000000-0000-0000-0010-000000000018");
            public static readonly Guid Lac = new("00000000-0000-0000-0010-000000000019");
            public static readonly Guid PomCoong = new("00000000-0000-0000-0010-000000000020");

            // Tiên Du, Bắc Ninh
            public static readonly Guid LimBN = new("00000000-0000-0000-0010-000000000021");
            public static readonly Guid DuongPhongBN = new("00000000-0000-0000-0010-000000000022");

            // Việt Trì, Phú Thọ
            public static readonly Guid ThoBach = new("00000000-0000-0000-0010-000000000023");
            public static readonly Guid VanPhu = new("00000000-0000-0000-0010-000000000024");

            // TP Huế, Thừa Thiên Huế
            public static readonly Guid KimLong = new("00000000-0000-0000-0010-000000000025");
            public static readonly Guid PhuHoi = new("00000000-0000-0000-0010-000000000026");

            // TP Pleiku, Gia Lai
            public static readonly Guid YenDo = new("00000000-0000-0000-0010-000000000027");
            public static readonly Guid HoaPhuGL = new("00000000-0000-0000-0010-000000000028");

            // Ia Grai, Gia Lai
            public static readonly Guid IaOGL = new("00000000-0000-0000-0010-000000000029");
            public static readonly Guid IaSaoGL = new("00000000-0000-0000-0010-000000000030");

            // Buôn Ma Thuột, Đắk Lắk
            public static readonly Guid TanLoi = new("00000000-0000-0000-0010-000000000031");
            public static readonly Guid EaTam = new("00000000-0000-0000-0010-000000000032");

            // Lắk, Đắk Lắk
            public static readonly Guid TTLien = new("00000000-0000-0000-0010-000000000033");
            public static readonly Guid YangTao = new("00000000-0000-0000-0010-000000000034");

            // TP Kon Tum
            public static readonly Guid QuangTrungKT = new("00000000-0000-0000-0010-000000000035");
            public static readonly Guid ThongNhatKT = new("00000000-0000-0000-0010-000000000036");

            // Đắk Glei, Kon Tum
            public static readonly Guid TTDakGlei = new("00000000-0000-0000-0010-000000000037");
            public static readonly Guid DakBloKT = new("00000000-0000-0000-0010-000000000038");

            // Lạc Dương, Lâm Đồng
            public static readonly Guid TTLacDuong = new("00000000-0000-0000-0010-000000000039");
            public static readonly Guid Lat = new("00000000-0000-0000-0010-000000000040");

            // Ninh Phước, Ninh Thuận
            public static readonly Guid PhuocDan = new("00000000-0000-0000-0010-000000000041");
            public static readonly Guid HuuDuc = new("00000000-0000-0000-0010-000000000042");

            // Quận 5, TP.HCM
            public static readonly Guid Phuong1Q5 = new("00000000-0000-0000-0010-000000000043");
            public static readonly Guid Phuong7Q5 = new("00000000-0000-0000-0010-000000000044");

            // Vĩnh Châu, Sóc Trăng
            public static readonly Guid VinhPhuocST = new("00000000-0000-0000-0010-000000000045");
            public static readonly Guid LaiHoaST = new("00000000-0000-0000-0010-000000000046");

            // Cầu Kè, Trà Vinh
            public static readonly Guid TTCauKe = new("00000000-0000-0000-0010-000000000047");
            public static readonly Guid HoaTan = new("00000000-0000-0000-0010-000000000048");

            // Tri Tôn, An Giang
            public static readonly Guid TTTriTon = new("00000000-0000-0000-0010-000000000049");
            public static readonly Guid OLam = new("00000000-0000-0000-0010-000000000050");

            // Bắc Sơn, Lạng Sơn
            public static readonly Guid TTBacSonLS = new("00000000-0000-0000-0010-000000000051");
            public static readonly Guid VuLang = new("00000000-0000-0000-0010-000000000052");

            // Con Cuông, Nghệ An
            public static readonly Guid TTConCuong = new("00000000-0000-0000-0010-000000000053");
            public static readonly Guid MonSon = new("00000000-0000-0000-0010-000000000054");

            // Phong Điền, Cần Thơ
            public static readonly Guid MyChanh = new("00000000-0000-0000-0010-000000000055");
            public static readonly Guid NhonAi = new("00000000-0000-0000-0010-000000000056");

            // Hội An, Quảng Nam
            public static readonly Guid MinhAn = new("00000000-0000-0000-0010-000000000057");
            public static readonly Guid CamPho = new("00000000-0000-0000-0010-000000000058");

            // TP Điện Biên Phủ
            public static readonly Guid TanhDB = new("00000000-0000-0000-0010-000000000059");
            public static readonly Guid NamThanhDB = new("00000000-0000-0000-0010-000000000060");
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
            SeedUsers(modelBuilder);
            SeedCommunes(modelBuilder);
            SeedDistricts(modelBuilder);
            SeedProvinces(modelBuilder);
        }

        // ====== Pre-defined Guids for Users ======
        public static class UserIds
        {
            public static readonly Guid AdminUser = new("00000000-0000-0000-0007-000000000001");
            public static readonly Guid Contributor1 = new("00000000-0000-0000-0007-000000000002");
            public static readonly Guid Contributor2 = new("00000000-0000-0000-0007-000000000003");
            public static readonly Guid Researcher1 = new("00000000-0000-0000-0007-000000000004");
            public static readonly Guid Researcher2 = new("00000000-0000-0000-0007-000000000005");
            public static readonly Guid Expert1 = new("00000000-0000-0000-0007-000000000006");
            public static readonly Guid Expert2 = new("00000000-0000-0000-0007-000000000007");
            public static readonly Guid Expert3 = new("00000000-0000-0000-0007-000000000008");
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

        // ============================================================
        // USERS - 1 Admin, 2 Contributors, 2 Researchers, 3 Experts
        // ============================================================
        private static void SeedUsers(ModelBuilder modelBuilder)
        {
            // Hashed password cho "password123" (dùng BCrypt hoặc tương tự)
            // Trong thực tế, password phải được hash bằng BCrypt trước
            var hashedPassword = "$2a$12$ESO37RsCeR9TfAF3ct4R2.oN1s3QuRqVvdVPkhT60VoIa3LVJAbiu"; // password123 hashed

            modelBuilder.Entity<User>().HasData(
                // Admin
                new User
                {
                    Id = UserIds.AdminUser,
                    FullName = "System Administrator",
                    Email = "admin@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84901234567",
                    Role = "Admin", // Admin
                    AcademicCredentials = "IT Manager, VietTuneArchive Project Lead",
                    ContributionScore = 1000,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                },

                // Contributor 1
                new User
                {
                    Id = UserIds.Contributor1,
                    FullName = "Nguyễn Thị Thu Hương",
                    Email = "contributor1@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84912345678",
                    Role = "Contributor", // Contributor
                    AcademicCredentials = "Music Enthusiast, Traditional Music Collector",
                    ContributionScore = 250,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                },

                // Contributor 2
                new User
                {
                    Id = UserIds.Contributor2,
                    FullName = "Trần Văn Tùng",
                    Email = "contributor2@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84923456789",
                    Role = "Contributor", // Contributor
                    AcademicCredentials = "Audio Engineer, Recording Specialist",
                    ContributionScore = 180,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                },

                // Researcher 1
                new User
                {
                    Id = UserIds.Researcher1,
                    FullName = "Dr. Phạm Quốc Bảo",
                    Email = "researcher1@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84934567890",
                    Role = "Researcher", // Researcher
                    AcademicCredentials = "PhD Ethnomusicology, Senior Researcher at Vietnam Institute of Music",
                    ContributionScore = 450,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                },

                // Researcher 2
                new User
                {
                    Id = UserIds.Researcher2,
                    FullName = "Assoc. Prof. Vũ Thị Hương Ly",
                    Email = "researcher2@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84945678901",
                    Role = "Researcher", // Researcher
                    AcademicCredentials = "Assoc. Prof. Ethnology, Hanoi National University of Education",
                    ContributionScore = 380,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                },

                // Expert 1
                new User
                {
                    Id = UserIds.Expert1,
                    FullName = "Maestro Nguyễn Tuấn Hùng",
                    Email = "expert1@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84956789012",
                    Role = "Expert", // Expert
                    AcademicCredentials = "Master Traditional Musician, National Treasure of Vietnam, 40+ years experience",
                    ContributionScore = 850,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                },

                // Expert 2
                new User
                {
                    Id = UserIds.Expert2,
                    FullName = "Dr. Đặng Thái Sơn",
                    Email = "expert2@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84967890123",
                    Role = "Expert", // Expert
                    AcademicCredentials = "PhD Traditional Arts, Director of Vietnam Heritage Music Center",
                    ContributionScore = 720,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                },

                // Expert 3
                new User
                {
                    Id = UserIds.Expert3,
                    FullName = "Prof. Lê Văn Hoàng",
                    Email = "expert3@gmail.com",
                    PasswordHash = hashedPassword,
                    Password = "1",
                    Phone = "+84978901234",
                    Role = "Expert", // Expert
                    AcademicCredentials = "Prof. Musicology, Dean of Traditional Music Faculty - Hanoi Academy of Music",
                    ContributionScore = 950,
                    IsActive = true,
                    IsEmailConfirmed = true,
                    CreatedAt = new DateTime(2026, 1, 1)
                }
            );
        }
        private static void SeedCommunes(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Commune>().HasData(
                // Hoàn Kiếm, Hà Nội - ca trù, chầu văn
                new Commune { Id = CommuneIds.HangBac, Name = "Phường Hàng Bạc", DistrictId = DistrictIds.HoanKiem},
                new Commune { Id = CommuneIds.CuaDong, Name = "Phường Cửa Đông", DistrictId = DistrictIds.HoanKiem},

                // Đống Đa, Hà Nội
                new Commune { Id = CommuneIds.CatLinh, Name = "Phường Cát Linh", DistrictId = DistrictIds.DongDa},
                new Commune { Id = CommuneIds.VanMieu, Name = "Phường Văn Miếu", DistrictId = DistrictIds.DongDa},
                // Đồng Văn, Hà Giang - H'Mông, Lô Lô
                new Commune { Id = CommuneIds.TTDongVan, Name = "Thị trấn Đồng Văn", DistrictId = DistrictIds.DongVan},
                new Commune { Id = CommuneIds.LungCu, Name = "Xã Lũng Cú", DistrictId = DistrictIds.DongVan},
                new Commune { Id = CommuneIds.SaPhìn, Name = "Xã Sà Phìn", DistrictId = DistrictIds.DongVan},
                // Mèo Vạc, Hà Giang - H'Mông
                new Commune { Id = CommuneIds.TTMeoVac, Name = "Thị trấn Mèo Vạc", DistrictId = DistrictIds.MeoVac},
                new Commune { Id = CommuneIds.PaiLung, Name = "Xã Pải Lủng", DistrictId = DistrictIds.MeoVac},

                // Sa Pa, Lào Cai - H'Mông, Dao, Giáy
                new Commune { Id = CommuneIds.TTSaPa, Name = "Phường Sa Pa", DistrictId = DistrictIds.SaPa},
                new Commune { Id = CommuneIds.TaVan, Name = "Xã Tả Van", DistrictId = DistrictIds.SaPa},
                new Commune { Id = CommuneIds.CatCat, Name = "Xã San Sả Hồ", DistrictId = DistrictIds.SaPa},
                new Commune { Id = CommuneIds.TaPhin, Name = "Xã Tả Phìn", DistrictId = DistrictIds.SaPa},

                // Bắc Hà, Lào Cai - H'Mông Hoa, Phù Lá
                new Commune { Id = CommuneIds.TTBacHa, Name = "Thị trấn Bắc Hà", DistrictId = DistrictIds.BacHa},
                new Commune { Id = CommuneIds.BanPho, Name = "Xã Bản Phố", DistrictId = DistrictIds.BacHa},

                // Mộc Châu, Sơn La - Thái, H'Mông
                new Commune { Id = CommuneIds.TTMocChau, Name = "Thị trấn Mộc Châu", DistrictId = DistrictIds.MocChau},
                new Commune { Id = CommuneIds.ChiengHac, Name = "Xã Chiềng Hắc", DistrictId = DistrictIds.MocChau},
                // Mai Châu, Hòa Bình - Thái, Mường
                new Commune { Id = CommuneIds.TTMaiChau, Name = "Thị trấn Mai Châu", DistrictId = DistrictIds.MaiChau},
                new Commune { Id = CommuneIds.Lac, Name = "Xã Chiềng Châu", DistrictId = DistrictIds.MaiChau},
                new Commune { Id = CommuneIds.PomCoong, Name = "Xã Pom Coọng", DistrictId = DistrictIds.MaiChau},
                // Tiên Du, Bắc Ninh - quan họ
                new Commune { Id = CommuneIds.LimBN, Name = "Thị trấn Lim", DistrictId = DistrictIds.TienDu},
                new Commune { Id = CommuneIds.DuongPhongBN, Name = "Xã Nội Duệ", DistrictId = DistrictIds.TienDu},

                // Việt Trì, Phú Thọ - hát xoan
                new Commune { Id = CommuneIds.ThoBach, Name = "Phường Thọ Sơn", DistrictId = DistrictIds.TPVietTri},
                new Commune { Id = CommuneIds.VanPhu, Name = "Xã Phượng Lâu", DistrictId = DistrictIds.TPVietTri},
                // TP Huế - nhã nhạc cung đình
                new Commune { Id = CommuneIds.KimLong, Name = "Phường Kim Long", DistrictId = DistrictIds.TPHue},
                new Commune { Id = CommuneIds.PhuHoi, Name = "Phường Phú Hội", DistrictId = DistrictIds.TPHue},

                // TP Pleiku, Gia Lai
                new Commune { Id = CommuneIds.YenDo, Name = "Phường Yên Đỗ", DistrictId = DistrictIds.TPPleiku},
                new Commune { Id = CommuneIds.HoaPhuGL, Name = "Phường Hoa Lư", DistrictId = DistrictIds.TPPleiku},
                // Ia Grai, Gia Lai - Gia Rai
                new Commune { Id = CommuneIds.IaOGL, Name = "Xã Ia O", DistrictId = DistrictIds.IaGrai},
                new Commune { Id = CommuneIds.IaSaoGL, Name = "Xã Ia Sao", DistrictId = DistrictIds.IaGrai},

                // TP Buôn Ma Thuột, Đắk Lắk
                new Commune { Id = CommuneIds.TanLoi, Name = "Phường Tân Lợi", DistrictId = DistrictIds.TPBuonMaThuot},
                new Commune { Id = CommuneIds.EaTam, Name = "Phường Ea Tam", DistrictId = DistrictIds.TPBuonMaThuot},

                // Lắk, Đắk Lắk - Mnông
                new Commune { Id = CommuneIds.TTLien, Name = "Thị trấn Liên Sơn", DistrictId = DistrictIds.LakDistrict},
                new Commune { Id = CommuneIds.YangTao, Name = "Xã Yang Tao", DistrictId = DistrictIds.LakDistrict},

                // TP Kon Tum - Ba Na, Xơ Đăng
                new Commune { Id = CommuneIds.QuangTrungKT, Name = "Phường Quang Trung", DistrictId = DistrictIds.TPKonTum},
                new Commune { Id = CommuneIds.ThongNhatKT, Name = "Phường Thống Nhất", DistrictId = DistrictIds.TPKonTum},

                // Đắk Glei, Kon Tum - Giẻ Triêng, Xơ Đăng
                new Commune { Id = CommuneIds.TTDakGlei, Name = "Thị trấn Đắk Glei", DistrictId = DistrictIds.DakGlei},
                new Commune { Id = CommuneIds.DakBloKT, Name = "Xã Đắk Blô", DistrictId = DistrictIds.DakGlei},
                // Lạc Dương, Lâm Đồng - Cơ Ho
                new Commune { Id = CommuneIds.TTLacDuong, Name = "Thị trấn Lạc Dương", DistrictId = DistrictIds.LacDuong},
                new Commune { Id = CommuneIds.Lat, Name = "Xã Lát", DistrictId = DistrictIds.LacDuong},

                // Ninh Phước, Ninh Thuận - Chăm
                new Commune { Id = CommuneIds.PhuocDan, Name = "Thị trấn Phước Dân", DistrictId = DistrictIds.NinhPhuoc},
                new Commune { Id = CommuneIds.HuuDuc, Name = "Xã Hữu Đức", DistrictId = DistrictIds.NinhPhuoc},

                // Quận 5, TP.HCM - Hoa
                new Commune { Id = CommuneIds.Phuong1Q5, Name = "Phường 1", DistrictId = DistrictIds.Quan5},
                new Commune { Id = CommuneIds.Phuong7Q5, Name = "Phường 7", DistrictId = DistrictIds.Quan5},

                // Vĩnh Châu, Sóc Trăng - Khmer
                new Commune { Id = CommuneIds.VinhPhuocST, Name = "Phường Vĩnh Phước", DistrictId = DistrictIds.VinhChau},
                new Commune { Id = CommuneIds.LaiHoaST, Name = "Xã Lai Hòa", DistrictId = DistrictIds.VinhChau},

                // Cầu Kè, Trà Vinh - Khmer
                new Commune { Id = CommuneIds.TTCauKe, Name = "Thị trấn Cầu Kè", DistrictId = DistrictIds.CauKe},
                new Commune { Id = CommuneIds.HoaTan, Name = "Xã Hòa Tân", DistrictId = DistrictIds.CauKe},

                // Tri Tôn, An Giang - Khmer, Chăm
                new Commune { Id = CommuneIds.TTTriTon, Name = "Thị trấn Tri Tôn", DistrictId = DistrictIds.TriTon},
                new Commune { Id = CommuneIds.OLam, Name = "Xã Ô Lâm", DistrictId = DistrictIds.TriTon},
                // Bắc Sơn, Lạng Sơn - Tày, Nùng
                new Commune { Id = CommuneIds.TTBacSonLS, Name = "Thị trấn Bắc Sơn", DistrictId = DistrictIds.BacSon},
                new Commune { Id = CommuneIds.VuLang, Name = "Xã Vũ Lăng", DistrictId = DistrictIds.BacSon},

                // Con Cuông, Nghệ An - Thái, Đan Lai
                new Commune { Id = CommuneIds.TTConCuong, Name = "Thị trấn Con Cuông", DistrictId = DistrictIds.ConCuong },
                new Commune { Id = CommuneIds.MonSon, Name = "Xã Môn Sơn", DistrictId = DistrictIds.ConCuong },

                // Phong Điền, Cần Thơ - đờn ca tài tử
                new Commune { Id = CommuneIds.MyChanh, Name = "Xã Mỹ Khánh", DistrictId = DistrictIds.PhongDienCT },
                new Commune { Id = CommuneIds.NhonAi, Name = "Xã Nhơn Ái", DistrictId = DistrictIds.PhongDienCT },
                // Hội An, Quảng Nam - bài chòi
                new Commune { Id = CommuneIds.MinhAn, Name = "Phường Minh An", DistrictId = DistrictIds.TPHoiAn },
                new Commune { Id = CommuneIds.CamPho, Name = "Phường Cẩm Phô", DistrictId = DistrictIds.TPHoiAn },

                // TP Điện Biên Phủ
                new Commune { Id = CommuneIds.TanhDB, Name = "Phường Tân Thanh", DistrictId = DistrictIds.TPDienBienPhu },
                new Commune { Id = CommuneIds.NamThanhDB, Name = "Phường Nam Thanh", DistrictId = DistrictIds.TPDienBienPhu }
            );
        }
        private static void SeedProvinces(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Province>().HasData(
                // Bắc Bộ
                new Province { Id = ProvinceIds.HaNoi, Name = "Hà Nội", RegionCode = "01" },
                new Province { Id = ProvinceIds.HaGiang, Name = "Hà Giang", RegionCode = "02" },
                new Province { Id = ProvinceIds.CaoBang, Name = "Cao Bằng", RegionCode = "04" },
                new Province { Id = ProvinceIds.BacKan, Name = "Bắc Kạn", RegionCode = "06" },
                new Province { Id = ProvinceIds.TuyenQuang, Name = "Tuyên Quang", RegionCode = "08" },
                new Province { Id = ProvinceIds.LaoCai, Name = "Lào Cai", RegionCode = "10" },
                new Province { Id = ProvinceIds.DienBien, Name = "Điện Biên", RegionCode = "11" },
                new Province { Id = ProvinceIds.LaiChau, Name = "Lai Châu", RegionCode = "12" },
                new Province { Id = ProvinceIds.SonLa, Name = "Sơn La", RegionCode = "14" },
                new Province { Id = ProvinceIds.YenBai, Name = "Yên Bái", RegionCode = "15" },
                new Province { Id = ProvinceIds.HoaBinh, Name = "Hòa Bình", RegionCode = "17" },
                new Province { Id = ProvinceIds.ThaiNguyen, Name = "Thái Nguyên", RegionCode = "19" },
                new Province { Id = ProvinceIds.LangSon, Name = "Lạng Sơn", RegionCode = "20" },
                new Province { Id = ProvinceIds.QuangNinh, Name = "Quảng Ninh", RegionCode = "22" },
                new Province { Id = ProvinceIds.BacGiang, Name = "Bắc Giang", RegionCode = "24" },
                new Province { Id = ProvinceIds.PhuTho, Name = "Phú Thọ", RegionCode = "25" },
                new Province { Id = ProvinceIds.VinhPhuc, Name = "Vĩnh Phúc", RegionCode = "26" },
                new Province { Id = ProvinceIds.BacNinh, Name = "Bắc Ninh", RegionCode = "27" },
                new Province { Id = ProvinceIds.HaiDuong, Name = "Hải Dương", RegionCode = "30" },
                new Province { Id = ProvinceIds.HaiPhong, Name = "Hải Phòng", RegionCode = "31" },
                new Province { Id = ProvinceIds.HungYen, Name = "Hưng Yên", RegionCode = "33" },
                new Province { Id = ProvinceIds.ThaiBinh, Name = "Thái Bình", RegionCode = "34" },
                new Province { Id = ProvinceIds.HaNam, Name = "Hà Nam", RegionCode = "35" },
                new Province { Id = ProvinceIds.NamDinh, Name = "Nam Định", RegionCode = "36" },
                new Province { Id = ProvinceIds.NinhBinh, Name = "Ninh Bình", RegionCode = "37" },

                // Bắc Trung Bộ
                new Province { Id = ProvinceIds.ThanhHoa, Name = "Thanh Hóa", RegionCode = "38" },
                new Province { Id = ProvinceIds.NgheAn, Name = "Nghệ An", RegionCode = "40" },
                new Province { Id = ProvinceIds.HaTinh, Name = "Hà Tĩnh", RegionCode = "42" },
                new Province { Id = ProvinceIds.QuangBinh, Name = "Quảng Bình", RegionCode = "44" },
                new Province { Id = ProvinceIds.QuangTri, Name = "Quảng Trị", RegionCode = "45" },
                new Province { Id = ProvinceIds.ThuaThienHue, Name = "Thừa Thiên Huế", RegionCode = "46" },

                // Nam Trung Bộ
                new Province { Id = ProvinceIds.DaNang, Name = "Đà Nẵng", RegionCode = "48" },
                new Province { Id = ProvinceIds.QuangNam, Name = "Quảng Nam", RegionCode = "49" },
                new Province { Id = ProvinceIds.QuangNgai, Name = "Quảng Ngãi", RegionCode = "51" },
                new Province { Id = ProvinceIds.BinhDinh, Name = "Bình Định", RegionCode = "52" },
                new Province { Id = ProvinceIds.PhuYen, Name = "Phú Yên", RegionCode = "54" },
                new Province { Id = ProvinceIds.KhanhHoa, Name = "Khánh Hòa", RegionCode = "56" },
                new Province { Id = ProvinceIds.NinhThuan, Name = "Ninh Thuận", RegionCode = "58" },
                new Province { Id = ProvinceIds.BinhThuan, Name = "Bình Thuận", RegionCode = "60" },

                // Tây Nguyên
                new Province { Id = ProvinceIds.KonTum, Name = "Kon Tum", RegionCode = "62" },
                new Province { Id = ProvinceIds.GiaLai, Name = "Gia Lai", RegionCode = "64" },
                new Province { Id = ProvinceIds.DakLak, Name = "Đắk Lắk", RegionCode = "66" },
                new Province { Id = ProvinceIds.DakNong, Name = "Đắk Nông", RegionCode = "67" },
                new Province { Id = ProvinceIds.LamDong, Name = "Lâm Đồng", RegionCode = "68" },

                // Đông Nam Bộ
                new Province { Id = ProvinceIds.BinhPhuoc, Name = "Bình Phước", RegionCode = "70" },
                new Province { Id = ProvinceIds.TayNinh, Name = "Tây Ninh", RegionCode = "72" },
                new Province { Id = ProvinceIds.BinhDuong, Name = "Bình Dương", RegionCode = "74" },
                new Province { Id = ProvinceIds.DongNai, Name = "Đồng Nai", RegionCode = "75" },
                new Province { Id = ProvinceIds.BaRiaVungTau, Name = "Bà Rịa - Vũng Tàu", RegionCode = "77" },
                new Province { Id = ProvinceIds.HoChiMinh, Name = "TP. Hồ Chí Minh", RegionCode = "79" },

                // Đồng bằng sông Cửu Long
                new Province { Id = ProvinceIds.LongAn, Name = "Long An", RegionCode = "80" },
                new Province { Id = ProvinceIds.TienGiang, Name = "Tiền Giang", RegionCode = "82" },
                new Province { Id = ProvinceIds.BenTre, Name = "Bến Tre", RegionCode = "83" },
                new Province { Id = ProvinceIds.TraVinh, Name = "Trà Vinh", RegionCode = "84" },
                new Province { Id = ProvinceIds.VinhLong, Name = "Vĩnh Long", RegionCode = "86" },
                new Province { Id = ProvinceIds.DongThap, Name = "Đồng Tháp", RegionCode = "87" },
                new Province { Id = ProvinceIds.AnGiang, Name = "An Giang", RegionCode = "89" },
                new Province { Id = ProvinceIds.KienGiang, Name = "Kiên Giang", RegionCode = "91" },
                new Province { Id = ProvinceIds.CanTho, Name = "Cần Thơ", RegionCode = "92" },
                new Province { Id = ProvinceIds.HauGiang, Name = "Hậu Giang", RegionCode = "93" },
                new Province { Id = ProvinceIds.SocTrang, Name = "Sóc Trăng", RegionCode = "94" },
                new Province { Id = ProvinceIds.BacLieu, Name = "Bạc Liêu", RegionCode = "95" },
                new Province { Id = ProvinceIds.CaMau, Name = "Cà Mau", RegionCode = "96" }
            );
        }

        // ============================================================
        // DISTRICTS - Quận/Huyện (đại diện các vùng văn hóa quan trọng)
        // ============================================================
        private static void SeedDistricts(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<District>().HasData(
                // Hà Nội
                new District { Id = DistrictIds.HoanKiem, Name = "Quận Hoàn Kiếm", ProvinceId = ProvinceIds.HaNoi },
                new District { Id = DistrictIds.DongDa, Name = "Quận Đống Đa", ProvinceId = ProvinceIds.HaNoi },
                new District { Id = DistrictIds.BaDinh, Name = "Quận Ba Đình", ProvinceId = ProvinceIds.HaNoi },
                new District { Id = DistrictIds.HaiBaTrung, Name = "Quận Hai Bà Trưng", ProvinceId = ProvinceIds.HaNoi },
                new District { Id = DistrictIds.CauGiay, Name = "Quận Cầu Giấy", ProvinceId = ProvinceIds.HaNoi },
                new District { Id = DistrictIds.TayHo, Name = "Quận Tây Hồ", ProvinceId = ProvinceIds.HaNoi },
                // Hà Giang - vùng H'Mông, Lô Lô, Dao
                new District { Id = DistrictIds.TPHaGiang, Name = "Thành phố Hà Giang", ProvinceId = ProvinceIds.HaGiang },
                new District { Id = DistrictIds.DongVan, Name = "Huyện Đồng Văn", ProvinceId = ProvinceIds.HaGiang },
                new District { Id = DistrictIds.MeoVac, Name = "Huyện Mèo Vạc", ProvinceId = ProvinceIds.HaGiang },
                // Lào Cai - vùng H'Mông, Dao, Tày
                new District { Id = DistrictIds.TPLaoCai, Name = "Thành phố Lào Cai", ProvinceId = ProvinceIds.LaoCai },
                new District { Id = DistrictIds.SaPa, Name = "Thị xã Sa Pa", ProvinceId = ProvinceIds.LaoCai },
                new District { Id = DistrictIds.BacHa, Name = "Huyện Bắc Hà", ProvinceId = ProvinceIds.LaoCai },
                // Điện Biên - vùng Thái, H'Mông
                new District { Id = DistrictIds.TPDienBienPhu, Name = "TP. Điện Biên Phủ", ProvinceId = ProvinceIds.DienBien },
                new District { Id = DistrictIds.DienBienDong, Name = "Huyện Điện Biên Đông", ProvinceId = ProvinceIds.DienBien },

                // Sơn La - vùng Thái, H'Mông
                new District { Id = DistrictIds.TPSonLa, Name = "Thành phố Sơn La", ProvinceId = ProvinceIds.SonLa },
                new District { Id = DistrictIds.MocChau, Name = "Huyện Mộc Châu", ProvinceId = ProvinceIds.SonLa },
                // Hòa Bình - vùng Mường, Thái
                new District { Id = DistrictIds.TPHoaBinh, Name = "Thành phố Hòa Bình", ProvinceId = ProvinceIds.HoaBinh },
                new District { Id = DistrictIds.MaiChau, Name = "Huyện Mai Châu", ProvinceId = ProvinceIds.HoaBinh },

                // Bắc Ninh - vùng quan họ
                new District { Id = DistrictIds.TPBacNinh, Name = "Thành phố Bắc Ninh", ProvinceId = ProvinceIds.BacNinh },
                new District { Id = DistrictIds.TienDu, Name = "Huyện Tiên Du", ProvinceId = ProvinceIds.BacNinh },
                // Phú Thọ - vùng hát xoan
                new District { Id = DistrictIds.TPVietTri, Name = "TP. Việt Trì", ProvinceId = ProvinceIds.PhuTho },
                new District { Id = DistrictIds.LamThao, Name = "Huyện Lâm Thao", ProvinceId = ProvinceIds.PhuTho },

                // Thừa Thiên Huế - nhã nhạc cung đình
                new District { Id = DistrictIds.TPHue, Name = "Thành phố Huế", ProvinceId = ProvinceIds.ThuaThienHue },
                new District { Id = DistrictIds.PhongDien, Name = "Huyện Phong Điền", ProvinceId = ProvinceIds.ThuaThienHue },
                // Nghệ An - ví giặm, dân tộc thiểu số miền Tây
                new District { Id = DistrictIds.TPVinh, Name = "Thành phố Vinh", ProvinceId = ProvinceIds.NgheAn },
                new District { Id = DistrictIds.ConCuong, Name = "Huyện Con Cuông", ProvinceId = ProvinceIds.NgheAn },

                // Gia Lai - cồng chiêng, Gia Rai
                new District { Id = DistrictIds.TPPleiku, Name = "TP. Pleiku", ProvinceId = ProvinceIds.GiaLai },
                new District { Id = DistrictIds.ChuSe, Name = "Thị xã Chư Sê", ProvinceId = ProvinceIds.GiaLai },
                new District { Id = DistrictIds.IaGrai, Name = "Huyện Ia Grai", ProvinceId = ProvinceIds.GiaLai },

                // Đắk Lắk - Ê Đê, cồng chiêng
                new District { Id = DistrictIds.TPBuonMaThuot, Name = "TP. Buôn Ma Thuột", ProvinceId = ProvinceIds.DakLak },
                new District { Id = DistrictIds.CuMGar, Name = "Huyện Cư M'gar", ProvinceId = ProvinceIds.DakLak },
                new District { Id = DistrictIds.LakDistrict, Name = "Huyện Lắk", ProvinceId = ProvinceIds.DakLak },

                // Kon Tum - Ba Na, Xơ Đăng
                new District { Id = DistrictIds.TPKonTum, Name = "Thành phố Kon Tum", ProvinceId = ProvinceIds.KonTum },
                new District { Id = DistrictIds.DakGlei, Name = "Huyện Đắk Glei", ProvinceId = ProvinceIds.KonTum },
                // Lâm Đồng - Cơ Ho, Mạ, Chu Ru
                new District { Id = DistrictIds.TPDaLat, Name = "Thành phố Đà Lạt", ProvinceId = ProvinceIds.LamDong },
                new District { Id = DistrictIds.LacDuong, Name = "Huyện Lạc Dương", ProvinceId = ProvinceIds.LamDong },

                // Ninh Thuận - Chăm
                new District { Id = DistrictIds.TPPhanRangThapChamNT, Name = "TP. Phan Rang - Tháp Chàm", ProvinceId = ProvinceIds.NinhThuan },
                new District { Id = DistrictIds.NinhPhuoc, Name = "Huyện Ninh Phước", ProvinceId = ProvinceIds.NinhThuan },
                // TP.HCM - Hoa, nhạc cải lương
                new District { Id = DistrictIds.Quan1, Name = "Quận 1", ProvinceId = ProvinceIds.HoChiMinh },
                new District { Id = DistrictIds.Quan5, Name = "Quận 5", ProvinceId = ProvinceIds.HoChiMinh },
                new District { Id = DistrictIds.ThuDuc, Name = "TP. Thủ Đức", ProvinceId = ProvinceIds.HoChiMinh },
                // Cần Thơ - đờn ca tài tử
                new District { Id = DistrictIds.NinhKieu, Name = "Quận Ninh Kiều", ProvinceId = ProvinceIds.CanTho },
                new District { Id = DistrictIds.PhongDienCT, Name = "Huyện Phong Điền", ProvinceId = ProvinceIds.CanTho },

                // Sóc Trăng - Khmer
                new District { Id = DistrictIds.TPSocTrang, Name = "TP. Sóc Trăng", ProvinceId = ProvinceIds.SocTrang },
                new District { Id = DistrictIds.VinhChau, Name = "Thị xã Vĩnh Châu", ProvinceId = ProvinceIds.SocTrang },
                // Trà Vinh - Khmer
                new District { Id = DistrictIds.TPTraVinh, Name = "TP. Trà Vinh", ProvinceId = ProvinceIds.TraVinh },
                new District { Id = DistrictIds.CauKe, Name = "Huyện Cầu Kè", ProvinceId = ProvinceIds.TraVinh },

                // Lạng Sơn - Tày, Nùng
                new District { Id = DistrictIds.TPLangSon, Name = "TP. Lạng Sơn", ProvinceId = ProvinceIds.LangSon },
                new District { Id = DistrictIds.BacSon, Name = "Huyện Bắc Sơn", ProvinceId = ProvinceIds.LangSon },
                // Cao Bằng - Tày, Nùng, Dao
                new District { Id = DistrictIds.TPCaoBang, Name = "TP. Cao Bằng", ProvinceId = ProvinceIds.CaoBang },
                new District { Id = DistrictIds.NguyenBinh, Name = "Huyện Nguyên Bình", ProvinceId = ProvinceIds.CaoBang },

                // Đắk Nông
                new District { Id = DistrictIds.GiaNghia, Name = "TP. Gia Nghĩa", ProvinceId = ProvinceIds.DakNong },
                new District { Id = DistrictIds.DakSong, Name = "Huyện Đắk Song", ProvinceId = ProvinceIds.DakNong },
                // Quảng Nam - nhạc bài chòi
                new District { Id = DistrictIds.TPHoiAn, Name = "TP. Hội An", ProvinceId = ProvinceIds.QuangNam },
                new District { Id = DistrictIds.DienBanQN, Name = "Thị xã Điện Bàn", ProvinceId = ProvinceIds.QuangNam },

                // Bình Định - hát bội
                new District { Id = DistrictIds.TPQuyNhon, Name = "TP. Quy Nhơn", ProvinceId = ProvinceIds.BinhDinh },
                new District { Id = DistrictIds.TaysonBD, Name = "Huyện Tây Sơn", ProvinceId = ProvinceIds.BinhDinh },
                // An Giang - Khmer, Chăm
                new District { Id = DistrictIds.TPLongXuyen, Name = "TP. Long Xuyên", ProvinceId = ProvinceIds.AnGiang },
                new District { Id = DistrictIds.TriTon, Name = "Huyện Tri Tôn", ProvinceId = ProvinceIds.AnGiang }
            );
        }
    }
}