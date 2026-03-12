import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, MapPin, Music, Filter, Plus, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { SearchFilters, Region, RecordingType, VerificationStatus } from "@/types";

// ===== CONSTANTS =====
const GENRES = [
  "Dân ca", "Hát xẩm", "Ca trù", "Chầu văn", "Quan họ", "Hát then",
  "Cải lương", "Tuồng", "Chèo", "Nhã nhạc", "Ca Huế", "Đờn ca tài tử",
  "Hát bội", "Hò", "Lý", "Vọng cổ", "Hát ru", "Hát ví", "Hát giặm", "Bài chòi", "Khác",
];

const ETHNICITIES = [
  "Kinh", "Tày", "Thái", "Mường", "Khmer", "H'Mông", "Nùng", "Hoa", "Dao", "Gia Rai",
  "Ê Đê", "Ba Na", "Xơ Đăng", "Sán Chay", "Cơ Ho", "Chăm", "Sán Dìu", "Hrê", "Mnông", "Ra Glai",
  "Giáy", "Stră", "Bru-Vân Kiều", "Cơ Tu", "Giẻ Triêng", "Tà Ôi", "Mạ", "Khơ Mú", "Co", "Chơ Ro",
  "Hà Nhì", "Xinh Mun", "Chu Ru", "Lào", "La Chí", "Kháng", "Phù Lá", "La Hủ", "La Ha", "Pà Thẻn",
  "Lự", "Ngái", "Chứt", "Lô Lô", "Mảng", "Cờ Lao", "Bố Y", "Cống", "Si La", "Pu Péo",
  "Rơ Măm", "Brâu", "Ơ Đu", "Khác",
];

const REGIONS = [
  "Trung du và miền núi Bắc Bộ", "Đồng bằng Bắc Bộ", "Bắc Trung Bộ",
  "Nam Trung Bộ", "Cao nguyên Trung Bộ", "Đông Nam Bộ", "Tây Nam Bộ",
];

const PROVINCES = [
  "TP. Hà Nội", "TP. Hải Phòng", "TP. Huế", "TP. Đà Nẵng", "TP. Hồ Chí Minh", "TP. Cần Thơ",
  "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Điện Biên", "Đắk Lắk", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Tĩnh", "Hưng Yên", "Khánh Hòa", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai",
  "Nghệ An", "Ninh Bình", "Phú Thọ", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh",
  "Thái Nguyên", "Thanh Hóa", "Tuyên Quang", "Vĩnh Long",
];

const EVENT_TYPES = [
  "Đám cưới", "Đám tang", "Lễ hội đình", "Lễ hội chùa", "Tết Nguyên đán", "Hội xuân",
  "Lễ cầu mùa", "Lễ cúng tổ tiên", "Lễ cấp sắc", "Lễ hội đâm trâu", "Lễ hội cồng chiêng",
  "Sinh hoạt cộng đồng", "Biểu diễn nghệ thuật", "Ghi âm studio", "Ghi âm thực địa", "Khác",
];

// Align with UploadMusic.tsx PERFORMANCE_TYPES for consistent filter/upload values
const PERFORMANCE_TYPES = [
  { key: "instrumental", label: "Chỉ nhạc cụ (Instrumental)" },
  { key: "acappella", label: "Chỉ giọng hát không đệm (Acappella)" },
  { key: "vocal_accompaniment", label: "Hát có nhạc đệm (Vocal with accompaniment)" },
];

const VERIFICATION_STATUS = [
  { key: "VERIFIED", label: "Đã xác minh" },
  { key: "PENDING", label: "Đang chờ" },
  { key: "UNDER_REVIEW", label: "Đang kiểm duyệt" },
];

