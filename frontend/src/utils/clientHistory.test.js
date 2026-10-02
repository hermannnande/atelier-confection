import test from 'node:test';
import assert from 'node:assert/strict';
import { clientProfileSummary, orderOutcomeLabel } from './clientHistory.js';

const history = (overrides = {}) => ({
  profil: 'connu', total: 0, livrees: 0, refusees: 0, annuleesApresValidation: 0, ...overrides,
});

test('aucun profil sans historique chargé', () => {
  assert.equal(clientProfileSummary(null), null);
});

test('un nouveau client est signalé comme première commande', () => {
  const summary = clientProfileSummary(history({ profil: 'nouveau' }));
  assert.equal(summary.label, 'Nouveau client');
  assert.equal(summary.detail, 'Première commande');
});

test('un client à risque montre d’abord ses refus à la livraison', () => {
  const summary = clientProfileSummary(history({ profil: 'risque', total: 3, refusees: 1, livrees: 2 }));
  assert.equal(summary.label, 'Client à risque');
  assert.equal(summary.detail, '1 refus à la livraison · 2 livrées');
});

test('les annulations après validation et les autres profils sont résumés', () => {
  assert.equal(
    clientProfileSummary(history({ profil: 'surveiller', total: 2, annuleesApresValidation: 2 })).detail,
    '2 annulées après validation',
  );
  assert.equal(clientProfileSummary(history({ profil: 'fiable', total: 1, livrees: 1 })).detail, '1 livrée');
  assert.equal(clientProfileSummary(history({ total: 3 })).detail, '3 commandes précédentes');
});

test('une issue inconnue est affichée comme en cours', () => {
  assert.equal(orderOutcomeLabel('refusee').label, 'Refusée à la livraison');
  assert.equal(orderOutcomeLabel('inconnue').label, 'En cours');
});
