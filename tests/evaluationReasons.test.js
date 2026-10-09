import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverallReasons, getPositiveReasons } from '../src/domain/evaluationReasons.js';
import { User } from '../src/classes/User.js';
import { questions } from '../src/questions.js';
import { explainPositive } from '../src/domain/positiveExplanation.js';

const withAnswers = values => Object.entries(values).reduce((user, [id, value]) => user.withAnswer(questions.find(question => question.id === id), value), new User());

test('overall reasons include all sections tied for highest rating and use contribution, not system positive percentage', () => {
  const groups = getOverallReasons({
    overallRisk: { level: 'high' }, positiveTotal: 10,
    parts: [
      { shortTitle: 'STOPBANG', level: 'high' },
      { shortTitle: 'Weight & eating', level: 'high' },
      { shortTitle: 'Sleep & metabolism', level: 'moderate' },
    ],
    systems: [
      { label: 'Metabolic health', positiveCount: 6, contributionPercentage: 60, positivePercentage: 30 },
      { label: 'Cardiovascular health', positiveCount: 4, contributionPercentage: 40, positivePercentage: 100 },
    ],
  });
  assert.equal(groups[0].items.length, 2);
  assert.deepEqual(groups[1].items, ['Metabolic health: 60% of all positive indicators (6 of 10).']);
  assert.equal(getOverallReasons({ overallRisk: { level: null }, parts: [], positiveTotal: 2, systems: [{ positiveCount: 1 }] })[1].items.length, 0);
});

test('positive reasons exclude negative and unknown answers and respect primary system tags', () => {
  const user = withAnswers({ snoring: true, daytime_fatigue: false, observed_apnea: null, age: 55 });
  assert.equal(getPositiveReasons(user, { partId: 1 })[0].items.length, 2);
  assert.equal(getPositiveReasons(user, { systemTag: 'CF' })[0].items.length, 1);
  assert.equal(getPositiveReasons(user, { systemTag: 'NC' })[0].items.length, 0);
});

test('meal explanation includes its follow-ups once as one combined indicator', () => {
  const user = withAnswers({ meals: 5, late_snacks: false, last_meal: '23:00' });
  const items = getPositiveReasons(user, { partId: 2 })[0].items;
  assert.equal(items.length, 1);
  assert.ok(items[0].includes('5 meals'));
  assert.ok(items[0].includes('23:00'));
  assert.ok(items[0].includes('after 22:00'));
  assert.ok(!items[0].includes('late-night snacks'));
});

test('every positive indicator has a natural explanation rather than a question and answer', () => {
  const numbers = { age: 60, neck: 45, previous_weight: 70, waist: 100, waist_hip_ratio: 1, meals: 5, sleep_hours: 6, bedtime_variability: 3, hba1c: 7 };
  const answers = Object.fromEntries(questions.map(question => [question.id,
    question.type === 'number' ? numbers[question.id]
      : question.type === 'measurements' ? { height: 170, weight: 100 }
      : question.type === 'checklist' ? []
      : question.type === 'time' ? '23:00'
      : question.id === 'sex' ? 'male' : true,
  ]));
  for (const question of questions.filter(question => question.indicator)) {
    assert.equal(question.evaluate(answers), true, question.id);
    const explanation = explainPositive(question, answers);
    assert.ok(explanation.length > 20, question.id);
    assert.ok(!explanation.includes('?'), question.id);
    assert.ok(!explanation.includes(question.text), question.id);
  }
});

test('diet and measurement explanations name the specific missing inputs and category change', () => {
  const user = withAnswers({ body_measurements: { height: 200, weight: 100 }, previous_weight: 90, diet: ['plants', 'protein', 'water'] });
  const weight = getPositiveReasons(user, { partId: 2 })[0];
  assert.equal(weight.title, undefined);
  assert.ok(weight.items[0].includes('from normal to overweight'));
  const diet = getPositiveReasons(user, { partId: 3 })[0].items[0];
  assert.ok(diet.includes('inadequate intake of healthy fats'));
  assert.ok(!diet.includes('lean protein'));
});

test('STOPBANG reasons explain classic triad and supporting indicators', () => {
  const triad = withAnswers({ snoring: true, daytime_fatigue: true, observed_apnea: true });
  assert.ok(getPositiveReasons(triad, { partId: 1 }).some(group => group.title === 'Rating rule'));
  const supporting = withAnswers({ age: 60 });
  assert.ok(getPositiveReasons(supporting, { partId: 1 }).some(group => group.title === 'Scoring note'));
});