const INSTRUMENTS = [
  "Alal (Ba Na)",
  "Aráp (Ba Na)",
  "Aráp (Ca Dong)",
  "Aráp (Gia Rai)",
  "Aráp (Rơ Năm)",
  "Aráp (Stră)",
  "Biên khánh (Kinh)",
  "Bro (Ba Na)",
  "Bro (Gia Rai)",
  "Bro (Giẻ Triêng)",
  "Bro (Xơ Đăng)",
  "Bẳng bu (Thái)",
  "Chul (Ba Na)",
  "Chul (Gia Rai)",
  "Chênh Kial (Ba Na)",
  "Cò ke (Mường)",
  "Cồng, chiêng (Ba Na)",
  "Cồng, chiêng (Gia Rai)",
  "Cồng, chiêng (Giẻ Triêng)",
  "Cồng, chiêng (Hrê)",
  "Cồng, chiêng (Ê Đê)",
  "Dàn nhạc ngũ âm (Khmer)",
  "Goong (Ba Na)",
  "Goong (Gia Rai)",
  "Goong (Giẻ Triêng)",
  "Goong đe (Ba Na)",
  "Hơgơr (Ê Đê)",
  "Hơgơr cân (Mnâm)",
  "Hơgơr cân (Rơ Năm)",
  "Hơgơr prong (Gia Rai)",
  "Hơgơr tuôn (Hà Lang)",
  "Hơgơr tăk (Ba Na)",
  "Khinh khung (Ba Na)",
  "Khinh khung (Gia Rai)",
  "Khèn (H'Mông)",
  "Khèn (Ta Ôi)",
  "Khèn (Ê Đê)",
  "Khên (Vân Kiều)",
  "Knăh ring (Ba Na)",
  "Knăh ring (Gia Rai)",
  "K'lông put (Gia Rai)",
  "K'ny (Ba Na)",
  "K'ny (Gia Rai)",
  "K'ny (Rơ Ngao)",
  "K'ny (Xơ Đăng)",
  "Kèn bầu (Chăm)",
  "Kèn bầu (Kinh)",
  "Kèn bầu (Thái)",
  "Kềnh (H'Mông)",
  "M'linh (Dao)",
  "M'linh (Mường)",
  "M'nhum (Gia Rai)",
  "Mõ (Kinh)",
  "Phách (Kinh)",
  "Pí cổng (Thái)",
  "Pí lè (Thái)",
  "Pí lè (Tày)",
  "Pí một lao (Kháng)",
  "Pí một lao (Khơ Mú)",
  "Pí một lao (La Ha)",
  "Pí một lao (Thái)",
  "Pí pặp (Thái)",
  "Pí phướng (Thái)",
  "Pí đôi (Thái)",
  "Púa (H'Mông)",
  "Púa (Lô Lô)",
  "Qeej (H'Mông)",
  "Rang leh (Ca Dong)",
  "Rang leh (Stră)",
  "Rang rai (Ba Na)",
  "Rang rai (Gia Rai)",
  "Song lang (Kinh)",
  "Sáo ngang (Kinh)",
  "Sênh tiền (Kinh)",
  "T'rum (Gia Rai)",
  "Ta in (Hà Nhì)",
  "Ta lư (Vân Kiều)",
  "Ta pòl (Ba Na)",
  "Ta pòl (Brâu)",
  "Ta pòl (Gia Rai)",
  "Ta pòl (Rơ Năm)",
  "Tam thập lục (Kinh)",
  "Teh ding (Gia Rai)",
  "Tiêu (Kinh)",
  "Tol alao (Ca Dong)",
  "Tông đing (Ba Na)",
  "Tông đing (Ca Dong)",
  "Tơ nốt (Ba Na)",
  "Trống bộc (Kinh)",
  "Trống cái (Kinh)",
  "Trống chầu (Kinh)",
  "Trống cơm (Kinh)",
  "Trống dẹt (Kinh)",
  "Trống khẩu (Kinh)",
  "Trống lắng (Kinh)",
  "Trống mảnh (Kinh)",
  "Trống quần (Kinh)",
  "Trống đế (Kinh)",
  "Trống đồng (Kinh)",
  "Tính tẩu (Thái)",
  "Tính tẩu (Tày)",
  "Vang (Gia Rai)",
  "Đinh Duar (Giẻ Triêng)",
  "Đinh Khén (Xơ Đăng)",
  "Đinh tuk (Ba Na)",
  "Đao đao (Khơ Mú)",
  "Đuk đik (Giẻ Triêng)",
  "Đàn bầu (Kinh)",
  "Đàn môi (H'Mông)",
  "Đàn nguyệt (Kinh)",
  "Đàn nhị (Chăm)",
  "Đàn nhị (Dao)",
  "Đàn nhị (Giáy)",
  "Đàn nhị (Kinh)",
  "Đàn nhị (Nùng)",
  "Đàn nhị (Tày)",
  "Đàn t'rưng (Ba Na)",
  "Đàn t'rưng (Gia Rai)",
  "Đàn tam (Kinh)",
  "Đàn tranh (Kinh)",
  "Đàn tứ (Kinh)",
  "Đàn tỳ bà (Kinh)",
  "Đàn đá (Kinh)",
  "Đàn đáy (Kinh)",
];

