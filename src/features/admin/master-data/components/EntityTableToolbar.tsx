import { Search, Plus } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

interface EntityTableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  entityTitle: string;
}

export function EntityTableToolbar({
  searchTerm,
  onSearchChange,
  onAddClick,
  entityTitle,
}: EntityTableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-5">
      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          type="search"
          placeholder={`Tìm kiếm ${entityTitle.toLowerCase()}...`}
          className="w-full pl-10 py-2.5 rounded-xl border-neutral-200/80 bg-cream-50 shadow-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Actions */}
      <Button
        onClick={onAddClick}
        size="md"
        className="w-full sm:w-auto flex items-center justify-center gap-2 !px-5 !py-2.5 !text-sm !font-semibold !shadow-md !shadow-primary-600/25"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        <span>Thêm mới</span>
      </Button>
    </div>
  );
}
