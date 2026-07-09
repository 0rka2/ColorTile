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
        className="theme-modal relative z-10 grid max-h-[calc(100dvh-1.5rem)] w-full max-w-[54rem] gap-3 overflow-y-auto rounded-[1.5rem] border p-4 sm:max-h-[calc(100dvh-2rem)] sm:grid-cols-[1fr_1fr] sm:gap-4 sm:p-5"
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <section className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="theme-text-muted font-fredoka-strong text-[0.75rem] uppercase tracking-[0.2em] sm:text-sm sm:tracking-[0.24em]">
                Modes
              </p>
              <h2 className="theme-text-primary font-fredoka-display mt-2 text-[1.7rem] leading-none sm:text-[1.95rem]">
                Choose
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modes window"
              className="theme-close-button font-fredoka-strong flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            >
              {"\u00D7"}
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3">
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
                  className={`flex min-h-[5.25rem] items-center gap-4 rounded-[1rem] border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                    isActive ? "theme-button-primary" : "theme-card"
                  }`}
                >
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl ${
                    isActive ? "bg-white/15" : "theme-button-secondary"
                  }`}>
                    {getModeIcon(family)}
                  </span>
                  <span className="min-w-0">
                    <span className="font-fredoka-display block text-[1.2rem] leading-none">
                      {mode.label}
                    </span>
                    <span className={`font-fredoka-strong mt-1 block text-sm leading-5 ${
                      isActive ? "text-current opacity-80" : "theme-text-muted"
                    }`}>
                      {mode.shortLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="theme-panel-muted flex flex-col rounded-[1.25rem] p-4 sm:p-5">
          <div>
            <p className="theme-text-muted font-fredoka-strong text-[0.75rem] uppercase tracking-[0.2em] sm:text-sm sm:tracking-[0.24em]">
              Details
            </p>
            <h3 className="theme-text-primary font-fredoka-display mt-2 text-[1.85rem] leading-none sm:text-[2.35rem]">
              {selectedMode.label}
            </h3>
            <p className="theme-text-muted font-fredoka-regular mt-3 text-sm leading-6 sm:text-base">
              {selectedMode.description}
            </p>
          </div>

          {selectedFamily === "endless" ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="theme-card rounded-[1rem] border p-3 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {endlessStats.clears}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">clears</p>
              </div>
              <div className="theme-card rounded-[1rem] border p-3 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {currentStreak}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">current streak</p>
              </div>
              <div className="theme-card rounded-[1rem] border p-3 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {endlessStats.bestStreak}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">best streak</p>
              </div>
              <div className="theme-card rounded-[1rem] border p-3 text-center">
                <p className="theme-text-primary font-fredoka-display text-xl leading-none">
                  {endlessStats.threeStarClears}
                </p>
                <p className="theme-text-muted font-fredoka-regular mt-1 text-xs">three-star</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2">
              {PRESET_MODE_DIFFICULTIES.map((presetDifficulty) => {
                const key = getPresetModeKey(selectedStyle, presetDifficulty);
                const isActive = selectedDifficulty === presetDifficulty;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDifficulty(presetDifficulty)}
                    className={`font-fredoka-strong flex items-center justify-between rounded-[1rem] px-4 py-3 text-left text-base leading-tight transition ${
                      isActive ? "theme-button-primary" : "theme-button-secondary"
                    }`}
                  >
                    <span>{DIFFICULTY_LABELS[presetDifficulty]}</span>
                    {isActive && <span aria-hidden="true">{"\u2713"}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={handlePlay}
            className="theme-button-primary font-fredoka-strong mt-5 flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3 text-base shadow-[0_14px_26px_rgba(15,23,42,0.16)] sm:mt-auto"
          >
            Play
          </button>
        </section>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
