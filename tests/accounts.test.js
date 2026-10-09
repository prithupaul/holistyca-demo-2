import test from 'node:test';
import assert from 'node:assert/strict';
import { signUp, logIn, logOut } from '../src/domain/accounts.js';
import { User } from '../src/classes/User.js';
import { questions, getQuestion } from '../src/questions.js';
const createStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const fields = { name: 'Demo Sleeper', username: 'demo-sleeper', password: 'demo-password' };

test('sign-up requires only account fields and leaves every screening question for Chat', async () => {
  const storage = createStorage();
  const user = signUp(fields, storage);
  assert.equal(user.profile.name, fields.name);
  assert.equal(user.profile.username, fields.username);
  assert.equal(user.profile.password, fields.password);
  assert.equal(user.answerMap.age, undefined);
  assert.equal(user.answerMap.sex, undefined);
  assert.equal(user.answers.length, 0);
  assert.equal(user.scores.answeredCount, 0);
  assert.equal((await getQuestion(user)).id, 'snoring');
  assert.deepEqual(User.load(storage).profile, user.profile);
});

test('signup stores only account fields without seeding age or gender answers', () => {
  const user = signUp({ ...fields, age: 35, gender: 'female' }, createStorage());
  assert.deepEqual(user.profile, fields);
  assert.deepEqual(user.answerMap, {});
});

test('login restores each account and its latest chat separately and rejects incorrect credentials', () => {
  const storage = createStorage();
  const first = signUp(fields, storage);
  const updated = first.withAnswer(questions[0], true);
  updated.save(storage);
  signUp({ ...fields, username: 'second', password: 'second-password' }, storage);
  assert.throws(() => logIn(fields.username, 'incorrect', storage), /incorrect/);
  assert.throws(() => signUp(fields, storage), /already taken/);
  assert.equal(logIn(fields.username, fields.password, storage).answerMap.snoring, true);
  assert.equal(logIn('second', 'second-password', storage).hasAnswer('snoring'), false);
});

test('clearing account answers retains login details and deletes evaluations in saved account', () => {
  const storage = createStorage();
  signUp(fields, storage).withAnswer(questions[0], true).save(storage);
  const cleared = User.clearData(storage);
  assert.equal(cleared.answers.length, 0);
  assert.equal(cleared.scores.overallRisk.level, null);
  assert.equal(cleared.profile.username, fields.username);
  assert.equal(logIn(fields.username, fields.password, storage).answers.length, 0);
});

test('sign-up requires name, username and password', () => {
  for (const key of ['name', 'username', 'password']) {
    assert.throws(() => signUp({ ...fields, [key]: '' }, createStorage()));
  }
});

test('logout clears the active session while retaining the account and saved answers for login', () => {
  const storage = createStorage();
  signUp(fields, storage).withAnswer(questions[0], true).save(storage);
  storage.setItem('unrelated', 'keep');
  const signedOut = logOut(storage);
  assert.equal(signedOut.profile.username, undefined);
  assert.equal(signedOut.answers.length, 0);
  assert.equal(User.load(storage).profile.username, undefined);
  assert.equal(storage.getItem('unrelated'), 'keep');
  const restored = logIn(fields.username, fields.password, storage);
  assert.equal(restored.profile.username, fields.username);
  assert.equal(restored.answerMap.snoring, true);
});

test('logout reports a storage failure without removing the active session', () => {
  const storage = createStorage();
  signUp(fields, storage);
  assert.throws(() => logOut({ ...storage, removeItem() { throw new Error('Blocked'); } }), /Could not log out/);
  assert.equal(User.load(storage).profile.username, fields.username);
});
