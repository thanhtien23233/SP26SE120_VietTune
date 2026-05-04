import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { isClickOnScrollbar } from '@/features/upload/uploadConstants';

export function MultiSelectTags({
  values,
  onChange,
  options,
  placeholder = 'Chọn nhạc cụ...',
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
        className={`min-h-[48px] px-5 py-3 border border-neutral-400 rounded-xl focus-within:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
        } bg-surface-panel`}
      >
        <div className="flex flex-wrap gap-1.5">
          {values.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-br from-primary-600 to-primary-700 text-white text-sm rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="ml-1 focus:outline-none hover:text-red-200"
                  aria-label={`Xóa ${tag}`}
                  tabIndex={0}
                  style={{ lineHeight: 0, padding: 0, background: 'none', border: 'none' }}
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
              className="flex-1 min-w-[120px] bg-transparent text-neutral-900 font-medium placeholder-neutral-500 text-sm focus:outline-none"
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
            style={{
              position: 'absolute',
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: menuRect.width,
              zIndex: 40,
            }}
          >
            <div
              className="max-h-60 overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#9B2C2C rgba(255, 255, 255, 0.3)',
              }}
            >
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

export default MultiSelectTags;
