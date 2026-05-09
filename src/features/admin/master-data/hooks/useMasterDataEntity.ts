import { useState, useCallback, useEffect } from 'react';
import { masterDataService } from '../services/masterDataService';
import { useMasterDataInvalidation } from './useMasterDataInvalidation';
import type { EntityKind, ReferenceEntity, EntityFormValues } from '../types/masterDataTypes';
import { logServiceWarn } from '@/services/serviceLogger';
import { logEvent } from '@/services/errorReporting';
import { uiToast, notifyLine } from '@/uiToast';

interface UseMasterDataEntityOptions {
  kind: EntityKind;
  pageSize?: number;
}

export function useMasterDataEntity({ kind, pageSize = 50 }: UseMasterDataEntityOptions) {
  const [items, setItems] = useState<ReferenceEntity<Record<string, unknown>>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { invalidateCache } = useMasterDataInvalidation();

  const fetchItems = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await masterDataService.list(kind, targetPage, pageSize);
      setItems(result.items);
      setTotal(result.total);
      setPage(targetPage);
    } catch (err: unknown) {
      logServiceWarn(`Failed to fetch master data for ${kind}`, err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [kind, pageSize]);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  const createItem = async (data: EntityFormValues) => {
    try {
      await masterDataService.create(kind, data);
      logEvent('admin.masterdata.create', { kind, entityName: data.name });
      uiToast.success(notifyLine('Thành công', 'Thêm mới dữ liệu thành công'));
      invalidateCache(kind);
      await fetchItems(page);
      return true;
    } catch (err: unknown) {
      logServiceWarn(`Failed to create ${kind}`, err);
      uiToast.error(notifyLine('Lỗi', 'Không thể thêm dữ liệu. Vui lòng thử lại.'));
      return false;
    }
  };

  const updateItem = async (id: string, data: EntityFormValues) => {
    // Optimistic update
    const previousItems = [...items];
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              name: data.name ?? item.name,
              raw: { ...item.raw, ...data },
            }
          : item
      )
    );

    try {
      await masterDataService.update(kind, id, data);
      logEvent('admin.masterdata.update', { kind, entityId: id });
      uiToast.success(notifyLine('Thành công', 'Cập nhật dữ liệu thành công'));
      invalidateCache(kind);
      await fetchItems(page);
      return true;
    } catch (err: unknown) {
      // Rollback optimistic update
      setItems(previousItems);
      logServiceWarn(`Failed to update ${kind} id=${id}`, err);
      uiToast.error(notifyLine('Lỗi', 'Không thể cập nhật dữ liệu. Vui lòng thử lại.'));
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    // Optimistic delete: hide the item immediately
    const previousItems = [...items];
    setItems((current) => current.filter((item) => item.id !== id));

    try {
      await masterDataService.delete(kind, id);
      const usageCount = await masterDataService.checkUsage(kind, id);
      logEvent('admin.masterdata.deactivate', { kind, entityId: id, usageCount });
      uiToast.success(notifyLine('Thành công', 'Xóa dữ liệu thành công'));
      invalidateCache(kind);
      // If we deleted the last item on the page, go back one page
      const isLastItemOnPage = previousItems.length === 1;
      const targetPage = isLastItemOnPage && page > 1 ? page - 1 : page;
      await fetchItems(targetPage);
      return true;
    } catch (err: unknown) {
      // Rollback optimistic update
      setItems(previousItems);
      logServiceWarn(`Failed to delete ${kind} id=${id}`, err);
      uiToast.error(notifyLine('Lỗi', 'Không thể xóa dữ liệu. Vui lòng kiểm tra lại.'));
      return false;
    }
  };

  return {
    items,
    total,
    page,
    isLoading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
