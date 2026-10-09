import test from 'node:test';
import assert from 'node:assert/strict';
import { Question } from '../src/classes/Question.js';
import { User, USER_STORAGE_KEY } from '../src/classes/User.js';
import { questions, getApplicableQuestions, getQuestion, submitAnswer } from '../src/questions.js';
import { calculateScores } from '../src/domain/scoring.js';
import { bmi, bmiCategory } from '../src/domain/measurements.js';

const question = id => questions.find(item => item.id === id);
const risk = (id, value, context = {}) => question(id).evaluate({ ...context, [id]: value });
const coreBaseline = { snoring: false, daytime_fatigue: false, observed_apnea: false, hypertension: false, body_measurements: { height: 180, weight: 70 }, age: 30, neck: 35, sex: 'female' };
const partScore = (answers, part = 1) => calculateScores(answers).parts[part - 1];
function storageMock() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('all 47 questions are class instances with a single valid primary tag and unique ID', () => {
  assert.equal(questions.length, 47);
  assert.equal(new Set(questions.map(item => item.id)).size, questions.length);
  for (const item of questions) {
    assert.ok(item instanceof Question);
    assert.ok(['MB', 'CV', 'PM', 'EC', 'NC', 'CF'].includes(item.system));
    assert.ok(item.relatedSystems.includes(item.system));
  }
  assert.equal(questions.filter(item => item.part === 4).length, 24);
});

test('BMI is calculated without rounding before category assignment', () => {
  assert.equal(bmi(100, 200), 25);
  for (const [value, label] of [[18.4, 'Underweight'], [18.5, 'Normal'], [24.99, 'Normal'], [25, 'Overweight'], [30, 'Obese'], [35, 'Severely obese'], [40, 'Morbidly obese']]) assert.equal(bmiCategory(value).label, label);
  assert.equal(bmiCategory(null), null);
});

test('STOP-BANG BMI starts at 25 and weight changes at greater than 30', () => {
  assert.equal(risk('body_measurements', { height: 200, weight: 99.9 }), false);
  assert.equal(risk('body_measurements', { height: 200, weight: 100 }), true);
  const score = weight => calculateScores({ body_measurements: { height: 200, weight } }).weightedItems.find(item => item.id === 'body_measurements').points;
  assert.equal(score(120), 6);
  assert.equal(score(120.1), 10);
});

test('age, neck, HbA1c, sleep duration and bedtime boundaries follow supplied rules', () => {
  for (const [id, negative, positive] of [['age', 49, 50], ['neck', 39.9, 40], ['hba1c', 5.5, 5.6], ['sleep_hours', 7, 6.9], ['bedtime_variability', 2, 2.1]]) {
    assert.equal(risk(id, negative), false, id);
    assert.equal(risk(id, positive), true, id);
  }
});

test('core score detects moderate and strong suspicion at 3 and 5 points', () => {
  assert.equal(partScore({ ...coreBaseline, snoring: true, daytime_fatigue: true, age: 50 }).level, 'moderate');
  assert.equal(partScore({ ...coreBaseline, snoring: true, daytime_fatigue: true, hypertension: true, age: 50, neck: 40 }).level, 'high');
  assert.equal(partScore(coreBaseline).level, 'below');
});

test('snoring, fatigue and observed apnea produce strong suspicion at only 3 points', () => {
  const scores = calculateScores({ ...coreBaseline, snoring: true, daytime_fatigue: true, observed_apnea: true });
  assert.equal(scores.parts[0].score, 3);
  assert.equal(scores.parts[0].level, 'high');
  assert.equal(scores.coreWeightedSubtotal, 29);
});

test('hypertension, age and male sex alone do not trigger suspicion or weighted additions', () => {
  const scores = calculateScores({ ...coreBaseline, hypertension: true, age: 60, sex: 'male' });
  assert.equal(scores.parts[0].positiveCount, 3);
  assert.equal(scores.parts[0].score, 0);
  assert.equal(scores.parts[0].level, 'below');
  assert.equal(scores.coreWeightedSubtotal, 0);
});

