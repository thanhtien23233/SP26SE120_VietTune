import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}

export default function Card({ children, className, variant = 'default' }: CardProps) {
  const variants = {
    default: 'shadow-lg backdrop-blur-sm',
    bordered: 'border border-neutral-200/80 shadow-lg backdrop-blur-sm',
    elevated: 'shadow-xl backdrop-blur-sm',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel',
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
