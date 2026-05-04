import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { USER_ROLE_NAMES } from '@/config/constants';
import {
  DELETE_ACTION,
  getRoleNameVi,
  ROLE_OPTIONS,
} from '@/features/admin/adminDashboardTypes';

function isClickOnScrollbar(event: MouseEvent): boolean {
  const w = window.innerWidth - document.documentElement.clientWidth;
  return w > 0 && event.clientX >= document.documentElement.clientWidth;
}

export function RoleSelectDropdown({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const outDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const outMenu = menuRef.current && !menuRef.current.contains(target);
      if (outDropdown && (menuRef.current ? outMenu : true)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen]);

  const label =
    ROLE_OPTIONS.find((o) => o.value === value)?.label ??
    getRoleNameVi((USER_ROLE_NAMES as Record<string, string>)[value] ?? value);

  return (
    <div ref={dropdownRef} className="relative min-w-[140px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-11 px-6 py-0 pr-10 text-neutral-900 border border-neutral-400/80 rounded-full focus:outline-none focus:border-primary-500 transition-all duration-300 text-left inline-flex items-center justify-between gap-2 shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 whitespace-nowrap ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'cursor-pointer'} bg-surface-panel`}
      >
        <span
          className={`min-w-0 truncate whitespace-nowrap ${value ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}
        >
          {label}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300 bg-surface-panel"
            style={{
              position: 'absolute',
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: Math.max(menuRect.width, 180),
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
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${
                    value === opt.value
                      ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium'
                      : 'text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onChange(DELETE_ACTION);
                  setIsOpen(false);
                }}
                className="w-full px-5 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 cursor-pointer"
              >
                Xóa khỏi hệ thống
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ExpertSelectDropdown({
  options,
  value,
  onChange,
  placeholder = ' -- Chọn Chuyên gia -- ',
  disabled,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const outDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const outMenu = menuRef.current && !menuRef.current.contains(target);
      if (outDropdown && (menuRef.current ? outMenu : true)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen]);

  const selectedLabel = value
    ? (options.find((o) => o.id === value)?.label ?? placeholder)
    : placeholder;

  return (
    <div ref={dropdownRef} className="relative min-w-[180px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400/80 rounded-full focus:outline-none focus:border-primary-500 transition-all duration-200 text-left flex items-center justify-between shadow-sm hover:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} bg-surface-panel`}
      >
        <span className={value ? 'text-neutral-900 font-medium' : 'text-neutral-400'}>
          {selectedLabel}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen &&
        menuRect &&
        createPortal(
          <div
            ref={(el) => (menuRef.current = el)}
            className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300 bg-surface-panel"
            style={{
              position: 'absolute',
              left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
              top: menuRect.bottom + (window.scrollY ?? 0) + 8,
              width: Math.max(menuRect.width, 200),
              zIndex: 40,
            }}
          >
            <div
              className="max-h-60 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#9B2C2C rgba(255, 255, 255, 0.3)' }}
            >
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${!value ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium' : 'text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700'}`}
              >
                {placeholder}
              </button>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-5 py-3 text-left text-sm transition-all duration-200 cursor-pointer ${value === opt.id ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium' : 'text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
