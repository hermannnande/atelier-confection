import test from 'node:test';
import assert from 'node:assert/strict';
import { periodLabel, periodRange } from './periods.js';

// Samedi 3 octobre 2026, 15:30 (heure locale).
const maintenant = new Date(2026, 9, 3, 15, 30);

test('périodes courantes à partir d’aujourd’hui', () => {
  assert.deepEqual(periodRange('aujourdhui', maintenant), { du: '2026-10-03', au: '2026-10-03' });
  assert.deepEqual(periodRange('hier', maintenant), { du: '2026-10-02', au: '2026-10-02' });
  assert.deepEqual(periodRange('semaine', maintenant), { du: '2026-09-28', au: '2026-10-03' });
  assert.deepEqual(periodRange('mois', maintenant), { du: '2026-10-01', au: '2026-10-03' });
});

test('semaine dernière et mois dernier sont complets', () => {
  assert.deepEqual(periodRange('semaine-derniere', maintenant), { du: '2026-09-21', au: '2026-09-27' });
  assert.deepEqual(periodRange('mois-dernier', maintenant), { du: '2026-09-01', au: '2026-09-30' });
  // Un dimanche appartient à la semaine commencée le lundi précédent.
  assert.deepEqual(periodRange('semaine', new Date(2026, 9, 4, 9, 0)), { du: '2026-09-28', au: '2026-10-04' });
  // En janvier, le mois dernier est décembre de l’année précédente.
  assert.deepEqual(periodRange('mois-dernier', new Date(2027, 0, 15)), { du: '2026-12-01', au: '2026-12-31' });
});

test('libellé lisible de la période', () => {
  assert.equal(periodLabel('2026-10-03', '2026-10-03'), 'le 03/10/2026');
  assert.equal(periodLabel('2026-10-01', '2026-10-31'), 'du 01/10/2026 au 31/10/2026');
});
