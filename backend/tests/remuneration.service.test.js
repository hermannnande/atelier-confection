import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdminRemunerationAlerts,
  calculateProductionBonusAllocations,
  calculateRemunerationSummary,
  getProductionBonusRule,
  normalizeDateKey,
  parseMoney,
  validateProductionIds,
  validateProductionItems,
} from '../services/remuneration.service.js';

test('applique 250 FCFA à chaque tenue à partir de la septième de la journée', () => {
  const expectedRule = { groupe: 'toutes_tenues', quota: 6, bonusUnitaire: 250 };
  assert.deepEqual(getProductionBonusRule(700), expectedRule);
  assert.deepEqual(getProductionBonusRule(800), expectedRule);
  assert.deepEqual(getProductionBonusRule(1000), expectedRule);

  const lowTarifModel = '11111111-1111-4111-8111-111111111111';
  const highTarifModel = '22222222-2222-4222-8222-222222222222';
  const allocations = calculateProductionBonusAllocations({
    items: [
      { modeleId: lowTarifModel, quantite: 4 },
      { modeleId: highTarifModel, quantite: 4 },
    ],
    tarifByModele: new Map([
      [lowTarifModel, { montant_unitaire: 900 }],
      [highTarifModel, { montant_unitaire: 1000 }],
    ]),
    existingProductions: [],
  });

  assert.deepEqual(allocations[0], {
    modeleId: lowTarifModel,
    quantite: 4,
    quantiteBonus: 0,
    bonusUnitaire: 250,
    montantBonus: 0,
  });
  assert.deepEqual(allocations[1], {
    modeleId: highTarifModel,
    quantite: 4,
    quantiteBonus: 2,
    bonusUnitaire: 250,
    montantBonus: 500,
  });
});

test('tient compte des tenues déjà déclarées pendant la même journée', () => {
  const modeleId = '33333333-3333-4333-8333-333333333333';
  const [allocation] = calculateProductionBonusAllocations({
    items: [{ modeleId, quantite: 3 }],
    tarifByModele: new Map([[modeleId, { montant_unitaire: 500 }]]),
    existingProductions: [{ quantite: 6, tarif_unitaire: 1400 }],
  });

  assert.deepEqual(allocation, {
    modeleId,
    quantite: 3,
    quantiteBonus: 3,
    bonusUnitaire: 250,
    montantBonus: 750,
  });
});

test('calcule les alertes de rémunération du tableau de bord administrateur', () => {
  assert.deepEqual(calculateAdminRemunerationAlerts({
    productions: [
      { quantite: 3, montant_total: 7500, montant_bonus: 600, statut: 'en_attente' },
      { quantite: 2, montant_total: 4000, statut: 'en_attente' },
      { quantite: 9, montant_total: 9000, statut: 'validee' },
    ],
    paiements: [
      { montant: 5000, statut: 'en_attente' },
      { montant: 2000, statut: 'payee' },
    ],
  }), {
    productions: 2,
    pieces: 5,
    montantProductions: 12100,
    paiements: 1,
    montantPaiements: 5000,
    total: 3,
  });
});

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
      { date_production: '2026-08-25', quantite: 1, montant_total: 2000, montant_bonus: 300, statut: 'validee' },
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
  assert.equal(summary.semaine, 7300);
  assert.equal(summary.mois, 7300);
  assert.equal(summary.piecesAujourdHui, 2);
  assert.equal(summary.totalGagne, 7300);
  assert.equal(summary.totalPaye, 1000);
  assert.equal(summary.productionEnAttente, 9000);
  assert.equal(summary.piecesEnAttente, 9);
  assert.equal(summary.paiementEnAttente, 1500);
  assert.equal(summary.soldeDisponible, 4800);
});

test('normalise les dates et montants financiers', () => {
  assert.equal(normalizeDateKey('2026-02-28'), '2026-02-28');
  assert.equal(parseMoney('1250.456'), 1250.46);
  assert.throws(() => parseMoney(0), /supérieur à zéro/);
});
