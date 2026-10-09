import test from 'node:test';
import assert from 'node:assert/strict';
import { countUnreadSuggestions, loadSuggestionReads, saveSuggestionReads } from '../src/domain/suggestionReads.js';

test('unread count follows relevant suggestions and does not count previously read ones again', () => {
  const read = new Set(['first']);
  assert.equal(countUnreadSuggestions([{ id: 'first' }, { id: 'new' }], read), 1);
  read.add('new');
  assert.equal(countUnreadSuggestions([{ id: 'first' }, { id: 'new' }], read), 0);
  assert.equal(countUnreadSuggestions([{ id: 'another' }], read), 1);
});

test('read status persists separately for each evaluation and tolerates invalid storage', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  saveSuggestionReads('one', new Set(['read']), storage);
  assert.deepEqual([...loadSuggestionReads('one', storage)], ['read']);
  assert.equal(loadSuggestionReads('two', storage).size, 0);
  assert.equal(loadSuggestionReads('one', { getItem() { throw new Error(); } }).size, 0);
  assert.equal(loadSuggestionReads('one', { getItem() { return '{}'; } }).size, 0);
});
