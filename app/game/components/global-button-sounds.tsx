"use client";

import { useEffect } from "react";

import { buttonClickSound } from "../../lib/sounds";

export function GlobalButtonSounds() {
  useEffect(() => {
    const playForActionElement = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return;
      }

      const actionElement = target.closest("button, a");

      if (!actionElement || actionElement.closest("[data-tile-index]")) {
        return;
      }

      buttonClickSound.play();
    };

    const handlePointerDown = (event: PointerEvent) => {
      playForActionElement(event.target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const actionElement = target?.closest("button, a");

      if (!actionElement || actionElement.closest("[data-tile-index]")) {
        return;
      }

      buttonClickSound.play();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}
