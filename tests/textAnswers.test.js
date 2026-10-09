import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTextAnswer } from '../src/domain/textAnswers.js';
import { questions } from '../src/questions.js';
import { User } from '../src/classes/User.js';
const q = id => questions.find(question => question.id === id);

test('typed choices and numbers normalize to existing screening answers', () => {
  assert.equal(parseTextAnswer(q('snoring'), ' Yes '), true);
  assert.equal(parseTextAnswer(q('snoring'), 'no'), false);
  assert.equal(parseTextAnswer(q('snoring'), "I don't know"), null);
  assert.equal(parseTextAnswer(q('sex'), 'Female'), 'female');
  assert.equal(parseTextAnswer(q('sleep_hours'), '7 hours'), 7);
  assert.throws(() => parseTextAnswer(q('age'), '35.5 years'), /whole number/);
  assert.throws(() => parseTextAnswer(q('age'), '130'), /between/);
  assert.throws(() => parseTextAnswer(q('snoring'), '   '), /Enter an answer/);
});

test('typed measurements, times and diet selections use the original validation', () => {
  assert.deepEqual(parseTextAnswer(q('body_measurements'), '170 cm, 70 kg'), { height: 170, weight: 70 });
  assert.equal(parseTextAnswer(q('last_meal'), '10:30 pm'), '22:30');
  assert.equal(parseTextAnswer(q('last_meal'), '12:00 am'), '00:00');
  assert.throws(() => parseTextAnswer(q('last_meal'), '25:00'), /valid time/);
  assert.deepEqual(parseTextAnswer(q('diet'), 'plants, protein, fats, water'), ['plants', 'protein', 'fats', 'water']);
  assert.deepEqual(parseTextAnswer(q('diet'), 'none'), []);
});

test('free text is saved and restored verbatim without inventing a risk-positive answer', () => {
  const text = 'My partner has not mentioned it.';
  const value = parseTextAnswer(q('snoring'), text);
  assert.equal(value, null);
  const user = new User().withAnswer(q('snoring'), value, text);
  const restored = User.fromJSON(JSON.parse(JSON.stringify(user)));
  assert.equal(restored.answers[0].text, text);
  assert.equal(restored.answers[0].riskPositive, null);
  assert.equal(restored.scores.systems.find(system => system.tag === 'CF').positivePercentage, null);
});
