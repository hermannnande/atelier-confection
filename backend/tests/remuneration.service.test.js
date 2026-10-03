import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdminRemunerationAlerts,
  calculatePeriodEarnings,
  calculateProductionBonusAllocations,
  calculateRemunerationSummary,
  getProductionBonusRule,
  getRemunerationRule,
  normalizeDateKey,
  parseMoney,
  parsePeriod,
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

test('l’équipe de nuit reçoit 100 FCFA de plus par tenue et 300 FCFA de bonus dès la septième', () => {
  assert.deepEqual(getRemunerationRule('jour'), { equipe: 'jour', supplementTenue: 0, quota: 6, bonusUnitaire: 250 });
  assert.deepEqual(getRemunerationRule('nuit'), { equipe: 'nuit', supplementTenue: 100, quota: 6, bonusUnitaire: 300 });
  assert.deepEqual(getRemunerationRule(undefined), getRemunerationRule('jour'));
  assert.deepEqual(getProductionBonusRule('nuit'), { groupe: 'toutes_tenues', quota: 6, bonusUnitaire: 300 });

  const modeleId = '33333333-3333-4333-8333-333333333333';
  const [nuit] = calculateProductionBonusAllocations({
    items: [{ modeleId, quantite: 5 }],
    existingProductions: [{ quantite: 4 }],
    equipe: 'nuit',
  });
  // 4 tenues déjà déclarées cette nuit : les 2 suivantes restent sans bonus, les 3 dernières à +300.
  assert.deepEqual(nuit, { modeleId, quantite: 5, quantiteBonus: 3, bonusUnitaire: 300, montantBonus: 900 });

  const [jour] = calculateProductionBonusAllocations({
    items: [{ modeleId, quantite: 5 }],
    existingProductions: [{ quantite: 4 }],
  });
  assert.deepEqual(jour, { modeleId, quantite: 5, quantiteBonus: 3, bonusUnitaire: 250, montantBonus: 750 });
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

test('une période se lit du … au …, bornes incluses', () => {
  assert.deepEqual(parsePeriod('2026-10-01', '2026-10-31'), { du: '2026-10-01', au: '2026-10-31' });
  assert.deepEqual(parsePeriod('2026-10-03', '2026-10-03'), { du: '2026-10-03', au: '2026-10-03' });
  assert.equal(parsePeriod('2026-10-31', '2026-10-01').error, 'La date de début doit précéder la date de fin');
  assert.equal(parsePeriod('2026-02-30', '2026-03-01').error, 'Période invalide');
  assert.equal(parsePeriod(undefined, '2026-03-01').error, 'Période invalide');
});

test('les gains d’une période ne comptent que les productions validées, jour par jour', () => {
  const couturiers = [
    { id: 'c1', nom: 'Aya', equipe: 'jour' },
    { id: 'c2', nom: 'Bamba', equipe: 'nuit' },
  ];
  const productions = [
    { couturier_id: 'c1', date_production: '2026-10-01', quantite: 4, montant_total: 4000, montant_bonus: 0, statut: 'validee' },
    { couturier_id: 'c1', date_production: '2026-10-01', quantite: 3, montant_total: 3000, montant_bonus: 250, statut: 'validee' },
    { couturier_id: 'c1', date_production: '2026-10-02', quantite: 2, montant_total: 1600, montant_bonus: 0, statut: 'en_attente' },
    { couturier_id: 'c2', date_production: '2026-10-02', quantite: 5, montant_total: 5500, montant_bonus: 0, statut: 'validee' },
    { couturier_id: 'inconnu', date_production: '2026-10-02', quantite: 9, montant_total: 9000, montant_bonus: 0, statut: 'validee' },
  ];
  const [aya, bamba] = calculatePeriodEarnings({ couturiers, productions });
  assert.deepEqual(aya, {
    id: 'c1', nom: 'Aya', equipe: 'jour',
    piecesValidees: 7, montantValide: 7250, bonusValide: 250, piecesEnAttente: 2, montantEnAttente: 1600,
    jours: [{ date: '2026-10-01', pieces: 7, montant: 7250, bonus: 250 }],
  });
  assert.equal(bamba.montantValide, 5500);
  assert.deepEqual(bamba.jours, [{ date: '2026-10-02', pieces: 5, montant: 5500, bonus: 0 }]);
});
