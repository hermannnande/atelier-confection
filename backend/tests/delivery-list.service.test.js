import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amountDue,
  deliveryWindowFilter,
  fetchByIdsInParallel,
  isDeliveryReportEvent,
  keepDeliveryReportEvents,
  loadDeliveryTotals,
  parseDeliveryWindowStart,
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

test('la page Livreurs peut limiter la liste à partir d’une date', () => {
  assert.deepEqual(parseDeliveryWindowStart(undefined), { since: null });
  assert.deepEqual(parseDeliveryWindowStart(''), { since: null });
  assert.deepEqual(parseDeliveryWindowStart('2026-08-03T00:00:00.000Z'), { since: '2026-08-03T00:00:00.000Z' });
  assert.deepEqual(parseDeliveryWindowStart('2026-08-03T00:00:00+02:00'), { since: '2026-08-02T22:00:00.000Z' });
  assert.deepEqual(parseDeliveryWindowStart('2026-08-03'), { since: '2026-08-03T00:00:00.000Z' });
  for (const invalide of ['hier', '8', '2026-13-45', '2026-08-03",statut.eq.livree', ['2026-08-03']]) {
    assert.equal(parseDeliveryWindowStart(invalide).error, 'Date de début invalide');
  }
  assert.equal(
    deliveryWindowFilter('2026-08-03T00:00:00.000Z'),
    'date_tournee.gte."2026-08-03T00:00:00.000Z",and(date_tournee.is.null,date_assignation.gte."2026-08-03T00:00:00.000Z")',
  );
});

// Base factice : applique les filtres utilisés par loadDeliveryTotals.
function fakeSupabase(tables) {
  return {
    from(table) {
      const filters = [];
      let options = {};
      let range = null;
      const builder = {
        select(columns, opts = {}) { options = opts; return builder; },
        eq(column, value) { filters.push((row) => row[column] === value); return builder; },
        in(column, values) { filters.push((row) => values.includes(row[column])); return builder; },
        not(column, operator, value) { filters.push((row) => !(operator === 'is' && row[column] === value)); return builder; },
        order() { return builder; },
        range(from, to) { range = [from, to]; return builder; },
        then(resolve, reject) {
          const rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
          const result = options.head
            ? { data: null, count: rows.length, error: null }
            : { data: range ? rows.slice(range[0], range[1] + 1) : rows, count: null, error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

test('les totaux de la page Livreurs comptent toutes les livraisons du pays', async () => {
  const livraisons = [
    { pays_code: 'CI', statut: 'en_cours', livreur_id: 'a' },
    { pays_code: 'CI', statut: 'reportee', livreur_id: 'b' },
    { pays_code: 'CI', statut: 'livree', paiement_recu: false, commande_id: 'c1', livreur_id: 'a' },
    { pays_code: 'CI', statut: 'livree', paiement_recu: false, commande_id: 'c1', livreur_id: 'b' },
    { pays_code: 'CI', statut: 'livree', paiement_recu: null, commande_id: 'c3', livreur_id: 'b' },
    { pays_code: 'CI', statut: 'livree', paiement_recu: true, commande_id: 'c2', livreur_id: 'a' },
    { pays_code: 'CI', statut: 'livree', paiement_recu: false, commande_id: 'absente', livreur_id: 'a' },
    { pays_code: 'CI', statut: 'refusee', livreur_id: 'a' },
    { pays_code: 'BF', statut: 'en_cours', livreur_id: 'a' },
  ];
  const commandes = [{ id: 'c1', prix: 15000 }, { id: 'c2', prix: 9000 }, { id: 'c3', prix: 7000 }];
  const db = fakeSupabase({ livraisons, commandes });

  assert.deepEqual(await loadDeliveryTotals(db, 'CI'), { colisDehors: 2, argentDu: 37000 });
  assert.deepEqual(await loadDeliveryTotals(db, 'CI', (q) => q.eq('livreur_id', 'a')), { colisDehors: 1, argentDu: 15000 });
  assert.equal(amountDue([{ commande_id: 'c1' }, { commande_id: 'c1' }, { commande_id: null }], commandes), 30000);
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
