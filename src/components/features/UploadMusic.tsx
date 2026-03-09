import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { ModerationStatus } from "@/types";
import { ChevronDown, Upload, Music, MapPin, FileAudio, Info, Shield, Check, Search, Plus, AlertCircle, Video, X, Navigation, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";
import UploadProgressDialog from "@/components/common/UploadProgressDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { LocalRecording } from "@/types";
import { UserRole } from "@/types";
import { sessionGetItem, sessionRemoveItem } from "@/services/storageService";
import { getLocalRecordingFull, setLocalRecording } from "@/services/recordingStorage";
import { recordingRequestService } from "@/services/recordingRequestService";
import { suggestMetadata } from "@/services/metadataSuggestService";
import { getAddressFromCoordinates } from "@/services/geocodeService";
import { ETHNICITIES, REGIONS, EVENT_TYPES, INSTRUMENTS } from "@/config/musicMetadata";

// Extended type for local recording storage (supports both legacy and new formats)
type LocalRecordingStorage = LocalRecording & {
  uploadedAt?: string; // Legacy field
  culturalContext?: {
    ethnicity?: string;
  };
};

// Type for saving (storage may persist file metadata)
type LocalRecordingForSave = LocalRecordingStorage & {
  file?: { name?: string; size?: number; type?: string; duration?: number; bitrate?: number; sampleRate?: number };
};

// ===== CONSTANTS =====
const SUPPORTED_AUDIO_FORMATS = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/flac",
  "audio/x-flac",
];

const SUPPORTED_VIDEO_FORMATS = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
  "video/x-ms-wmv",
  "video/3gpp",
  "video/x-flv",
];

/** Video & audio upload: no file size limit. Do not add size checks. */

const GENRES = [
  "Dân ca",
  "Hát xẩm",
  "Ca trù",
  "Chầu văn",
  "Quan họ",
  "Hát then",
  "Cải lương",
  "Tuồng",
  "Chèo",
  "Nhã nhạc",
  "Ca Huế",
  "Đờn ca tài tử",
  "Hát bội",
  "Hò",
  "Lý",
  "Vọng cổ",
  "Hát ru",
  "Hát ví",
  "Hát giặm",
  "Bài chòi",
  "Khác",
];

const LANGUAGES = [
  "Tiếng Việt",
  "Tiếng Thái",
  "Tiếng Tày",
  "Tiếng Nùng",
  "Tiếng H'Mông",
  "Tiếng Mường",
  "Tiếng Khmer",
  "Tiếng Chăm",
  "Tiếng Ê Đê",
  "Tiếng Ba Na",
  "Tiếng Gia Rai",
  "Tiếng Dao",
  "Tiếng Sán Chay",
  "Tiếng Cơ Ho",
  "Tiếng Xơ Đăng",
  "Tiếng Sán Dìu",
  "Tiếng Hrê",
  "Tiếng Mnông",
  "Tiếng Ra Glai",
  "Tiếng Giáy",
  "Tiếng Cơ Tu",
  "Tiếng Bru-Vân Kiều",
  "Khác",
];

const PROVINCES = [
  "TP. Hà Nội",
  "TP. Hải Phòng",
  "TP. Huế",
  "TP. Đà Nẵng",
  "TP. Hồ Chí Minh",
  "TP. Cần Thơ",
  "An Giang",
  "Bắc Ninh",
  "Cà Mau",
  "Cao Bằng",
  "Điện Biên",
  "Đắk Lắk",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Tĩnh",
  "Hưng Yên",
  "Khánh Hòa",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Nghệ An",
  "Ninh Bình",
  "Phú Thọ",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sơn La",
  "Tây Ninh",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tuyên Quang",
  "Vĩnh Long",
];

const PERFORMANCE_TYPES = [
  { key: "instrumental", label: "Chỉ nhạc cụ (Instrumental)" },
  { key: "acappella", label: "Chỉ giọng hát không đệm (Acappella)" },
  {
    key: "vocal_accompaniment",
    label: "Giọng hát có nhạc đệm (Vocal with accompaniment)",
  },
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
  Tuồng: ["Kinh"],
  Chèo: ["Kinh"],
  "Hát xẩm": ["Kinh"],
  "Hát then": ["Tày", "Nùng"],
  Khèn: ["H'Mông"],
  "Cồng chiêng": ["Ba Na", "Gia Rai", "Ê Đê", "Xơ Đăng", "Giẻ Triêng"],
};

// ===== VIETNAMESE LUNAR CALENDAR =====
// Based on Ho Ngoc Duc's algorithm - https://www.informatik.uni-leipzig.de/~duc/amlich/

const PI = Math.PI;

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd =
      dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k: number, timeZone: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 =
    C1 -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M));
  C1 =
    C1 -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 =
    C1 +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat: number;
  if (T < -11) {
    deltat =
      0.001 +
      0.000839 * T +
      0.0002261 * T2 -
      0.00000845 * T3 -
      0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  const JdNew = Jd1 + C1 - deltat;
  return Math.floor(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(jdn: number, timeZone: number): number {
  const T = (jdn - 0.5 - timeZone / 24 - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL =
    DL +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - PI * 2 * Math.floor(L / (PI * 2));
  return Math.floor((L / PI) * 6);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

function convertSolar2Lunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone: number = 7,
): { day: number; month: number; year: number; leap: boolean } {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
}

// Vietnamese Zodiac (Can Chi) calculation
const CAN = [
  "Giáp",
  "Ất",
  "Bính",
  "Đinh",
  "Mậu",
  "Kỷ",
  "Canh",
  "Tân",
  "Nhâm",
  "Quý",
];
const CHI = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
];

function getCanChi(lunarYear: number): string {
  const can = CAN[(lunarYear + 6) % 10];
  const chi = CHI[(lunarYear + 8) % 12];
  return `${can} ${chi}`;
}

function getLunarDateString(dd: number, mm: number, yy: number): string {
  const lunar = convertSolar2Lunar(dd, mm, yy);
  return `${lunar.day}`;
}

function getFullLunarDateString(dd: number, mm: number, yy: number): string {
  const lunar = convertSolar2Lunar(dd, mm, yy);
  const canChi = getCanChi(lunar.year);
  return `${lunar.day}/${lunar.month}${lunar.leap ? " nhuận" : ""} năm ${canChi}`;
}

// Convert lunar date to solar date
function jdToDate(jd: number): { day: number; month: number; year: number } {
  let a;
  if (jd > 2299160) {
    a = Math.floor((jd - 1867216.25) / 36524.25);
    a = jd + 1 + a - Math.floor(a / 4);
  } else {
    a = jd;
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  let m;
  if (e < 14) {
    m = e - 1;
  } else {
    m = e - 13;
  }
  let year;
  if (m > 2) {
    year = c - 4716;
  } else {
    year = c - 4715;
  }
  return { day, month: m, year };
}

function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap: boolean = false,
  timeZone: number = 7,
): { day: number; month: number; year: number } | null {
  let a11: number, b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }

  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }

  if (b11 - a11 > 365) {
    const leapMonth = getLeapMonthInYear(lunarYear);

    if (lunarLeap && lunarMonth !== leapMonth) {
      return null; // Invalid leap month request
    }

    // Adjust offset if the target month is after the leap month, or is the leap month itself
    if (lunarLeap || lunarMonth > leapMonth) {
      off += 1;
    }
  }

  const monthStart = getNewMoonDay(k + off, timeZone);
  return jdToDate(monthStart + lunarDay - 1);
}

// Get the leap month number for a lunar year (returns 0 if no leap month)
function getLeapMonthInYear(lunarYear: number): number {
  // Use convertSolar2Lunar to find leap month by checking dates throughout the year
  // This approach uses the proven conversion algorithm

  // A lunar year spans approximately from late Jan/early Feb of solar year
  // to late Jan/early Feb of the next solar year
  // Check solar dates from (lunarYear) to (lunarYear + 1) to cover all lunar months

  const yearsToCheck = [lunarYear, lunarYear + 1];

  for (const solarYear of yearsToCheck) {
    for (let solarMonth = 1; solarMonth <= 12; solarMonth++) {
      // Check multiple days in each solar month to ensure we catch the leap month
      // (leap months can be short, so checking only day 15 might miss some)
      for (const day of [5, 15, 25]) {
        // Make sure the day is valid for this month
        const maxDay = new Date(solarYear, solarMonth, 0).getDate();
        if (day > maxDay) continue;

        const lunar = convertSolar2Lunar(day, solarMonth, solarYear);
        if (lunar.year === lunarYear && lunar.leap) {
          return lunar.month;
        }
      }
    }
  }

  return 0; // No leap month found
}

// Get lunar months for a lunar year (including leap month if any)
function getLunarMonthsForYear(
  lunarYear: number,
): { month: number; leap: boolean; label: string }[] {
  const leapMonth = getLeapMonthInYear(lunarYear);

  const months: { month: number; leap: boolean; label: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push({ month: m, leap: false, label: `Tháng ${m}` });
    if (leapMonth === m) {
      months.push({ month: m, leap: true, label: `Tháng ${m} nhuận` });
    }
  }
  return months;
}

// ===== UTILITY FUNCTIONS =====

// Check if click is on scrollbar
const isClickOnScrollbar = (event: MouseEvent): boolean => {
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  if (
    scrollbarWidth > 0 &&
    event.clientX >= document.documentElement.clientWidth
  ) {
    return true;
  }
  return false;
};

const inferMimeFromName = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return "";
  // Audio formats
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "flac") return "audio/flac";
  if (ext === "ogg") return "audio/ogg";
  // Video formats
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "avi") return "video/x-msvideo";
  if (ext === "webm") return "video/webm";
  if (ext === "mkv") return "video/x-matroska";
  if (ext === "mpeg" || ext === "mpg") return "video/mpeg";
  if (ext === "wmv") return "video/x-ms-wmv";
  if (ext === "3gp") return "video/3gpp";
  if (ext === "flv") return "video/x-flv";
  return "";
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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
      opt.toLowerCase().includes(search.toLowerCase()),
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
      if (
        clickedOutsideDropdown &&
        (menuRef.current ? clickedOutsideMenu : true)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current)
        setMenuRect(buttonRef.current.getBoundingClientRect());
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
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400/80 rounded-full focus:outline-none focus:border-primary-500 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-md ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        style={{ backgroundColor: "#FFFCF5" }}
      >
        <span className={value ? "text-neutral-900 font-medium" : "text-neutral-400"}>
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
              backgroundColor: "#FFFCF5",
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
                    className="w-full pl-9 pr-3 py-2 text-neutral-900 placeholder-neutral-500 border border-neutral-400/80 rounded-full focus:outline-none focus:border-primary-500 text-sm shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ backgroundColor: "#FFFCF5" }}
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
          document.body,
        )}
    </div>
  );
}

