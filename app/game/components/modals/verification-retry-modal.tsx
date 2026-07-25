import { createPortal } from "react-dom";

type VerificationRetryModalProps = {
  isOpen: boolean;
  isRetrying: boolean;
  onContinueUnranked: () => void;
  onRetry: () => void;
};

export function VerificationRetryModal({
  isOpen,
  isRetrying,
  onContinueUnranked,
  onRetry,
}: Readonly<VerificationRetryModalProps>) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <section
        aria-labelledby="verification-retry-title"
        aria-modal="true"
        className="theme-modal w-full max-w-[34rem] rounded-[1.5rem] border p-7 text-center sm:rounded-[1.75rem] sm:p-9"
        role="dialog"
      >
        <h2
          className="theme-text-primary font-fredoka-display text-[2rem] leading-none sm:text-[2.4rem]"
          id="verification-retry-title"
        >
          Verification paused
        </h2>
        <p className="theme-text-muted font-fredoka-regular mt-4 text-base leading-7">
          The leaderboard could not verify this result right now. Your completed
          puzzle is ready to retry.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            className="theme-button-secondary font-fredoka-strong rounded-full px-5 py-3 text-sm disabled:opacity-60 sm:text-base"
            disabled={isRetrying}
            onClick={onContinueUnranked}
            type="button"
          >
            Continue unranked
          </button>
          <button
            className="theme-button-primary font-fredoka-strong rounded-full px-5 py-3 text-sm disabled:opacity-60 sm:text-base"
            disabled={isRetrying}
            onClick={onRetry}
            type="button"
          >
            {isRetrying ? "Retrying..." : "Retry verification"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
