export function getSectionPercentage(part) {
  if (!part.evaluatedCount || !part.indicatorCount) return null;
  return Math.round(Math.min(100, Math.max(0, part.score / part.indicatorCount * 100)) * 10) / 10;
}

export function getOverallPercentage(parts) {
  const percentages = parts.filter(part => !part.unreachable).map(getSectionPercentage).filter(Number.isFinite);
  return percentages.length ? Math.max(...percentages) : null;
}
