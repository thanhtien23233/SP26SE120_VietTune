import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { isClickOnScrollbar } from '@/features/upload/uploadConstants';

export function UploadDatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày/tháng/năm',
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const date = new Date(value);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  const selectedDate = value ? new Date(value) : null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const years = Array.from(
    { length: currentYear - (currentYear - 100) + 1 },
    (_, i) => currentYear - i,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClickOnScrollbar(event)) return;
      const target = event.target as Node;
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      if (clickedOutsideDropdown && (menuRef.current ? clickedOutsideMenu : true)) {
        setIsOpen(false);
        setShowMonthDropdown(false);
        setShowYearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    };
    document.addEventListener('mousedown', handleClickOutsideDropdowns);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdowns);
  }, [showMonthDropdown, showYearDropdown]);

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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
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
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const handleDateClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const isoString = `${year}-${month}-${dayStr}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = viewDate.getMonth() + 1;
    const nextYear = nextMonth > 11 ? viewDate.getFullYear() + 1 : viewDate.getFullYear();
    const actualNextMonth = nextMonth > 11 ? 0 : nextMonth;

    if (nextYear > currentYear || (nextYear === currentYear && actualNextMonth > currentMonth)) {
      return;
    }
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const canGoNext = !(
    viewDate.getFullYear() === currentYear && viewDate.getMonth() >= currentMonth
  );

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400 rounded-xl focus:outline-none focus:border-primary-500 transition-colors text-left flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } bg-surface-panel`}
      >
        <span className={value ? 'text-neutral-900' : 'text-neutral-400'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
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
              width: Math.max(320, menuRect.width),
              zIndex: 40,
            }}
          >
            <div className="p-3 border-b border-neutral-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-primary-100 rounded-xl transition-colors flex-shrink-0"
              >
                <ChevronDown className="h-4 w-4 text-neutral-600 rotate-90" />
              </button>

              <div className="flex items-center gap-2 flex-1 justify-center">
                <div className="relative" ref={monthDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMonthDropdown(!showMonthDropdown);
                      setShowYearDropdown(false);
                    }}
                    className="px-4 py-1.5 border border-neutral-400 rounded-xl text-sm font-medium text-neutral-900 transition-colors flex items-center gap-1 bg-surface-panel hover:bg-cream-50"
                  >
                    {monthNames[viewDate.getMonth()]}
                    <ChevronDown
                      className={`h-3 w-3 text-neutral-500 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showMonthDropdown && (
                    <div
                      className="absolute top-full left-0 mt-1 rounded-xl shadow-xl border border-neutral-300 overflow-hidden z-10 min-w-[120px] bg-surface-panel"
                    >
                      <div
                        className="max-h-48 overflow-y-auto"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#9B2C2C rgba(255,255,255,0.3)',
                        }}
                      >
                        {monthNames.map((month, index) => {
                          const isFutureMonth =
                            viewDate.getFullYear() === currentYear && index > currentMonth;
                          return (
                            <button
                              key={month}
                              type="button"
                              onClick={() => {
                                if (!isFutureMonth) {
                                  setViewDate(new Date(viewDate.getFullYear(), index, 1));
                                  setShowMonthDropdown(false);
                                }
                              }}
                              disabled={isFutureMonth}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                                isFutureMonth
                                  ? 'text-neutral-400 cursor-not-allowed'
                                  : viewDate.getMonth() === index
                                    ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white font-medium'
                                    : 'text-neutral-900 hover:bg-primary-100/90 hover:text-primary-700'
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

                <div className="relative" ref={yearDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowYearDropdown(!showYearDropdown);
                      setShowMonthDropdown(false);
                    }}
                    className="px-4 py-1.5 border border-neutral-400 rounded-xl text-sm font-medium text-neutral-900 transition-colors flex items-center gap-1 bg-surface-panel hover:bg-cream-50"
                  >
                    Năm {viewDate.getFullYear()}
                    <ChevronDown
                      className={`h-3 w-3 text-neutral-500 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showYearDropdown && (
                    <div
                      className="absolute top-full right-0 mt-1 rounded-xl shadow-xl border border-neutral-300 overflow-hidden z-10 min-w-[120px] bg-surface-panel"
                    >
                      <div
                        className="max-h-48 overflow-y-auto"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#9B2C2C rgba(255,255,255,0.3)',
                        }}
                      >
                        {years.map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              let newMonth = viewDate.getMonth();
                              if (year === currentYear && newMonth > currentMonth) {
                                newMonth = currentMonth;
                              }
                              setViewDate(new Date(year, newMonth, 1));
                              setShowYearDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                              viewDate.getFullYear() === year
                                ? 'bg-primary-600 text-white font-medium'
                                : 'text-neutral-900 hover:bg-primary-100 hover:text-primary-700'
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
                className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                  canGoNext ? 'hover:bg-primary-100' : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <ChevronDown className="h-4 w-4 text-neutral-600 -rotate-90" />
              </button>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day, i) => (
                  <div
                    key={day}
                    className={`text-center text-xs font-semibold py-1 ${
                      i === 6 ? 'text-red-600' : 'text-neutral-600'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square min-h-[2.25rem]" />;
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

                  const dayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                  const isFuture = dayDate > today;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !isFuture && handleDateClick(day)}
                      disabled={isFuture}
                      className={`aspect-square min-h-[2.25rem] rounded-lg transition-colors flex items-center justify-center text-sm font-medium ${
                        isFuture
                          ? 'text-neutral-400 cursor-not-allowed'
                          : isSelected
                            ? 'bg-primary-600 text-white shadow-sm'
                            : isToday
                              ? 'bg-primary-100 text-primary-800 ring-1 ring-primary-300/60'
                              : 'text-neutral-900 hover:bg-primary-50'
                      }`}
                    >
                      {day}
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
