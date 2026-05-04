import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className,
}: BadgeProps) {
  const variants = {
    primary:
      'bg-primary-100/90 text-primary-800 shadow-sm hover:shadow-md transition-shadow duration-200',
    secondary:
      'bg-secondary-100/90 text-secondary-800 shadow-sm hover:shadow-md transition-shadow duration-200',
    success:
      'bg-green-100/90 text-green-800 shadow-sm hover:shadow-md transition-shadow duration-200',
    warning:
      'bg-yellow-100/90 text-yellow-800 shadow-sm hover:shadow-md transition-shadow duration-200',
    danger: 'bg-red-100/90 text-red-800 shadow-sm hover:shadow-md transition-shadow duration-200',
    info: 'bg-blue-100/90 text-blue-800 shadow-sm hover:shadow-md transition-shadow duration-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
