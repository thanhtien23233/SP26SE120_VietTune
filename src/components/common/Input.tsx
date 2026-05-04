import { clsx } from 'clsx';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  labelColor?: 'dark' | 'light';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, labelColor = 'dark', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            className={clsx(
              'block text-xs font-medium mb-0.5',
              labelColor === 'light' ? 'text-white' : 'text-neutral-700',
            )}
          >
            {label}
            {props.required && <span className="text-primary-600 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-5 py-3 border rounded-full focus:outline-none focus:border-primary-500 transition-all duration-200 text-sm',
            'text-neutral-900 placeholder:text-neutral-500 font-medium',
            error
              ? 'border-primary-400 focus:border-primary-500'
              : 'border-neutral-400/80 focus:border-transparent',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'shadow-sm hover:shadow-md focus:shadow-lg',
            'bg-surface-panel',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-0.5 text-xs text-primary-600">{error}</p>}
        {helperText && !error && <p className="mt-0.5 text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
