import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchRowsUpTo, MAX_ORDER_LIST_LIMIT, parseOrderListLimit } from '../services/order-list.service.js';

// Requête simulée : comme Supabase, chaque page est limitée par range().
function fakeQuery(rows, calls, error = null) {
  return () => ({
    range(from, to) {
      calls.push([from, to]);
      return Promise.resolve(error ? { data: null, error } : { data: rows.slice(from, to + 1), error: null });
    },
  });
}
const commandes = (count) => Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

test('la limite demandée est lue comme un nombre borné', () => {
  assert.equal(parseOrderListLimit(undefined), null);
  assert.equal(parseOrderListLimit(''), null);
  assert.equal(parseOrderListLimit('abc'), null);
  assert.equal(parseOrderListLimit('0'), null);
  assert.equal(parseOrderListLimit('1500'), 1500);
  assert.equal(parseOrderListLimit('99999'), MAX_ORDER_LIST_LIMIT);
});

test('1 500 commandes sont lues en deux pages, dans l’ordre', async () => {
  const calls = [];
  const { data, error } = await fetchRowsUpTo(fakeQuery(commandes(2500), calls), 1500);

  assert.equal(error, null);
  assert.equal(data.length, 1500);
  assert.equal(data[0].id, 1);
  assert.equal(data[1499].id, 1500);
  assert.deepEqual(calls, [[0, 999], [1000, 1499]]);
});

test('la lecture s’arrête quand il y a moins de commandes que la limite', async () => {
  const calls = [];
  const { data } = await fetchRowsUpTo(fakeQuery(commandes(1200), calls), 1500);

  assert.equal(data.length, 1200);
  assert.deepEqual(calls, [[0, 999], [1000, 1499]]);
});

test('une erreur de lecture est transmise sans liste partielle', async () => {
  const failure = new Error('lecture impossible');
  const { data, error } = await fetchRowsUpTo(fakeQuery([], [], failure), 1500);

  assert.equal(data, null);
  assert.equal(error, failure);
});
