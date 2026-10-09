import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoProfile, saveDemoProfile } from '../src/domain/demoProfiles.js';
import { User, USER_STORAGE_KEY } from '../src/classes/User.js';
import { getApplicableQuestions, getQuestion, questions } from '../src/questions.js';

function seededRandom(seed) {
  let state = seed;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
}

test('answer all generates a new complete profile with valid answers on every applicable branch', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const user = createDemoProfile('all', seededRandom(seed));
    assert.ok(user instanceof User);
    assert.equal(user.scores.complete, true);
    assert.equal(user.answers.length, getApplicableQuestions(user.answerMap).length);
    for (const entry of user.answers) {
      const question = questions.find(item => item.id === entry.questionId);
      assert.deepEqual(question.normalize(entry.value), entry.value);
      assert.equal(question.isApplicable(user.answerMap), true);
    }
  }
});

test('answer some fills between 25% and 50% and resumes at the next unanswered question', async () => {
  for (let seed = 1; seed <= 100; seed++) {
    const user = createDemoProfile('some', seededRandom(seed));
    const proportion = user.scores.answeredCount / user.scores.totalQuestions;
    assert.ok(proportion >= 0.25 && proportion <= 0.5, `${seed}: ${proportion}`);
    assert.equal(user.scores.complete, false);
    const applicable = getApplicableQuestions(user.answerMap);
    assert.deepEqual(user.answers.map(entry => entry.questionId), applicable.slice(0, user.answers.length).map(question => question.id));
    assert.equal((await getQuestion(user)).id, applicable[user.answers.length].id);
  }
});

test('boundary random values keep partial profiles within the requested range', () => {
  for (const random of [() => 0, () => 0.999999]) {
    const user = createDemoProfile('some', random);
    assert.ok(user.scores.answeredCount >= user.scores.totalQuestions * 0.25);
    assert.ok(user.scores.answeredCount <= user.scores.totalQuestions * 0.5);
  }
});

test('demo generation respects both skipped and included conditional follow-ups', () => {
  const first = createDemoProfile('all', () => 0);
  assert.equal(first.hasAnswer('late_snacks'), false);
  assert.equal(first.hasAnswer('last_meal'), false);
  assert.equal(first.hasAnswer('insulin_switch'), true);
  const second = createDemoProfile('all', () => 0.999999);
  assert.equal(second.hasAnswer('late_snacks'), true);
  assert.equal(second.hasAnswer('last_meal'), true);
  assert.equal(second.hasAnswer('insulin_switch'), false);
  assert.notEqual(first.id, second.id);
});

test('creating a demo profile replaces the saved profile and restores identical answers and scores', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const existing = new User().withAnswer(questions[0], null);
  existing.save(storage);
  for (const mode of ['all', 'some']) {
    const generated = saveDemoProfile(mode, storage, seededRandom(12));
    assert.notEqual(generated.id, existing.id);
    const restored = User.load(storage);
    assert.equal(restored.id, generated.id);
    assert.deepEqual(restored.answers, generated.answers);
    assert.deepEqual(restored.scores, generated.scores);
  }
  assert.ok(data.has(USER_STORAGE_KEY));
});

test('storage failure leaves the existing saved profile intact', () => {
  let stored = 'previous profile';
  const storage = { getItem: () => stored, setItem() { throw new Error('Storage full'); } };
  assert.throws(() => saveDemoProfile('all', storage, seededRandom(1)), /Could not save/);
  assert.equal(stored, 'previous profile');
  assert.throws(() => createDemoProfile('invalid'), /valid demo/);
});
