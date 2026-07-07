export type ViewportLike = {
  innerWidth: number;
  innerHeight: number;
};

export function getConfettiViewportSize(viewport?: ViewportLike | null) {
  return {
    width: Math.max(0, Math.floor(viewport?.innerWidth ?? 0)),
    height: Math.max(0, Math.floor(viewport?.innerHeight ?? 0)),
  };
}
