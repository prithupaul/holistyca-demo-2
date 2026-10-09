// Only unambiguous text is converted into a evaluation value. Other text stays unscored.
export function parseTextAnswer(question, text) {
  const cleaned = text.trim().toLowerCase().replace(/[?']/g, '');
  if (!cleaned) throw new Error('Enter an answer.');
  if (['unknown', 'i dont know', 'dont know', 'not sure', 'prefer not to say'].includes(cleaned)) return null;
  if (question.type === 'choice') {
    const option = question.options.find(item => String(item.value).toLowerCase() === cleaned || item.label.toLowerCase().replace(/[?']/g, '') === cleaned);
    return option ? option.value : null;
  }
  if (question.type === 'number') {
    const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*(?:years?|cm|kg|hours?|meals?|%)?$/);
    return match ? question.normalize(match[1]) : null;
  }
  if (question.type === 'measurements') {
    const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:cm)?\s*(?:,|\/|;|and|\s)\s*(\d+(?:\.\d+)?)\s*(?:kg)?$/);
    return match ? question.normalize({ height: match[1], weight: match[2] }) : null;
  }
  if (question.type === 'time') {
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
    if (!match) return null;
    let hour = Number(match[1]);
    if (match[3]) {
      if (hour < 1 || hour > 12) throw new Error('Enter a valid time.');
      hour = hour % 12 + (match[3] === 'pm' ? 12 : 0);
    }
    return question.normalize(String(hour).padStart(2, '0') + ':' + match[2]);
  }
  if (question.type === 'checklist') {
    if (['none', 'none of these'].includes(cleaned)) return [];
    const tokens = cleaned.split(/[,;]/).map(token => token.trim());
    const options = tokens.map(token => question.options.find(item => item.value.toLowerCase() === token || item.label.toLowerCase() === token));
    return options.every(Boolean) ? options.map(option => option.value) : null;
  }
  return null;
}
