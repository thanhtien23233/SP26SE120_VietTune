import { useState, useMemo } from 'react';

import { EmptyState } from '../components/EmptyState';
import { EntityDeleteDialog } from '../components/EntityDeleteDialog';
import { EntityFormDialog } from '../components/EntityFormDialog';
import { EntitySidebar } from '../components/EntitySidebar';
import { EntityTable } from '../components/EntityTable';
import { EntityTableToolbar } from '../components/EntityTableToolbar';
import { ErrorState } from '../components/ErrorState';
import { TableSkeleton } from '../components/TableSkeleton';
import { useEntitySearch } from '../hooks/useEntitySearch';
import { useMasterDataEntity } from '../hooks/useMasterDataEntity';
import { masterDataService } from '../services/masterDataService';
import type { EntityKind, ReferenceEntity, EntityFormValues } from '../types/masterDataTypes';
import { entityConfigs } from '../utils/entityFieldConfig';
import { normalizeSlug } from '../utils/slugNormalizer';

import BackButton from '@/components/common/BackButton';
import { reportError, toReportableError } from '@/services/errorReporting';

export function MasterDataPage() {
  const [currentKind, setCurrentKind] = useState<EntityKind>('instruments');
  const [selectedEntity, setSelectedEntity] = useState<ReferenceEntity<Record<string, unknown>> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { searchTerm, setSearchTerm, debouncedSearch } = useEntitySearch();
  const {
    items,
    total,
    page,
    isLoading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  } = useMasterDataEntity({ kind: currentKind, pageSize: 20 });

  const config = entityConfigs[currentKind];

  const handlePageChange = (newPage: number) => {
    void fetchItems(newPage);
  };

  const handleAddClick = () => {
    setSelectedEntity(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (entity: ReferenceEntity<Record<string, unknown>>) => {
    setSelectedEntity(entity);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (entity: ReferenceEntity<Record<string, unknown>>) => {
    setSelectedEntity(entity);
    setIsDeleteOpen(true);

    // Pre-fetch usage count
    try {
      const usageCount = await masterDataService.checkUsage(currentKind, entity.id);
      setSelectedEntity((prev) => prev && prev.id === entity.id ? { ...prev, usageCount } : prev);
    } catch (err) {
      reportError(toReportableError(err, 'Failed to fetch usage count'), undefined, {
        region: 'admin',
        masterData: currentKind,
      });
    }
  };

  const handleSave = async (data: EntityFormValues) => {
    if (selectedEntity) {
      return await updateItem(selectedEntity.id, data);
    } else {
      return await createItem(data);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedEntity) return;
    const success = await deleteItem(selectedEntity.id);
    if (success) {
      setIsDeleteOpen(false);
      setSelectedEntity(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    const searchSlug = normalizeSlug(debouncedSearch);
    return items.filter((item: ReferenceEntity<Record<string, unknown>>) => normalizeSlug(item.name).includes(searchSlug));
  }, [items, debouncedSearch]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12">
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
            {config.title}
          </h1>
          <p className="text-sm text-neutral-500 mt-1.5 font-medium">
            Quản lý danh sách {config.singularName} — dữ liệu tham chiếu cho toàn bộ hệ thống VietTune.
          </p>
        </div>
        <BackButton to="/admin" />
      </div>

      {/* Main layout: sidebar + workspace */}
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        <EntitySidebar currentKind={currentKind} onSelect={setCurrentKind} />

        {/* Workspace panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <EntityTableToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onAddClick={handleAddClick}
            entityTitle={config.title}
          />

          <div className="flex-1">
            {isLoading ? (
              <TableSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={() => fetchItems(page)} />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title={`Không tìm thấy ${config.singularName} nào`}
                description={
                  searchTerm
                    ? `Không có kết quả nào phù hợp với "${searchTerm}"`
                    : `Hãy bắt đầu bằng cách thêm ${config.singularName} đầu tiên của bạn.`
                }
              />
            ) : (
              <EntityTable
                items={filteredItems}
                kind={currentKind}
                total={total}
                page={page}
                pageSize={20}
                onPageChange={handlePageChange}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EntityFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        kind={currentKind}
        entity={selectedEntity}
        existingItems={items}
      />

      <EntityDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        entity={selectedEntity}
        entityName={config.singularName}
      />
    </div>
  );
}
