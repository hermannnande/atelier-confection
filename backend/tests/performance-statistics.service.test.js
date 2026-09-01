import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPerformanceStatistics } from '../services/performance-statistics.service.js';
import { resolveStatisticsDateRange } from '../services/order-statistics.service.js';

const range = resolveStatisticsDateRange({ dateDebut: '2026-09-01', dateFin: '2026-09-01' });
const users = [
  { id: 'a1', nom: 'Awa', role: 'appelant', actif: true },
  { id: 's1', nom: 'Sita', role: 'styliste', actif: true },
  { id: 'c1', nom: 'Cissé', role: 'couturier', actif: true },
  { id: 'l1', nom: 'Lago', role: 'livreur', actif: true },
];

test('calcule les performances avec les dates propres à chaque métier', () => {
  const stats = buildPerformanceStatistics({
    range,
    users,
    commandes: [{
      id: 'cmd1',
      appelant_id: 'a1',
      styliste_id: 's1',
      modele: { nom: 'Robe A' },
      prix: 15000,
      statut: 'livree',
      created_at: '2026-09-01T08:00:00.000Z',
      date_decoupe: '2026-09-01T09:00:00.000Z',
      date_livraison: '2026-09-01T17:00:00.000Z',
      historique: [
        { statut: 'validee', date: '2026-09-01T08:30:00.000Z' },
        { statut: 'en_couture', date: '2026-09-01T10:00:00.000Z' },
      ],
    }],
    livraisons: [{
      commande_id: 'cmd1',
      livreur_id: 'l1',
      statut: 'livree',
      date_assignation: '2026-09-01T14:00:00.000Z',
      date_livraison: '2026-09-01T17:00:00.000Z',
    }],
    productions: [],
  });

  assert.deepEqual(
    {
      recues: stats.appelants[0].recues,
      validees: stats.appelants[0].validees,
      livrees: stats.appelants[0].livrees,
      montant: stats.appelants[0].montantLivre,
    },
    { recues: 1, validees: 1, livrees: 1, montant: 15000 },
  );
  assert.equal(stats.stylistes[0].demarrees, 1);
  assert.equal(stats.stylistes[0].terminees, 1);
  assert.equal(stats.livreurs[0].assignees, 1);
  assert.equal(stats.livreurs[0].livrees, 1);
  assert.equal(stats.livreurs[0].tauxReussite, 100);
});

test('utilise les productions validées de la rémunération pour les couturiers', () => {
  const stats = buildPerformanceStatistics({
    range,
    users,
    commandes: [],
    livraisons: [],
    productions: [
      {
        couturier_id: 'c1',
        modele: { nom: 'Robe A' },
        date_production: '2026-09-01',
        quantite: 8,
        montant_total: 7200,
        montant_bonus: 600,
        statut: 'validee',
      },
      {
        couturier_id: 'c1',
        modele: { nom: 'Robe B' },
        date_production: '2026-09-01',
        quantite: 3,
        montant_total: 2100,
        montant_bonus: 0,
        statut: 'en_attente',
      },
      {
        couturier_id: 'c1',
        modele: { nom: 'Robe A' },
        date_production: '2026-08-31',
        quantite: 50,
        montant_total: 45000,
        montant_bonus: 0,
        statut: 'validee',
      },
    ],
  });

  const couturier = stats.couturiers[0];
  assert.equal(couturier.piecesValidees, 8);
  assert.equal(couturier.piecesEnAttente, 3);
  assert.equal(couturier.gainsBase, 7200);
  assert.equal(couturier.bonus, 600);
  assert.equal(couturier.totalGagne, 7800);
  assert.equal(couturier.detailsParModele[0].piecesValidees, 8);
});

test('attribue la performance à l’appelant qui a réellement traité la commande en ligne', () => {
  const stats = buildPerformanceStatistics({
    range,
    users: [
      { id: 'a1', nom: 'Awa', role: 'appelant', actif: true },
      { id: 'a2', nom: 'Binta', role: 'appelant', actif: true },
    ],
    commandes: [
      {
        id: 'web1',
        appelant_id: null,
        modele: { nom: 'Robe Web' },
        prix: 18000,
        statut: 'livree',
        created_at: '2026-08-31T20:00:00.000Z',
        date_livraison: '2026-09-01T17:00:00.000Z',
        historique: [
          { statut: 'validee', utilisateur: 'a2', date: '2026-09-01T08:30:00.000Z' },
        ],
      },
      {
        id: 'web2',
        appelant_id: null,
        modele: { nom: 'Robe Web' },
        prix: 12000,
        statut: 'annulee',
        created_at: '2026-09-01T07:00:00.000Z',
        historique: [
          { statut: 'annulee', utilisateur: 'a1', date: '2026-09-01T09:00:00.000Z' },
        ],
      },
    ],
    livraisons: [],
    productions: [],
  });

  const awa = stats.appelants.find((item) => item.personne.id === 'a1');
  const binta = stats.appelants.find((item) => item.personne.id === 'a2');
  assert.equal(awa.annulees, 1);
  assert.equal(binta.validees, 1);
  assert.equal(binta.livrees, 1);
  assert.equal(binta.montantLivre, 18000);
});
