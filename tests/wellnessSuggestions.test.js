import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questions } from '../src/questions.js';

const read = file => JSON.parse(readFileSync(new URL('../src/data/' + file, import.meta.url), 'utf8'));
const suggestions = read('wellnessSuggestions.json');
const sources = read('wellnessSuggestionSources.json');
const schema = read('wellnessSuggestions.schema.json');
const questionMap = new Map(questions.map(question => [question.id, question]));
const sourceMap = new Map(sources.map(source => [source.id, source]));

test('suggestion catalog covers every questionnaire input with unique IDs and consistent tags', () => {
  assert.ok(Array.isArray(suggestions) && suggestions.length > 0);
  assert.equal(new Set(suggestions.map(row => row.id)).size, suggestions.length);
  const covered = new Set();
  for (const row of suggestions) {
    assert.deepEqual(Object.keys(row).sort(), schema.items.required.toSorted());
    assert.match(row.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(row.title.trim() && row.suggestion.trim(), row.id);
    assert.ok(row.questionIds.length > 0, row.id);
    assert.equal(new Set(row.questionIds).size, row.questionIds.length);
    for (const id of row.questionIds) {
      assert.ok(questionMap.has(id), `${row.id}: unknown question ${id}`);
      covered.add(id);
    }
    assert.ok(Object.values(row.tags).flat().length <= 3, `${row.id}: too many tags`);
    for (const key of ['timeOfDay', 'events', 'categories']) {
      const allowed = schema.items.properties.tags.properties[key].items.enum;
      assert.ok(row.tags[key].length >= schema.items.properties.tags.properties[key].minItems, row.id);
      assert.ok(row.tags[key].length <= 1, `${row.id}: multiple ${key} tags`);
      assert.equal(new Set(row.tags[key]).size, row.tags[key].length);
      for (const tag of row.tags[key]) assert.ok(allowed.includes(tag), `${row.id}: invalid ${key} tag ${tag}`);
    }
    for (const key of ['audience', 'priority']) assert.ok(schema.items.properties[key].enum.includes(row[key]));
    assert.ok(row.contextNotes.every(note => typeof note === 'string' && note.trim()));
  }
  assert.deepEqual([...covered].sort(), [...questionMap.keys()].sort());
});

test('suggestion conditions use valid questionnaire types and include required dependencies', () => {
  for (const row of suggestions) {
    assert.ok(row.relevance.anyOf.length > 0);
    for (const rule of [...row.relevance.anyOf, ...row.relevance.allOf, ...row.relevance.excludeIf]) {
      const question = questionMap.get(rule.questionId);
      assert.ok(question && row.questionIds.includes(question.id), row.id);
      assert.ok(schema.$defs.condition.properties.operator.enum.includes(rule.operator));
      if (rule.operator === 'risk_positive') {
        assert.ok(question.indicator && question.rule !== 'none', row.id);
        if (question.condition) assert.ok(row.questionIds.includes(question.condition.questionId), row.id);
      } else if (rule.operator === 'not_contains') {
        assert.equal(question.type, 'checklist');
        assert.ok(question.options.some(option => option.value === rule.value));
      } else if (['gt', 'gte'].includes(rule.operator)) {
        assert.ok(['number', 'time'].includes(question.type));
        if (question.type === 'number') assert.ok(Number.isFinite(rule.value));
        else assert.match(rule.value, /^([01]\d|2[0-3]):[0-5]\d$/);
      } else if (rule.operator === 'equals') {
        assert.ok(question.options.some(option => option.value === rule.value));
      } else if (rule.operator === 'bmi_below') {
        assert.equal(question.id, 'body_measurements');
        assert.ok(Number.isFinite(rule.value));
      } else if (['bmi_category_increased', 'weight_decreased'].includes(rule.operator)) {
        assert.equal(question.id, 'previous_weight');
        assert.ok(row.questionIds.includes('body_measurements'), row.id);
      }
      if (['equals', 'gt', 'gte', 'not_contains', 'bmi_below'].includes(rule.operator)) assert.ok(Object.hasOwn(rule, 'value'));
      else assert.ok(!Object.hasOwn(rule, 'value'));
    }
  }
});

test('source references resolve and supplied PDF pages are valid', () => {
  assert.equal(sourceMap.size, sources.length);
  for (const source of sources) {
    if (source.type === 'web') {
      assert.equal(new URL(source.url).protocol, 'https:');
      assert.match(source.accessedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
  for (const row of suggestions) {
    assert.ok(row.sourceReferences.length > 0);
    for (const ref of row.sourceReferences) {
      const source = sourceMap.get(ref.sourceId);
      assert.ok(source, `${row.id}: missing source ${ref.sourceId}`);
      if (source.type === 'provided_document') {
        assert.ok(ref.pages.length > 0);
        assert.ok(ref.pages.every(page => Number.isInteger(page) && page >= 1 && page <= source.pages));
      }
    }
  }
  for (const id of ['nutrition_pdf', 'wellness_pdf']) assert.ok(suggestions.some(row => row.sourceReferences.some(ref => ref.sourceId === id)));
});
