export function getSystemRiskTone(percentage) {
  if (!Number.isFinite(percentage)) return 'neutral';
  if (percentage <= 33) return 'low';
  if (percentage <= 67) return 'moderate';
  return 'high';
}
