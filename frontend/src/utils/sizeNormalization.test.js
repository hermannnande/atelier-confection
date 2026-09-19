import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSize } from './sizeNormalization.js';

test('les anciennes tailles correspondent aux seules tailles proposées', () => {
  assert.equal(normalizeSize('XXL'), '2XL');
  assert.equal(normalizeSize('XXXL'), '3XL');
  assert.equal(normalizeSize('2XL'), '2XL');
  assert.equal(normalizeSize('3XL'), '3XL');
});
