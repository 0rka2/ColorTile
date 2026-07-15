type ControlsProps = {
  onAutoSolve: () => void;
  showDevControls: boolean;
};

export function GameControls({
  onAutoSolve,
  showDevControls,
}: Readonly<ControlsProps>) {
  return (
    <section className="flex w-full justify-center">
      <div className="flex w-full max-w-[42rem] flex-col gap-[clamp(0.5rem,1.2vw,0.85rem)] sm:flex-row sm:justify-center">
        {showDevControls && (
          <button
            type="button"
            onClick={onAutoSolve}
            className="theme-button-accent font-fredoka-strong flex min-h-[clamp(3rem,5vw,4rem)] w-full items-center justify-center rounded-[clamp(0.9rem,1.8vw,1.25rem)] px-[clamp(0.8rem,1.6vw,1.1rem)] py-[clamp(0.7rem,1.2vw,0.95rem)] text-center text-[clamp(0.8rem,1.35vw,0.92rem)] leading-tight transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto sm:min-w-[clamp(7.5rem,13vw,9.5rem)]"
          >
            Auto Solve
          </button>
        )}
      </div>
    </section>
  );
}
