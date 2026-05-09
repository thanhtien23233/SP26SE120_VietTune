import { FolderSearch } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center rounded-2xl border border-dashed border-neutral-200/60 bg-cream-50/50">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100/80 flex items-center justify-center mb-5">
        <FolderSearch className="w-7 h-7 text-neutral-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-neutral-700">{title}</h3>
      <p className="text-sm text-neutral-500 mt-1.5 max-w-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}
