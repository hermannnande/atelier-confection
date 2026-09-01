import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_ORGANIZATION_COLORS,
  parseOrderOrganizationColor,
} from '../services/order-organization.service.js';

test('accepte uniquement les couleurs d’organisation proposées', () => {
  for (const color of ORDER_ORGANIZATION_COLORS) {
    assert.equal(parseOrderOrganizationColor(color), color);
  }
  assert.throws(
    () => parseOrderOrganizationColor('orange'),
    /Couleur d’organisation invalide/,
  );
});

test('retire la couleur avec une valeur vide ou « none »', () => {
  assert.equal(parseOrderOrganizationColor(null), null);
  assert.equal(parseOrderOrganizationColor(''), null);
  assert.equal(parseOrderOrganizationColor('none'), null);
});
