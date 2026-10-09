const SEVERITY = { below: 1, moderate: 2, high: 3 };

/** Maximum of the achieved section classifications, not a probability or weighted total. */
export function getOverallOsaRisk(parts) {
  const classified = parts.filter(part => !part.unreachable && Object.hasOwn(SEVERITY, part.level));
  const mostSevere = classified.reduce((result, part) => !result || SEVERITY[part.level] > SEVERITY[result.level] ? part : result, null);
  return {
    level: mostSevere ? mostSevere.level === 'below' ? 'low' : mostSevere.level : null,
    evaluatedSectionCount: classified.length,
    provisional: parts.some(part => part.provisional),
    hasUnavailableSections: parts.some(part => ['unconfigured', 'inconclusive'].includes(part.level)),
  };
}
