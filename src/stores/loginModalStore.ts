import { create } from 'zustand';

import { parseSafeRedirectParam } from '@/utils/routeAccess';

type LoginModalState = {
  isOpen: boolean;
  redirectTo: string | null;
  onSuccessCallback: (() => void) | null;
  openLoginModal: (opts?: { redirect?: string; onSuccess?: () => void }) => void;
  closeLoginModal: () => void;
};

export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  redirectTo: null,
  onSuccessCallback: null,
  openLoginModal: (opts) =>
    set({
      isOpen: true,
      redirectTo: parseSafeRedirectParam(opts?.redirect),
      onSuccessCallback: opts?.onSuccess ?? null,
    }),
  closeLoginModal: () =>
    set({
      isOpen: false,
      redirectTo: null,
      onSuccessCallback: null,
    }),
}));

/** Dev-only: `__loginModalStore.getState().openLoginModal()` in the browser console (Phase 1 verification). */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & { __loginModalStore?: typeof useLoginModalStore }).__loginModalStore =
    useLoginModalStore;
}
