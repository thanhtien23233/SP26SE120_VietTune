import { Pencil, Trash2 } from 'lucide-react';
import type { ReferenceEntity, EntityKind } from '../types/masterDataTypes';
import { entityConfigs } from '../utils/entityFieldConfig';
import { EntityStatusBadge } from './EntityStatusBadge';
import Pagination from '@/components/common/Pagination';

interface EntityTableProps {
  items: ReferenceEntity<Record<string, unknown>>[];
  kind: EntityKind;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEdit: (item: ReferenceEntity<Record<string, unknown>>) => void;
  onDelete: (item: ReferenceEntity<Record<string, unknown>>) => void;
}

export function EntityTable({
  items,
  kind,
  total,
  page,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
}: EntityTableProps) {
  const config = entityConfigs[kind];
  const totalPages = Math.ceil(total / pageSize);

  // Show only specific fields in the table based on entity kind
  const displayFields = config.fields.filter(f => f.name !== 'name' && f.type !== 'textarea').slice(0, 2);

  return (
    <div className="rounded-2xl border border-neutral-200/60 bg-surface-panel shadow-md overflow-hidden flex flex-col">
      {/* Desktop table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm text-left" role="grid" aria-rowcount={items.length + 1}>
          <thead>
            <tr role="row" className="border-b border-neutral-200/50">
              <th scope="col" className="px-6 py-3.5 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Tên {config.singularName}
              </th>
              {displayFields.map((field) => (
                <th key={field.name} scope="col" className="px-6 py-3.5 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  {field.label}
                </th>
              ))}
              <th scope="col" className="px-6 py-3.5 text-xs font-semibold tracking-wider text-neutral-400 uppercase w-32">
                Trạng thái
              </th>
              <th scope="col" className="px-6 py-3.5 text-xs font-semibold tracking-wider text-neutral-400 uppercase text-right w-28">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="group transition-colors duration-150 hover:bg-cream-50/80"
                role="row"
              >
                <td className="px-6 py-4 font-medium text-neutral-800" role="gridcell">
                  {item.name}
                </td>
                {displayFields.map((field) => (
                  <td key={field.name} className="px-6 py-4 text-neutral-500" role="gridcell">
                    {(item.raw as Record<string, unknown>)[field.name] as string || '—'}
                  </td>
                ))}
                <td className="px-6 py-4" role="gridcell">
                  <EntityStatusBadge isActive={item.isActive} />
                </td>
                <td className="px-6 py-4 text-right" role="gridcell">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
                      title={`Sửa ${item.name}`}
                      aria-label={`Sửa ${item.name}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                      title={item.isActive ? `Tạm ẩn ${item.name}` : `Xóa ${item.name}`}
                      aria-label={item.isActive ? `Tạm ẩn ${item.name}` : `Xóa ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-neutral-100">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-800 truncate">{item.name}</p>
              {displayFields.map((field) => {
                const val = (item.raw as Record<string, unknown>)[field.name] as string;
                return val ? (
                  <p key={field.name} className="text-xs text-neutral-500 mt-0.5 truncate">{field.label}: {val}</p>
                ) : null;
              })}
              <div className="mt-2">
                <EntityStatusBadge isActive={item.isActive} />
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(item)}
                className="p-2 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                aria-label={`Sửa ${item.name}`}
              >
                <Pencil className="w-4 h-4" strokeWidth={2} />
              </button>
              <button
                onClick={() => onDelete(item)}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label={item.isActive ? `Tạm ẩn ${item.name}` : `Xóa ${item.name}`}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-neutral-100 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
