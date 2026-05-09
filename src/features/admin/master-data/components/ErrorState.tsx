import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '@/components/common/Button';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 px-8 text-center rounded-2xl border border-red-200/40 bg-red-50/30">
      <div className="w-14 h-14 rounded-2xl bg-red-100/60 flex items-center justify-center mb-5">
        <AlertCircle className="w-7 h-7 text-red-500" aria-hidden="true" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-neutral-700">Đã xảy ra lỗi</h3>
      <p className="text-sm text-neutral-500 mt-1.5 mb-6 max-w-xs leading-relaxed">
        {message}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="flex items-center gap-2 !rounded-xl !px-4 !py-2">
        <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} />
        <span>Thử lại</span>
      </Button>
    </div>
  );
}
