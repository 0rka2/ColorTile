function clampQuality(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function getGradientQuality(completion: number) {
  const safeCompletion = clampQuality(completion);
  if (safeCompletion === 0 || safeCompletion === 100) {
    return safeCompletion;
  }

  const progress = safeCompletion / 100;
  return clampQuality(Math.round(100 * Math.pow(progress, 0.7)));
}

export function getGradientQualityFill(completion: number) {
  return clampQuality(completion);
}
