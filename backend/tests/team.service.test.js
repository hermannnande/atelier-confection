import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTeam, teamStatsUpdate, userTeam } from '../services/team.service.js';
import { isLateArrival, shiftDate, shiftHours } from '../services/work-shift.service.js';

test('les couturiers et stylistes sans équipe notée sont dans l’équipe de jour', () => {
  assert.equal(userTeam({ role: 'couturier', stats: {} }), 'jour');
  assert.equal(userTeam({ role: 'styliste', stats: null }), 'jour');
  assert.equal(userTeam({ role: 'couturier', stats: { equipe: 'nuit' } }), 'nuit');
  assert.equal(userTeam({ role: 'livreur', stats: { equipe: 'nuit' } }), null);
});

test('seules les équipes jour et nuit sont acceptées', () => {
  assert.deepEqual(parseTeam(undefined), { equipe: undefined });
  assert.deepEqual(parseTeam('nuit'), { equipe: 'nuit' });
  assert.equal(parseTeam('soir').error, 'Équipe invalide');
});

test('l’équipe est enregistrée sans toucher aux autres informations', () => {
  assert.deepEqual(teamStatsUpdate({ stats: {}, role: 'couturier', equipe: 'nuit' }), { equipe: 'nuit' });
  assert.deepEqual(teamStatsUpdate({ stats: { autre: 1 }, role: 'styliste', equipe: 'jour' }), { autre: 1, equipe: 'jour' });
  assert.equal(teamStatsUpdate({ stats: { equipe: 'nuit' }, role: 'couturier', equipe: 'nuit' }), undefined);
  assert.equal(teamStatsUpdate({ stats: {}, role: 'couturier' }), undefined);
  // Changement de rôle vers un rôle sans équipe : l’équipe est retirée.
  assert.deepEqual(teamStatsUpdate({ stats: { equipe: 'nuit', autre: 1 }, role: 'livreur', equipe: 'nuit' }), { autre: 1 });
  assert.equal(teamStatsUpdate({ stats: {}, role: 'livreur' }), undefined);
});

test('une nuit de travail est rattachée à la date de son début', () => {
  assert.equal(shiftDate(new Date('2026-10-03T21:00:00Z'), 'nuit'), '2026-10-03');
  assert.equal(shiftDate(new Date('2026-10-04T06:30:00Z'), 'nuit'), '2026-10-03');
  assert.equal(shiftDate(new Date('2026-10-04T06:30:00Z'), 'jour'), '2026-10-04');
  assert.equal(shiftDate(new Date('2026-11-01T02:00:00Z'), 'nuit'), '2026-10-31');
});

test('le retard se calcule sur l’heure d’Abidjan et l’horaire de l’équipe', () => {
  const config = { heure_ouverture: '08:30:00', heure_fermeture: '17:30:00', tolerance_retard: 15 };
  assert.deepEqual(shiftHours('jour', config), { debut: '08:30', fin: '17:30' });
  assert.deepEqual(shiftHours('nuit', config), { debut: '19:00', fin: '07:00' });
  // Jour : 08:21 et 08:45 à l’heure, 08:46 en retard.
  assert.equal(isLateArrival(new Date('2026-10-03T08:21:00Z'), 'jour', config), false);
  assert.equal(isLateArrival(new Date('2026-10-03T08:45:59Z'), 'jour', config), false);
  assert.equal(isLateArrival(new Date('2026-10-03T08:46:00Z'), 'jour', config), true);
  // Nuit : 18:40 et 19:10 à l’heure, 19:20 en retard, 01:00 en retard sur la nuit de la veille.
  assert.equal(isLateArrival(new Date('2026-10-03T18:40:00Z'), 'nuit', config), false);
  assert.equal(isLateArrival(new Date('2026-10-03T19:10:00Z'), 'nuit', config), false);
  assert.equal(isLateArrival(new Date('2026-10-03T19:20:00Z'), 'nuit', config), true);
  assert.equal(isLateArrival(new Date('2026-10-04T01:00:00Z'), 'nuit', config), true);
});
