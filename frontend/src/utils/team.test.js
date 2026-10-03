import test from 'node:test';
import assert from 'node:assert/strict';
import { hasTeam, inTeam, teamLabel } from './team.js';

test('seuls les couturiers et les stylistes ont une équipe', () => {
  assert.equal(hasTeam('couturier'), true);
  assert.equal(hasTeam('styliste'), true);
  assert.equal(hasTeam('livreur'), false);
});

test('libellés courts des équipes', () => {
  assert.equal(teamLabel('nuit'), '🌙 Nuit');
  assert.equal(teamLabel('jour'), '☀️ Jour');
  assert.equal(teamLabel(null), '');
});

test('le filtre d’équipe garde tout le monde sans choix, et la journée par défaut', () => {
  assert.equal(inTeam('', 'nuit'), true);
  assert.equal(inTeam('nuit', 'nuit'), true);
  assert.equal(inTeam('nuit', 'jour'), false);
  assert.equal(inTeam('jour', undefined), true);
});
