import catalog from '../data/wellnessSuggestions.json' with { type: 'json' };
import { questions } from '../questions.js';
import { bmi, bmiCategory } from './measurements.js';

const questionMap = new Map(questions.map(question => [question.id, question]));
const priority = { safety: 0, important: 1, routine: 2 };

export function matchesSuggestionCondition(condition, answers) {
  const question = questionMap.get(condition.questionId);
  const value = answers[condition.questionId];
  if (!question || !question.isApplicable(answers) || value === undefined || value === null || value === 'not_applicable') return false;
  // Validate inputs before evaluating dependent measurements or numeric comparisons.
  try { question.normalize(value); } catch { return false; }
  switch (condition.operator) {
    case 'risk_positive':
      try { return question.evaluate(answers) === true; } catch { return false; }
    case 'equals': return value === condition.value;
    case 'gt':
    case 'gte': {
      const comparable = question.type === 'time' ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : value;
      const threshold = question.type === 'time' ? Number(condition.value.slice(0, 2)) * 60 + Number(condition.value.slice(3)) : condition.value;
      if (typeof comparable !== 'number' || !Number.isFinite(comparable)) return false;
      return condition.operator === 'gt' ? comparable > threshold : comparable >= threshold;
    }
    case 'not_contains': return Array.isArray(value) && !value.includes(condition.value);
    case 'bmi_below': {
      const calculated = bmi(value.weight, value.height);
      return calculated !== null && calculated < condition.value;
    }
    case 'bmi_category_increased':
    case 'weight_decreased': {
      const current = answers.body_measurements;
      try { questionMap.get('body_measurements').normalize(current); } catch { return false; }
      if (condition.operator === 'weight_decreased') return current.weight < value;
      return bmiCategory(bmi(current.weight, current.height)).index > bmiCategory(bmi(value, current.height)).index;
    }
    default: return false;
  }
}

export function getRelevantSuggestions(answers, suggestions = catalog) {
  return suggestions.filter(suggestion => {
    if (suggestion.audience === 'adults' && (!Number.isFinite(answers.age) || answers.age < 18)) return false;
    const match = rule => matchesSuggestionCondition(rule, answers);
    return suggestion.relevance.anyOf.some(match)
      && suggestion.relevance.allOf.every(match)
      && !suggestion.relevance.excludeIf.some(match);
  }).sort((a, b) => priority[a.priority] - priority[b.priority]);
}

export const tagTypes = { timeOfDay: 'Time of day', events: 'Event', categories: 'Category' };

export function getSuggestionTags(suggestion) {
  return Object.entries(suggestion.tags).flatMap(([type, values]) => values.map(value => ({
    id: `${type}:${value}`, type, value, label: value.replaceAll('_', ' '),
  })));
}

export function getAvailableSuggestionTags(suggestions) {
  const typeOrder = Object.keys(tagTypes);
  return [...new Map(suggestions.flatMap(getSuggestionTags).map(tag => [tag.id, tag])).values()]
    .sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.label.localeCompare(b.label));
}

export function filterSuggestionsByTags(suggestions, filters) {
  return suggestions.filter(suggestion => {
    const tags = new Set(getSuggestionTags(suggestion).map(tag => tag.id));
    return filters.every(filter => tags.has(filter));
  });
}