function MultiSelectTags({
  values,
  onChange,
  options,
  placeholder = "Chọn nhạc cụ...",
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
      if (
        clickedOutsideContainer &&
        (menuRef.current ? clickedOutsideMenu : true)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (inputRef.current)
        setMenuRect(inputRef.current.getBoundingClientRect());
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
        className={`min-h-[48px] px-4 py-2.5 border border-neutral-400/80 rounded-full focus-within:border-primary-500 focus-within:border-transparent transition-all duration-200 shadow-sm hover:shadow-md ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"
          }`}
        style={{ backgroundColor: "#FFFCF5" }}
      >
        <div className="flex flex-wrap gap-1.5">
          {values.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-primary-600 to-primary-700 text-white text-xs rounded-full font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
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
                  // Prevent browser navigating back
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
              backgroundColor: "#FFFCF5",
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
                    className="w-full px-5 py-3 text-left text-sm text-neutral-900 hover:bg-primary-100 hover:text-primary-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4 text-primary-600" />
                    {option}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày/tháng/năm",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showLunarMonthDropdown, setShowLunarMonthDropdown] = useState(false);
  const [showLunarYearDropdown, setShowLunarYearDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const lunarMonthDropdownRef = useRef<HTMLDivElement>(null);
  const lunarYearDropdownRef = useRef<HTMLDivElement>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const date = new Date(value);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  const selectedDate = value ? new Date(value) : null;

  // Generate year range (100 years back to current year - auto updates each new year)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const years = Array.from(
    { length: currentYear - (currentYear - 100) + 1 },
    (_, i) => currentYear - i,
  );

  // Get current lunar info
  const currentLunar = convertSolar2Lunar(
    new Date().getDate(),
    new Date().getMonth() + 1,
    new Date().getFullYear(),
  );

  // Find the lunar month whose first day (mùng 1) appears in the current solar month view
  const viewLunar = useMemo(() => {
    const lastDay = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      0,
    ).getDate();

    // Check each day in the solar month to find where a lunar month starts
    for (let d = 1; d <= lastDay; d++) {
      const lunar = convertSolar2Lunar(
        d,
        viewDate.getMonth() + 1,
        viewDate.getFullYear(),
      );
      if (lunar.day === 1) {
        return lunar; // Found the lunar month that starts in this solar month
      }
    }
    // If no lunar month starts in this solar month, use the lunar month of day 1
    return convertSolar2Lunar(
      1,
      viewDate.getMonth() + 1,
      viewDate.getFullYear(),
    );
  }, [viewDate]);

  const lunarYears = Array.from(
    { length: currentYear - (currentYear - 100) + 1 },
    (_, i) => currentYear - i,
  );
  const lunarMonths = getLunarMonthsForYear(viewLunar.year);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const clickedOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideMenu =
        menuRef.current && !menuRef.current.contains(target);
      if (
        clickedOutsideDropdown &&
        (menuRef.current ? clickedOutsideMenu : true)
      ) {
        setIsOpen(false);
        setShowMonthDropdown(false);
        setShowYearDropdown(false);
        setShowLunarMonthDropdown(false);
        setShowLunarYearDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close month/year dropdowns when clicking outside them
  useEffect(() => {
    const handleClickOutsideDropdowns = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      if (
        showMonthDropdown &&
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(target)
      ) {
        setShowMonthDropdown(false);
      }
      if (
        showYearDropdown &&
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(target)
      ) {
        setShowYearDropdown(false);
      }
      if (
        showLunarMonthDropdown &&
        lunarMonthDropdownRef.current &&
        !lunarMonthDropdownRef.current.contains(target)
      ) {
        setShowLunarMonthDropdown(false);
      }
      if (
        showLunarYearDropdown &&
        lunarYearDropdownRef.current &&
        !lunarYearDropdownRef.current.contains(target)
      ) {
        setShowLunarYearDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideDropdowns);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideDropdowns);
  }, [
    showMonthDropdown,
    showYearDropdown,
    showLunarMonthDropdown,
    showLunarYearDropdown,
  ]);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current)
        setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Convert Sunday=0 to Monday-first format (Monday=0, Sunday=6)
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const days = getDaysInMonth(viewDate);
  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];
  const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const handleDateClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = (viewDate.getMonth() + 1).toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    const isoString = `${year}-${month}-${dayStr}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = viewDate.getMonth() + 1;
    const nextYear =
      nextMonth > 11 ? viewDate.getFullYear() + 1 : viewDate.getFullYear();
    const actualNextMonth = nextMonth > 11 ? 0 : nextMonth;

    // Don't allow navigating to future months
    if (
      nextYear > currentYear ||
      (nextYear === currentYear && actualNextMonth > currentMonth)
    ) {
      return;
    }
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const canGoNext = !(
    viewDate.getFullYear() === currentYear &&
    viewDate.getMonth() >= currentMonth
  );

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const solarDate = date.toLocaleDateString("vi-VN");
    const lunarStr = getFullLunarDateString(
      date.getDate(),
      date.getMonth() + 1,
      date.getFullYear(),
    );
    return `${solarDate} (${lunarStr})`;
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400 rounded-full focus:outline-none focus:border-primary-500 transition-colors text-left flex items-center justify-between ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        style={{ backgroundColor: "#FFFCF5" }}
      >
        <span className={value ? "text-neutral-900" : "text-neutral-400"}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: "#FFFCF5",
              position: "absolute",
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: Math.max(320, menuRect.width),
              zIndex: 40,
            }}
          >
            <div className="p-3 border-b border-neutral-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-primary-100 rounded-full transition-colors flex-shrink-0"
              >
                <ChevronDown className="h-4 w-4 text-neutral-600 rotate-90" />
              </button>

              <div className="flex items-center gap-2 flex-1 justify-center">
                {/* Month Dropdown */}
                <div className="relative" ref={monthDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMonthDropdown(!showMonthDropdown);
                      setShowYearDropdown(false);
                    }}
                    className="px-4 py-1.5 border border-neutral-400 rounded-full text-sm font-medium text-neutral-900 transition-colors flex items-center gap-1"
                    style={{ backgroundColor: "#FFFCF5" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#FFF7E6")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#FFFCF5")
                    }
                  >
                    {monthNames[viewDate.getMonth()]}
                    <ChevronDown
                      className={`h-3 w-3 text-neutral-500 transition-transform ${showMonthDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showMonthDropdown && (
                    <div
                      className="absolute top-full left-0 mt-1 rounded-xl shadow-xl border border-neutral-300 overflow-hidden z-10 min-w-[120px]"
                      style={{ backgroundColor: "#FFFCF5" }}
                    >
                      <div
                        className="max-h-48 overflow-y-auto"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "#9B2C2C rgba(255,255,255,0.3)",
                        }}
                      >
                        {monthNames.map((month, index) => {
                          const isFutureMonth =
                            viewDate.getFullYear() === currentYear &&
                            index > currentMonth;
                          return (
                            <button
                              key={month}
                              type="button"
                              onClick={() => {
                                if (!isFutureMonth) {
                                  setViewDate(
                                    new Date(viewDate.getFullYear(), index, 1),
                                  );
                                  setShowMonthDropdown(false);
                                }
                              }}
                              disabled={isFutureMonth}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${isFutureMonth
                                ? "text-neutral-400 cursor-not-allowed"
                                : viewDate.getMonth() === index
                                  ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium"
                                  : "text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700"
                                }`}
                            >
                              {month}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Year Dropdown */}
                <div className="relative" ref={yearDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowYearDropdown(!showYearDropdown);
                      setShowMonthDropdown(false);
                    }}
                    className="px-4 py-1.5 border border-neutral-400 rounded-full text-sm font-medium text-neutral-900 transition-colors flex items-center gap-1"
                    style={{ backgroundColor: "#FFFCF5" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#FFF7E6")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#FFFCF5")
                    }
                  >
                    Năm {viewDate.getFullYear()}
                    <ChevronDown
                      className={`h-3 w-3 text-neutral-500 transition-transform ${showYearDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showYearDropdown && (
                    <div
                      className="absolute top-full right-0 mt-1 rounded-xl shadow-xl border border-neutral-300 overflow-hidden z-10 min-w-[120px]"
                      style={{ backgroundColor: "#FFFCF5" }}
                    >
                      <div
                        className="max-h-48 overflow-y-auto"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "#9B2C2C rgba(255,255,255,0.3)",
                        }}
                      >
                        {years.map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              // If switching to current year and current view month is in future, adjust to current month
                              let newMonth = viewDate.getMonth();
                              if (
                                year === currentYear &&
                                newMonth > currentMonth
                              ) {
                                newMonth = currentMonth;
                              }
                              setViewDate(new Date(year, newMonth, 1));
                              setShowYearDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${viewDate.getFullYear() === year
                              ? "bg-primary-600 text-white font-medium"
                              : "text-neutral-900 hover:bg-primary-100 hover:text-primary-700"
                              }`}
                          >
                            Năm {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={!canGoNext}
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${canGoNext
                  ? "hover:bg-primary-100"
                  : "opacity-30 cursor-not-allowed"
                  }`}
              >
                <ChevronDown className="h-4 w-4 text-neutral-600 -rotate-90" />
              </button>
            </div>

            {/* Lunar Calendar Selection */}
            <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-center gap-2">
              <span className="text-xs text-neutral-500">Âm lịch:</span>

              {/* Lunar Month Dropdown */}
              <div className="relative" ref={lunarMonthDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLunarMonthDropdown(!showLunarMonthDropdown);
                    setShowLunarYearDropdown(false);
                    setShowMonthDropdown(false);
                    setShowYearDropdown(false);
                  }}
                  className="px-4 py-1.5 border border-neutral-400 rounded-full text-sm font-medium text-neutral-900 transition-colors flex items-center gap-1"
                  style={{ backgroundColor: "#FFFCF5" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#FFF7E6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#FFFCF5")
                  }
                >
                  Tháng {viewLunar.month}
                  {viewLunar.leap ? " nhuận" : ""}
                  <ChevronDown
                    className={`h-3 w-3 text-neutral-500 transition-transform ${showLunarMonthDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showLunarMonthDropdown && (
                  <div
                    className="absolute top-full left-0 mt-1 rounded-xl shadow-xl border border-neutral-300 overflow-hidden z-10 min-w-[150px]"
                    style={{ backgroundColor: "#FFFCF5" }}
                  >
                    <div
                      className="max-h-48 overflow-y-auto"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#dc2626 rgba(255,255,255,0.3)",
                      }}
                    >
                      {lunarMonths.map((lm) => {
                        const isFutureLunarMonth =
                          viewLunar.year === currentLunar.year &&
                          (lm.month > currentLunar.month ||
                            (lm.month === currentLunar.month &&
                              lm.leap &&
                              !currentLunar.leap));
                        return (
                          <button
                            key={`${lm.month}-${lm.leap}`}
                            type="button"
                            onClick={() => {
                              if (!isFutureLunarMonth) {
                                // Convert first day of lunar month to solar date
                                const solarDate = convertLunar2Solar(
                                  1,
                                  lm.month,
                                  viewLunar.year,
                                  lm.leap,
                                );
                                if (solarDate) {
                                  // Navigate to the solar month containing the first day of lunar month
                                  setViewDate(
                                    new Date(
                                      solarDate.year,
                                      solarDate.month - 1,
                                      1,
                                    ),
                                  );
                                }
                                setShowLunarMonthDropdown(false);
                              }
                            }}
                            disabled={isFutureLunarMonth}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${isFutureLunarMonth
                              ? "text-neutral-400 cursor-not-allowed"
                              : viewLunar.month === lm.month &&
                                viewLunar.leap === lm.leap
                                ? "bg-primary-600 text-white font-medium"
                                : "text-neutral-900 hover:bg-primary-100 hover:text-primary-700"
                              }`}
                          >
                            {lm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Lunar Year Dropdown */}
              <div className="relative" ref={lunarYearDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLunarYearDropdown(!showLunarYearDropdown);
                    setShowLunarMonthDropdown(false);
                    setShowMonthDropdown(false);
                    setShowYearDropdown(false);
                  }}
                  className="px-4 py-1.5 border border-neutral-400 rounded-full text-sm font-medium text-neutral-900 transition-colors flex items-center gap-1"
                  style={{ backgroundColor: "#FFFCF5" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#FFF7E6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#FFFCF5")
                  }
                >
                  Năm {getCanChi(viewLunar.year)}
                  <ChevronDown
                    className={`h-3 w-3 text-neutral-500 transition-transform ${showLunarYearDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showLunarYearDropdown && (
                  <div
                    className="absolute top-full right-0 mt-1 rounded-xl shadow-xl border border-neutral-300 overflow-hidden z-10 min-w-[200px]"
                    style={{ backgroundColor: "#FFFCF5" }}
                  >
                    <div
                      className="max-h-48 overflow-y-auto"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#dc2626 rgba(255,255,255,0.3)",
                      }}
                    >
                      {lunarYears.map((year) => {
                        const isFutureYear = year > currentLunar.year;
                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              if (!isFutureYear) {
                                // Convert lunar to solar and update view
                                let targetLunarMonth = viewLunar.month;
                                let targetLunarLeap = viewLunar.leap;

                                // Check if we need to adjust month for future
                                if (
                                  year === currentLunar.year &&
                                  targetLunarMonth > currentLunar.month
                                ) {
                                  targetLunarMonth = currentLunar.month;
                                  targetLunarLeap = false;
                                }

                                // Convert first day of lunar month to solar date
                                const solarDate = convertLunar2Solar(
                                  1,
                                  targetLunarMonth,
                                  year,
                                  targetLunarLeap,
                                );
                                if (solarDate) {
                                  // Navigate to the solar month containing the first day of lunar month
                                  setViewDate(
                                    new Date(
                                      solarDate.year,
                                      solarDate.month - 1,
                                      1,
                                    ),
                                  );
                                }
                                setShowLunarYearDropdown(false);
                              }
                            }}
                            disabled={isFutureYear}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors whitespace-nowrap ${isFutureYear
                              ? "text-neutral-400 cursor-not-allowed"
                              : viewLunar.year === year
                                ? "bg-primary-600 text-white font-medium"
                                : "text-neutral-900 hover:bg-primary-100 hover:text-primary-700"
                              }`}
                          >
                            Năm {getCanChi(year)} ({year})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-neutral-500 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (day === null) {
                    return (
                      <div key={`empty-${index}`} className="aspect-[1/1.3]" />
                    );
                  }

                  const isSelected =
                    selectedDate &&
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === viewDate.getMonth() &&
                    selectedDate.getFullYear() === viewDate.getFullYear();

                  const today = new Date();
                  const isToday =
                    today.getDate() === day &&
                    today.getMonth() === viewDate.getMonth() &&
                    today.getFullYear() === viewDate.getFullYear();

                  const dayDate = new Date(
                    viewDate.getFullYear(),
                    viewDate.getMonth(),
                    day,
                  );
                  const isFuture = dayDate > today;

                  // Get lunar date
                  const lunarDay = getLunarDateString(
                    day,
                    viewDate.getMonth() + 1,
                    viewDate.getFullYear(),
                  );
                  const lunar = convertSolar2Lunar(
                    day,
                    viewDate.getMonth() + 1,
                    viewDate.getFullYear(),
                  );
                  const isLunarFirstDay = lunar.day === 1;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !isFuture && handleDateClick(day)}
                      disabled={isFuture}
                      className={`aspect-[1/1.3] rounded-lg transition-colors flex flex-col items-center justify-center py-1 ${isFuture
                        ? "text-neutral-400 cursor-not-allowed"
                        : isSelected
                          ? "bg-primary-600 text-white font-medium"
                          : isToday
                            ? "bg-primary-100 text-primary-700 font-medium"
                            : "text-neutral-900 hover:bg-primary-50"
                        }`}
                    >
                      <span className="text-sm leading-none">{day}</span>
                      <span
                        className={`text-[10px] leading-none mt-0.5 ${isFuture
                          ? "text-neutral-300"
                          : isSelected
                            ? "text-white/70"
                            : isLunarFirstDay
                              ? "text-primary-600 font-medium"
                              : "text-neutral-400"
                          }`}
                      >
                        {isLunarFirstDay
                          ? `${lunar.day}/${lunar.month}${lunar.leap ? " nhuận" : ""}`
                          : lunarDay}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  multiline = false,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  const baseClasses = `w-full px-5 py-3 text-neutral-900 placeholder-neutral-500 border border-neutral-400 focus:outline-none focus:border-primary-500 transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""
    }`;
  const bgStyle = { backgroundColor: "#FFFCF5" };

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`${baseClasses} rounded-2xl resize-none`}
        style={bgStyle}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`${baseClasses} rounded-full`}
      style={bgStyle}
    />
  );
}

