"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

import { boardCompleteSound } from "../../lib/sounds";
import { EMPTY_PERSONAL_BEST_STATUS } from "../personal-best";
import type { PersonalBestStatus } from "../personal-best";
import { getWinSequenceDurations } from "../win-sequence";
import type { WinPhase } from "../win-sequence";

type WinSequenceOptions = {
  boardLength: number;
  setPersonalBestStatus: Dispatch<SetStateAction<PersonalBestStatus>>;
};

export function useWinSequence({ boardLength, setPersonalBestStatus }: WinSequenceOptions) {
  const [winPhase, setWinPhase] = useState<WinPhase>("idle");
  const winSequenceTimeoutsRef = useRef<number[]>([]);
  const lastWinPhaseSoundRef = useRef<WinPhase>("idle");

  const clearWinSequenceTimeouts = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    winSequenceTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    winSequenceTimeoutsRef.current = [];
  }, []);

  const resetWinSequence = useCallback(() => {
    clearWinSequenceTimeouts();
    lastWinPhaseSoundRef.current = "idle";
    setWinPhase("idle");
    setPersonalBestStatus(EMPTY_PERSONAL_BEST_STATUS);
  }, [clearWinSequenceTimeouts, setPersonalBestStatus]);

  useEffect(() => {
    if (winPhase !== "boardWave" && winPhase !== "confetti") {
      return;
    }

    clearWinSequenceTimeouts();

    const { boardWaveDurationMs, modalDelayMs } = getWinSequenceDurations(boardLength);

    if (winPhase === "boardWave") {
      if (lastWinPhaseSoundRef.current !== "boardWave") {
        boardCompleteSound.play();
        lastWinPhaseSoundRef.current = "boardWave";
      }

      winSequenceTimeoutsRef.current.push(
        window.setTimeout(() => {
          setWinPhase("confetti");
        }, boardWaveDurationMs),
      );
      return;
    }

    winSequenceTimeoutsRef.current.push(
      window.setTimeout(() => {
        setWinPhase("modal");
      }, modalDelayMs - boardWaveDurationMs),
    );

    return () => {
      clearWinSequenceTimeouts();
    };
  }, [boardLength, clearWinSequenceTimeouts, winPhase]);

  useEffect(() => {
    return () => {
      clearWinSequenceTimeouts();
    };
  }, [clearWinSequenceTimeouts]);

  return {
    clearWinSequenceTimeouts,
    confettiActive: winPhase === "confetti" || winPhase === "modal",
    resetWinSequence,
    setWinPhase,
    winModalVisible: winPhase === "modal",
    winPhase,
    winWaveActive: winPhase === "boardWave",
  };
}