test('fatigue weighting and resistant hypertension are recalculated as answers arrive', () => {
  const initial = calculateScores({ daytime_fatigue: true, hypertension: true });
  assert.equal(initial.coreWeightedSubtotal, 13);
  assert.equal(calculateScores({ daytime_fatigue: true, hypertension: true, resistant_hypertension: true }).coreWeightedSubtotal, 16);
  assert.equal(calculateScores({ daytime_fatigue: true, snoring: true, observed_apnea: true }).weightedItems.find(item => item.id === 'daytime_fatigue').points, 9);
});

test('unknown core answers produce incomplete data rather than a reassuring low classification', () => {
  assert.equal(partScore({ ...coreBaseline, snoring: null }).level, 'inconclusive');
  assert.equal(partScore({}).level, 'pending');
});

test('sex-specific waist and waist-to-hip thresholds are inclusive', () => {
  for (const [sex, waist, ratio] of [['male', 95, 0.9], ['female', 90, 0.85]]) {
    assert.equal(risk('waist', waist - 0.1, { sex }), false);
    assert.equal(risk('waist', waist, { sex }), true);
    assert.equal(risk('waist_hip_ratio', ratio - 0.01, { sex }), false);
    assert.equal(risk('waist_hip_ratio', ratio, { sex }), true);
  }
  assert.equal(risk('waist', 100, { sex: null }), null);
  assert.equal(risk('waist_hip_ratio', 1, { sex: 'others' }), null);
});

test('weight change counts category movement rather than any weight gain', () => {
  assert.equal(risk('previous_weight', 90, { body_measurements: { height: 200, weight: 100 } }), true);
  assert.equal(risk('previous_weight', 100, { body_measurements: { height: 200, weight: 110 } }), false);
  assert.equal(risk('previous_weight', 110, { body_measurements: { height: 200, weight: 90 } }), false);
  assert.equal(risk('previous_weight', 90, { body_measurements: null }), null);
});

test('meal and diabetes follow-ups appear only under the document conditions', () => {
  const ids = answers => getApplicableQuestions(answers).map(item => item.id);
  assert.ok(!ids({ meals: 4, diabetes: false }).includes('late_snacks'));
  assert.ok(!ids({ meals: 4, diabetes: null }).includes('insulin_switch'));
  assert.ok(ids({ meals: 5, diabetes: true }).includes('late_snacks'));
  assert.ok(ids({ meals: 5, diabetes: true }).includes('last_meal'));
  assert.ok(ids({ meals: 5, diabetes: true }).includes('insulin_switch'));
});

test('late meals use strictly after 22:00; meal follow-ups are one combined indicator', () => {
  assert.equal(risk('meals', 4), false);
  assert.equal(risk('meals', 5, { late_snacks: false, last_meal: '22:00' }), false);
  assert.equal(risk('meals', 5, { late_snacks: false, last_meal: '22:01' }), true);
  assert.equal(risk('meals', 5, { late_snacks: true, last_meal: '21:00' }), true);
  assert.equal(risk('meals', 5, { late_snacks: null, last_meal: '21:00' }), null);
  assert.equal(partScore({ meals: 5, late_snacks: true, last_meal: '23:00' }, 2).positiveCount, 1);
});

test('Part 2 reaches moderate at 3 and high at 4 indicators', () => {
  const answers = { sex: 'male', body_measurements: { height: 200, weight: 140 }, previous_weight: 100, waist: 95, waist_hip_ratio: 0.9, meals: 3 };
  assert.equal(partScore(answers, 2).level, 'moderate');
  assert.equal(partScore({ ...answers, meals: 5, late_snacks: true, last_meal: '23:00' }, 2).level, 'high');
});

