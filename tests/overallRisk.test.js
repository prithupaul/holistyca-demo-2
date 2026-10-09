import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverallOsaRisk } from '../src/domain/overallRisk.js';
import { calculateScores } from '../src/domain/scoring.js';
import { User } from '../src/classes/User.js';
import { createDemoProfile } from '../src/domain/demoProfiles.js';
import { questions } from '../src/questions.js';

test('overall risk takes the most severe result from any of the four sections', () => {
  for (let index = 0; index < 4; index++) {
    const parts = Array.from({ length: 4 }, (_, part) => ({ level: part === index ? 'high' : 'moderate', provisional: false }));
    assert.equal(getOverallOsaRisk(parts).level, 'high');
  }
  assert.equal(getOverallOsaRisk([{ level: 'below' }, { level: 'moderate' }]).level, 'moderate');
  assert.equal(getOverallOsaRisk([{ level: 'below' }]).level, 'low');
});

test('pending, inconclusive, or unreachable sections never imply low risk', () => {
  assert.equal(getOverallOsaRisk([{ level: 'pending' }, { level: 'inconclusive' }, { level: 'unconfigured', unreachable: true }]).level, null);
  assert.equal(getOverallOsaRisk([{ level: 'high', unreachable: true }]).level, null);
  assert.equal(getOverallOsaRisk([]).level, null);
  assert.equal(calculateScores({}).overallRisk.level, null);
});

test('partial moderate and strong core suspicion immediately update the overall label', () => {
  const moderate = calculateScores({ snoring: true, daytime_fatigue: true, neck: 40 });
  assert.equal(moderate.overallRisk.level, 'moderate');
  assert.equal(moderate.overallRisk.provisional, true);
  const high = calculateScores({ snoring: true, daytime_fatigue: true, observed_apnea: true });
  assert.equal(high.overallRisk.level, 'high');
});

test('a completed low section maps to low while unfinished sections remain provisional', () => {
  const score = calculateScores({ snoring: false, daytime_fatigue: false, observed_apnea: false, hypertension: false, body_measurements: { height: 180, weight: 70 }, age: 30, neck: 35, sex: 'female' });
  assert.equal(score.overallRisk.level, 'low');
  assert.equal(score.overallRisk.provisional, true);
  assert.equal(score.overallRisk.evaluatedSectionCount, 1);
});

test('overall risk is saved and restored with the profile and disappears after clearing', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const user = createDemoProfile('all', () => 0).withAnswer(questions.find(question => question.id === 'observed_apnea'), true);
  user.save(storage);
  assert.equal(User.load(storage).scores.overallRisk.level, 'high');
  assert.equal(User.clearData(storage).scores.overallRisk.level, null);
});
