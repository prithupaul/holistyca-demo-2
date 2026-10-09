import test from 'node:test';
import assert from 'node:assert/strict';
import { getSystemRiskTone } from '../src/domain/systemRisk.js';

test('system colors follow inclusive 33% and 67% boundaries', () => {
  for (const [percentage, expected] of [[0, 'low'], [33, 'low'], [33.1, 'moderate'], [67, 'moderate'], [67.1, 'high'], [100, 'high'], [null, 'neutral'], [undefined, 'neutral']]) {
    assert.equal(getSystemRiskTone(percentage), expected);
  }
});
