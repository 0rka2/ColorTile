"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { AppView } from "../../views/app-view";
import type { DifficultyKey } from "../game-types";

const GAME_AREA_MAX_WIDTH_PX = 600;
const MOBILE_BOARD_BREAKPOINT_PX = 640;

type BoardSizeOptions = {
  activeConfigSize: number;
  activeView: AppView;
  boardLength: number;
  boardResetKey: number;
  difficulty: DifficultyKey;
};

export function useBoardSize({
  activeConfigSize,
  activeView,
  boardLength,
  boardResetKey,
  difficulty,
}: BoardSizeOptions) {
  const pageShellRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const restartRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState(0);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const measureBoardSize = () => {
      const shellElement = pageShellRef.current;
      const contentElement = contentRef.current;
      const headerElement = headerRef.current;
      const hudElement = hudRef.current;
      const controlsElement = controlsRef.current;
      const restartElement = restartRef.current;

      if (!shellElement || !contentElement || !headerElement || !hudElement || !controlsElement || !restartElement) {
        return;
      }

      const shellGap = Number.parseFloat(window.getComputedStyle(shellElement).rowGap || "0");
      const contentGap = Number.parseFloat(window.getComputedStyle(contentElement).rowGap || "0");
      const paddingLeft = Number.parseFloat(window.getComputedStyle(shellElement).paddingLeft || "0");
      const paddingRight = Number.parseFloat(window.getComputedStyle(shellElement).paddingRight || "0");
      const paddingTop = Number.parseFloat(window.getComputedStyle(shellElement).paddingTop || "0");
      const paddingBottom = Number.parseFloat(window.getComputedStyle(shellElement).paddingBottom || "0");
      const contentPaddingBottom = Number.parseFloat(window.getComputedStyle(contentElement).paddingBottom || "0");

      const viewport = window.visualViewport;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const availableWidth =
        Math.min(shellElement.clientWidth, viewportWidth) - paddingLeft - paddingRight;
      const reservedHeight =
        headerElement.getBoundingClientRect().height +
        hudElement.getBoundingClientRect().height +
        controlsElement.getBoundingClientRect().height +
        restartElement.getBoundingClientRect().height +
        shellGap +
        contentGap * 3 +
        paddingTop +
        paddingBottom +
        contentPaddingBottom;
      const availableHeight = viewportHeight - reservedHeight;
      const boardSizeLimit =
        viewportWidth <= MOBILE_BOARD_BREAKPOINT_PX
          ? availableWidth
          : Math.min(availableWidth, availableHeight);
      const measuredBoardSize = Math.max(0, Math.floor(boardSizeLimit));
      const nextBoardSize = Math.min(availableWidth, GAME_AREA_MAX_WIDTH_PX, measuredBoardSize);
      setBoardSize(Math.max(0, nextBoardSize));
    };

    measureBoardSize();

    const resizeObserver = new ResizeObserver(measureBoardSize);
    [pageShellRef.current, headerRef.current, contentRef.current, hudRef.current, controlsRef.current, restartRef.current].forEach((element) => {
      if (element) {
        resizeObserver.observe(element);
      }
    });

    window.addEventListener("resize", measureBoardSize);
    window.visualViewport?.addEventListener("resize", measureBoardSize);
    window.visualViewport?.addEventListener("scroll", measureBoardSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureBoardSize);
      window.visualViewport?.removeEventListener("resize", measureBoardSize);
      window.visualViewport?.removeEventListener("scroll", measureBoardSize);
    };
  }, [activeConfigSize, activeView, boardLength, boardResetKey, difficulty]);

  return {
    boardAreaWidth: boardSize > 0 ? `${boardSize}px` : `min(100%, ${GAME_AREA_MAX_WIDTH_PX}px)`,
    contentRef,
    controlsRef,
    headerRef,
    hudRef,
    pageShellRef,
    restartRef,
  };
}
