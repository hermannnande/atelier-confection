import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRemunerationSummary,
  normalizeDateKey,
  parseMoney,
  validateProductionIds,
  validateProductionItems,
} from '../services/remuneration.service.js';

test('valide une déclaration et refuse les modèles en double', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.deepEqual(validateProductionItems([{ modeleId: id, quantite: 3 }]), [{ modeleId: id, quantite: 3 }]);
  assert.throws(
    () => validateProductionItems([{ modeleId: id, quantite: 1 }, { modeleId: id, quantite: 2 }]),
    /même tenue/,
  );
});

test('valide une sélection groupée de productions sans doublon', () => {
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  assert.deepEqual(validateProductionIds([first, second]), [first, second]);
  assert.throws(() => validateProductionIds([first, first]), /qu’une fois/);
  assert.throws(() => validateProductionIds(['production-invalide']), /invalide/);
});

test('calcule les gains, réservations et paiements sans effacer l’historique', () => {
  const summary = calculateRemunerationSummary({
    today: '2026-08-28',
    productions: [
      { date_production: '2026-08-28', quantite: 2, montant_total: 5000, statut: 'validee' },
      { date_production: '2026-08-25', quantite: 1, montant_total: 2000, statut: 'validee' },
      { date_production: '2026-08-28', quantite: 9, montant_total: 9000, statut: 'en_attente' },
    ],
    paiements: [
      { montant: 1000, statut: 'payee' },
      { montant: 1500, statut: 'en_attente' },
    ],
  });

  assert.equal(summary.aujourdHui, 5000);
  assert.equal(summary.saisieAujourdHui, 14000);
  assert.equal(summary.piecesSaisiesAujourdHui, 11);
  assert.equal(summary.semaine, 7000);
  assert.equal(summary.mois, 7000);
  assert.equal(summary.piecesAujourdHui, 2);
  assert.equal(summary.totalGagne, 7000);
  assert.equal(summary.totalPaye, 1000);
  assert.equal(summary.productionEnAttente, 9000);
  assert.equal(summary.piecesEnAttente, 9);
  assert.equal(summary.paiementEnAttente, 1500);
  assert.equal(summary.soldeDisponible, 4500);
});

test('normalise les dates et montants financiers', () => {
  assert.equal(normalizeDateKey('2026-02-28'), '2026-02-28');
  assert.equal(parseMoney('1250.456'), 1250.46);
  assert.throws(() => parseMoney(0), /supérieur à zéro/);
});
