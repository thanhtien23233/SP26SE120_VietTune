import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

type ModerationVirtualizedListProps<T> = {
  items: T[];
  ariaLabel: string;
  getItemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
};

export default function ModerationVirtualizedList<T>({
  items,
  ariaLabel,
  getItemKey,
  renderItem,
  estimateSize = 220,
  overscan = 6,
}: ModerationVirtualizedListProps<T>) {
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getItemKey(items[index], index),
  });

  return (
    <div
      ref={scrollParentRef}
      className="flex-1 overflow-y-auto min-h-0"
      role="region"
      aria-label={ariaLabel}
    >
      <div
        role="list"
        aria-label="Danh sách bản thu chờ xử lý"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="px-2 py-1.5">{renderItem(item, virtualRow.index)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
