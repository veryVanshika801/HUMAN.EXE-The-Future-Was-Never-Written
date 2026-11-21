import { RefObject, useEffect } from 'react';

let openModalLockCount = 0;
let previousBodyOverflow = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (openModalLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openModalLockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  openModalLockCount = Math.max(0, openModalLockCount - 1);
  if (openModalLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0
  );
}

/**
 * Provides Escape dismissal, ref-counted body scroll lock, focus save/restore,
 * and Tab focus trapping for accessible museum dialogs and drawers.
 */
export function useDialogAccessibility(
  isOpen: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>,
  options: { lockScroll?: boolean; trapFocus?: boolean } = {}
) {
  const { lockScroll = true, trapFocus = true } = options;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (lockScroll) {
      lockBodyScroll();
    }

    const focusTimer = window.requestAnimationFrame(() => {
      const container = dialogRef.current;
      if (!container) return;
      const active = document.activeElement;
      if (active && container.contains(active)) return;
      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus({ preventScroll: true });
      } else {
        container.focus({ preventScroll: true });
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (trapFocus && e.key === 'Tab') {
        const container = dialogRef.current;
        if (!container) return;
        const focusables = getFocusableElements(container);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !container.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !container.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      if (lockScroll) {
        unlockBodyScroll();
      }
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, onClose, dialogRef, lockScroll, trapFocus]);
}
