import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedSnapshot } from '../services/shared-snapshot.service.js';

function clock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms) => { current += ms; },
  };
}

test('une lecture récente est réutilisée au lieu d’interroger de nouveau la base', async () => {
  const time = clock();
  let loads = 0;
  const read = createSharedSnapshot({ maxAgeMs: 4000, now: time.now, load: async () => ({ total: ++loads }) });

  const first = await read('CI');
  time.advance(3999);
  const second = await read('CI');

  assert.equal(loads, 1);
  assert.deepEqual(second.value, { total: 1 });
  assert.equal(second.generatedAt, first.generatedAt);
  assert.equal(second.stale, false);
});

test('les requêtes simultanées partagent une seule lecture', async () => {
  let loads = 0;
  let release;
  const read = createSharedSnapshot({
    maxAgeMs: 4000,
    load: () => new Promise((resolve) => {
      loads += 1;
      release = () => resolve({ total: loads });
    }),
  });

  const pending = [read('CI'), read('CI'), read('CI')];
  await new Promise((resolve) => setImmediate(resolve));
  release();
  const results = await Promise.all(pending);

  assert.equal(loads, 1);
  assert.deepEqual(results.map((result) => result.value.total), [1, 1, 1]);
});

test('la lecture est refaite une fois le délai de fraîcheur passé', async () => {
  const time = clock();
  let loads = 0;
  const read = createSharedSnapshot({ maxAgeMs: 4000, now: time.now, load: async () => ({ total: ++loads }) });

  await read('CI');
  time.advance(4000);
  const refreshed = await read('CI');

  assert.equal(loads, 2);
  assert.deepEqual(refreshed.value, { total: 2 });
});

test('chaque pays garde sa propre lecture', async () => {
  const loaded = [];
  const read = createSharedSnapshot({ maxAgeMs: 4000, load: async (country) => { loaded.push(country); return country; } });

  assert.equal((await read('CI')).value, 'CI');
  assert.equal((await read('BF')).value, 'BF');
  assert.equal((await read('CI')).value, 'CI');
  assert.deepEqual(loaded, ['CI', 'BF']);
});

test('pendant une panne passagère, la dernière version réussie est servie et signalée', async () => {
  const time = clock();
  let fail = false;
  const read = createSharedSnapshot({
    maxAgeMs: 4000,
    staleIfErrorMs: 120000,
    now: time.now,
    load: async () => {
      if (fail) throw new Error('TypeError: fetch failed');
      return { total: 7 };
    },
  });

  const fresh = await read('CI');
  fail = true;
  time.advance(30000);
  const kept = await read('CI');

  assert.equal(kept.stale, true);
  assert.deepEqual(kept.value, { total: 7 });
  assert.equal(kept.generatedAt, fresh.generatedAt);
  assert.match(kept.error.message, /fetch failed/);
});

test('une erreur sans version récente est renvoyée et n’est pas mémorisée', async () => {
  const time = clock();
  let attempts = 0;
  const read = createSharedSnapshot({
    maxAgeMs: 4000,
    staleIfErrorMs: 120000,
    now: time.now,
    load: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('TimeoutError: The operation was aborted due to timeout');
      return { total: 3 };
    },
  });

  await assert.rejects(read('CI'), /TimeoutError/);
  const retried = await read('CI');

  assert.equal(attempts, 2);
  assert.deepEqual(retried.value, { total: 3 });
  assert.equal(retried.stale, false);
});

test('une version trop ancienne n’est plus servie pendant une panne', async () => {
  const time = clock();
  let fail = false;
  const read = createSharedSnapshot({
    maxAgeMs: 4000,
    staleIfErrorMs: 120000,
    now: time.now,
    load: async () => {
      if (fail) throw new Error('TypeError: fetch failed');
      return { total: 7 };
    },
  });

  await read('CI');
  fail = true;
  time.advance(120000);

  await assert.rejects(read('CI'), /fetch failed/);
});
