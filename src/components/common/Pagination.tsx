import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={clsx('flex items-center justify-center gap-2', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2.5 text-sm font-medium rounded-full border border-neutral-300/80 text-neutral-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] hover:scale-105 active:scale-95 cursor-pointer disabled:hover:scale-100 bg-surface-panel enabled:hover:bg-[#F5F0E8]"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        Trước
      </button>

      {getPageNumbers().map((page, index) => {
        const isActive = page === currentPage;
        const isEllipsis = page === '...';

        return (
          <button
            key={typeof page === 'number' ? `page-${page}` : `ellipsis-${index}`}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={isEllipsis}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'min-w-[40px] px-4 py-2.5 text-sm font-medium rounded-full transition-all duration-200 border',
              isEllipsis && 'cursor-default bg-transparent text-neutral-400',
              isActive &&
                'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]',
              !isActive &&
                !isEllipsis &&
                'text-neutral-800 border-neutral-300/80 bg-surface-panel hover:bg-[#F5F0E8] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] hover:scale-105 active:scale-95 cursor-pointer',
            )}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2.5 text-sm font-medium rounded-full border border-neutral-300/80 text-neutral-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] hover:scale-105 active:scale-95 cursor-pointer disabled:hover:scale-100 bg-surface-panel enabled:hover:bg-[#F5F0E8]"
      >
        Sau
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
