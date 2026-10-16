import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextRefreshDelayMs,
  pendingModelsState,
  readPendingModelsSnapshot,
  savePendingModelsSnapshot,
} from './pendingModelsSnapshot.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const response = {
  groupes: [{ id: 'davichi', nom: 'DAVICHI', total: 2, variations: [] }],
  totalCommandes: 2,
  totalValidees: 5,
  totalCouvertesStock: 3,
  serverNow: '2026-10-16T12:00:05.000Z',
  generatedAt: '2026-10-16T12:00:03.000Z',
  stale: false,
};

test('le dernier état connu est relu pour le même pays', () => {
  const storage = memoryStorage();
  const state = pendingModelsState(response);

  savePendingModelsSnapshot('CI', state, { storage, now: 1000 });

  assert.deepEqual(readPendingModelsSnapshot('CI', { storage, now: 2000 }), state);
  assert.equal(readPendingModelsSnapshot('BF', { storage, now: 2000 }), null);
});

test('un état trop ancien ou illisible est ignoré', () => {
  const storage = memoryStorage();
  savePendingModelsSnapshot('CI', pendingModelsState(response), { storage, now: 0 });
  assert.equal(readPendingModelsSnapshot('CI', { storage, now: 13 * 60 * 60 * 1000 }), null);

  storage.setItem('modeles-en-attente:CI', '{pas du json');
  assert.equal(readPendingModelsSnapshot('CI', { storage }), null);
});

test('un stockage bloqué n’empêche pas la page de fonctionner', () => {
  const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  };

  assert.equal(readPendingModelsSnapshot('CI', { storage: blocked }), null);
  assert.doesNotThrow(() => savePendingModelsSnapshot('CI', pendingModelsState(response), { storage: blocked }));
});

test('une réponse incomplète donne un état vide mais utilisable', () => {
  assert.deepEqual(pendingModelsState({ serverNow: '2026-10-16T12:00:00.000Z' }), {
    groupes: [],
    totalCommandes: 0,
    totalValidees: 0,
    totalCouvertesStock: 0,
    totalEnCours: 0,
    totalAVerifier: 0,
    serverNow: '2026-10-16T12:00:00.000Z',
    generatedAt: '2026-10-16T12:00:00.000Z',
    stale: false,
  });
});

test('le rythme de mise à jour s’espace après des échecs, sans dépasser 30 s', () => {
  assert.deepEqual([0, 1, 2, 3, 8].map(nextRefreshDelayMs), [5000, 10000, 20000, 30000, 30000]);
});
