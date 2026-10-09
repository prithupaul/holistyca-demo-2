const prefix = 'holistyca.suggestion-reads.v1:';

export function loadSuggestionReads(userId, storage = globalThis.localStorage) {
  try {
    const ids = JSON.parse(storage?.getItem(prefix + userId) ?? '[]');
    return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []);
  } catch { return new Set(); }
}

export function saveSuggestionReads(userId, ids, storage = globalThis.localStorage) {
  try { storage?.setItem(prefix + userId, JSON.stringify([...ids])); } catch { /* Keep read state for this session if storage is unavailable. */ }
}

export function countUnreadSuggestions(suggestions, readIds) {
  return suggestions.reduce((count, suggestion) => count + Number(!readIds.has(suggestion.id)), 0);
}
