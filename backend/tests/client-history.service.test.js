import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClientHistory,
  clientPhoneKey,
  createClientHistoryLoader,
  orderOutcome,
} from '../services/client-history.service.js';

const nouvelle = { id: 'new', created_at: '2026-10-02T10:00:00Z', client: { contact: '0712345678' } };
const passee = (id, statut, overrides = {}) => ({
  id,
  numero_commande: `CMD-${id}`,
  statut,
  created_at: '2026-09-20T10:00:00Z',
  prix: 11000,
  modele: { nom: 'DAVICHI' },
  taille: 'M',
  couleur: 'Blanc',
  historique: [{ action: 'Commande validée', statut: 'validee', date: '2026-09-20T11:00:00Z' }],
  ...overrides,
});

test('un même numéro est reconnu quel que soit son format', () => {
  for (const contact of ['+225 07 12 34 56 78', '0712345678', '225 0712345678', '07 12 34 56 78']) {
    assert.equal(clientPhoneKey(contact, 'CI'), '0712345678');
  }
  assert.equal(clientPhoneKey('+226 70 12 34 56', 'BF'), clientPhoneKey('70123456', 'BF'));
  assert.equal(clientPhoneKey('+33 6 12 34 56 78', 'FR'), clientPhoneKey('06 12 34 56 78', 'FR'));
  assert.equal(clientPhoneKey('12 34', 'CI'), null);
});

test('l’issue de chaque commande passée est reconnue', () => {
  assert.equal(orderOutcome(passee('1', 'livree')), 'livree');
  assert.equal(orderOutcome(passee('2', 'refusee')), 'refusee');
  assert.equal(orderOutcome(passee('3', 'en_stock', {
    historique: [{ action: 'Livraison refusée par le client', statut: 'refusee' }],
  })), 'refusee');
  assert.equal(orderOutcome(passee('4', 'annulee')), 'annulee_apres_validation');
  assert.equal(orderOutcome(passee('5', 'annulee', { historique: [] })), 'annulee');
  assert.equal(orderOutcome(passee('6', 'en_livraison')), 'en_cours');
});

test('un client sans commande précédente est un nouveau client', () => {
  const history = buildClientHistory(nouvelle, [nouvelle]);
  assert.equal(history.profil, 'nouveau');
  assert.equal(history.carteGrise, false);
  assert.equal(history.total, 0);
});

test('un refus à la livraison un autre jour grise la carte et garde le motif', () => {
  const history = buildClientHistory(nouvelle, [
    passee('1', 'refusee', { motif_refus: 'Ne décroche pas' }),
    passee('2', 'livree', { created_at: '2026-08-01T10:00:00Z' }),
  ]);
  assert.equal(history.profil, 'risque');
  assert.equal(history.carteGrise, true);
  assert.equal(history.refusees, 1);
  assert.equal(history.livrees, 1);
  assert.deepEqual(history.dernierRefus, { date: '2026-09-20T10:00:00Z', motif: 'Ne décroche pas' });
  assert.equal(history.clientDepuis, '2026-08-01T10:00:00Z');
});

test('un refus le même jour reste visible sans griser la carte', () => {
  const history = buildClientHistory(nouvelle, [passee('1', 'refusee', { created_at: '2026-10-02T08:00:00Z' })]);
  assert.equal(history.carteGrise, false);
  assert.equal(history.profil, 'surveiller');
});

test('une annulation après validation est à surveiller sans griser la carte', () => {
  const history = buildClientHistory(nouvelle, [passee('1', 'annulee', {
    historique: [
      { statut: 'validee', date: '2026-09-20T11:00:00Z' },
      { statut: 'annulee', commentaire: 'Client injoignable', date: '2026-09-21T09:00:00Z' },
    ],
  })]);
  assert.equal(history.carteGrise, false);
  assert.equal(history.profil, 'surveiller');
  assert.equal(history.annuleesApresValidation, 1);
  assert.equal(history.commandes[0].motif, 'Client injoignable');
});

test('un texte automatique de l’application n’est pas affiché comme motif', () => {
  const history = buildClientHistory(nouvelle, [passee('1', 'annulee', {
    historique: [{ action: 'Commande modifiée', statut: 'annulee', commentaire: 'Modification des détails de la commande' }],
  })]);
  assert.equal(history.commandes[0].motif, '');
});

test('un client livré sans incident est fiable, du plus récent au plus ancien', () => {
  const history = buildClientHistory(nouvelle, [
    passee('1', 'livree', { created_at: '2026-08-01T10:00:00Z', prix: 9000 }),
    passee('2', 'livree', { created_at: '2026-09-01T10:00:00Z' }),
  ]);
  assert.equal(history.profil, 'fiable');
  assert.equal(history.montantLivre, 20000);
  assert.deepEqual(history.commandes.map((commande) => commande.id), ['2', '1']);
});

// Base simulée : seules les lectures utilisées par le chargement existent.
function fakeDatabase(rows) {
  const calls = { index: 0, details: 0 };
  const query = (state) => ({
    select(columns) { state.columns = columns; return this; },
    eq(field, value) { state.filters.push((row) => row[field] === value); return this; },
    in(field, values) { state.filters.push((row) => values.includes(row[field])); return this; },
    order() { return this; },
    range(from, to) { state.range = [from, to + 1]; return this; },
    then(resolve) {
      const selected = rows.filter((row) => state.filters.every((filter) => filter(row)));
      if (state.columns.includes('contact:')) {
        calls.index += 1;
        resolve({ data: selected.slice(...state.range).map((row) => ({ id: row.id, contact: row.client?.contact })), error: null });
      } else {
        calls.details += 1;
        resolve({ data: selected, error: null });
      }
    },
  });
  return { calls, from: () => query({ filters: [] }) };
}

test('le chargement relie les commandes d’un même client et renouvelle l’index en arrière-plan', async () => {
  const rows = [
    { ...nouvelle, pays_code: 'CI' },
    { ...passee('1', 'refusee'), pays_code: 'CI', client: { contact: '+225 07 12 34 56 78' } },
    { ...passee('2', 'livree'), pays_code: 'CI', client: { contact: '0101010101' } },
  ];
  const db = fakeDatabase(rows);
  let clock = 0;
  const load = createClientHistoryLoader({ now: () => clock });

  const first = await load(db, 'CI', [nouvelle]);
  assert.equal(first.get('new').carteGrise, true);
  assert.equal(first.get('new').total, 1);

  // Une commande ajoutée entre-temps n'apparaît qu'au renouvellement de l'index.
  rows.push({ ...passee('3', 'livree'), pays_code: 'CI', client: { contact: '0712345678' } });
  assert.equal((await load(db, 'CI', [nouvelle])).get('new').total, 1);
  assert.equal(db.calls.index, 1);

  clock = 3 * 60 * 1000;
  assert.equal((await load(db, 'CI', [nouvelle])).get('new').total, 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(db.calls.index, 2);
  assert.equal((await load(db, 'CI', [nouvelle])).get('new').total, 2);
});
