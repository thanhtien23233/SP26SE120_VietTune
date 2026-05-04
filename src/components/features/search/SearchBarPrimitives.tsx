import { ChevronDown, Search, Plus } from 'lucide-react';
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { isClickOnScrollbar } from '@/features/search/searchBarDomUtils';
import { useButtonAnchorRect } from '@/hooks/useButtonAnchorRect';

const DROPDOWN_SCROLL_LIST_STYLE: CSSProperties = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#9B2C2C rgba(255, 255, 255, 0.3)',
};

export function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = '-- Chọn --',
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
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRect = useButtonAnchorRect(isOpen, buttonRef);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const portalMenuStyle = useMemo(
    () =>
      menuRect
        ? {
            position: 'absolute' as const,
            left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
            top: menuRect.bottom + (window.scrollY ?? 0) + 8,
            width: menuRect.width,
            zIndex: 40,
          }
        : undefined,
    [menuRect],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      if (clickedOutsideDropdown && (menuRef.current ? clickedOutsideMenu : true)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !searchable) return;
    searchInputRef.current?.focus();
  }, [isOpen, searchable]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400/80 rounded-xl focus:outline-none focus:border-primary-500 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-md ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } bg-surface-panel`}
      >
        <span className={value ? 'text-neutral-900 font-medium' : 'text-neutral-500'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300 bg-surface-panel"
            style={portalMenuStyle}
          >
            {searchable && (
              <div className="p-3 border-b border-neutral-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm..."
                    className="w-full pl-9 pr-3 py-2 text-neutral-900 placeholder-neutral-500 border border-neutral-400/80 rounded-xl focus:outline-none focus:border-primary-500 text-sm shadow-sm hover:shadow-md transition-all duration-200 bg-surface-panel"
                  />
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto" style={DROPDOWN_SCROLL_LIST_STYLE}>
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
                      setSearch('');
                    }}
                    className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${
                      value === option
                        ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium'
                        : 'text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700'
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

export function MultiSelectTags({
  values,
  onChange,
  options,
  placeholder = 'Chọn...',
  disabled = false,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  // Helper: remove Vietnamese accents for insensitive search
  function removeVietnameseTones(str: string) {
    return str
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
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

  const multiPortalMenuStyle = useMemo(
    () =>
      menuRect
        ? {
            position: 'absolute' as const,
            left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
            top: menuRect.bottom + (window.scrollY ?? 0) + 8,
            width: menuRect.width,
            zIndex: 40,
          }
        : undefined,
    [menuRect],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const clickedOutsideContainer =
        containerRef.current && !containerRef.current.contains(target);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      if (clickedOutsideContainer && (menuRef.current ? clickedOutsideMenu : true)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (inputRef.current) setMenuRect(inputRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen]);

  const addTag = (tag: string) => {
    onChange([...values, tag]);
    setSearch('');
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((t) => t !== tag));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={inputRef}
        onClick={() => !disabled && setIsOpen(true)}
        className={`min-h-[48px] px-4 py-2.5 border border-neutral-400 rounded-xl focus-within:border-primary-500 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
        } bg-surface-panel`}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="ml-1 border-0 bg-transparent p-0 leading-none focus:outline-none hover:text-red-200"
                  aria-label={`Xóa ${tag}`}
                  tabIndex={0}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
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
              placeholder={values.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[120px] bg-transparent text-neutral-900 placeholder-neutral-500 text-sm focus:outline-none py-1"
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && search === '' && values.length > 0) {
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
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300 bg-surface-panel"
            style={multiPortalMenuStyle}
          >
            <div className="max-h-60 overflow-y-auto" style={DROPDOWN_SCROLL_LIST_STYLE}>
              {filteredOptions.length === 0 ? (
                <div className="px-5 py-3 text-neutral-400 text-sm text-center">
                  {search ? 'Không tìm thấy kết quả' : 'Đã chọn tất cả'}
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
          document.body,
        )}
    </div>
  );
}

export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-800">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-800/60">{hint}</p>}
    </div>
  );
}

export function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="border border-neutral-200/80 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl bg-surface-panel"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between transition-all duration-200 cursor-pointer bg-surface-panel hover:bg-[#F5F0E8]"
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
          className={`h-5 w-5 text-neutral-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen && <div className="p-6 pt-2 space-y-4">{children}</div>}
    </div>
  );
}
