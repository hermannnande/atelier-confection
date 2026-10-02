import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchByIdsInParallel,
  isDeliveryReportEvent,
  keepDeliveryReportEvents,
  readPagesInParallel,
} from '../services/delivery-list.service.js';
import {
  preparationCandidates,
  withoutDeliveries,
} from '../services/preparation-orders.service.js';

test('seuls les reports de livraison sont gardés dans l’historique', () => {
  const commande = {
    id: 'c1',
    historique: [
      { action: 'Commande validée', statut: 'validee' },
      { action: 'Livraison reportée au lendemain', statut: 'reportee', dateTourneeOrigine: '2026-10-01' },
      { action: 'Livraison reportée (ancien format)', statut: 'en_livraison' },
      { action: 'Assigné au livreur', statut: 'en_livraison' },
    ],
  };
  const allegee = keepDeliveryReportEvents(commande);
  assert.deepEqual(allegee.historique.map((event) => event.action), [
    'Livraison reportée au lendemain',
    'Livraison reportée (ancien format)',
  ]);
  assert.equal(commande.historique.length, 4);
  assert.equal(isDeliveryReportEvent(null), false);
});

test('les identifiants sont lus par morceaux simultanés, dans l’ordre', async () => {
  const ids = Array.from({ length: 700 }, (_, index) => index);
  let enCours = 0;
  let maximum = 0;
  const rows = await fetchByIdsInParallel(async (slice) => {
    enCours += 1;
    maximum = Math.max(maximum, enCours);
    await new Promise((resolve) => setTimeout(resolve, 1));
    enCours -= 1;
    return { data: slice.map((id) => ({ id })), error: null };
  }, ids, { chunkSize: 100, concurrency: 3 });

  assert.deepEqual(rows.map((row) => row.id), ids);
  assert.equal(maximum, 3);
});

test('une erreur de morceau est signalée ou interrompt la lecture selon le cas', async () => {
  const read = async (slice) => (slice.includes(150) ? { data: null, error: new Error('panne') } : { data: slice.map((id) => ({ id })), error: null });
  const ids = Array.from({ length: 300 }, (_, index) => index);
  const erreurs = [];
  const rows = await fetchByIdsInParallel(read, ids, { onError: (error, from, size) => erreurs.push([error.message, from, size]) });
  assert.equal(rows.length, 150);
  assert.deepEqual(erreurs, [['panne', 150, 150]]);
  await assert.rejects(fetchByIdsInParallel(read, ids), /panne/);
});

test('toutes les pages sont lues, y compris si la liste a grandi depuis le comptage', async () => {
  const liste = Array.from({ length: 2300 }, (_, index) => index);
  const pages = [];
  const { data, error } = await readPagesInParallel(async (from, to) => {
    pages.push(from);
    return { data: liste.slice(from, to + 1), error: null };
  }, 2000, { pageSize: 1000, concurrency: 4 });

  assert.equal(error, null);
  assert.deepEqual(data, liste);
  assert.deepEqual(pages.sort((a, b) => a - b), [0, 1000, 2000]);

  const vide = await readPagesInParallel(async () => ({ data: [], error: null }), 0);
  assert.deepEqual(vide.data, []);
  const panne = await readPagesInParallel(async () => ({ data: null, error: new Error('hors ligne') }), 10);
  assert.equal(panne.error.message, 'hors ligne');
});

test('Préparation Colis garde les mêmes commandes que la page', () => {
  const recentes = [
    { id: '1', statut: 'en_stock', livreur_id: null },
    { id: '2', statut: 'en_couture', livreur_id: null },
    { id: '3', statut: 'en_decoupe', livreur_id: null },
    { id: '4', statut: 'en_stock', livreur_id: 'livreur' },
    { id: '5', statut: 'validee', livreur_id: null },
    { id: '6', statut: 'en_stock', livreur_id: null },
  ];
  const candidats = preparationCandidates(recentes);
  assert.deepEqual(candidats.map((row) => row.id), ['1', '2', '3', '6']);
  assert.deepEqual(withoutDeliveries(candidats, ['6']).map((row) => row.id), ['1', '2', '3']);
});