test('a diet is positive if any component is inadequate; an empty selection is a valid positive answer', () => {
  assert.equal(risk('diet', ['plants', 'protein', 'fats', 'water']), false);
  assert.equal(risk('diet', ['plants', 'protein', 'water']), true);
  assert.equal(risk('diet', []), true);
  assert.deepEqual(question('diet').normalize([]), []);
});

test('Part 3 reaches moderate at 3 and high at 6 indicators', () => {
  assert.equal(partScore({ diet: [], interrupted_sleep: true, sleep_hours: 6 }, 3).level, 'moderate');
  assert.equal(partScore({ diet: [], interrupted_sleep: true, sleep_hours: 6, bedtime_variability: 3, hypothyroidism: true, diabetes: true }, 3).level, 'high');
});

test('Part 4 uses 4-9 positives for moderate and 10 or more for high risk', () => {
  const items = questions.filter(item => item.part === 4);
  for (const [count, expected] of [[0, 'below'], [3, 'below'], [4, 'moderate'], [9, 'moderate'], [10, 'high'], [24, 'high']]) {
    const answers = Object.fromEntries(items.map((item, index) => [item.id, index < count]));
    const result = partScore(answers, 4);
    assert.equal(result.positiveCount, count);
    assert.equal(result.complete, true);
    assert.equal(result.level, expected);
    assert.equal(result.unreachable, false);
  }
});

test('system percentages count only known indicators and do not double-count associations', () => {
  const scores = calculateScores({ snoring: true, neck: false, sex: null, daytime_fatigue: true, cognitive_changes: false });
  const cf = scores.systems.find(item => item.tag === 'CF');
  assert.equal(cf.positiveCount, 1);
  assert.equal(cf.evaluatedCount, 2);
  assert.equal(cf.positivePercentage, 50);
  assert.equal(cf.contributionPercentage, 50);
  assert.equal(cf.unknownCount, 1);
  assert.equal(scores.systems.find(item => item.tag === 'EC').positivePercentage, null);
  assert.equal(scores.systems.reduce((total, item) => total + item.positiveCount, 0), scores.positiveTotal);
});

test('not applicable is excluded from known counts and distinguished from unknown', () => {
  const scores = calculateScores({ pcod: 'not_applicable', diabetes: null });
  const system = scores.systems.find(item => item.tag === 'EC');
  assert.equal(system.notApplicableCount, 1);
  assert.equal(system.unknownCount, 1);
  assert.equal(system.evaluatedCount, 0);
});

test('numeric validation rejects blanks, invalid ranges and fractional age or meals', () => {
  for (const value of ['', undefined, 'abc', 0, 130, 30.5, true]) assert.throws(() => question('age').normalize(value));
  assert.equal(question('age').normalize('50'), 50);
  assert.throws(() => question('body_measurements').normalize({ height: 170, weight: '' }));
  assert.throws(() => question('last_meal').normalize('25:00'));
  assert.equal(question('last_meal').normalize('22:01'), '22:01');
});

test('user appends tagged and timestamped answers and updates risk status on dependent answers', () => {
  const original = new User();
  const first = original.withAnswer(question('meals'), 5);
  assert.equal(first.answers[0].riskPositive, null);
  const second = first.withAnswer(question('late_snacks'), true);
  assert.equal(original.answers.length, 0);
  assert.equal(second.answers[0].riskPositive, true);
  assert.equal(second.answers[1].system, 'MB');
  assert.equal(second.answers[1].part, 2);
  assert.ok(second.answers[1].answeredAt);
});

test('changing a parent prunes obsolete conditional answers and adjusts scoring', () => {
  let user = new User().withAnswer(question('diabetes'), true).withAnswer(question('insulin_switch'), true);
  assert.equal(user.scores.parts[2].positiveCount, 2);
  user = user.withAnswer(question('diabetes'), false);
  assert.equal(user.hasAnswer('insulin_switch'), false);
  assert.equal(user.scores.parts[2].positiveCount, 0);
});

