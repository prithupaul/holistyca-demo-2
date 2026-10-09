import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectionPercentage, getOverallPercentage } from '../src/domain/evaluationPercentage.js';
import { calculateScores } from '../src/domain/scoring.js';

test('section percentages distinguish unknown from zero and normalize available indicators', () => {
  assert.equal(getSectionPercentage({ evaluatedCount: 0, indicatorCount: 8, score: 0 }), null);
  assert.equal(getSectionPercentage({ evaluatedCount: 1, indicatorCount: 8, score: 0 }), 0);
  assert.equal(getSectionPercentage({ evaluatedCount: 3, indicatorCount: 8, score: 3 }), 37.5);
  assert.equal(getSectionPercentage({ evaluatedCount: 3, indicatorCount: 9, score: 3 }), 33.3);
  assert.equal(getOverallPercentage([]), null);
  assert.equal(getOverallPercentage([
    { evaluatedCount: 3, indicatorCount: 8, score: 3 },
    { evaluatedCount: 4, indicatorCount: 4, score: 4 },
  ]), 100);
});

test('Part 2 distinguishes zero known positives from fully evaluated negative answers', () => {
  const answers = {
    body_measurements: { height: 180, weight: 70 }, sex: 'male',
    previous_weight: 70, waist: 80, waist_hip_ratio: 0.8, meals: 3,
  };
  const part = overrides => calculateScores({ ...answers, ...overrides }).parts[1];
  const negative = part({});
  assert.equal(negative.score, 0);
  assert.equal(negative.evaluatedCount, 4);
  assert.equal(negative.level, 'below');
  assert.equal(getSectionPercentage(negative), 0);

  for (const overrides of [{ previous_weight: null }, { sex: 'others' }, { body_measurements: null }]) {
    const incomplete = part(overrides);
    assert.equal(incomplete.complete, true);
    assert.equal(incomplete.level, 'inconclusive');
    assert.ok(incomplete.evaluatedCount < 4);
    assert.equal(getSectionPercentage(incomplete), 0);
  }

  const unknown = part({ previous_weight: null, waist: null, waist_hip_ratio: null, meals: null });
  assert.equal(unknown.evaluatedCount, 0);
  assert.equal(getSectionPercentage(unknown), null);
});

test('Part 2 combines meal follow-ups once and scores all four indicators', () => {
  const answers = {
    body_measurements: { height: 200, weight: 140 }, sex: 'male',
    previous_weight: 100, waist: 95, waist_hip_ratio: 0.9, meals: 5,
    late_snacks: true, last_meal: '23:00',
  };
  const part = calculateScores(answers).parts[1];
  assert.equal(part.score, 4);
  assert.equal(part.indicatorCount, 4);
  assert.equal(part.evaluatedCount, 4);
  assert.equal(part.level, 'high');
  assert.equal(getSectionPercentage(part), 100);
});