const YEAR_RANGES = [
  { key: "before_1950", label: "Trước 1950" },
  { key: "1950_1975", label: "1950 - 1975" },
  { key: "1975_2000", label: "1975 - 2000" },
  { key: "2000_2010", label: "2000 - 2010" },
  { key: "2010_2020", label: "2010 - 2020" },
  { key: "after_2020", label: "Sau 2020" },
];

// Mapping genre to typical ethnicity
const GENRE_ETHNICITY_MAP: Record<string, string[]> = {
  "Ca trù": ["Kinh"],
  "Quan họ": ["Kinh"],
  "Chầu văn": ["Kinh"],
  "Nhã nhạc": ["Kinh"],
  "Ca Huế": ["Kinh"],
  "Đờn ca tài tử": ["Kinh"],
  "Hát bội": ["Kinh"],
  "Cải lương": ["Kinh"],
  "Tuồng": ["Kinh"],
  "Chèo": ["Kinh"],
  "Hát xẩm": ["Kinh"],
  "Hát then": ["Tày", "Nùng"],
  "Khèn": ["H'Mông"],
  "Cồng chiêng": ["Ba Na", "Gia Rai", "Ê Đê", "Xơ Đăng", "Giẻ Triêng"],
};

// Check if click is on scrollbar
const isClickOnScrollbar = (event: MouseEvent): boolean => {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0 && event.clientX >= document.documentElement.clientWidth) {
    return true;
  }
  return false;
};

// ===== REUSABLE COMPONENTS =====