function FormField({
  label,
  required = false,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-neutral-600 font-medium">{hint}</p>}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  optional = false,
  required = false,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="p-2 bg-primary-600/20 rounded-lg">
        <Icon className="h-5 w-5 text-primary-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
          {title}
          {required && <span className="text-red-500" aria-hidden="true">*</span>}
          {optional && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full border border-neutral-300/80 shadow-sm"
            >
              Tùy chọn
            </span>
          )}
        </h3>
        {subtitle && (
          <p className="text-sm text-neutral-600 font-medium mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  optional = false,
  defaultOpen = true,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  optional?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="border border-neutral-200/80 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
      style={{ backgroundColor: "#FFFCF5" }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-6 flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer min-h-[44px] sm:min-h-0"
        style={{ backgroundColor: "#FFFCF5" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#F5F0E8")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#FFFCF5")
        }
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm flex-shrink-0">
            <Icon className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-neutral-900 flex items-center gap-2 break-words">
              {title}
              {optional && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full border border-neutral-300/80 shadow-sm"
                >
                  Tùy chọn
                </span>
              )}
            </h3>
            {subtitle && (
              <p className="text-sm text-neutral-600 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-neutral-600 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""
            }`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen && <div className="p-4 sm:p-6 pt-2 space-y-4 min-w-0">{children}</div>}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export interface UploadMusicProps {
  /** When provided (e.g. from EditRecordingPage), load recording by id from storage instead of session. */
  recordingId?: string;
  /** When true, save preserves moderation status APPROVED instead of resetting to PENDING_REVIEW. */
  isApprovedEdit?: boolean;
}

export default function UploadMusic({ recordingId, isApprovedEdit }: UploadMusicProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditModeParam = searchParams.get("edit") === "true" || !!recordingId;
  const [isEditMode, setIsEditMode] = useState(isEditModeParam);
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");
  const [file, setFile] = useState<File | null>(null);
  const [audioInfo, setAudioInfo] = useState<{
    name: string;
    size: number;
    type: string;
    duration: number;
    bitrate?: number;
    sampleRate?: number;
  } | null>(null);
  const [existingMediaSrc, setExistingMediaSrc] = useState<string | null>(null);
  const [existingMediaInfo, setExistingMediaInfo] = useState<{
    name: string;
    size: number;
    type: string;
    duration: number;
    bitrate?: number;
    sampleRate?: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [artistUnknown, setArtistUnknown] = useState(false);
  const [composer, setComposer] = useState("");
  const [composerUnknown, setComposerUnknown] = useState(false);
  const [language, setLanguage] = useState("");
  const [noLanguage, setNoLanguage] = useState(false);
  const [customLanguage, setCustomLanguage] = useState("");
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [recordingDate, setRecordingDate] = useState("");
  const [dateEstimated, setDateEstimated] = useState(false);
  const [dateNote, setDateNote] = useState("");
  const [recordingLocation, setRecordingLocation] = useState("");

  const [ethnicity, setEthnicity] = useState("");
  const [customEthnicity, setCustomEthnicity] = useState("");
  const [region, setRegion] = useState("");

  const { user: currentUser } = useAuthStore();
  // Upload: only CONTRIBUTOR. Edit (isApprovedEdit): CONTRIBUTOR or EXPERT — same UI/UX and logic for both.
  const isFormDisabled = !currentUser || (isApprovedEdit ? (currentUser.role !== "CONTRIBUTOR" && currentUser.role !== "EXPERT") : currentUser.role !== "CONTRIBUTOR");
  const [province, setProvince] = useState("");
  const [eventType, setEventType] = useState("");
  const [customEventType, setCustomEventType] = useState("");
  const [performanceType, setPerformanceType] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);

  const [description, setDescription] = useState("");
  const [fieldNotes, setFieldNotes] = useState("");
  const [transcription, setTranscription] = useState("");
  const [lyricsFile, setLyricsFile] = useState<File | null>(null);
  // Instrument image upload state
  const [instrumentImage, setInstrumentImage] = useState<File | null>(null);
  const [instrumentImagePreview, setInstrumentImagePreview] = useState<string>("");
  // Instrument image upload handler
  const handleInstrumentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setInstrumentImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInstrumentImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setInstrumentImagePreview("");
    }
  };

  const [collector, setCollector] = useState("");
  const [copyright, setCopyright] = useState("");
  const [archiveOrg, setArchiveOrg] = useState("");
  const [catalogId, setCatalogId] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Wizard steps for new submission (1=Upload, 2=Metadata, 3=GPS+AI, 4=Review). When isEditMode, all sections shown.
  const [uploadWizardStep, setUploadWizardStep] = useState(1);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);
  const [aiSuggestSuccess, setAiSuggestSuccess] = useState<string | null>(null);
  // success popup removed; use submitStatus === 'success' to show confirmations

  const requiresInstruments =
    performanceType === "instrumental" ||
    performanceType === "vocal_accompaniment";
  const allowsLyrics =
    performanceType === "acappella" ||
    performanceType === "vocal_accompaniment";

  // Check for genre-ethnicity mismatch
  const genreEthnicityWarning = useMemo(() => {
    if (!genre || !ethnicity) return null;

    const expectedEthnicities = GENRE_ETHNICITY_MAP[genre];
    if (expectedEthnicities && !expectedEthnicities.includes(ethnicity)) {
      return `Lưu ý: Thể loại "${genre}" thường là đặc trưng của người ${expectedEthnicities.join(", ")}. Tuy nhiên, giao lưu văn hóa giữa các dân tộc là điều bình thường.`;
    }
    return null;
  }, [genre, ethnicity]);

  const showWizard = !isEditMode;

  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ GPS.");
      return;
    }
    setGpsError(null);
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const gpsText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          const res = await getAddressFromCoordinates(latitude, longitude);
          const display = res.address?.trim() || `Tọa độ: ${gpsText}`;
          setRecordingLocation((prev) => (prev ? `${prev}; ${display}` : display));
          if (res.addressFromService === false || display.startsWith("Tọa độ:")) {
            setGpsError("Không lấy được tên địa chỉ từ dịch vụ; đã lưu tọa độ. Bạn có thể chỉnh sửa ô địa điểm ở bước Metadata.");
          } else {
            setGpsError(null);
          }
        } catch {
          setRecordingLocation((prev) => (prev ? `${prev} (Tọa độ: ${gpsText})` : `Tọa độ: ${gpsText}`));
          setGpsError("Không kết nối được dịch vụ địa chỉ; đã lưu tọa độ. Bạn có thể chỉnh sửa ô địa điểm.");
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(err.message === "User denied Geolocation" ? "Bạn đã từ chối quyền vị trí." : "Không lấy được tọa độ. Kiểm tra quyền vị trí hoặc kết nối.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleAiSuggestMetadata = async () => {
    setAiSuggestError(null);
    setAiSuggestSuccess(null);
    setAiSuggestLoading(true);
    try {
      const res = await suggestMetadata({
        genre: genre || undefined,
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
      });
      const hasSuggestions = res.ethnicity || res.region || (res.instruments && res.instruments.length > 0);
      if (res.message && !hasSuggestions) {
        setAiSuggestError(res.message);
      } else {
        const parts: string[] = [];
        if (res.ethnicity) {
          setEthnicity(res.ethnicity);
          parts.push(`Dân tộc: ${res.ethnicity}`);
        }
        if (res.region) {
          setRegion(res.region);
          parts.push(`Vùng: ${res.region}`);
        }
        if (res.instruments && res.instruments.length > 0) {
          setInstruments((prev) => {
            const combined = [...prev];
            for (const name of res.instruments!) {
              if (name && !combined.includes(name)) combined.push(name);
            }
            return combined.length > 0 ? combined : res.instruments;
          });
          parts.push(`Nhạc cụ: ${res.instruments.join(", ")}`);
        }
        if (parts.length > 0) {
          setAiSuggestSuccess(`Đã áp dụng gợi ý: ${parts.join(" · ")}. Xem lại ở Bước 2.`);
          setUploadWizardStep(2);
        }
      }
    } catch {
      if (genre && GENRE_ETHNICITY_MAP[genre]) {
        const suggested = GENRE_ETHNICITY_MAP[genre][0];
        if (suggested && !ethnicity) setEthnicity(suggested);
      }
      setAiSuggestError("Không kết nối được dịch vụ gợi ý. Kiểm tra backend và thử lại.");
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Video & audio: no file size limit (unlimited).
    const mime = selected.type || inferMimeFromName(selected.name);

    const isAudio = SUPPORTED_AUDIO_FORMATS.includes(mime);
    const isVideo = SUPPORTED_VIDEO_FORMATS.includes(mime);

    // Kiểm tra extension như fallback nếu MIME type không rõ
    const fileName = selected.name.toLowerCase();
    const hasVideoExtension = /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i.test(fileName);
    const hasAudioExtension = /\.(mp3|wav|flac|ogg)$/i.test(fileName);

    // Nếu không phải audio hoặc video theo MIME, kiểm tra extension
    if (!isAudio && !isVideo) {
      if (hasVideoExtension && mediaType === "video") {
        // Cho phép upload video dựa trên extension
      } else if (hasAudioExtension && mediaType === "audio") {
        // Cho phép upload audio dựa trên extension
      } else {
        setErrors((prev) => ({
          ...prev,
          file: mediaType === "audio"
            ? "Chỉ hỗ trợ file MP3, WAV hoặc FLAC"
            : "Chỉ hỗ trợ file MP4, MOV, AVI, WebM, MKV, MPEG, WMV, 3GP hoặc FLV",
        }));
        setFile(null);
        setAudioInfo(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    // Mutually exclusive: once user has chosen audio or video, do not allow switching via file pick
    if ((isVideo || hasVideoExtension) && mediaType === "audio") {
      setErrors((prev) => ({
        ...prev,
        file: "Bạn đã chọn đóng góp file âm thanh. Không thể chuyển sang file video trong cùng bản đóng góp. Vui lòng chọn file âm thanh.",
      }));
      setFile(null);
      setAudioInfo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if ((isAudio || hasAudioExtension) && mediaType === "video") {
      setErrors((prev) => ({
        ...prev,
        file: "Bạn đã chọn đóng góp file video. Không thể chuyển sang file âm thanh trong cùng bản đóng góp. Vui lòng chọn file video.",
      }));
      setFile(null);
      setAudioInfo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.file;
      return newErrors;
    });
    setFile(selected);
    setIsAnalyzing(true);

    const url = URL.createObjectURL(selected);
    let cleanedUp = false;
    let mediaElement: HTMLAudioElement | HTMLVideoElement | null = null;
    let wrappedOnLoaded: (() => void) | null = null;
    let wrappedOnError: (() => void) | null = null;
    let metadataTimeout: NodeJS.Timeout | null = null;

    const onLoaded = () => {
      if (cleanedUp || !mediaElement) return;
      const durationSeconds = isFinite(mediaElement.duration)
        ? Math.round(mediaElement.duration)
        : 0;

      const bitrate =
        durationSeconds > 0
          ? Math.round((selected.size * 8) / durationSeconds / 1000)
          : undefined;

      setAudioInfo({
        name: selected.name,
        size: selected.size,
        type: mime,
        duration: durationSeconds,
        bitrate,
      });

      if (!title) {
        const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }

      setIsAnalyzing(false);
      cleanup();
    };

    const onError = () => {
      if (cleanedUp) return;
      // Một số định dạng video có thể không hỗ trợ đọc metadata trong browser
      // Nhưng vẫn cho phép upload với thông tin cơ bản
      if (isVideo) {
        // Với video, vẫn cho phép upload ngay cả khi không đọc được metadata
        setAudioInfo({
          name: selected.name,
          size: selected.size,
          type: mime,
          duration: 0, // Không xác định được duration
        });
        setIsAnalyzing(false);
        cleanup();

        // Không set error, chỉ log warning
        console.warn("Không thể đọc metadata từ file video, nhưng vẫn cho phép upload:", selected.name);
        return;
      }

      // Với audio, vẫn yêu cầu có metadata
      setErrors((prev) => ({
        ...prev,
        file: "Không thể phân tích file âm thanh. Vui lòng chọn file khác.",
      }));
      setFile(null);
      setAudioInfo(null);
      setIsAnalyzing(false);
      cleanup();
    };

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;

      // Clear timeout nếu có
      if (metadataTimeout) {
        clearTimeout(metadataTimeout);
        metadataTimeout = null;
      }

      if (mediaElement) {
        // Remove event listeners với wrapped handlers
        if (wrappedOnLoaded) {
          mediaElement.removeEventListener("loadedmetadata", wrappedOnLoaded);
        }
        if (wrappedOnError) {
          mediaElement.removeEventListener("error", wrappedOnError);
        }
        mediaElement.src = "";
        if (mediaElement instanceof HTMLVideoElement && mediaElement.parentNode) {
          document.body.removeChild(mediaElement);
        }
      }
      URL.revokeObjectURL(url);
    };

    // Set timeout để tránh treo quá lâu khi đọc metadata (đặc biệt với video lớn)
    metadataTimeout = setTimeout(() => {
      if (!cleanedUp && isAnalyzing) {
        console.warn("Timeout khi đọc metadata, nhưng vẫn cho phép upload");
        // Với video, vẫn cho phép upload ngay cả khi timeout
        if (isVideo) {
          setAudioInfo({
            name: selected.name,
            size: selected.size,
            type: mime,
            duration: 0,
          });
          setIsAnalyzing(false);
          cleanup();
        }
      }
    }, 15000); // 15 giây timeout cho metadata

    if (isVideo) {
      const video = document.createElement("video");
      video.style.display = "none";
      document.body.appendChild(video);
      mediaElement = video;
      video.preload = "metadata";
      video.src = url;

      wrappedOnLoaded = () => {
        if (metadataTimeout) clearTimeout(metadataTimeout);
        onLoaded();
      };

      wrappedOnError = () => {
        if (metadataTimeout) clearTimeout(metadataTimeout);
        onError();
      };

      video.addEventListener("loadedmetadata", wrappedOnLoaded);
      video.addEventListener("error", wrappedOnError);
    } else {
      const audio = new Audio();
      mediaElement = audio;
      audio.preload = "metadata";
      audio.src = url;

      wrappedOnLoaded = () => {
        if (metadataTimeout) clearTimeout(metadataTimeout);
        onLoaded();
      };

      wrappedOnError = () => {
        if (metadataTimeout) clearTimeout(metadataTimeout);
        onError();
      };

      audio.addEventListener("loadedmetadata", wrappedOnLoaded);
      audio.addEventListener("error", wrappedOnError);
    }
  };


  const handleLyricsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setLyricsFile(selected);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!file && !(isEditMode && !!existingMediaSrc)) {
      newErrors.file = mediaType === "audio"
        ? "Vui lòng chọn file âm thanh"
        : "Vui lòng chọn file video";
    }
    if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    if (!artistUnknown && !artist.trim()) {
      newErrors.artist = "Vui lòng nhập tên nghệ sĩ hoặc chọn 'Không rõ'";
    }
    if (!composerUnknown && !composer.trim()) {
      newErrors.composer =
        "Vui lòng nhập tên tác giả hoặc chọn 'Dân gian/Không rõ'";
    }
    if (!genre) newErrors.genre = "Vui lòng chọn thể loại";
    if (!performanceType) {
      newErrors.performanceType = "Vui lòng chọn loại hình biểu diễn";
    }
    if (requiresInstruments && instruments.length === 0) {
      newErrors.instruments = "Vui lòng chọn ít nhất một nhạc cụ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Shape used when loading from storage (storage may have extra fields not in LocalRecording type)
  type LoadedRecording = LocalRecordingStorage & {
    basicInfo?: { composer?: string; language?: string; dateEstimated?: boolean; dateNote?: string; recordingLocation?: string };
    additionalNotes?: { description?: string; fieldNotes?: string; transcription?: string };
    adminInfo?: { collector?: string; copyright?: string; archiveOrg?: string; catalogId?: string };
    file?: { name?: string; size?: number; type?: string; duration?: number; bitrate?: number; sampleRate?: number };
  };

  // Load editing recording: by recordingId (EditRecordingPage) or from session (ContributionsPage → /upload?edit=true)
  useEffect(() => {
    if (recordingId) {
      let cancelled = false;
      (async () => {
        try {
          const existing = await getLocalRecordingFull(recordingId) as LocalRecordingStorage | null;
          if (cancelled || !existing) return;
          const recording = existing as LoadedRecording;

          setEditingRecordingId(recording.id ?? null);
          setMediaType((recording.mediaType || "audio") as "audio" | "video");
          setTitle(recording.basicInfo?.title || "");
          setArtist(recording.basicInfo?.artist || "");
          setComposer(recording.basicInfo?.composer || "");
          setLanguage(recording.basicInfo?.language || "");
          setGenre(recording.basicInfo?.genre || "");
          setRecordingDate(recording.basicInfo?.recordingDate || "");
          setDateEstimated(recording.basicInfo?.dateEstimated || false);
          setDateNote(recording.basicInfo?.dateNote || "");
          setRecordingLocation(recording.basicInfo?.recordingLocation || "");
          setEthnicity(recording.culturalContext?.ethnicity || "");
          setRegion(recording.culturalContext?.region || "");
          setProvince(recording.culturalContext?.province || "");
          setEventType(recording.culturalContext?.eventType || "");
          setPerformanceType(recording.culturalContext?.performanceType || "");
          setInstruments(recording.culturalContext?.instruments || []);
          setDescription(recording.additionalNotes?.description || "");
          setFieldNotes(recording.additionalNotes?.fieldNotes || "");
          setTranscription(recording.additionalNotes?.transcription || "");
          setCollector(recording.adminInfo?.collector || "");
          setCopyright(recording.adminInfo?.copyright || "");
          setArchiveOrg(recording.adminInfo?.archiveOrg || "");
          setCatalogId(recording.adminInfo?.catalogId || "");

          const effectiveMediaType = (recording.mediaType || "audio") as "audio" | "video";
          const src =
            (recording.youtubeUrl && typeof recording.youtubeUrl === "string" && recording.youtubeUrl.trim())
              ? recording.youtubeUrl.trim()
              : (effectiveMediaType === "video" ? (recording.videoData ?? null) : (recording.audioData ?? null));

          setExistingMediaSrc(typeof src === "string" && src.trim().length > 0 ? src : null);
          setExistingMediaInfo({
            name: recording.file?.name || (effectiveMediaType === "video" ? "Video đã tải lên" : "Âm thanh đã tải lên"),
            size: Number(recording.file?.size || 0),
            type: recording.file?.type || "",
            duration: Number(recording.file?.duration || 0),
            bitrate: recording.file?.bitrate,
            sampleRate: recording.file?.sampleRate,
          });

          setIsEditMode(true);
        } catch (err) {
          console.error("Error loading recording by id:", err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (isEditModeParam && !recordingId) {
      let cancelled = false;
      (async () => {
        try {
          const editingData = sessionGetItem("editingRecording");
          if (!editingData) return;

          const recording = JSON.parse(editingData);
          if (cancelled) return;

          setEditingRecordingId(recording.id);
          setMediaType(recording.mediaType || "audio");
          setTitle(recording.basicInfo?.title || "");
          setArtist(recording.basicInfo?.artist || "");
          setComposer(recording.basicInfo?.composer || "");
          setLanguage(recording.basicInfo?.language || "");
          setGenre(recording.basicInfo?.genre || "");
          setRecordingDate(recording.basicInfo?.recordingDate || "");
          setDateEstimated(recording.basicInfo?.dateEstimated || false);
          setDateNote(recording.basicInfo?.dateNote || "");
          setRecordingLocation(recording.basicInfo?.recordingLocation || "");
          setEthnicity(recording.culturalContext?.ethnicity || "");
          setRegion(recording.culturalContext?.region || "");
          setProvince(recording.culturalContext?.province || "");
          setEventType(recording.culturalContext?.eventType || "");
          setPerformanceType(recording.culturalContext?.performanceType || "");
          setInstruments(recording.culturalContext?.instruments || []);
          setDescription(recording.additionalNotes?.description || "");
          setFieldNotes(recording.additionalNotes?.fieldNotes || "");
          setTranscription(recording.additionalNotes?.transcription || "");
          setCollector(recording.adminInfo?.collector || "");
          setCopyright(recording.adminInfo?.copyright || "");
          setArchiveOrg(recording.adminInfo?.archiveOrg || "");
          setCatalogId(recording.adminInfo?.catalogId || "");

          const existing = await getLocalRecordingFull(recording.id) as LocalRecordingStorage | null;
          if (cancelled) return;
          const existingLoaded = existing as LoadedRecording | null;
          const recordingLoaded = recording as LoadedRecording;

          const effectiveMediaType = (existing?.mediaType || recording.mediaType || "audio") as "audio" | "video";
          const src =
            (existing?.youtubeUrl && typeof existing.youtubeUrl === "string" && existing.youtubeUrl.trim())
              ? existing.youtubeUrl.trim()
              : (effectiveMediaType === "video" ? (existing?.videoData ?? null) : (existing?.audioData ?? null));

          setExistingMediaSrc(typeof src === "string" && src.trim().length > 0 ? src : null);
          setExistingMediaInfo({
            name: existingLoaded?.file?.name || recordingLoaded?.file?.name || (effectiveMediaType === "video" ? "Video đã tải lên" : "Âm thanh đã tải lên"),
            size: Number(existingLoaded?.file?.size || recordingLoaded?.file?.size || 0),
            type: existingLoaded?.file?.type || recordingLoaded?.file?.type || "",
            duration: Number(existingLoaded?.file?.duration || recordingLoaded?.file?.duration || 0),
            bitrate: existingLoaded?.file?.bitrate || recordingLoaded?.file?.bitrate,
            sampleRate: existingLoaded?.file?.sampleRate || recordingLoaded?.file?.sampleRate,
          });

          setIsEditMode(true);
        } catch (err) {
          console.error("Error loading editing recording:", err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [isEditModeParam, recordingId]);

  // Disable body scroll when dialogs are open
  useEffect(() => {
    if (showConfirmDialog || submitStatus === "success") {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      // Cleanup
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showConfirmDialog, submitStatus]);

  // Handle ESC key to close dialogs
  useEffect(() => {
    if (!showConfirmDialog && submitStatus !== "success") return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        }
        if (submitStatus === "success") {
          setSubmitStatus("idle");
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showConfirmDialog, submitStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      setSubmitStatus("error");
      setSubmitMessage("Vui lòng điền đầy đủ thông tin bắt buộc");
      setTimeout(() => {
        setSubmitStatus("idle");
        setSubmitMessage("");
      }, 5000);
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    const formData = {
      id: isEditMode && editingRecordingId ? editingRecordingId : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      mediaType,
      file: {
        name: audioInfo?.name || file?.name,
        type: audioInfo?.type || file?.type,
        size: audioInfo?.size || file?.size,
        duration: audioInfo?.duration || 0,
        bitrate: audioInfo?.bitrate,
      },
      youtubeUrl: null,
      basicInfo: {
        title,
        artist: artistUnknown ? "Không rõ nghệ sĩ" : artist,
        composer: composerUnknown ? "Dân gian/Không rõ tác giả" : composer,
        language: language === "Khác" ? customLanguage : language,
        genre: genre === "Khác" ? customGenre : genre,
        recordingDate,
        dateEstimated,
        dateNote,
        recordingLocation,
      },
      culturalContext: {
        ethnicity: ethnicity === "Khác" ? customEthnicity : ethnicity,
        region,
        province,
        eventType: eventType === "Khác" ? customEventType : eventType,
        performanceType,
        instruments,
      },
      tags: (() => {
        const genreVal = genre === "Khác" ? customGenre : genre;
        const ethnicityVal = ethnicity === "Khác" ? customEthnicity : ethnicity;
        const eventVal = eventType === "Khác" ? customEventType : eventType;
        const perfLabel = PERFORMANCE_TYPES.find((p) => p.key === performanceType)?.label ?? "";
        return [genreVal, ethnicityVal, region, province, eventVal, perfLabel, ...instruments].filter(Boolean);
      })(),
      additionalNotes: {
        description,
        fieldNotes,
        transcription,
        hasLyricsFile: !!lyricsFile,
      },
      adminInfo: {
        collector,
        copyright,
        archiveOrg,
        catalogId,
      },
      uploadedDate: new Date().toISOString(),
    };

    // Xử lý file upload (audio hoặc video)
    if (!file) {
      // Edit mode: allow contributor to keep existing media and update metadata only
      if (isEditMode && editingRecordingId && existingMediaSrc) {
        (async () => {
          try {
            const existing = await getLocalRecordingFull(editingRecordingId) as LocalRecordingStorage | null;
            const preservedUploadDate = existing?.uploadedDate ?? existing?.uploadedAt ?? new Date().toISOString();
            // Luôn giữ uploader gốc (contributor) khi chỉnh sửa — dù contributor tự sửa hay expert sửa — để ContributionsPage vẫn hiển thị bản thu đó
            const uploaderToSave =
              existing?.uploader != null && typeof existing.uploader === "object"
                ? { id: String((existing.uploader as { id?: string }).id ?? ""), username: String((existing.uploader as { username?: string }).username ?? "Khách") }
                : { id: currentUser?.id || "anonymous", username: currentUser?.username || "Khách" };
            const toSave: LocalRecordingForSave = {
              ...(existing ?? ({} as LocalRecordingStorage)),
              ...(formData as unknown as LocalRecordingStorage),
              id: editingRecordingId,
              // Preserve media content when contributor doesn't re-upload
              audioData: existing?.audioData ?? null,
              videoData: existing?.videoData ?? null,
              youtubeUrl: existing?.youtubeUrl ?? null,
              mediaType: (existing?.mediaType ?? mediaType) as "audio" | "video",
              file: (existing as LocalRecordingForSave)?.file ?? (formData as LocalRecordingForSave).file,
              uploadedDate: preservedUploadDate,
              uploadedAt: preservedUploadDate,
              moderation:
                isApprovedEdit && currentUser?.role !== "CONTRIBUTOR" && existing?.moderation
                  ? existing.moderation
                  : {
                    status: ModerationStatus.PENDING_REVIEW,
                    claimedBy: null,
                    claimedByName: null,
                    reviewedAt: null,
                    reviewerId: null,
                    rejectionNote: undefined,
                  },
              uploader: uploaderToSave,
              ...(isApprovedEdit && currentUser?.role === "CONTRIBUTOR" ? { resubmittedForModeration: true } : {}),
            };

            await setLocalRecording(toSave);
            if (!isApprovedEdit) void sessionRemoveItem("editingRecording");
            if (isApprovedEdit && editingRecordingId) {
              if (currentUser?.role === "CONTRIBUTOR") {
                await recordingRequestService.revokeApprovedEdit(editingRecordingId);
              } else {
                await recordingRequestService.addNotification({
                  type: "recording_edited",
                  title: "Bản thu đã được chỉnh sửa",
                  body: `Bản thu "${title || "Không có tiêu đề"}" đã được chỉnh sửa.`,
                  forRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.EXPERT],
                  recordingId: editingRecordingId,
                });
                await recordingRequestService.revokeApprovedEdit(editingRecordingId);
              }
            }

            setSubmitStatus("success");
            setSubmitMessage(
              isApprovedEdit
                ? (currentUser?.role === "CONTRIBUTOR"
                    ? "Bản thu đã được gửi thành công đến các Chuyên gia! Bạn vui lòng theo dõi quá trình kiểm duyệt qua trang hồ sơ."
                    : "Chi tiết bản thu đã được cập nhật thành công. Bản thu vẫn ở trạng thái đã duyệt.")
                : "Bản đóng góp của bạn đã được gửi thành công đến các Chuyên gia! Bạn vui lòng theo dõi quá trình kiểm duyệt qua trang hồ sơ. Cảm ơn bạn đã đóng góp!"
            );
            setIsSubmitting(false);
          } catch (error) {
            console.error("Lỗi khi lưu dữ liệu (edit mode, metadata only):", error);
            setIsSubmitting(false);
            setSubmitStatus("error");
            setSubmitMessage(error instanceof Error ? `Lỗi: ${error.message}. Vui lòng thử lại.` : "Lỗi không xác định khi lưu dữ liệu. Vui lòng thử lại.");
          }
        })();
        return;
      }

      setIsSubmitting(false);
      setSubmitStatus("error");
      setSubmitMessage("Vui lòng chọn file.");
      return;
    }

    // Validate type/extension only. No file size limit (unlimited video/audio).
    const mime = file.type || inferMimeFromName(file.name);
    const isAudio = SUPPORTED_AUDIO_FORMATS.includes(mime);
    const isVideo = SUPPORTED_VIDEO_FORMATS.includes(mime);

    // Kiểm tra extension file như fallback nếu MIME type không rõ
    const fileName = file.name.toLowerCase();
    const hasVideoExtension = /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i.test(fileName);
    const hasAudioExtension = /\.(mp3|wav|flac|ogg)$/i.test(fileName);

    // Nếu mediaType là video và file có extension video, cho phép upload (ngay cả khi MIME không rõ)
    if (mediaType === "video" && (isVideo || hasVideoExtension)) {
      // Cho phép upload
    } else if (mediaType === "audio" && (isAudio || hasAudioExtension)) {
      // Cho phép upload
    } else if (!isAudio && !isVideo && !hasVideoExtension && !hasAudioExtension) {
      setIsSubmitting(false);
      setSubmitStatus("error");
      setSubmitMessage(
        mediaType === "video"
          ? "File video không được hỗ trợ. Vui lòng chọn file MP4, MOV, AVI, WebM hoặc MKV."
          : "File âm thanh không được hỗ trợ. Vui lòng chọn file MP3, WAV hoặc FLAC."
      );
      return;
    }

    const reader = new FileReader();

    // Set timeout để tránh treo quá lâu (tăng lên 10 phút cho file lớn)
    const timeoutId = setTimeout(() => {
      if (reader.readyState === FileReader.LOADING) {
        console.warn("FileReader timeout, aborting...");
        reader.abort();
        setIsSubmitting(false);
        setSubmitStatus("error");
        setSubmitMessage("Quá trình đọc file mất quá nhiều thời gian. Vui lòng đợi thêm hoặc thử lại.");
      }
    }, 600000); // 10 phút timeout cho file video lớn

    reader.onload = function () {
      clearTimeout(timeoutId);

      try {
        // Nếu onload được gọi, FileReader đã đọc file thành công
        // reader.result sẽ LUÔN có giá trị (string data URL) khi onload được gọi
        // Theo spec của FileReader API, khi onload được trigger, result sẽ không bao giờ null
        const result = reader.result;

        // Chuyển đổi sang string (luôn là string với readAsDataURL)
        // Nếu result vẫn null/undefined (rất hiếm), sử dụng empty string và để processFileData xử lý
        const dataUrl = result ? String(result) : "";

        // Xử lý file ngay lập tức - không kiểm tra nữa
        // Nếu onload được gọi, file đã được đọc thành công
        processFileData(dataUrl);
      } catch (error) {
        console.error("Error in reader.onload:", error, {
          fileName: file.name,
          fileSize: file.size
        });
        setIsSubmitting(false);
        setSubmitStatus("error");
        setSubmitMessage(`Lỗi khi xử lý file: ${error instanceof Error ? error.message : 'Không xác định'}. Vui lòng thử lại.`);
      }
    };

    // Hàm xử lý dữ liệu file đã đọc
    const processFileData = async (dataUrl: string) => {
      // Nếu dataUrl rỗng (không nên xảy ra), vẫn tiếp tục nhưng log warning
      if (!dataUrl || dataUrl.trim().length === 0) {
        console.warn("Warning: Empty dataUrl, but continuing anyway. This should not happen.");
        // Không return, tiếp tục xử lý để tránh reject file hợp lệ
      }

      // Xác định nơi lưu dữ liệu dựa trên mediaType
      const isVideoFile = mediaType === "video";
      const uploadTimestamp = new Date().toISOString();
      const defaultModeration = {
        status: ModerationStatus.PENDING_REVIEW,
        claimedBy: null,
        claimedByName: null,
        reviewedAt: null,
        reviewerId: null,
        rejectionNote: undefined as string | undefined,
      };
      const recordingData: Record<string, unknown> = {
        ...formData,
        id: isEditMode && editingRecordingId ? editingRecordingId : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        moderation: defaultModeration,
        uploader: {
          id: currentUser?.id || "anonymous",
          username: currentUser?.username || "Khách",
        },
        uploadedDate: isEditMode && editingRecordingId ? (formData.uploadedDate || uploadTimestamp) : uploadTimestamp,
        uploadedAt: isEditMode && editingRecordingId ? (formData.uploadedDate || uploadTimestamp) : uploadTimestamp,
      };

      // Lưu vào videoData cho video, audioData cho audio
      if (isVideoFile) {
        recordingData.videoData = dataUrl;
        recordingData.audioData = null; // Không lưu video vào audioData
      } else {
        recordingData.audioData = dataUrl;
        recordingData.videoData = null; // Không lưu audio vào videoData
      }

      const newRecording = recordingData as LocalRecordingStorage;

      try {
        // Per-recording storage: only save this recording (no full-list read → no OOM)
        if (isEditMode && editingRecordingId) {
          const existing = await getLocalRecordingFull(editingRecordingId) as LocalRecordingStorage | null;
          const preservedUploadDate = existing?.uploadedDate ?? existing?.uploadedAt ?? new Date().toISOString();
          // Luôn giữ uploader gốc (contributor) khi chỉnh sửa — dù contributor tự sửa hay expert sửa — để ContributionsPage vẫn hiển thị bản thu đó
          const uploaderToSave =
            existing?.uploader != null && typeof existing.uploader === "object"
              ? { id: String((existing.uploader as { id?: string }).id ?? ""), username: String((existing.uploader as { username?: string }).username ?? "Khách") }
              : { id: newRecording.uploader?.id ?? currentUser?.id ?? "anonymous", username: newRecording.uploader?.username ?? currentUser?.username ?? "Khách" };
          const toSave: LocalRecordingStorage = {
            ...newRecording,
            id: editingRecordingId,
            audioData: isVideoFile ? (existing?.audioData ?? null) : ((newRecording.audioData as string) ?? existing?.audioData ?? null),
            videoData: isVideoFile ? ((newRecording.videoData as string) ?? existing?.videoData ?? null) : (existing?.videoData ?? null),
            youtubeUrl: existing?.youtubeUrl ?? null,
            mediaType: (mediaType as "audio" | "video") ?? existing?.mediaType ?? "audio",
            uploadedDate: preservedUploadDate,
            uploadedAt: preservedUploadDate,
            moderation:
              isApprovedEdit && currentUser?.role !== "CONTRIBUTOR" && existing?.moderation
                ? existing.moderation
                : newRecording.moderation,
            uploader: uploaderToSave,
            ...(isApprovedEdit && currentUser?.role === "CONTRIBUTOR" ? { resubmittedForModeration: true } : {}),
          };
          await setLocalRecording(toSave);
          if (!isApprovedEdit) void sessionRemoveItem("editingRecording");
          if (isApprovedEdit && editingRecordingId) {
            if (currentUser?.role === "CONTRIBUTOR") {
              await recordingRequestService.revokeApprovedEdit(editingRecordingId);
            } else {
              await recordingRequestService.addNotification({
                type: "recording_edited",
                title: "Bản thu đã được chỉnh sửa",
                body: `Bản thu "${title || "Không có tiêu đề"}" đã được chỉnh sửa.`,
                forRoles: [UserRole.ADMIN, UserRole.CONTRIBUTOR, UserRole.EXPERT],
                recordingId: editingRecordingId,
              });
              await recordingRequestService.revokeApprovedEdit(editingRecordingId);
            }
          }
        } else {
          await setLocalRecording(newRecording);
        }

        setSubmitStatus("success");
        setSubmitMessage(
          isApprovedEdit
            ? (currentUser?.role === "CONTRIBUTOR"
                ? "Bản thu đã được gửi thành công đến các Chuyên gia! Bạn vui lòng theo dõi quá trình kiểm duyệt qua trang hồ sơ. Quy trình giống như đóng góp mới."
                : "Chi tiết bản thu đã được cập nhật thành công. Bản thu vẫn ở trạng thái đã duyệt.")
            : "Bản đóng góp của bạn đã được gửi thành công đến các Chuyên gia! Bạn vui lòng theo dõi quá trình kiểm duyệt qua trang hồ sơ. Cảm ơn bạn đã đóng góp!"
        );

        // success popup removed; use submitStatus/submitMessage for confirmations
        setIsSubmitting(false);
      } catch (error) {
        console.error("Lỗi khi lưu dữ liệu:", error);
        setIsSubmitting(false);
        setSubmitStatus("error");

        // Cung cấp thông báo lỗi chi tiết hơn
        if (error instanceof Error) {
          if (
            error.name === "QuotaExceededError" ||
            error.message.includes("quota")
          ) {
            setSubmitMessage(
              "Dung lượng lưu trữ trình duyệt đã đầy. Vui lòng xóa một số bản ghi cũ trong trình duyệt hoặc sử dụng trình duyệt khác.",
            );
          } else {
            setSubmitMessage(
              `Lỗi: ${error.message}. Vui lòng thử lại.`,
            );
          }
        } else {
          setSubmitMessage(
            "Lỗi không xác định khi lưu dữ liệu. Vui lòng thử lại.",
          );
        }
      }
    };

    reader.onerror = (error) => {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
      setSubmitStatus("error");

      // Thông báo lỗi chi tiết hơn
      const errorMessage = reader.error?.message || reader.error?.name || "Không xác định";
      const errorName = reader.error?.name || "UnknownError";
      console.error("FileReader error:", {
        error,
        readerError: reader.error,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        mediaType
      });

      if (errorName === "NotReadableError" || errorMessage.includes("NotReadableError") || errorMessage.includes("not readable")) {
        setSubmitMessage("File không thể đọc được. Vui lòng đảm bảo file không bị hỏng và thử lại. Nếu vẫn lỗi, hãy thử file khác hoặc kiểm tra định dạng file.");
      } else if (errorName === "AbortError" || errorMessage.includes("AbortError")) {
        setSubmitMessage("Quá trình đọc file bị hủy do timeout. Vui lòng thử lại hoặc chờ thêm thời gian.");
      } else if (errorName === "SecurityError" || errorMessage.includes("SecurityError")) {
        setSubmitMessage("Lỗi bảo mật khi đọc file. Vui lòng thử lại hoặc sử dụng file khác.");
      } else {
        setSubmitMessage(`Lỗi khi đọc file: ${errorMessage}. Vui lòng kiểm tra file và thử lại. Nếu vẫn lỗi, hãy đảm bảo file video hợp lệ và không bị hỏng.`);
      }
    };

    reader.onabort = () => {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
      setSubmitStatus("error");
      setSubmitMessage("Quá trình đọc file bị hủy. Vui lòng thử lại.");
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
      setSubmitStatus("error");
      const errorMsg = error instanceof Error ? error.message : "Không xác định";
      setSubmitMessage(`Không thể bắt đầu đọc file: ${errorMsg}. Vui lòng kiểm tra file và thử lại.`);
      console.error("Error starting FileReader:", error, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
    }
  };

  const resetForm = () => {
    if (showWizard) setUploadWizardStep(1);
    setMediaType("audio");
    setFile(null);
    setAudioInfo(null);
    setTitle("");
    setArtist("");
    setArtistUnknown(false);
    setComposer("");
    setComposerUnknown(false);
    setLanguage("");
    setNoLanguage(false);
    setCustomLanguage("");
    setGenre("");
    setCustomGenre("");
    setRecordingDate("");
    setDateEstimated(false);
    setDateNote("");
    setRecordingLocation("");
    setEthnicity("");
    setCustomEthnicity("");
    setRegion("");
    setProvince("");
    setEventType("");
    setCustomEventType("");
    setPerformanceType("");
    setInstruments([]);
    setDescription("");
    setFieldNotes("");
    setTranscription("");
    setLyricsFile(null);
    setCollector("");
    setCopyright("");
    setArchiveOrg("");
    setCatalogId("");
    setErrors({});
    setSubmitStatus("idle");
    setSubmitMessage("");
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Pure check for whether all required fields are filled (does not mutate state). Same required fields as validateForm.
  const isFormComplete = useMemo(() => {
    if (isFormDisabled) return false;

    // Media presence: file or (edit mode with existing media)
    if (!file && !(isEditMode && !!existingMediaSrc)) return false;

    // Basic required fields
    if (!title.trim()) return false;
    if (!artistUnknown && !artist.trim()) return false;
    if (!composerUnknown && !composer.trim()) return false;
    if (!genre) return false;
    if (!performanceType) return false;

    // Instruments when required
    if (requiresInstruments && instruments.length === 0) return false;

    return true;
  }, [
    file,
    isEditMode,
    existingMediaSrc,
    title,
    artist,
    artistUnknown,
    composer,
    composerUnknown,
    genre,
    performanceType,
    requiresInstruments,
    instruments,
    isFormDisabled,
  ]);

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {/* Required Fields Note */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 font-medium">
          <span className="text-red-500">*</span>
          <span>Trường bắt buộc</span>
        </div>

        {/* Submission wizard stepper (chỉ khi đóng góp mới, không chỉnh sửa) */}
        {showWizard && (
          <div className="border border-primary-200/80 rounded-2xl p-4 sm:p-6 bg-white shadow-md" style={{ backgroundColor: "#FFFCF5" }}>
            <p className="text-sm font-semibold text-primary-800 mb-3">Luồng đóng góp</p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {[
                { step: 1, label: "Tải lên", icon: Upload },
                { step: 2, label: "Metadata", icon: Info },
                { step: 3, label: "GPS & Gợi ý AI", icon: MapPin },
                { step: 4, label: "Xem lại & Gửi", icon: Check },
              ].map(({ step, label, icon: Icon }) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setUploadWizardStep(step)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                    uploadWizardStep === step
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white border-neutral-200/80 text-neutral-700 hover:border-primary-300"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                  <span>Bước {step}:</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Removed duplicate yellow notice for non-Contributor users */}

        {submitStatus === "error" && (
          <div className="flex items-center gap-3 p-4 bg-red-50/90 border border-red-300/80 rounded-2xl shadow-sm backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" strokeWidth={2.5} />
            <p className="text-red-800 font-medium">{submitMessage}</p>
          </div>
        )}

        {(uploadWizardStep === 1 || !showWizard) && (
        <div
          className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: "#FFFCF5" }}
          aria-disabled={isFormDisabled}
        >
          <SectionHeader
            icon={Upload}
            title={mediaType === "video" ? "Tải lên file video" : "Tải lên file âm thanh"}
            subtitle={mediaType === "video" ? "Hỗ trợ định dạng MP4, MOV, AVI, WebM, MKV, MPEG, WMV, 3GP, FLV" : "Hỗ trợ định dạng MP3, WAV, FLAC"}
            required
          />

          {/* Media Type Selection */}
          <div className="mt-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {/* File âm thanh — disabled when video already uploaded (mutually exclusive) */}
              <button
                type="button"
                disabled={isFormDisabled || (file != null && mediaType === "video")}
                onClick={() => {
                  if (isFormDisabled || (file != null && mediaType === "video")) return;
                  setMediaType("audio");
                  setFile(null);
                  setAudioInfo(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border border-neutral-200/80 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 ${mediaType === "audio"
                  ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white"
                  : "text-neutral-800 bg-neutral-100/90"
                  } ${(isFormDisabled || (file != null && mediaType === "video")) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                style={
                  mediaType !== "audio"
                    ? { backgroundColor: "#FFFCF5" }
                    : undefined
                }
                onMouseEnter={e => {
                  if (isFormDisabled || (file != null && mediaType === "video")) return;
                  if (mediaType !== "audio") {
                    e.currentTarget.style.backgroundColor = "#F5F0E8";
                  }
                }}
                onMouseLeave={e => {
                  if (isFormDisabled) return;
                  if (mediaType !== "audio") {
                    e.currentTarget.style.backgroundColor = "#FFFCF5";
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <FileAudio className="h-4 w-4" strokeWidth={2.5} />
                  <span>File âm thanh</span>
                </div>
              </button>
              {/* File video — disabled when audio already uploaded (mutually exclusive) */}
              <button
                type="button"
                disabled={isFormDisabled || (file != null && mediaType === "audio")}
                onClick={() => {
                  if (isFormDisabled || (file != null && mediaType === "audio")) return;
                  setMediaType("video");
                  setFile(null);
                  setAudioInfo(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border border-neutral-200/80 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 ${mediaType === "video"
                  ? "bg-gradient-to-br from-primary-600 to-primary-700 text-white"
                  : "text-neutral-800 bg-neutral-100/90"
                  } ${(isFormDisabled || (file != null && mediaType === "audio")) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                style={
                  mediaType !== "video"
                    ? { backgroundColor: "#FFFCF5" }
                    : undefined
                }
                onMouseEnter={e => {
                  if (isFormDisabled || (file != null && mediaType === "audio")) return;
                  if (mediaType !== "video") {
                    e.currentTarget.style.backgroundColor = "#F5F0E8";
                  }
                }}
                onMouseLeave={e => {
                  if (isFormDisabled) return;
                  if (mediaType !== "video") {
                    e.currentTarget.style.backgroundColor = "#FFFCF5";
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" strokeWidth={2.5} />
                  <span>File video</span>
                </div>
              </button>
            </div>
          </div>

          {/* File Upload */}
          {
            <div className="mt-4">
              <div
                onClick={() => { if (isFormDisabled || isAnalyzing) return; fileInputRef.current?.click(); }}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${errors.file
                  ? "border-red-500/50 bg-red-500/5"
                  : file
                    ? "border-primary-500/50 bg-primary-600/5"
                    : "border-neutral-200 hover:border-primary-400"
                  } ${isAnalyzing ? "opacity-60 cursor-wait" : (isFormDisabled ? "cursor-not-allowed" : "cursor-pointer")}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === "video" ? ".mp4,.mov,.avi,.webm,.mkv,.mpeg,.mpg,.wmv,.3gp,.flv,video/*" : ".mp3,.wav,.flac,audio/*"}
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isAnalyzing || isFormDisabled}
                />

                {isAnalyzing ? (
                  <div className="space-y-3">
                    <div className="animate-spin h-10 w-10 border-3 border-primary-600 border-t-transparent rounded-full mx-auto" />
                    <p className="text-neutral-800/70">Đang phân tích file...</p>
                  </div>
                ) : file && audioInfo ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-primary-600/20 rounded-2xl w-fit mx-auto">
                      {mediaType === "video" ? (
                        <Video className="h-8 w-8 text-primary-600" />
                      ) : (
                        <FileAudio className="h-8 w-8 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-neutral-800 font-medium">
                        {audioInfo.name}
                      </p>
                      <div className="flex items-center justify-center gap-4 mt-2 text-sm text-neutral-800/60">
                        <span>{formatFileSize(audioInfo.size)}</span>
                        <span>•</span>
                        <span>{formatDuration(audioInfo.duration)}</span>
                        {audioInfo.bitrate && (
                          <>
                            <span>•</span>
                            <span>~{audioInfo.bitrate} kbps</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setAudioInfo(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-sm text-neutral-800/60 hover:text-red-400 transition-colors"
                    >
                      Chọn file khác
                    </button>
                  </div>
                ) : isEditMode && existingMediaSrc && existingMediaInfo ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-primary-600/20 rounded-2xl w-fit mx-auto">
                      {mediaType === "video" ? (
                        <Video className="h-8 w-8 text-primary-600" />
                      ) : (
                        <FileAudio className="h-8 w-8 text-primary-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-neutral-800 font-medium">
                        {existingMediaInfo.name}
                      </p>
                      <div className="flex items-center justify-center gap-4 mt-2 text-sm text-neutral-800/60">
                        <span>{formatFileSize(existingMediaInfo.size)}</span>
                        <span>•</span>
                        <span>{formatDuration(existingMediaInfo.duration)}</span>
                        {existingMediaInfo.bitrate && (
                          <>
                            <span>•</span>
                            <span>~{existingMediaInfo.bitrate} kbps</span>
                          </>
                        )}
                      </div>

                      {/* Existing media preview (edit mode) */}
                      <div className="mt-3">
                        {mediaType === "video" ? (
                          existingMediaSrc.startsWith("http") ? (
                            <p className="text-sm text-neutral-800/70 break-all">
                              Đang dùng video YouTube/URL: {existingMediaSrc}
                            </p>
                          ) : (
                            <video
                              controls
                              className="w-full max-w-md mx-auto rounded-xl border border-neutral-200/80"
                              src={existingMediaSrc}
                            />
                          )
                        ) : (
                          existingMediaSrc.startsWith("http") ? (
                            <p className="text-sm text-neutral-800/70 break-all">
                              Đang dùng audio URL: {existingMediaSrc}
                            </p>
                          ) : (
                            <audio
                              controls
                              className="w-full max-w-md mx-auto"
                              src={existingMediaSrc}
                            />
                          )
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFormDisabled || isAnalyzing) return;
                        fileInputRef.current?.click();
                      }}
                      className="text-sm text-neutral-800/60 hover:text-primary-600 transition-colors"
                    >
                      Chọn file khác để thay thế
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-primary-600/20 rounded-2xl w-fit mx-auto">
                      <Upload className="h-8 w-8 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-neutral-800">
                        Kéo thả file hoặc click để chọn
                      </p>
                      <p className="text-sm text-neutral-800/60 mt-1">
                        {mediaType === "video"
                          ? "MP4, MOV, AVI, WebM, MKV, MPEG, WMV, 3GP, FLV - Không giới hạn dung lượng"
                          : "MP3, WAV, FLAC - Không giới hạn dung lượng"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {errors.file && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.file}
                </p>
              )}
            </div>
          }
        </div>
        )}

        {(uploadWizardStep === 2 || !showWizard) && (
        <>
        <div
          className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <SectionHeader
            icon={Music}
            title="Thông tin mô tả cơ bản"
            subtitle="Thông tin chính về bản nhạc"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Tiêu đề/Tên bản nhạc" required>
              <TextInput
                value={title}
                onChange={setTitle}
                placeholder="Nhập tên bản nhạc"
                required
              />
              {errors.title && (
                <p className="text-sm text-red-400">{errors.title}</p>
              )}
            </FormField>

            <div className="space-y-2">
              <FormField
                label="Nghệ sĩ/Người biểu diễn"
                required={!artistUnknown}
              >
                <TextInput
                  value={artist}
                  onChange={setArtist}
                  placeholder="Tên người hát hoặc chơi nhạc cụ"
                  required={!artistUnknown}
                  disabled={isFormDisabled || artistUnknown}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={artistUnknown}
                  onChange={(e) => {
                    setArtistUnknown(e.target.checked);
                    if (e.target.checked) setArtist("");
                  }}
                  className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none"
                  style={{ backgroundColor: "#FFFCF5" }}
                  disabled={isFormDisabled}
                />
                Không rõ
              </label>
              {errors.artist && (
                <p className="text-sm text-red-400">{errors.artist}</p>
              )}
            </div>

            <div className="space-y-2">
              <FormField label="Nhạc sĩ/Tác giả" required={!composerUnknown}>
                <TextInput
                  value={composer}
                  onChange={setComposer}
                  placeholder="Tên người sáng tác"
                  disabled={isFormDisabled || composerUnknown}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={composerUnknown}
                  onChange={(e) => {
                    setComposerUnknown(e.target.checked);
                    if (e.target.checked) setComposer("");
                  }}
                  className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none"
                  style={{ backgroundColor: "#FFFCF5" }}
                  disabled={isFormDisabled}
                />
                Dân gian/Không rõ tác giả
              </label>
              {errors.composer && (
                <p className="text-sm text-red-400">{errors.composer}</p>
              )}
            </div>

            <div className="space-y-2">
              <FormField label="Ngôn ngữ">
                <SearchableDropdown
                  value={language}
                  onChange={(val) => {
                    setLanguage(val);
                    if (val !== "Khác") setCustomLanguage("");
                  }}
                  options={LANGUAGES}
                  placeholder="Chọn ngôn ngữ"
                  disabled={isFormDisabled || noLanguage}
                />
              </FormField>
              {language === "Khác" && !noLanguage && (
                <TextInput
                  value={customLanguage}
                  onChange={setCustomLanguage}
                  placeholder="Nhập tên ngôn ngữ khác..."
                  disabled={isFormDisabled || noLanguage}
                />
              )}
              <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noLanguage}
                  onChange={(e) => {
                    setNoLanguage(e.target.checked);
                    if (e.target.checked) {
                      setLanguage("");
                      setCustomLanguage("");
                    }
                  }}
                  className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none"
                  style={{ backgroundColor: "#FFFCF5" }}
                  disabled={isFormDisabled}
                />
                Không có ngôn ngữ
              </label>
            </div>

            <div className="space-y-2">
              <FormField label="Thể loại/Loại hình" required>
                <SearchableDropdown
                  value={genre}
                  onChange={(val) => {
                    setGenre(val);
                    if (val !== "Khác") setCustomGenre("");
                  }}
                  options={GENRES}
                  placeholder="Chọn thể loại"
                />
                {errors.genre && (
                  <p className="text-sm text-red-400">{errors.genre}</p>
                )}
              </FormField>
              {genre === "Khác" && (
                <TextInput
                  value={customGenre}
                  onChange={setCustomGenre}
                  placeholder="Nhập tên thể loại khác..."
                />
              )}
            </div>

            <div className="space-y-2">
              <FormField label="Ngày ghi âm">
                <DatePicker
                  value={recordingDate}
                  onChange={setRecordingDate}
                  placeholder="Chọn ngày/tháng/năm"
                  disabled={isFormDisabled || dateEstimated}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dateEstimated}
                  onChange={(e) => {
                    setDateEstimated(e.target.checked);
                    if (e.target.checked) setRecordingDate("");
                  }}
                  className="w-4 h-4 rounded border-neutral-400 text-primary-600 focus:outline-none"
                  style={{ backgroundColor: "#FFFCF5" }}
                  disabled={isFormDisabled}
                />
                Ngày ước tính/không chính xác
              </label>
              {dateEstimated && (
                <TextInput
                  value={dateNote}
                  onChange={setDateNote}
                  placeholder="Ghi chú về ngày tháng (Ví dụ: khoảng năm 1990)"
                  disabled={isFormDisabled || dateEstimated}
                />
              )}
            </div>

            <FormField
              label="Địa điểm ghi âm"
              hint="Ví dụ: Đình làng X, Nhà văn hóa Y"
            >
              <TextInput
                value={recordingLocation}
                onChange={setRecordingLocation}
                placeholder="Nhập địa điểm cụ thể"
                disabled={isFormDisabled}
              />
            </FormField>
          </div>
        </div>

        <CollapsibleSection
          icon={MapPin}
          title="Thông tin bối cảnh văn hóa"
          subtitle="Thông tin về nguồn gốc và bối cảnh biểu diễn"
        >
          {/* Genre-Ethnicity Warning */}
          {genreEthnicityWarning && (
            <div className="mb-4 flex items-start gap-3 p-4 bg-yellow-500/20 border border-yellow-500/40 rounded-2xl">
              <AlertCircle className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
              <p className="text-black text-sm leading-relaxed">
                {genreEthnicityWarning}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <FormField label="Thuộc tính dân tộc">
                <SearchableDropdown
                  value={ethnicity}
                  onChange={(val) => {
                    setEthnicity(val);
                    if (val !== "Khác") setCustomEthnicity("");
                  }}
                  options={ETHNICITIES}
                  placeholder="Chọn dân tộc"
                />
              </FormField>
              {ethnicity === "Khác" && (
                <TextInput
                  value={customEthnicity}
                  onChange={setCustomEthnicity}
                  placeholder="Nhập tên dân tộc khác..."
                />
              )}
            </div>

            <FormField label="Khu vực">
              <SearchableDropdown
                value={region}
                onChange={setRegion}
                options={REGIONS}
                placeholder="Chọn khu vực"
                searchable={false}
              />
            </FormField>

            <FormField label="Tỉnh/Thành phố">
              <SearchableDropdown
                value={province}
                onChange={setProvince}
                options={PROVINCES}
                placeholder="Chọn tỉnh thành"
              />
            </FormField>

            <div className="space-y-2">
              <FormField label="Loại sự kiện">
                <SearchableDropdown
                  value={eventType}
                  onChange={(val) => {
                    setEventType(val);
                    if (val !== "Khác") setCustomEventType("");
                  }}
                  options={EVENT_TYPES}
                  placeholder="Chọn loại sự kiện"
                />
              </FormField>
              {eventType === "Khác" && (
                <TextInput
                  value={customEventType}
                  onChange={setCustomEventType}
                  placeholder="Nhập loại sự kiện khác..."
                />
              )}
            </div>

            <div className="md:col-span-2">
              <FormField label="Loại hình biểu diễn" required>
                <div className="flex flex-wrap gap-2">
                  {PERFORMANCE_TYPES.map((pt) => (
                    <button
                      key={pt.key}
                      type="button"
                      onClick={() => {
                        setPerformanceType(pt.key);
                        if (pt.key === "acappella") {
                          setInstruments([]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm transition-all border border-neutral-200 ${performanceType === pt.key
                        ? "bg-primary-600 text-white"
                        : "text-neutral-700"
                        }`}
                      style={
                        performanceType !== pt.key
                          ? { backgroundColor: "#FFFCF5" }
                          : undefined
                      }
                      onMouseEnter={(e) => {
                        if (performanceType !== pt.key) {
                          e.currentTarget.style.backgroundColor = "#F5F0E8";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (performanceType !== pt.key) {
                          e.currentTarget.style.backgroundColor = "#FFFCF5";
                        }
                      }}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
                {errors.performanceType && (
                  <p className="text-sm text-red-400">{errors.performanceType}</p>
                )}
              </FormField>
            </div>

            {requiresInstruments && (
              <div className="md:col-span-2">
                <FormField
                  label="Nhạc cụ sử dụng"
                  required={requiresInstruments}
                  hint="Chọn một hoặc nhiều nhạc cụ"
                >
                  <MultiSelectTags
                    values={instruments}
                    onChange={setInstruments}
                    options={INSTRUMENTS}
                    placeholder="Tìm và chọn nhạc cụ..."
                    disabled={isFormDisabled}
                  />
                  {errors.instruments && (
                    <p className="text-sm text-red-400">{errors.instruments}</p>
                  )}
                </FormField>

                {/* Instrument image upload for solo (instrumental) */}
                {performanceType === "instrumental" && (
                  <div className="md:col-span-2 mt-4">
                    <FormField label="Tải lên hình ảnh nhạc cụ (nếu có)" hint="Ảnh minh họa cho nhạc cụ sử dụng, chỉ dành cho bài độc tấu">
                      <div className="flex items-center gap-3">
                        <label
                          className={`px-4 py-2 rounded-full text-sm text-neutral-800 border border-neutral-300 transition-colors shadow-sm inline-block ${isFormDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}`}
                          style={{ backgroundColor: "#FFFCF5" }}
                          onMouseEnter={e => { if (!isFormDisabled) e.currentTarget.style.backgroundColor = "#F5F0E8" }}
                          onMouseLeave={e => { if (!isFormDisabled) e.currentTarget.style.backgroundColor = "#FFFCF5" }}
                        >
                          Chọn ảnh
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleInstrumentImageChange}
                            className="sr-only"
                            disabled={isFormDisabled}
                          />
                        </label>
                        {instrumentImage && (
                          <span className="text-neutral-800/60 text-sm">{instrumentImage.name}</span>
                        )}
                        {instrumentImagePreview && (
                          <img src={instrumentImagePreview} alt="Xem trước ảnh nhạc cụ" className="h-16 rounded-lg border border-neutral-300" />
                        )}
                        {instrumentImage && (
                          <button
                            type="button"
                            className="ml-2 text-xs text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (isFormDisabled) return;
                              setInstrumentImage(null);
                              setInstrumentImagePreview("");
                            }}
                            disabled={isFormDisabled}
                          >
                            Xóa ảnh
                          </button>
                        )}
                      </div>
                    </FormField>
                  </div>
                )}
              </div>
            )}

            {allowsLyrics && (
              <div className="md:col-span-2">
                <FormField
                  label="Tải lên lời bài hát (nếu có)"
                  hint="File .txt hoặc .docx"
                >
                  <div className="flex items-center gap-3">
                    <label
                      className={`px-4 py-2 rounded-full text-sm text-neutral-800 border border-neutral-300 transition-colors shadow-sm inline-block ${isFormDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}`}
                      style={{ backgroundColor: "#FFFCF5" }}
                      onMouseEnter={(e) => { if (!isFormDisabled) e.currentTarget.style.backgroundColor = "#F5F0E8" }}
                      onMouseLeave={(e) => { if (!isFormDisabled) e.currentTarget.style.backgroundColor = "#FFFCF5" }}
                    >
                      Chọn file
                      <input
                        type="file"
                        accept=".txt,.doc,.docx"
                        onChange={handleLyricsFileChange}
                        className="sr-only"
                        disabled={isFormDisabled}
                      />
                    </label>
                    <span className="text-neutral-800/60 text-sm">
                      {lyricsFile ? lyricsFile.name : "Chưa chọn file"}
                    </span>
                  </div>
                </FormField>
              </div>
            )}
          </div>
        </CollapsibleSection>
        </>
        )}

        {/* Bước 3: GPS & Gợi ý metadata từ AI */}
        {(uploadWizardStep === 3 || !showWizard) && (
        <div
          className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <SectionHeader
            icon={Navigation}
            title="Gắn GPS"
            subtitle="Lấy tọa độ hiện tại để gắn vào địa điểm ghi âm"
            optional
          />
          <div className="space-y-2 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGetGpsLocation}
                disabled={isFormDisabled || gpsLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium transition-colors cursor-pointer"
              >
                <Navigation className="w-4 h-4" strokeWidth={2.5} />
                {gpsLoading ? "Đang lấy vị trí và địa chỉ..." : "Lấy vị trí hiện tại"}
              </button>
              <span className="text-sm text-neutral-600">Địa điểm sẽ được thêm vào Địa điểm ghi âm ở Bước 2.</span>
            </div>
            {gpsError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {gpsError}
              </p>
            )}
          </div>
          <SectionHeader
            icon={Sparkles}
            title="Gợi ý metadata từ AI"
            subtitle="Dựa trên thể loại đã chọn, AI gợi ý dân tộc phù hợp (bạn có thể chỉnh sửa)"
            optional
          />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAiSuggestMetadata}
                disabled={isFormDisabled || aiSuggestLoading || !genre}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" strokeWidth={2.5} />
                {aiSuggestLoading ? "Đang gợi ý..." : "Lấy gợi ý từ AI"}
              </button>
              {!genre && (
                <span className="text-sm text-neutral-600">Chọn thể loại ở Bước 2 trước khi dùng gợi ý AI.</span>
              )}
            </div>
            {aiSuggestError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {aiSuggestError}
              </p>
            )}
            {aiSuggestSuccess && (
              <p className="text-sm text-green-700 flex items-center gap-1">
                <Check className="w-4 h-4" />
                {aiSuggestSuccess}
              </p>
            )}
          </div>
        </div>
        )}

        {(uploadWizardStep === 4 || !showWizard) && (
        <>
        <CollapsibleSection
          icon={Info}
          title="Ghi chú bổ sung"
          optional
          defaultOpen={false}
        >
          <div className="space-y-4">
            <FormField
              label="Mô tả nội dung"
              hint="Lời bài hát, chủ đề, ý nghĩa văn hóa"
            >
              <TextInput
                value={description}
                onChange={setDescription}
                placeholder="Mô tả chi tiết về bản nhạc..."
                multiline
                rows={4}
              />
            </FormField>

            <FormField
              label="Ghi chú thực địa"
              hint="Quan sát về bối cảnh, phong cách trình diễn"
            >
              <TextInput
                value={fieldNotes}
                onChange={setFieldNotes}
                placeholder="Những quan sát đặc biệt..."
                multiline
                rows={3}
              />
            </FormField>

            <FormField
              label="Phiên âm/Bản dịch"
              hint="Nếu sử dụng ngôn ngữ dân tộc thiểu số"
            >
              <TextInput
                value={transcription}
                onChange={setTranscription}
                placeholder="Phiên âm hoặc bản dịch tiếng Việt..."
                multiline
                rows={3}
              />
            </FormField>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={Shield}
          title="Thông tin quản trị và bản quyền"
          optional
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Người thu thập/Ghi âm">
              <TextInput
                value={collector}
                onChange={setCollector}
                placeholder="Tên người hoặc tổ chức ghi âm"
              />
            </FormField>

            <FormField label="Bản quyền">
              <TextInput
                value={copyright}
                onChange={setCopyright}
                placeholder="Thông tin về quyền sở hữu, giấy phép"
              />
            </FormField>

            <FormField label="Tổ chức lưu trữ">
              <TextInput
                value={archiveOrg}
                onChange={setArchiveOrg}
                placeholder="Nơi bảo quản bản gốc"
              />
            </FormField>

            <FormField label="Mã định danh" hint="ISRC hoặc mã catalog riêng">
              <TextInput
                value={catalogId}
                onChange={setCatalogId}
                placeholder="VD: ISRC-VN-XXX-00-00000"
              />
            </FormField>
          </div>
        </CollapsibleSection>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting || isFormDisabled}
              className="px-6 py-2.5 text-neutral-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md border-2 border-primary-600"
              style={{ backgroundColor: "#FFFCF5" }}
              onMouseEnter={(e) =>
                !isSubmitting && !isFormDisabled &&
                (e.currentTarget.style.backgroundColor = "#F5F0E8")
              }
              onMouseLeave={(e) =>
                !isSubmitting && !isFormDisabled &&
                (e.currentTarget.style.backgroundColor = "#FFFCF5")
              }
            >
              Đặt lại
            </button>
            <button
              type="submit"
              disabled={!isFormComplete || isAnalyzing || isSubmitting || isFormDisabled}
              title={isFormDisabled ? (isApprovedEdit ? "Bạn cần có tài khoản Người đóng góp hoặc Chuyên gia để chỉnh sửa bản thu" : "Bạn cần có tài khoản Người đóng góp để đóng góp bản thu") : (!isFormComplete ? "Vui lòng hoàn thành các trường bắt buộc" : undefined)}
              className="px-8 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" strokeWidth={2.5} />
                  {isApprovedEdit ? "Hoàn tất chỉnh sửa" : "Đóng góp"}
                </>
              )}
            </button>
          </div>
        </div>
        </>
        )}

        {/* Wizard navigation (chỉ khi đóng góp mới) */}
        {showWizard && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200/80">
            <button
              type="button"
              onClick={() => setUploadWizardStep((s) => Math.max(1, s - 1))}
              disabled={uploadWizardStep === 1}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Quay lại
            </button>
            {uploadWizardStep < 4 ? (
              <button
                type="button"
                onClick={() => setUploadWizardStep((s) => Math.min(4, s + 1))}
                className="px-6 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium cursor-pointer"
              >
                Tiếp theo
              </button>
            ) : null}
          </div>
        )}
      </form>

      {/* Upload in progress pop-up — same UI/UX as ConfirmationDialog */}
      <UploadProgressDialog isOpen={isSubmitting} />

      {/* Confirmation Dialog */}
      {showConfirmDialog && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
          onClick={() => setShowConfirmDialog(false)}
          style={{
            animation: 'fadeIn 0.3s ease-out',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            position: 'fixed',
          }}
        >
          <div
            className="rounded-2xl border border-neutral-300/80 shadow-2xl backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform"
            style={{
              backgroundColor: '#FFF2D6',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
              <h2 className="text-2xl font-bold text-white">{isApprovedEdit ? "Xác nhận chỉnh sửa" : "Xác nhận đóng góp"}</h2>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6">
              <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                <div className="flex flex-col items-center gap-4 mb-2">
                  <div className="p-3 bg-primary-100/90 rounded-full flex-shrink-0 shadow-sm">
                    <AlertCircle className="h-8 w-8 text-primary-600" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 text-center">
                    Hãy đảm bảo chính xác thông tin đã nhập, bạn nhé!
                  </h3>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200/80 bg-neutral-50/50">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-6 py-2.5 bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                Xem lại
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
              >
                {isApprovedEdit ? "Hoàn tất chỉnh sửa" : "Gửi"}
              </button>
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Success Pop-up (inline) */}
      {submitStatus === "success" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
          onClick={() => setSubmitStatus("idle")}
          style={{
            animation: 'fadeIn 0.3s ease-out',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            position: 'fixed',
          }}
        >
          <div
            className="rounded-2xl border border-neutral-300/80 shadow-2xl backdrop-blur-sm max-w-3xl w-full overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto transform"
            style={{
              backgroundColor: '#FFF2D6',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200/80 bg-gradient-to-br from-primary-600 to-primary-700">
              <h2 className="text-2xl font-bold text-white">{isApprovedEdit ? "Chỉnh sửa thành công" : "Đóng góp thành công"}</h2>
              <button
                onClick={() => setSubmitStatus("idle")}
                className="p-1.5 rounded-full hover:bg-primary-500/50 transition-colors duration-200 text-white hover:text-white cursor-pointer"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6">
              <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: '#FFFCF5' }}>
                <div className="flex flex-col items-center gap-4 mb-2">
                  <div className="p-3 bg-green-100/90 rounded-full flex-shrink-0 shadow-sm">
                    <Check className="h-8 w-8 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div className="text-xl font-semibold text-neutral-900 text-center space-y-1">
                    {submitMessage ? (
                      submitMessage
                        .split(/(?<=[.!])\s+/)
                        .filter(s => s.trim())
                        .map((sentence, index) => (
                          <p key={index}>{sentence.trim()}</p>
                        ))
                    ) : (
                      <p>{isApprovedEdit ? "Cảm ơn bạn đã cập nhật bản thu!" : "Cảm ơn bạn đã đóng góp bản thu!"}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-4 p-6 border-t border-neutral-200/80 bg-neutral-50/50">
              <button
                onClick={() => {
                  resetForm();
                  setSubmitStatus("idle");
                  setSubmitMessage("");
                  navigate("/");
                }}
                className="px-6 py-2.5 bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-full font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-110 active:scale-95 cursor-pointer"
              >
                Về trang chủ
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setSubmitStatus("idle");
                  setSubmitMessage("");
                  navigate("/contributions");
                }}
                className="px-6 py-2.5 bg-secondary-100/90 hover:bg-secondary-200/90 text-secondary-800 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                Đóng góp của bạn
              </button>
            </div>
          </div>
        </div>
        , document.body
      )}
    </React.Fragment>
  );
}