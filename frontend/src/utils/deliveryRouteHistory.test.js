import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryRouteEntries, getDeliveryRouteDayKey } from './deliveryRouteHistory.js';

test('garde une livraison reportée dans sa tournée tant qu’elle attend une reprise', () => {
  const livraison = {
    id: 'liv-1',
    statut: 'reportee',
    dateTournee: '2026-09-07T10:00:00.000Z',
    commande: {
      historique: [
        {
          action: 'Livraison reportée au lendemain',
          statut: 'reportee',
          date: '2026-09-07T18:00:00.000Z',
          dateTourneeOrigine: '2026-09-07T10:00:00.000Z',
        },
      ],
    },
  };

  const entries = buildDeliveryRouteEntries([livraison]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].statut, 'reportee');
});

test('conserve la trace au jour initial après la reprise dans la tournée du jour', () => {
  const livraison = {
    id: 'liv-2',
    statut: 'en_cours',
    dateTournee: '2026-09-08T08:00:00.000Z',
    commande: {
      historique: [
        {
          action: 'Livraison reportée au lendemain',
          statut: 'reportee',
          date: '2026-09-07T18:00:00.000Z',
          dateTourneeOrigine: '2026-09-07T08:00:00.000Z',
        },
        {
          action: 'Livraison reprise (nouvelle tournée)',
          statut: 'en_cours',
          date: '2026-09-08T08:00:00.000Z',
        },
      ],
    },
  };

  const entries = buildDeliveryRouteEntries([livraison]);

  assert.equal(entries.length, 2);
  assert.equal(entries[0].statut, 'en_cours');
  assert.equal(entries[1].statut, 'reportee_historique');
  assert.equal(getDeliveryRouteDayKey(entries[1].dateTournee), '2026-09-07');
});

test('utilise la date de report pour restaurer les anciennes traces déjà enregistrées', () => {
  const livraison = {
    id: 'liv-3',
    statut: 'livree',
    dateTournee: '2026-09-08T08:00:00.000Z',
    commande: {
      historique: [
        {
          action: 'Livraison reportée au lendemain',
          statut: 'reportee',
          date: '2026-09-07T17:00:00.000Z',
        },
      ],
    },
  };

  const entries = buildDeliveryRouteEntries([livraison]);

  assert.equal(entries.length, 2);
  assert.equal(getDeliveryRouteDayKey(entries[1].dateTournee), '2026-09-07');
});

test('ignore les événements sans rapport et évite deux traces le même jour', () => {
  const livraison = {
    id: 'liv-4',
    statut: 'en_cours',
    dateTournee: '2026-09-09T08:00:00.000Z',
    commande: {
      historique: [
        { action: 'Commande validée', statut: 'validee', date: '2026-09-06T08:00:00.000Z' },
        { statut: 'reportee', date: '2026-09-07T16:00:00.000Z' },
        { statut: 'reportee', date: '2026-09-07T18:00:00.000Z' },
      ],
    },
  };

  const entries = buildDeliveryRouteEntries([livraison]);

  assert.equal(entries.length, 2);
  assert.equal(entries[1].statut, 'reportee_historique');
});

test('n’attribue pas au nouveau livreur le report d’une ancienne livraison', () => {
  const livraison = {
    id: 'liv-nouvelle',
    statut: 'en_cours',
    dateAssignation: '2026-09-08T08:00:00.000Z',
    dateTournee: '2026-09-08T08:00:00.000Z',
    commande: {
      historique: [
        {
          statut: 'reportee',
          livraisonId: 'liv-ancienne',
          dateTourneeOrigine: '2026-09-06T08:00:00.000Z',
          date: '2026-09-06T18:00:00.000Z',
        },
        {
          statut: 'reportee',
          date: '2026-09-07T18:00:00.000Z',
        },
      ],
    },
  };

  assert.equal(buildDeliveryRouteEntries([livraison]).length, 1);
});