function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = "-- Chọn --",
  searchable = true,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter((opt) =>
      opt.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const clickedOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideMenu =
        menuRef.current && !menuRef.current.contains(target);
      if (clickedOutsideDropdown && (menuRef.current ? clickedOutsideMenu : true)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400/80 rounded-xl focus:outline-none focus:border-primary-500 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-md ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        style={{ backgroundColor: '#FFFCF5' }}
      >
        <span className={value ? "text-neutral-900 font-medium" : "text-neutral-500"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: '#FFFCF5',
              position: "absolute",
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: menuRect.width,
              zIndex: 40,
            }}
          >
            {searchable && (
              <div className="p-3 border-b border-neutral-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm..."
                    className="w-full pl-9 pr-3 py-2 text-neutral-900 placeholder-neutral-500 border border-neutral-400/80 rounded-xl focus:outline-none focus:border-primary-500 text-sm shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ backgroundColor: '#FFFCF5' }}
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div
              className="max-h-60 overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#9B2C2C rgba(255, 255, 255, 0.3)",
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-5 py-3 text-neutral-400 text-sm text-center">
                  Không tìm thấy kết quả
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${value === option
                      ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium"
                      : "text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700"
                      }`}
                  >
                    {option}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function MultiSelectTags({
  values,
  onChange,
  options,
  placeholder = "Chọn...",
  disabled = false,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  // Helper: remove Vietnamese accents for insensitive search
  function removeVietnameseTones(str: string) {
    return str
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  }

  const filteredOptions = useMemo(() => {
    const available = options.filter((opt) => !values.includes(opt));
    if (!search) return available;
    const searchNorm = removeVietnameseTones(search.toLowerCase());
    return available.filter((opt) => {
      const optNorm = removeVietnameseTones(opt.toLowerCase());
      return optNorm.includes(searchNorm);
    });
  }, [options, values, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const clickedOutsideContainer =
        containerRef.current && !containerRef.current.contains(target);
      const clickedOutsideMenu =
        menuRef.current && !menuRef.current.contains(target);
      if (clickedOutsideContainer && (menuRef.current ? clickedOutsideMenu : true)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (inputRef.current) setMenuRect(inputRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen]);

  const addTag = (tag: string) => {
    onChange([...values, tag]);
    setSearch("");
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((t) => t !== tag));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={inputRef}
        onClick={() => !disabled && setIsOpen(true)}
        className={`min-h-[48px] px-4 py-2.5 border border-neutral-400 rounded-xl focus-within:border-primary-500 transition-all ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"
          }`}
        style={{ backgroundColor: '#FFFCF5' }}
      >
        <div className="flex flex-wrap gap-1.5">
          {values.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-primary-600 to-primary-700 text-white text-xs rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="ml-1 focus:outline-none hover:text-red-200"
                  aria-label={`Xóa ${tag}`}
                  tabIndex={0}
                  style={{ lineHeight: 0, padding: 0, background: "none", border: "none" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {!disabled && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={values.length === 0 ? placeholder : ""}
              className="flex-1 min-w-[120px] bg-transparent text-neutral-900 placeholder-neutral-500 text-sm focus:outline-none py-1"
              onKeyDown={e => {
                if (e.key === "Backspace" && search === "" && values.length > 0) {
                  removeTag(values[values.length - 1]);
                  e.preventDefault();
                }
              }}
            />
          )}
        </div>
      </div>

      {isOpen &&
        menuRect &&
        !disabled &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: '#FFFCF5',
              position: "absolute",
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: menuRect.width,
              zIndex: 40,
            }}
          >
            <div
              className="max-h-60 overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#9B2C2C rgba(255, 255, 255, 0.3)",
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-5 py-3 text-neutral-400 text-sm text-center">
                  {search ? "Không tìm thấy kết quả" : "Đã chọn tất cả"}
                </div>
              ) : (
                filteredOptions.slice(0, 50).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => addTag(option)}
                    className="w-full px-5 py-3 text-left text-sm text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-primary-600" strokeWidth={2.5} />
                    {option}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-neutral-800/60">{hint}</p>}
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-neutral-200/80 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between transition-all duration-200 cursor-pointer"
        style={{ backgroundColor: '#FFFCF5' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F0E8')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFCF5')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
            <Icon className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
            {subtitle && <p className="text-sm text-neutral-600 font-medium">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-neutral-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen && <div className="p-6 pt-2 space-y-4">{children}</div>}
    </div>
  );
}

// ===== MAIN COMPONENT =====
interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
}

// Map Region enum to Vietnamese label (same order as REGIONS)
const REGION_TO_LABEL: Record<Region, string> = {
  [Region.NORTHERN_MOUNTAINS]: "Trung du và miền núi Bắc Bộ",
  [Region.RED_RIVER_DELTA]: "Đồng bằng Bắc Bộ",
  [Region.NORTH_CENTRAL]: "Bắc Trung Bộ",
  [Region.SOUTH_CENTRAL_COAST]: "Nam Trung Bộ",
  [Region.CENTRAL_HIGHLANDS]: "Cao nguyên Trung Bộ",
  [Region.SOUTHEAST]: "Đông Nam Bộ",
  [Region.MEKONG_DELTA]: "Tây Nam Bộ",
};

export default function SearchBar({ onSearch, initialFilters = {} }: SearchBarProps) {
  const [query, setQuery] = useState(initialFilters.query || "");
  const [genres, setGenres] = useState<string[]>([]);
  const [ethnicity, setEthnicity] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [eventType, setEventType] = useState("");
  const [performanceType, setPerformanceType] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");

  // Hydrate form from initialFilters (e.g. URL params or parent state) so filter search can be restored
  useEffect(() => {
    if (!initialFilters || Object.keys(initialFilters).length === 0) return;
    if (initialFilters.query !== undefined) setQuery(initialFilters.query);
    if (initialFilters.regions?.length) {
      const label = REGION_TO_LABEL[initialFilters.regions[0]];
      if (label) setRegion(label);
    }
    if (initialFilters.recordingTypes?.length) {
      const rt = initialFilters.recordingTypes[0];
      const pt = PERFORMANCE_TYPES.find(
        (p) =>
          (rt === RecordingType.INSTRUMENTAL && p.key === "instrumental") ||
          (rt === RecordingType.VOCAL && (p.key === "acappella" || p.key === "vocal_accompaniment"))
      );
      if (pt) setPerformanceType(pt.label);
    }
    if (initialFilters.verificationStatus?.length) {
      const vs = VERIFICATION_STATUS.find((s) => s.key === initialFilters.verificationStatus![0]);
      if (vs) setVerificationStatus(vs.label);
    }
    if (initialFilters.dateFrom || initialFilters.dateTo) {
      const from = initialFilters.dateFrom;
      const to = initialFilters.dateTo;
      const yr = YEAR_RANGES.find((y) => {
        switch (y.key) {
          case "before_1950":
            return to === "1949-12-31";
          case "1950_1975":
            return from === "1950-01-01" && to === "1975-12-31";
          case "1975_2000":
            return from === "1975-01-01" && to === "2000-12-31";
          case "2000_2010":
            return from === "2000-01-01" && to === "2010-12-31";
          case "2010_2020":
            return from === "2010-01-01" && to === "2020-12-31";
          case "after_2020":
            return from === "2021-01-01";
          default:
            return false;
        }
      });
      if (yr) setYearRange(yr.label);
    }
    if (initialFilters.tags?.length) {
      const tags = initialFilters.tags;
      const newGenres = tags.filter((t) => GENRES.includes(t));
      const newInstruments = tags.filter((t) => INSTRUMENTS.includes(t));
      const eth = tags.find((t) => ETHNICITIES.includes(t));
      const prov = tags.find((t) => PROVINCES.includes(t));
      const evt = tags.find((t) => EVENT_TYPES.includes(t));
      if (newGenres.length) setGenres(newGenres);
      if (newInstruments.length) setInstruments(newInstruments);
      if (eth) setEthnicity(eth);
      if (prov) setProvince(prov);
      if (evt) setEventType(evt);
    }
  }, [initialFilters]);

  // Check for genre-ethnicity mismatch
  const genreEthnicityWarning = useMemo(() => {
    if (genres.length === 1 && ethnicity && ethnicity !== "Tất cả dân tộc") {
      const genre = genres[0];
      const expectedEthnicities = GENRE_ETHNICITY_MAP[genre];
      if (expectedEthnicities && !expectedEthnicities.includes(ethnicity)) {
        return `Lưu ý: Thể loại "${genre}" thường là đặc trưng của người ${expectedEthnicities.join(", ")}. Tuy nhiên, giao lưu văn hóa giữa các dân tộc là điều bình thường.`;
      }
    }
    return null;
  }, [genres, ethnicity]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (genres.length > 0) count++;
    if (ethnicity && !ethnicity.startsWith("Tất cả")) count++;
    if (region && !region.startsWith("Tất cả")) count++;
    if (province && !province.startsWith("Tất cả")) count++;
    if (eventType && !eventType.startsWith("Tất cả")) count++;
    if (performanceType && !performanceType.startsWith("Tất cả")) count++;
    if (instruments.length > 0) count++;
    if (yearRange && !yearRange.startsWith("Tất cả")) count++;
    if (verificationStatus && !verificationStatus.startsWith("Tất cả")) count++;
    return count;
  }, [genres, ethnicity, region, province, eventType, performanceType, instruments, yearRange, verificationStatus]);

  const handleSearch = () => {
    const filters: SearchFilters = {
      query: query.trim() || undefined,
    };

    // Map performanceType label to RecordingType enum (labels aligned with UploadMusic)
    if (performanceType && !performanceType.startsWith("Tất cả")) {
      const perfMap: Record<string, RecordingType> = {
        "Chỉ nhạc cụ (Instrumental)": RecordingType.INSTRUMENTAL,
        "Chỉ giọng hát không đệm (Acappella)": RecordingType.VOCAL,
        "Giọng hát có nhạc đệm (Vocal with accompaniment)": RecordingType.VOCAL,
      };
      const mapped = perfMap[performanceType];
      if (mapped) filters.recordingTypes = [mapped];
    }

    // Use human-friendly selections (genres, instruments, eventType, province, ethnicity) as tags
    const tags: string[] = [];
    if (genres.length > 0) tags.push(...genres);
    if (instruments.length > 0) tags.push(...instruments);
    if (eventType && !eventType.startsWith("Tất cả")) tags.push(eventType);
    if (province && !province.startsWith("Tất cả")) tags.push(province);
    if (ethnicity && !ethnicity.startsWith("Tất cả")) tags.push(ethnicity);
    if (tags.length > 0) filters.tags = tags;

    // Map region label back to Region enum
    const regionMap: Record<string, Region> = {
      "Trung du và miền núi Bắc Bộ": Region.NORTHERN_MOUNTAINS,
      "Đồng bằng Bắc Bộ": Region.RED_RIVER_DELTA,
      "Bắc Trung Bộ": Region.NORTH_CENTRAL,
      "Nam Trung Bộ": Region.SOUTH_CENTRAL_COAST,
      "Cao nguyên Trung Bộ": Region.CENTRAL_HIGHLANDS,
      "Đông Nam Bộ": Region.SOUTHEAST,
      "Tây Nam Bộ": Region.MEKONG_DELTA,
    };
    if (region && !region.startsWith("Tất cả")) {
      const mapped = regionMap[region];
      if (mapped) filters.regions = [mapped];
    }

    // Map verification status label back to enum key
    if (verificationStatus && !verificationStatus.startsWith("Tất cả")) {
      const vs = VERIFICATION_STATUS.find((s) => s.label === verificationStatus);
      if (vs) filters.verificationStatus = [vs.key as VerificationStatus];
    }

    // Map year range label to dateFrom/dateTo
    if (yearRange && !yearRange.startsWith("Tất cả")) {
      const yr = YEAR_RANGES.find(y => y.label === yearRange);
      if (yr) {
        switch (yr.key) {
          case "before_1950":
            filters.dateTo = "1949-12-31";
            break;
          case "1950_1975":
            filters.dateFrom = "1950-01-01";
            filters.dateTo = "1975-12-31";
            break;
          case "1975_2000":
            filters.dateFrom = "1975-01-01";
            filters.dateTo = "2000-12-31";
            break;
          case "2000_2010":
            filters.dateFrom = "2000-01-01";
            filters.dateTo = "2010-12-31";
            break;
          case "2010_2020":
            filters.dateFrom = "2010-01-01";
            filters.dateTo = "2020-12-31";
            break;
          case "after_2020":
            filters.dateFrom = "2021-01-01";
            break;
        }
      }
    }

    onSearch(filters);
  };

  const handleClearAll = () => {
    setQuery("");
    setGenres([]);
    setEthnicity("");
    setRegion("");
    setProvince("");
    setEventType("");
    setPerformanceType("");
    setInstruments([]);
    setYearRange("");
    setVerificationStatus("");
    onSearch({});
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Main Search Input — same style as SemanticSearchPage main card */}
      <div className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
        <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
          <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
            <Search className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
          </div>
          Tìm kiếm bài hát
        </h2>
        <p className="text-neutral-600 font-medium leading-relaxed mb-4">
          Nhập từ khóa để tìm kiếm nhanh. Kết hợp bộ lọc bên dưới để thu hẹp kết quả.
        </p>

        <div
          className="relative w-full min-h-[48px] px-4 py-2.5 border border-neutral-400/80 rounded-xl focus-within:border-primary-500 focus-within:border-transparent transition-all duration-200 shadow-sm hover:shadow-md mb-4"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" strokeWidth={2} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tìm kiếm bài hát, nhạc cụ, nghệ nhân,..."
            className="w-full pl-12 pr-32 py-2 bg-transparent text-neutral-900 placeholder-neutral-500 focus:outline-none rounded-xl"
            aria-label="Từ khóa tìm kiếm"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors duration-200 flex items-center gap-2 cursor-pointer"
          >
            Tìm kiếm
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {activeFilterCount > 0 ? (
          <p className="text-sm text-neutral-500">
            {activeFilterCount} bộ lọc đang được áp dụng
          </p>
        ) : (
          null
        )}
      </div>

      {/* Basic Filters — same card style as SemanticSearchPage */}
      <div className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: "#FFFCF5" }}>
        <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
          <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
            <Music className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
          </div>
          Bộ lọc cơ bản
        </h2>
        <p className="text-neutral-600 font-medium leading-relaxed mb-4">
          Lọc theo thể loại và nguồn gốc
        </p>

        {/* Genre-Ethnicity Warning */}
        {genreEthnicityWarning && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-yellow-50/90 border border-yellow-300/80 rounded-2xl shadow-sm backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-yellow-700 font-medium text-sm leading-relaxed">{genreEthnicityWarning}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Thể loại/Loại hình">
            <MultiSelectTags
              values={genres}
              onChange={setGenres}
              options={GENRES}
              placeholder="Chọn thể loại..."
            />
          </FormField>

          <FormField label="Dân tộc">
            <SearchableDropdown
              value={ethnicity}
              onChange={setEthnicity}
              options={["Tất cả dân tộc", ...ETHNICITIES]}
              placeholder="Tất cả dân tộc"
            />
          </FormField>

          <FormField label="Khu vực">
            <SearchableDropdown
              value={region}
              onChange={setRegion}
              options={["Tất cả khu vực", ...REGIONS]}
              placeholder="Tất cả khu vực"
              searchable={false}
            />
          </FormField>

          <FormField label="Tỉnh/Thành phố">
            <SearchableDropdown
              value={province}
              onChange={setProvince}
              options={["Tất cả tỉnh thành", ...PROVINCES]}
              placeholder="Tất cả tỉnh thành"
            />
          </FormField>
        </div>
      </div>

      {/* Cultural Context Filters */}
      <CollapsibleSection
        icon={MapPin}
        title="Bộ lọc bối cảnh văn hóa"
        subtitle="Lọc theo sự kiện và hình thức biểu diễn"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Loại sự kiện">
            <SearchableDropdown
              value={eventType}
              onChange={setEventType}
              options={["Tất cả sự kiện", ...EVENT_TYPES]}
              placeholder="Tất cả sự kiện"
            />
          </FormField>

          <FormField label="Loại hình biểu diễn">
            <SearchableDropdown
              value={performanceType}
              onChange={setPerformanceType}
              options={["Tất cả loại hình", ...PERFORMANCE_TYPES.map(p => p.label)]}
              placeholder="Tất cả loại hình"
              searchable={false}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Nhạc cụ" hint="Chọn một hoặc nhiều nhạc cụ">
              <MultiSelectTags
                values={instruments}
                onChange={setInstruments}
                options={INSTRUMENTS}
                placeholder="Tìm và chọn nhạc cụ..."
              />
            </FormField>
          </div>
        </div>
      </CollapsibleSection>

      {/* Time & Status Filters */}
      <CollapsibleSection
        icon={Filter}
        title="Bộ lọc thời gian và trạng thái"
        subtitle="Lọc theo năm ghi âm và trạng thái xác minh"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Năm ghi âm">
            <SearchableDropdown
              value={yearRange}
              onChange={setYearRange}
              options={["Tất cả thời gian", ...YEAR_RANGES.map(y => y.label)]}
              placeholder="Tất cả thời gian"
              searchable={false}
            />
          </FormField>

          <FormField label="Trạng thái xác minh">
            <SearchableDropdown
              value={verificationStatus}
              onChange={setVerificationStatus}
              options={["Tất cả trạng thái", ...VERIFICATION_STATUS.map(s => s.label)]}
              placeholder="Tất cả trạng thái"
              searchable={false}
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6">
        <button
          type="button"
          onClick={handleClearAll}
          className="px-6 py-2.5 text-neutral-800 rounded-xl transition-colors shadow-sm hover:shadow-md border-2 border-primary-600"
          style={{ backgroundColor: '#FFFCF5' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F0E8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFCF5'}
        >
          Xóa bộ lọc
        </button>
        <button
          type="button"
          onClick={handleSearch}
          className="px-8 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-xl font-medium flex items-center gap-2 transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <Search className="h-4 w-4" strokeWidth={2.5} />
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}