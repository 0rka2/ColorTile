import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Confetti from "react-confetti";

import { getConfettiViewportSize } from "../confetti-logic";
import type { CosmeticId } from "../shop-catalog";

type ConfettiProps = {
  active: boolean;
  confettiStyle: CosmeticId;
};

function drawStar(context: CanvasRenderingContext2D) {
  const outerRadius = 7;
  const innerRadius = 3.2;

  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (point === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
  context.fill();
}

export function WinConfetti({
  active,
  confettiStyle,
}: Readonly<ConfettiProps>) {
  const [viewportSize, setViewportSize] = useState(() =>
    typeof window === "undefined" ? { width: 0, height: 0 } : getConfettiViewportSize(window),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize(getConfettiViewportSize(window));
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  if (!active || typeof document === "undefined" || viewportSize.width === 0 || viewportSize.height === 0) {
    return null;
  }

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[12] overflow-hidden">
      <Confetti
        colors={["#ff2344", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"]}
        drawShape={confettiStyle === "starburst-confetti" ? drawStar : undefined}
        gravity={0.18}
        initialVelocityY={{ min: 10, max: 22 }}
        numberOfPieces={300}
        recycle={false}
        run={active}
        tweenDuration={8500}
        width={viewportSize.width}
        height={viewportSize.height}
      />
    </div>,
    document.body,
  );
}
