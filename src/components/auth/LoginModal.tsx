import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import LoginFormContent from '@/components/auth/LoginFormContent';
import { useLoginModalStore } from '@/stores/loginModalStore';
import type { User } from '@/types';
import { resolvePostLoginPath } from '@/utils/routeAccess';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isInsideInertSubtree(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    if (node.hasAttribute('inert')) return true;
    node = node.parentElement;
  }
  return false;
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (isInsideInertSubtree(el)) return false;
    if (el.tabIndex === -1) return false;
    if ('disabled' in el && (el as HTMLButtonElement | HTMLInputElement).disabled) return false;
    return true;
  });
}

export default function LoginModal() {
  const navigate = useNavigate();
  const isOpen = useLoginModalStore((s) => s.isOpen);
  const redirectTo = useLoginModalStore((s) => s.redirectTo);
  const onSuccessCallback = useLoginModalStore((s) => s.onSuccessCallback);
  const closeLoginModal = useLoginModalStore((s) => s.closeLoginModal);

  const panelRef = useRef<HTMLDivElement>(null);
  const [otpOverlayOpen, setOtpOverlayOpen] = useState(false);
  const [shellVisible, setShellVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setOtpOverlayOpen(false);
      setShellVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setShellVisible(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shellVisible || !panelRef.current) return;

    const trapRoot = panelRef.current;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = getFocusableElements(trapRoot);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    trapRoot.addEventListener('keydown', handleTab);
    const list = getFocusableElements(trapRoot);
    const t = window.setTimeout(() => list[0]?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      trapRoot.removeEventListener('keydown', handleTab);
    };
  }, [isOpen, otpOverlayOpen, shellVisible]);

  useEffect(() => {
    if (!isOpen || !shellVisible || !panelRef.current) return;
    const panel = panelRef.current;

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (!target || panel.contains(target)) return;
      const list = getFocusableElements(panel);
      list[0]?.focus();
    };

    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, [isOpen, otpOverlayOpen, shellVisible]);

  const handleAuthenticated = (user: User) => {
    onSuccessCallback?.();
    if (redirectTo) {
      navigate(resolvePostLoginPath(user, redirectTo));
    }
    closeLoginModal();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (otpOverlayOpen) return;
    if (e.target === e.currentTarget) closeLoginModal();
  };

  if (!isOpen) return null;

  const overlay = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        shellVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className={`relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:scale-100 ${
          shellVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {!otpOverlayOpen && (
          <button
            type="button"
            onClick={() => closeLoginModal()}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-xl font-bold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Đóng"
          >
            &times;
          </button>
        )}
        <LoginFormContent
          titleId="login-modal-title"
          className="pt-2"
          showGuestLink={false}
          onSuccess={handleAuthenticated}
          onRequestClose={closeLoginModal}
          onOtpModalOpenChange={setOtpOverlayOpen}
          onRegisterClick={() => {
            closeLoginModal();
            navigate('/register');
          }}
          onForgotPasswordClick={closeLoginModal}
        />
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
