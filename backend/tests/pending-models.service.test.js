import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupPendingModels,
  loadPendingModelsSummary,
  recentVisibilityThreshold,
} from '../services/pending-models.service.js';

// Client Supabase minimal : enregistre chaque lecture et renvoie les lignes de la table.
function fakeSupabase({ commandes = [], stock = [], errors = {} } = {}) {
  const reads = [];
  return {
    reads,
    from(table) {
      const read = { table, select: null, filters: [], range: null, signal: null };
      reads.push(read);
      const builder = {
        select(columns) { read.select = columns; return builder; },
        eq(column, value) { read.filters.push([column, value]); return builder; },
        in(column, values) { read.filters.push([column, values]); return builder; },
        order() { return builder; },
        range(from, to) { read.range = [from, to]; return builder; },
        abortSignal(signal) { read.signal = signal; return builder; },
        then(resolve, reject) {
          const rows = table === 'commandes' ? commandes : stock;
          const result = errors[table]
            ? { data: null, error: errors[table] }
            : { data: read.range ? rows.slice(read.range[0], read.range[1] + 1) : rows, error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

const commandeDavichi = (id, statut, overrides = {}) => ({
  id,
  statut,
  modele: { nom: 'DAVICHI', image: 'davichi.webp' },
  couleur: 'Blanc',
  taille: 'L',
  created_at: '2026-10-16T08:00:00Z',
  ...overrides,
});

test('regroupe les commandes par modèle, couleur et taille', () => {
  const orders = [
    { id: '1', statut: 'validee', modele: { nom: 'DAVICHI', image: 'davichi.jpg' }, couleur: 'Blanc', taille: 'L' },
    { id: '2', statut: 'nouvelle', modele: { nom: 'KAYLA' }, couleur: 'Blanc', taille: 'L' },
    { id: '3', statut: 'validee', modele: { nom: 'DAVICHI' }, couleur: 'Bleu ciel', taille: '2XL' },
    { id: '4', statut: 'en_decoupe', modele: { nom: 'DAVICHI' }, couleur: 'Blanc', taille: 'L' },
  ];

  const [davichi] = groupPendingModels(orders);
  assert.equal(davichi.total, 2);
  assert.equal(davichi.image, 'davichi.jpg');
  assert.deepEqual(
    davichi.variations.map(({ couleur, taille, quantite }) => ({ couleur, taille, quantite })),
    [
      { couleur: 'Blanc', taille: 'L', quantite: 1 },
      { couleur: 'Bleu ciel', taille: '2XL', quantite: 1 },
    ],
  );
  assert.equal(groupPendingModels(orders).some((groupe) => groupe.nom === 'KAYLA'), false);
});

test('regroupe XXL et 2XL dans une seule taille en attente', () => {
  const [davichi] = groupPendingModels([
    { id: '1', statut: 'validee', modele: 'DAVICHI', couleur: 'Bleu marine', taille: 'XXL' },
    { id: '2', statut: 'validee', modele: 'DAVICHI', couleur: 'Bleu marine', taille: '2XL' },
  ]);

  assert.deepEqual(
    davichi.variations.map(({ couleur, taille, quantite }) => ({ couleur, taille, quantite })),
    [{ couleur: 'Bleu marine', taille: '2XL', quantite: 2 }],
  );
});

test('signale seulement les commandes postérieures au seuil de récence', () => {
  const orders = [
    { statut: 'validee', modele: 'DAVICHI', couleur: 'Blanc', taille: 'L', created_at: '2026-09-10T08:00:00Z' },
    { statut: 'validee', modele: 'DAVICHI', couleur: 'Blanc', taille: 'L', created_at: '2026-09-10T10:00:00Z' },
  ];

  const [davichi] = groupPendingModels(orders, { recentAfter: '2026-09-10T09:00:00Z' });
  assert.equal(davichi.nouveau, 1);
  assert.equal(davichi.variations[0].nouveau, 1);
});

test('utilise la date de validation comme date d’arrivée à préparer', () => {
  const [davichi] = groupPendingModels([
    {
      statut: 'validee',
      modele: 'DAVICHI',
      couleur: 'Blanc',
      taille: 'M',
      created_at: '2026-09-01T08:00:00Z',
      historique: [
        { statut: 'nouvelle', date: '2026-09-01T08:00:00Z' },
        { statut: 'validee', date: '2026-09-12T09:30:00Z' },
      ],
    },
  ], { recentAfter: '2026-09-12T09:00:00Z' });

  assert.equal(davichi.nouveau, 1);
  assert.equal(davichi.derniereArrivee, '2026-09-12T09:30:00.000Z');
});

test('la fenêtre récente dure une heure pour chaque utilisateur', () => {
  assert.equal(
    recentVisibilityThreshold(new Date('2026-09-10T12:00:00Z')),
    new Date('2026-09-10T11:00:00Z').getTime(),
  );
});

test('le résumé ne garde que les commandes validées non couvertes par le stock libre', async () => {
  const supabase = fakeSupabase({
    commandes: [
      commandeDavichi('1', 'validee'),
      commandeDavichi('2', 'validee', { urgence: true }),
      commandeDavichi('3', 'validee', { modele: { nom: 'KAYLA' }, couleur: 'Noir', taille: 'M' }),
      // La seule pièce DAVICHI Blanc L est déjà affectée à ce colis en préparation.
      commandeDavichi('4', 'en_stock', {
        historique: [{ statut: 'en_stock', date: '2026-10-16T07:00:00Z', reservationStock: ['principal'] }],
      }),
    ],
    stock: [{ modele: 'DAVICHI', couleur: 'Blanc', taille: 'L', quantite_principale: 1, quantite_en_livraison: 0 }],
  });

  const summary = await loadPendingModelsSummary(supabase, {
    country: 'CI',
    now: new Date('2026-10-16T12:00:00Z'),
  });

  assert.equal(summary.totalCommandes, 3);
  assert.equal(summary.totalValidees, 3);
  assert.equal(summary.totalCouvertesStock, 0);
  assert.equal(summary.totalModeles, 2);
  assert.deepEqual(summary.groupes.map(({ nom, total, urgentes }) => ({ nom, total, urgentes })), [
    { nom: 'DAVICHI', total: 2, urgentes: 1 },
    { nom: 'KAYLA', total: 1, urgentes: 0 },
  ]);
  assert.deepEqual(
    supabase.reads.map(({ table, filters }) => [table, filters[0]]).sort(),
    [['commandes', ['pays_code', 'CI']], ['stock', ['pays_code', 'CI']]],
  );
});

test('le stock libre couvre d’abord la commande urgente', async () => {
  const supabase = fakeSupabase({
    commandes: [commandeDavichi('1', 'validee'), commandeDavichi('2', 'validee', { urgence: true })],
    stock: [{ modele: 'DAVICHI', couleur: 'Blanc', taille: 'L', quantite_principale: 1 }],
  });

  const summary = await loadPendingModelsSummary(supabase, { country: 'CI' });

  assert.equal(summary.totalCommandes, 1);
  assert.equal(summary.totalCouvertesStock, 1);
  assert.equal(summary.groupes[0].urgentes, 0);
});

test('le résumé ne lit pas les colonnes inutiles et applique le délai aux deux lectures', async () => {
  const supabase = fakeSupabase({ commandes: [commandeDavichi('1', 'validee')] });
  const signal = new AbortController().signal;

  await loadPendingModelsSummary(supabase, { country: 'CI', signal });

  const commandes = supabase.reads.find((read) => read.table === 'commandes');
  const stock = supabase.reads.find((read) => read.table === 'stock');
  assert.equal(commandes.signal, signal);
  assert.equal(stock.signal, signal);
  assert.doesNotMatch(commandes.select, /numero_commande|updated_at/);
  assert.match(commandes.select, /historique/);
});

test('une base injoignable ou trop lente donne une erreur 503 à retenter', async () => {
  const timeout = fakeSupabase({
    errors: { commandes: { message: 'TimeoutError: The operation was aborted due to timeout' } },
  });
  await assert.rejects(
    loadPendingModelsSummary(timeout, { country: 'CI' }),
    (error) => error.status === 503 && /TimeoutError/.test(error.cause.message),
  );

  const unreachable = fakeSupabase({ errors: { stock: { message: 'TypeError: fetch failed' } } });
  await assert.rejects(loadPendingModelsSummary(unreachable, { country: 'CI' }), (error) => error.status === 503);

  const invalid = fakeSupabase({ errors: { commandes: { message: 'column "x" does not exist' } } });
  await assert.rejects(loadPendingModelsSummary(invalid, { country: 'CI' }), (error) => error.status === 500);
});
