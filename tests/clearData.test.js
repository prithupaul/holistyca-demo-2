import test from 'node:test';
import assert from 'node:assert/strict';
import { User, USER_STORAGE_KEY } from '../src/classes/User.js';
import { createDemoProfile } from '../src/domain/demoProfiles.js';
import { getQuestion } from '../src/questions.js';

test('clear data removes saved answers and evaluations, preserves unrelated storage, and starts at question one', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const previous = createDemoProfile('all', () => 0);
  previous.save(storage);
  storage.setItem('unrelated.setting', 'keep');
  const fresh = User.clearData(storage);
  assert.equal(storage.getItem(USER_STORAGE_KEY), null);
  assert.equal(storage.getItem('unrelated.setting'), 'keep');
  assert.notEqual(fresh.id, previous.id);
  assert.equal(fresh.answers.length, 0);
  assert.equal(fresh.scores.positiveTotal, 0);
  assert.equal(fresh.scores.coreWeightedSubtotal, 0);
  assert.ok(fresh.scores.parts.every(part => part.answered === 0 && part.positiveCount === 0));
  assert.ok(fresh.scores.systems.every(system => system.positiveCount === 0 && system.positivePercentage === null));
  assert.equal((await getQuestion(fresh)).id, 'snoring');
  const restored = User.load(storage);
  assert.equal(restored.answers.length, 0);
  assert.equal((await getQuestion(restored)).id, 'snoring');
});

test('failed deletion leaves the previous saved user intact', () => {
  const previous = JSON.stringify(createDemoProfile('some', () => 0));
  const storage = { getItem: () => previous, removeItem() { throw new Error('Storage blocked'); } };
  assert.throws(() => User.clearData(storage), /Could not clear/);
  assert.equal(storage.getItem(USER_STORAGE_KEY), previous);
});
