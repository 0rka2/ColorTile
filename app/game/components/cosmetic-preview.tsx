import type { CSSProperties } from "react";

import type { CosmeticDefinition } from "../shop-catalog";
import { FloatingClouds } from "./floating-clouds";
import { StarfieldTwinkles } from "./starfield-twinkles";

type CosmeticPreviewProps = {
  item: CosmeticDefinition;
};

export function CosmeticPreview({
  item,
}: Readonly<CosmeticPreviewProps>) {
  if (item.slot === "tile-style") {
    const tileStyleClass = `tile-style-${item.id.replace("-tiles", "")}`;

    return (
      <div className="shop-preview-grid" aria-hidden="true">
        {["#fb7185", "#fbbf24", "#34d399", "#60a5fa"].map((color) => (
          <span
            key={color}
            className={`shop-preview-tile ${tileStyleClass}`}
            style={{
              backgroundColor: item.id === "gem-tiles" ? undefined : color,
              "--tile-color": color,
            } as CSSProperties}
          />
        ))}
      </div>
    );
  }

  if (item.slot === "board-theme") {
    return (
      <div
        aria-hidden="true"
        className="shop-preview-board"
        data-preview-board-theme={item.id}
      >
        <div>
          {["#38bdf8", "#2dd4bf", "#818cf8", "#34d399"].map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
    );
  }

  if (item.slot === "background-style") {
    return (
      <div
        aria-hidden="true"
        className="shop-preview-background"
        data-preview-background={item.id}
      >
        {item.id === "starfield-background" && <StarfieldTwinkles />}
        {item.id === "clouds-background" && <FloatingClouds />}
        <span className="shop-preview-background-header" />
        <span className="shop-preview-background-board">
          <span />
          <span />
          <span />
          <span />
        </span>
      </div>
    );
  }

  if (item.slot === "swap-effect") {
    return (
      <div
        aria-hidden="true"
        className={`shop-preview-effect shop-preview-swap shop-preview-${item.id}`}
      >
        <span className="shop-preview-swap-start" />
        <span className="shop-preview-swap-path" />
        <span className="shop-preview-swap-end" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`shop-preview-effect shop-preview-completion shop-preview-${item.id}`}
    >
      <span className="shop-preview-mini-board">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="shop-preview-completion-overlay" />
    </div>
  );
}
