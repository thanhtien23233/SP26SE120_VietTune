import { ChevronDown } from 'lucide-react';
import { useState, type ElementType, type ReactNode } from 'react';

export function TextInput({
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
  const baseClasses = `w-full px-5 py-3 text-neutral-900 placeholder-neutral-500 border border-neutral-400 focus:outline-none focus:border-primary-500 transition-colors bg-surface-panel ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;

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
      className={`${baseClasses} rounded-xl`}
    />
  );
}

export function FormField({
  label,
  required = false,
  children,
  hint,
  id,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  id?: string;
}) {
  return (
    <div className="space-y-1.5" id={id}>
      <label className="block text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs font-medium text-neutral-700">{hint}</p>}
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  optional = false,
  required = false,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/50">
        <Icon className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
          {title}
          {required && (
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          )}
          {optional && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full border border-neutral-300/80 shadow-sm">
              Tùy chọn
            </span>
          )}
        </h3>
        {subtitle && <p className="mt-1 text-sm font-medium text-neutral-700">{subtitle}</p>}
      </div>
    </div>
  );
}

export function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  optional = false,
  defaultOpen = true,
  children,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  optional?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/85 to-secondary-50/45 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 bg-gradient-to-r from-surface-panel/95 to-secondary-50/30 p-4 transition-all duration-200 hover:from-secondary-50/40 hover:to-secondary-100/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel sm:min-h-0 sm:p-6"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/50">
            <Icon className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-neutral-900 flex items-center gap-2 break-words">
              {title}
              {optional && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-neutral-100/90 text-neutral-700 rounded-full border border-neutral-300/80 shadow-sm">
                  Tùy chọn
                </span>
              )}
            </h3>
            {subtitle && <p className="text-sm font-medium text-neutral-700">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-neutral-600 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={2.5}
        />
      </button>
      {isOpen && <div className="p-4 sm:p-6 pt-2 space-y-4 min-w-0">{children}</div>}
    </div>
  );
}
