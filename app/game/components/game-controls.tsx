type ControlsProps = {
  onAutoSolve: () => void;
  onRestart: () => void;
  showDevControls: boolean;
};

export function GameControls({
  onAutoSolve,
  onRestart,
  showDevControls,
}: Readonly<ControlsProps>) {
  return (
    <section className="flex w-full justify-center">
      <div
        className={`game-controls-row grid w-full gap-2 ${
          showDevControls ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart game"
          className="theme-button-primary restart-button font-fredoka-strong flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm shadow-[0_14px_26px_rgba(15,23,42,0.16)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span aria-hidden="true" className="inline-flex items-center leading-none">
            {"\u21BB"}
          </span>
          <span>Restart</span>
        </button>

        {showDevControls && (
          <button
            type="button"
            onClick={onAutoSolve}
            aria-label="Automatically solve puzzle"
            className="theme-button-secondary font-fredoka-strong flex min-h-11 items-center justify-center rounded-full border border-[var(--border-soft)] px-5 text-center text-sm leading-tight transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Auto Solve
          </button>
        )}
      </div>
    </section>
  );
}
