"use client";

import { useEffect } from "react";

/**
 * Keyboard behaviour every modal in the app shares:
 * Escape closes, Ctrl/⌘+Enter saves from anywhere inside (plain Enter already
 * submits from single-line inputs through the form element). Also locks page
 * scroll while open so the sheet behind doesn't drift.
 */
export function useModalKeys({ onClose, onSubmit }: { onClose: () => void; onSubmit?: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (onSubmit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSubmit();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, onSubmit]);
}
