import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSuggestionsByTags, getAvailableSuggestionTags, getRelevantSuggestions, matchesSuggestionCondition } from '../src/domain/suggestionMatching.js';

const condition = (questionId, operator, value) => ({ questionId, operator, value });

test('unknown and not-applicable answers never trigger a suggestion, including dietary omissions', () => {
  for (const diet of [undefined, null, 'not_applicable']) assert.equal(matchesSuggestionCondition(condition('diet', 'not_contains', 'protein'), { diet }), false);
  assert.equal(matchesSuggestionCondition(condition('diet', 'not_contains', 'protein'), { diet: [] }), true);
  assert.equal(matchesSuggestionCondition(condition('diet', 'not_contains', 'protein'), { diet: ['protein'] }), false);
  assert.deepEqual(getRelevantSuggestions({}), []);
});

test('adult suggestions require a known adult age while breathing-pause advice remains available', () => {
  for (const age of [undefined, null, 17]) {
    const suggestions = getRelevantSuggestions({ age, snoring: true, observed_apnea: true });
    assert.ok(suggestions.every(suggestion => suggestion.audience === 'all_ages'));
    assert.ok(suggestions.some(suggestion => suggestion.id === 'observed-breathing-review'));
  }
  assert.ok(getRelevantSuggestions({ age: 18, snoring: true }).some(suggestion => suggestion.id === 'side-sleeping'));
});

test('matching respects applicability, meal-time boundaries and dependent measurements', () => {
  const mealRule = condition('last_meal', 'gt', '22:00');
  assert.equal(matchesSuggestionCondition(mealRule, { meals: 4, last_meal: '23:00' }), false);
  assert.equal(matchesSuggestionCondition(mealRule, { meals: 5, last_meal: '22:00' }), false);
  assert.equal(matchesSuggestionCondition(mealRule, { meals: 5, last_meal: '22:01' }), true);
  const weightRule = condition('previous_weight', 'bmi_category_increased');
  assert.equal(matchesSuggestionCondition(weightRule, { previous_weight: 90 }), false);
  assert.equal(matchesSuggestionCondition(weightRule, { previous_weight: 90, body_measurements: { height: 200, weight: 100 } }), true);
  assert.equal(matchesSuggestionCondition(condition('body_measurements', 'bmi_below', 18.5), { body_measurements: { height: 180, weight: 50 } }), true);
  assert.equal(matchesSuggestionCondition(condition('previous_weight', 'weight_decreased'), { previous_weight: 90, body_measurements: { height: 180, weight: 70 } }), true);
});

test('relevance applies all and exclusion rules and prioritizes safety messages', () => {
  const base = { audience: 'all_ages', relevance: { anyOf: [condition('snoring', 'equals', true)], allOf: [], excludeIf: [] } };
  const catalog = [
    { ...base, id: 'routine', priority: 'routine' },
    { ...base, id: 'safety', priority: 'safety' },
    { ...base, id: 'needs-more', priority: 'important', relevance: { ...base.relevance, allOf: [condition('observed_apnea', 'equals', true)] } },
    { ...base, id: 'excluded', priority: 'important', relevance: { ...base.relevance, excludeIf: [condition('snoring', 'equals', true)] } },
  ];
  assert.deepEqual(getRelevantSuggestions({ snoring: true }, catalog).map(suggestion => suggestion.id), ['safety', 'routine']);
  const actual = getRelevantSuggestions({ age: 35, driving_sleepiness: true, snoring: true });
  assert.equal(actual[0].id, 'drowsy-driving');
});

test('tag search vocabulary is unique and multiple filters require every tag', () => {
  const suggestions = getRelevantSuggestions({ age: 35, snoring: true, diet: [] });
  const tags = getAvailableSuggestionTags(suggestions);
  assert.equal(new Set(tags.map(tag => tag.id)).size, tags.length);
  assert.ok(tags.some(tag => tag.id === 'timeOfDay:night' && tag.label === 'night'));
  const filtered = filterSuggestionsByTags(suggestions, ['timeOfDay:night', 'categories:sleep']);
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(suggestion => suggestion.tags.timeOfDay.includes('night') && suggestion.tags.categories.includes('sleep')));
  assert.deepEqual(filterSuggestionsByTags(suggestions, ['timeOfDay:missing']), []);
  assert.deepEqual(filterSuggestionsByTags(suggestions, []), suggestions);
});