test('local storage round-trip restores class, identity, dates, progress and calculated results', async () => {
  const storage = storageMock();
  let user = new User().withAnswer(question('snoring'), true).withAnswer(question('daytime_fatigue'), null);
  user.save(storage);
  const saved = JSON.parse(storage.getItem(USER_STORAGE_KEY));
  assert.equal(saved.answers.length, 2);
  assert.equal(saved.scores.systems.find(item => item.tag === 'CF').positivePercentage, 100);
  const restored = User.load(storage);
  assert.ok(restored instanceof User);
  assert.equal(restored.id, user.id);
  assert.equal(restored.updatedAt, user.updatedAt);
  assert.deepEqual(restored.answers, user.answers);
  assert.deepEqual(restored.scores, user.scores);
  assert.equal((await getQuestion(restored)).id, 'observed_apnea');
});

test('restoration recomputes stored scores and is independent of parent entry order', () => {
  const storage = storageMock();
  const user = new User().withAnswer(question('diabetes'), true).withAnswer(question('insulin_switch'), true).withAnswer(question('diabetes'), true);
  const saved = user.toJSON();
  saved.scores.positiveTotal = 999;
  storage.setItem(USER_STORAGE_KEY, JSON.stringify(saved));
  const restored = User.load(storage);
  assert.equal(restored.hasAnswer('insulin_switch'), true);
  assert.equal(restored.scores.positiveTotal, 2);
});

test('invalid or unavailable storage fails explicitly rather than silently losing data', () => {
  const storage = storageMock();
  storage.setItem(USER_STORAGE_KEY, '{bad json');
  assert.throws(() => User.load(storage));
  assert.throws(() => new User().save({ setItem() { throw new Error('Quota'); } }), /Could not save/);
});

test('submission persists before resolving and completion follows only the applicable branch', async () => {
  const storage = storageMock();
  const oldStorage = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    let user = new User();
    let current;
    while ((current = await getQuestion(user))) user = await submitAnswer(user, current.id, null);
    assert.equal(user.answers.length, 44);
    assert.equal(user.scores.complete, true);
    assert.equal(JSON.parse(storage.getItem(USER_STORAGE_KEY)).scores.complete, true);
    assert.equal(await getQuestion(User.load(storage)), null);
  } finally {
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  }
});

test('a complete positive path scores all sections and recomputes the final weighted subtotal', async () => {
  const numbers = { age: 60, neck: 45, previous_weight: 70, waist: 100, waist_hip_ratio: 1, meals: 5, sleep_hours: 6, bedtime_variability: 3, hba1c: 7 };
  let user = new User();
  let current;
  while ((current = await getQuestion(user))) {
    const value = current.type === 'number' ? numbers[current.id]
      : current.type === 'measurements' ? { height: 170, weight: 100 }
      : current.type === 'checklist' ? []
      : current.type === 'time' ? '23:00'
      : current.id === 'sex' ? 'male' : true;
    user = user.withAnswer(current, value);
  }
  assert.equal(user.answers.length, 47);
  assert.equal(user.scores.complete, true);
  assert.deepEqual(user.scores.parts.map(part => part.positiveCount), [8, 4, 9, 24]);
  assert.deepEqual(user.scores.parts.map(part => part.level), ['high', 'high', 'high', 'high']);
  assert.equal(user.scores.coreWeightedSubtotal, 61);
  assert.equal(user.scores.positiveTotal, 45);
  assert.ok(user.scores.systems.every(system => system.positivePercentage === 100));
});

test('a failed storage write never advances the original user', async () => {
  const oldStorage = globalThis.localStorage;
  globalThis.localStorage = { setItem() { throw new Error('Storage full'); } };
  const user = new User();
  try {
    await assert.rejects(submitAnswer(user, 'snoring', true), /Could not save/);
    assert.equal(user.answers.length, 0);
    assert.equal((await getQuestion(user)).id, 'snoring');
  } finally {
    if (oldStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = oldStorage;
  }
});
