import { useEffect, useState } from 'react';

/**
 * Tracks `getBoundingClientRect()` for a button while `isOpen` for portaled dropdown menus.
 */
export function useButtonAnchorRect(
  isOpen: boolean,
  buttonRef: React.RefObject<HTMLButtonElement | null>,
): DOMRect | null {
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
    };
    if (isOpen) updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, buttonRef]);

  return menuRect;
}
