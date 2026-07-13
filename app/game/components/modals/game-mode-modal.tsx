import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BsCircleHalf } from "react-icons/bs";
import { FaInfinity } from "react-icons/fa";
import { VscStarFull } from "react-icons/vsc";
import { motion } from "motion/react";

import {
  DIFFICULTY_LABELS,
  getModeStyle,
  getPresetModeKey,
  PRESET_MODE_DIFFICULTIES,
} from "../../game-logic";
import type {
  DifficultyKey,
  EndlessStats,
  ModeStyle,
  PresetDifficultyKey,
} from "../../game-types";

const MODE_FAMILIES = ["classic", "endless", "black-and-white"] as const;

type ModeFamily = (typeof MODE_FAMILIES)[number];

type GameModeModalProps = {
  currentStreak: number;
  difficulty: DifficultyKey;
  endlessStats: EndlessStats;
  isOpen: boolean;
  onClose: () => void;
  onDifficultyChange: (difficulty: DifficultyKey) => void;
  onEndlessStart: () => void;
};

const MODE_DETAILS: Record<ModeFamily, {
  description: string;
  label: string;
  shortLabel: string;
}> = {
  classic: {
    description: "Restore a full color gradient before the clock gets away from you.",
    label: "Classic",
    shortLabel: "Color puzzle",
  },
  endless: {
    description: "Clear puzzle after puzzle with a tightening swap limit and build a streak.",
    label: "Endless",
    shortLabel: "Streak chase",
  },
  "black-and-white": {
    description: "Study the colors, then solve from memory after the board fades to grayscale.",
    label: "B&W",
    shortLabel: "Memory mode",
  },
};

function getModeIcon(family: ModeFamily) {
  if (family === "endless") {
    return <FaInfinity aria-hidden="true" />;
  }

  if (family === "black-and-white") {
    return <BsCircleHalf aria-hidden="true" />;
  }

  return <VscStarFull aria-hidden="true" />;
}

function getModeFamily(difficulty: DifficultyKey): ModeFamily {
  if (difficulty === "endless") {
    return "endless";
  }

  return getModeStyle(difficulty) === "black-and-white" ? "black-and-white" : "classic";
}

function getSelectedDifficulty(difficulty: DifficultyKey, family: ModeFamily) {
  if (family === "endless") {
    return "normal";
  }

  const prefix = "black-and-white-";
  if (family === "black-and-white" && difficulty.startsWith(prefix)) {
    const presetDifficulty = difficulty.slice(prefix.length) as PresetDifficultyKey;
    return PRESET_MODE_DIFFICULTIES.includes(presetDifficulty) ? presetDifficulty : "normal";
  }

  if (
    family === "classic" &&
    !difficulty.startsWith(prefix) &&
    PRESET_MODE_DIFFICULTIES.includes(difficulty as PresetDifficultyKey)
  ) {
    return difficulty as PresetDifficultyKey;
  }

  return "normal";
}

