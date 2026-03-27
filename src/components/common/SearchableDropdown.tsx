import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { normalizeSearchText, scoreSearchOption } from "@/utils/searchText";

function isClickOnScrollbar(event: MouseEvent): boolean {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0 && event.clientX >= document.documentElement.clientWidth) {
    return true;
  }
  return false;
}

/** Dropdown UI đồng bộ UploadMusic/SearchBar: button rounded-full, panel searchable, #FFFCF5 */
export default function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = "Tất cả",
  searchable = true,
  disabled = false,
  /** Khi truyền `isOpen` + `onOpenChange`, trạng thái mở/đóng do cha quản lý (nhóm dropdown độc quyền). */
  isOpen: isOpenControlled,
  onOpenChange,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = isOpenControlled !== undefined;
  const menuOpen = controlled ? Boolean(isOpenControlled) : uncontrolledOpen;

  const setMenuOpen = useCallback(
    (next: boolean) => {
      if (controlled) onOpenChange?.(next);
      else setUncontrolledOpen(next);
    },
    [controlled, onOpenChange],
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const sanitizedOptions = Array.from(
    new Set(options.map((x) => x.trim()).filter(Boolean)),
  );
  const normalizedQuery = normalizeSearchText(debouncedSearch);
  const filteredOptions = normalizedQuery
    ? sanitizedOptions
      .map((option) => ({ option, score: scoreSearchOption(option, normalizedQuery) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.option.localeCompare(b.option, "vi");
      })
      .map((x) => x.option)
    : sanitizedOptions;

  const handleSearchInput = useCallback((raw: string) => {
    setSearch(raw);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 150);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!menuOpen && search) {
      setSearch("");
    }
    if (!menuOpen) {
      setDebouncedSearch("");
      setActiveOptionIndex(0);
    }
  }, [menuOpen, search]);

  useEffect(() => {
    setActiveOptionIndex(0);
  }, [debouncedSearch, value, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const node = optionRefs.current[activeOptionIndex];
    node?.scrollIntoView({ block: "nearest" });
  }, [activeOptionIndex, menuOpen, filteredOptions.length]);

  const optionsToRender = value ? [placeholder, ...filteredOptions] : filteredOptions;

  const getLabelWithHighlight = useCallback(
    (label: string) => {
      const keyword = search.trim();
      if (!keyword) return <>{label}</>;
      const idx = label.toLowerCase().indexOf(keyword.toLowerCase());
      if (idx < 0) return <>{label}</>;
      return (
        <>
          {label.slice(0, idx)}
          <mark className="bg-amber-200 text-amber-900 rounded px-0.5">
            {label.slice(idx, idx + keyword.length)}
          </mark>
          {label.slice(idx + keyword.length)}
        </>
      );
    },
    [search],
  );

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const clickedOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideMenu =
        menuRef.current && !menuRef.current.contains(target);
      if (clickedOutsideDropdown && (menuRef.current ? clickedOutsideMenu : true)) {
        setMenuOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, setMenuOpen]);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (menuOpen) updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [menuOpen]);

  const displayLabel = value || placeholder;

  return (
    <div ref={dropdownRef} className="relative w-full min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setMenuOpen(!menuOpen)}
        disabled={disabled}
        className={`group w-full min-h-[2.75rem] px-4 py-2.5 pr-10 text-neutral-900 border border-neutral-300/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-all duration-200 text-left flex items-center gap-2 shadow-sm hover:border-primary-300/80 hover:shadow ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer bg-white"}`}
        style={{ backgroundColor: "#FFFCF5" }}
        title={displayLabel}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
      >
        <span
          className={`min-w-0 flex-1 truncate text-sm leading-snug ${value ? "text-neutral-900 font-medium" : "text-neutral-500 font-normal"}`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>

      {menuOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => {
              menuRef.current = el;
            }}
            className="rounded-xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-200"
            style={{
              backgroundColor: "#FFFCF5",
              position: "absolute",
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: menuRect.width,
              zIndex: 40,
            }}
            role="listbox"
          >
            {searchable && (
              <div className="p-2.5 border-b border-neutral-200/90">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onInput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (!optionsToRender.length) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveOptionIndex((prev) =>
                          Math.min(prev + 1, optionsToRender.length - 1),
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveOptionIndex((prev) => Math.max(prev - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const picked = optionsToRender[activeOptionIndex];
                        if (picked === placeholder) onChange("");
                        else if (picked) onChange(picked);
                        setMenuOpen(false);
                        setSearch("");
                        setDebouncedSearch("");
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setMenuOpen(false);
                        setSearch("");
                        setDebouncedSearch("");
                        buttonRef.current?.focus();
                      }
                    }}
                    placeholder="Tìm kiếm..."
                    className="w-full pl-9 pr-9 py-2 text-neutral-900 placeholder-neutral-500 border border-neutral-300/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm shadow-sm bg-white"
                    autoFocus
                  />
                  {search.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setDebouncedSearch("");
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-neutral-500 px-1">
                  {filteredOptions.length} kết quả
                </p>
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
                <div className="px-4 py-3 text-neutral-400 text-sm text-center">Không tìm thấy kết quả</div>
              ) : (
                <>
                  {optionsToRender.map((option, idx) => (
                    <button
                      key={`${option}-${idx}`}
                      ref={(el) => {
                        optionRefs.current[idx] = el;
                      }}
                      type="button"
                      onClick={() => {
                        if (option === placeholder && value) onChange("");
                        else onChange(option);
                        setMenuOpen(false);
                        setSearch("");
                        setDebouncedSearch("");
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                        idx === activeOptionIndex
                          ? "ring-1 ring-primary-300/70"
                          : ""
                      } ${
                        value === option
                          ? "bg-primary-600 text-white font-medium"
                          : option === placeholder
                            ? "text-neutral-600 hover:bg-primary-50 hover:text-primary-800 border-b border-neutral-200/80"
                            : "text-neutral-900 hover:bg-primary-50 hover:text-primary-800"
                      }`}
                      onMouseEnter={() => setActiveOptionIndex(idx)}
                    >
                      {getLabelWithHighlight(option)}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
