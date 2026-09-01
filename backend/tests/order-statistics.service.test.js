import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderStatistics,
  getCancellationDate,
  resolveStatisticsDateRange,
} from '../services/order-statistics.service.js';

const model = (nom) => ({ nom });

test('construit une période inclusive en heure d’Abidjan', () => {
  const range = resolveStatisticsDateRange(
    { dateDebut: '2026-08-30', dateFin: '2026-09-01' },
    new Date('2026-09-01T18:00:00.000Z'),
  );
  assert.equal(range.nombreJours, 3);
  assert.equal(range.start.toISOString(), '2026-08-30T00:00:00.000Z');
  assert.equal(range.endExclusive.toISOString(), '2026-09-02T00:00:00.000Z');
});

test('refuse les dates impossibles et les périodes inversées', () => {
  assert.throws(
    () => resolveStatisticsDateRange({ dateDebut: '2026-02-30', dateFin: '2026-03-01' }),
    /Date de début invalide/,
  );
  assert.throws(
    () => resolveStatisticsDateRange({ dateDebut: '2026-09-02', dateFin: '2026-09-01' }),
    /date de fin/i,
  );
});

test('retrouve la vraie date d’annulation dans l’historique', () => {
  const date = getCancellationDate({
    statut: 'annulee',
    updated_at: '2026-09-03T08:00:00.000Z',
    historique: [
      { action: 'Commande créée', date: '2026-08-30T09:00:00.000Z' },
      { action: 'Commande annulée', statut: 'annulee', date: '2026-09-01T11:00:00.000Z' },
    ],
  });
  assert.equal(date.toISOString(), '2026-09-01T11:00:00.000Z');
});

test('compte réception, livraison et annulation selon leurs propres dates', () => {
  const range = resolveStatisticsDateRange({ dateDebut: '2026-09-01', dateFin: '2026-09-01' });
  const stats = buildOrderStatistics({
    range,
    receivedOrders: [
      { id: 'r1', modele: model('Robe A'), created_at: '2026-09-01T08:00:00.000Z' },
      { id: 'r2', modele: model('Robe B'), created_at: '2026-09-01T09:00:00.000Z' },
    ],
    deliveredOrders: [
      { id: 'l1', modele: model('Robe A'), prix: 15000, date_livraison: '2026-09-01T14:00:00.000Z' },
    ],
    cancelledCandidates: [
      {
        id: 'a1',
        modele: model('Robe B'),
        statut: 'annulee',
        historique: [{ statut: 'annulee', date: '2026-09-01T12:00:00.000Z' }],
      },
      {
        id: 'a2',
        modele: model('Robe A'),
        statut: 'annulee',
        historique: [{ statut: 'annulee', date: '2026-08-31T12:00:00.000Z' }],
      },
    ],
  });

  assert.equal(stats.recues, 2);
  assert.equal(stats.livrees, 1);
  assert.equal(stats.annulees, 1);
  assert.equal(stats.chiffreAffairesLivre, 15000);
  assert.deepEqual(
    stats.statistiquesParModele.map(({ nom, recues, livrees, annulees }) => (
      { nom, recues, livrees, annulees }
    )),
    [
      { nom: 'Robe A', recues: 1, livrees: 1, annulees: 0 },
      { nom: 'Robe B', recues: 1, livrees: 0, annulees: 1 },
    ],
  );
});