export function GameModeModal({
  currentStreak,
  difficulty,
  endlessStats,
  isOpen,
  onClose,
  onDifficultyChange,
  onEndlessStart,
}: Readonly<GameModeModalProps>) {
  const [selectedFamily, setSelectedFamily] = useState<ModeFamily>("classic");
  const [selectedDifficulty, setSelectedDifficulty] = useState<PresetDifficultyKey>("normal");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextFamily = getModeFamily(difficulty);
    setSelectedFamily(nextFamily);
    setSelectedDifficulty(getSelectedDifficulty(difficulty, nextFamily));
  }, [difficulty, isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const selectedMode = MODE_DETAILS[selectedFamily];
  const selectedStyle: ModeStyle = selectedFamily === "black-and-white" ? "black-and-white" : "color";
  const selectedModeKey = getPresetModeKey(selectedStyle, selectedDifficulty);

  const handlePlay = () => {
    if (selectedFamily === "endless") {
      onEndlessStart();
      onClose();
      return;
    }

    onDifficultyChange(selectedModeKey);
    onClose();
  };

  return createPortal(
    <motion.div
      className="theme-overlay fixed inset-0 z-40 flex items-center justify-center p-3 backdrop-blur-sm sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Select game mode"
        className="theme-modal relative z-10 grid h-[min(48rem,calc(100dvh-1rem))] w-full max-w-[64rem] gap-5 overflow-hidden rounded-[1.75rem] border p-5 sm:grid-cols-[0.85fr_1fr] sm:gap-7 sm:p-7"
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modes window"
          className="theme-close-button font-fredoka-strong absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full"
        >
          {"\u00D7"}
        </button>

        <section className="flex flex-col">
          <div>
            <div>
              <p className="theme-text-muted font-fredoka-strong text-[0.75rem] uppercase tracking-[0.2em] sm:text-sm sm:tracking-[0.24em]">
                Modes
              </p>
              <h2 className="theme-text-primary font-fredoka-display mt-2 text-[1.7rem] leading-none sm:text-[1.95rem]">
                Choose
              </h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {MODE_FAMILIES.map((family) => {
              const mode = MODE_DETAILS[family];
              const isActive = selectedFamily === family;

              return (
                <button
                  key={family}
                  type="button"
                  onClick={() => {
                    setSelectedFamily(family);
                    setSelectedDifficulty(getSelectedDifficulty(difficulty, family));
                  }}
                  className={`rounded-[1rem] text-center ${
                    isActive
                      ? "modal-rainbow-border min-h-[4.75rem]"
                      : "theme-card flex min-h-[4.75rem] flex-col items-center justify-center gap-2 border px-2 py-3"
                  }`}
                >
                  <span className={isActive ? "modal-rainbow-content flex min-h-[calc(4.75rem-0.44rem)] flex-col items-center justify-center gap-2 px-2 py-3" : "contents"}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                      isActive ? "bg-white/15" : "theme-button-secondary"
                    }`}>
                      {getModeIcon(family)}
                    </span>
                    <span className="min-w-0">
                      <span className="font-fredoka-display block text-[0.95rem] leading-none">
                        {mode.label}
                      </span>
                      <span className={`font-fredoka-strong mt-1 block text-sm leading-5 ${
                        isActive ? "text-current opacity-80" : "theme-text-muted"
                      } hidden`}>
                        {mode.shortLabel}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="theme-panel-muted flex h-full flex-col rounded-[1.5rem] p-5 sm:p-7">
          <div>
            <p className="theme-text-muted font-fredoka-strong text-[0.75rem] uppercase tracking-[0.2em] sm:text-sm sm:tracking-[0.24em]">
              Details
            </p>
            <h3 className="theme-text-primary font-fredoka-display mt-2 text-[1.85rem] leading-none sm:text-[2.35rem]">
              {selectedMode.label}
            </h3>
            <p className="theme-text-muted font-fredoka-regular mt-3 text-sm leading-6 sm:mt-4 sm:text-base">
              {selectedMode.description}
            </p>
          </div>

          {selectedFamily === "endless" ? (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="theme-card rounded-[1rem] border p-4 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {endlessStats.clears}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">clears</p>
              </div>
              <div className="theme-card rounded-[1rem] border p-4 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {currentStreak}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">current streak</p>
              </div>
              <div className="theme-card rounded-[1rem] border p-4 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {endlessStats.bestStreak}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">best streak</p>
              </div>
              <div className="theme-card rounded-[1rem] border p-4 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {endlessStats.threeStarClears}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">three-star</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {PRESET_MODE_DIFFICULTIES.map((presetDifficulty) => {
                const key = getPresetModeKey(selectedStyle, presetDifficulty);
                const isActive = selectedDifficulty === presetDifficulty;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDifficulty(presetDifficulty)}
                    className={`font-fredoka-strong rounded-[1rem] text-left text-base leading-tight ${
                      isActive ? "modal-rainbow-border min-h-[3.5rem]" : "theme-card flex min-h-[3.5rem] items-center justify-between border px-5 py-4"
                    }`}
                  >
                    <span className={isActive ? "modal-rainbow-content flex items-center justify-between px-5 py-4" : "contents"}>
                      <span>{DIFFICULTY_LABELS[presetDifficulty]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handlePlay}
            className="theme-button-primary font-fredoka-strong mt-5 flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3 text-base shadow-[0_14px_26px_rgba(15,23,42,0.16)]"
          >
            Play
          </button>
        </section>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
