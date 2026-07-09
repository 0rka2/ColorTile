import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

type ShopComingSoonModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShopComingSoonModal({
  isOpen,
  onClose,
}: Readonly<ShopComingSoonModalProps>) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Shop coming soon"
        className="theme-modal relative w-full max-w-[24rem] rounded-[1.5rem] border p-7 text-center sm:rounded-[1.75rem] sm:p-8"
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close shop window"
          className="theme-close-button font-fredoka-strong absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full"
        >
          {"\u00D7"}
        </button>
        <h2 className="theme-text-primary font-fredoka-display mt-8 text-[2rem] leading-none sm:text-[2.35rem]">
          Coming soon..
        </h2>
        <p className="theme-text-muted font-fredoka-regular mt-4 text-base leading-6">
          The shop is not open yet.
        </p>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
