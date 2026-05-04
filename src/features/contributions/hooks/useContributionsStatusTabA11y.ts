import { useCallback, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

import { CONTRIBUTOR_STATUS_TABS } from '@/features/contributions/contributionFilterConstants';
import { cn } from '@/utils/helpers';

/**
 * Refs + keyboard roving for the dual mobile (horizontal) / desktop (vertical) status tab lists.
 */
export function useContributionsStatusTabA11y(
  setActiveStatusTab: (value: number | 'ALL') => void,
) {
  const statusTabHorizRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const statusTabSideRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusContributorStatusTab = useCallback(
    (orientation: 'horizontal' | 'vertical', index: number) => {
      const list = orientation === 'horizontal' ? statusTabHorizRefs : statusTabSideRefs;
      queueMicrotask(() => list.current[index]?.focus());
    },
    [],
  );

  const onContributorStatusTabKeyDown = useCallback(
    (
      e: ReactKeyboardEvent<HTMLButtonElement>,
      index: number,
      orientation: 'horizontal' | 'vertical',
    ) => {
      const len = CONTRIBUTOR_STATUS_TABS.length;
      const go = (next: number) => {
        setActiveStatusTab(CONTRIBUTOR_STATUS_TABS[next].value);
        focusContributorStatusTab(orientation, next);
      };
      if (orientation === 'horizontal') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          go((index + 1) % len);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go((index - 1 + len) % len);
        } else if (e.key === 'Home') {
          e.preventDefault();
          go(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          go(len - 1);
        }
      } else {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          go((index + 1) % len);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          go((index - 1 + len) % len);
        } else if (e.key === 'Home') {
          e.preventDefault();
          go(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          go(len - 1);
        }
      }
    },
    [focusContributorStatusTab, setActiveStatusTab],
  );

  const statusFilterTabClass = useCallback(
    (isActive: boolean, layout: 'sidebar' | 'horizontal') =>
      cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 sm:text-base',
        layout === 'sidebar' ? 'w-full justify-start text-left' : 'shrink-0 whitespace-nowrap',
        isActive
          ? 'bg-gradient-to-br from-white to-secondary-50 text-primary-900 shadow-md ring-2 ring-secondary-300/70'
          : 'text-neutral-700 hover:bg-secondary-50/90 hover:text-neutral-900',
      ),
    [],
  );

  return {
    statusTabHorizRefs,
    statusTabSideRefs,
    onContributorStatusTabKeyDown,
    statusFilterTabClass,
  };
}
