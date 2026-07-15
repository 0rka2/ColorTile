import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { getGradientQualityFill } from "../gradient-quality";

type HudProps = {
  bestMoves: number | null;
  bestTimeDisplay: string;
  endlessInfo?: {
    label?: string;
    puzzleNumber: number;
    styleLabel: string;
    swapBudget?: number | null;
  };
  gradientQuality: number;
  moves: number;
  timeDisplay: string;
  timeWarning: boolean;
};

export function GameHud({
  bestMoves,
  bestTimeDisplay,
  endlessInfo,
  gradientQuality,
  moves,
  timeDisplay,
  timeWarning,
}: Readonly<HudProps>) {
  const [animatedQuality, setAnimatedQuality] = useState(gradientQuality);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = animatedQuality;
    const targetValue = gradientQuality;

    if (startValue === targetValue || typeof window === "undefined") {
      setAnimatedQuality(targetValue);
      return;
    }

    const durationMs = 520;
    const startTime = window.performance.now();

    const tick = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (targetValue - startValue) * easedProgress);

      setAnimatedQuality(nextValue);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gradientQuality]);

  const qualityFill = getGradientQualityFill(animatedQuality);
  const hasSwapBudget = endlessInfo?.swapBudget !== undefined && endlessInfo.swapBudget !== null;
  const moveDisplay = hasSwapBudget ? `${moves}/${endlessInfo.swapBudget}` : moves;
  const moveLabel = hasSwapBudget ? "Swaps" : "Moves";
  const progressLabel = endlessInfo
    ? endlessInfo.label ?? `Puzzle ${endlessInfo.puzzleNumber} · ${endlessInfo.styleLabel}`
    : "Progress";

  return (
    <section className="flex w-full max-w-none flex-col gap-[clamp(0.3rem,0.7vw,0.75rem)]">
      <div className="game-hud-compact theme-panel relative overflow-hidden rounded-[clamp(1rem,2vw,1.5rem)] border px-[clamp(0.65rem,1.25vw,1rem)] py-[clamp(0.45rem,1vw,0.8rem)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="theme-text-muted font-fredoka-strong text-[0.52rem] uppercase leading-none tracking-[0.16em]">
              Time
            </p>
            <p className={`mt-1 font-fredoka-display text-[1.3rem] leading-none tracking-tight ${timeWarning ? "theme-text-danger" : "theme-text-primary"}`}>
              {timeDisplay}
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="text-center">
              <p className="theme-text-muted font-fredoka-strong text-[0.52rem] uppercase leading-none tracking-[0.16em]">
                {moveLabel}
              </p>
              <p className="theme-text-primary mt-1 font-fredoka-display text-[1.15rem] leading-none tracking-tight">
                {moveDisplay}
              </p>
            </div>
            <div className="h-9 w-px bg-[var(--border-soft)]" aria-hidden="true" />
            <div className="text-right">
              <p className="theme-text-muted font-fredoka-strong text-[0.52rem] uppercase leading-none tracking-[0.16em]">
                {progressLabel}
              </p>
              <p className="theme-text-primary mt-1 font-fredoka-display text-[1.15rem] leading-none tracking-[-0.05em]">
                {animatedQuality}%
              </p>
            </div>
          </div>
        </div>

        <div className="theme-progress-track relative z-10 mt-2 h-1.5 overflow-hidden rounded-full">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff5f6d_0%,#fbbf24_30%,#34d399_62%,#60a5fa_100%)] shadow-[0_8px_18px_rgba(96,165,250,0.26)]"
            animate={{ width: `${qualityFill}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="game-hud-full flex flex-col gap-2">
  {!endlessInfo && (
  <div className="grid grid-cols-2 gap-2">
    <div className="theme-card rounded-xl border px-3 py-2 text-center backdrop-blur">
      <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
        Time Record
      </p>
      <p className="theme-text-primary mt-0.5 font-fredoka-display text-xl leading-none tracking-tight">
        {bestTimeDisplay}
      </p>
    </div>

    <div className="theme-card rounded-xl border px-3 py-2 text-center backdrop-blur">
      <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
        Move Record
      </p>
      <p className="theme-text-primary mt-0.5 font-fredoka-display text-xl leading-none tracking-tight">
        {bestMoves ?? "-"}
      </p>
    </div>
  </div>
  )}

  <div className="theme-panel relative overflow-hidden rounded-2xl border px-3 py-2 backdrop-blur">
    <div className="grid min-w-0 grid-cols-3 gap-2">
      <div className="min-w-0 text-left">
        <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
          Time
        </p>
        <p
          className={`mt-0.5 font-fredoka-display text-[32px] leading-none tracking-tight ${
            timeWarning ? "theme-text-danger" : "theme-text-primary"
          }`}
        >
          {timeDisplay}
        </p>
      </div>

      <div className="min-w-0 text-center">
        <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
          {moveLabel}
        </p>
        <p className="theme-text-primary mt-0.5 font-fredoka-display text-[32px] leading-none tracking-tight">
          {moveDisplay}
        </p>
      </div>

      <div className="min-w-0 text-right">
        <p className="theme-text-muted font-fredoka-strong text-[11px] uppercase leading-none tracking-[0.14em]">
          {progressLabel}
        </p>
        <p className="theme-text-primary mt-0.5 font-fredoka-display text-[30px] leading-none tracking-[-0.05em]">
          {animatedQuality}%
        </p>
      </div>
    </div>

    <div className="theme-progress-track relative z-10 mt-2 h-2 overflow-hidden rounded-full">
      <motion.div
        className="h-full rounded-full bg-[linear-gradient(90deg,#ff5f6d_0%,#fbbf24_30%,#34d399_62%,#60a5fa_100%)] shadow-[0_8px_18px_rgba(96,165,250,0.26)]"
        animate={{ width: `${qualityFill}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  </div>
</div>
    </section>
  );
}
