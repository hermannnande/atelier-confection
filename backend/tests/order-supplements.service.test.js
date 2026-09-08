import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderTotal,
  normalizeOrderSupplements,
  resolveStoredOrderBasePrice,
} from '../services/order-supplements.service.js';

test('additionne les articles supplémentaires au prix de base', () => {
  const supplements = normalizeOrderSupplements([
    { id: 's1', libelle: 'Deuxième tenue', taille: 'XL', montant: 13_500 },
    { id: 's2', libelle: 'Livraison express', montant: 2_000 },
  ]);

  assert.equal(calculateOrderTotal(13_500, supplements), 29_000);
  assert.equal(supplements[0].taille, 'XL');
});

test('retrouve le prix de base des anciennes commandes', () => {
  assert.equal(
    resolveStoredOrderBasePrice(
      { prix: 20_000 },
      [{ id: 's1', libelle: 'Accessoire', montant: 5_000 }],
    ),
    15_000,
  );
});

test('refuse un supplément sans libellé ou sans montant positif', () => {
  assert.throws(() => normalizeOrderSupplements([{ libelle: '', montant: 1_000 }]), /obligatoire/);
  assert.throws(() => normalizeOrderSupplements([{ libelle: 'Accessoire', montant: 0 }]), /supérieur/);
});
