import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chosenStartCount,
  piecesToStart,
  startButtonLabel,
  startSuccessMessage,
} from './workshopStartSelection.js';

const pieces = [
  { commandeId: 'a', articleKey: 'principal', urgence: true },
  { commandeId: 'b', articleKey: 'principal', urgence: false },
  { commandeId: 'c', articleKey: 'supplement-1', urgence: false },
];

test('sans choix, toutes les pièces affichées sont commencées', () => {
  assert.equal(chosenStartCount(undefined, 3), 3);
  assert.deepEqual(piecesToStart(pieces), pieces);
});

test('le styliste peut commencer une seule pièce sur deux', () => {
  assert.equal(chosenStartCount(1, 2), 1);
  assert.deepEqual(piecesToStart(pieces.slice(0, 2), 1), [pieces[0]]);
});

test('le choix reste entre 1 et le nombre de pièces encore affichées', () => {
  assert.equal(chosenStartCount(0, 2), 1);
  assert.equal(chosenStartCount(-4, 2), 1);
  // Une pièce a été commencée ailleurs entre-temps : on ne dépasse jamais la liste.
  assert.equal(chosenStartCount(3, 2), 2);
  assert.equal(chosenStartCount('abc', 2), 2);
  assert.equal(chosenStartCount(1, 0), 0);
  assert.deepEqual(piecesToStart(undefined, 1), []);
});

test('les pièces prioritaires envoyées en premier par le serveur sont commencées', () => {
  assert.deepEqual(piecesToStart(pieces, 2).map(p => p.commandeId), ['a', 'b']);
});

test('le bouton et le message indiquent clairement une partie des pièces', () => {
  assert.equal(startButtonLabel(1, 2), 'Je commence 1 pièce sur 2');
  assert.equal(startButtonLabel(2, 3), 'Je commence 2 pièces sur 3');
  assert.equal(startButtonLabel(2, 2), 'Je commence ces 2 pièces');
  assert.equal(startButtonLabel(1, 1), 'Je commence cette pièce');
  assert.match(startSuccessMessage(1, 1), /Cette pièce reste .* Il reste 1 pièce à commencer\.$/);
  assert.match(startSuccessMessage(2, 0), /Ces pièces restent .* réception\.$/);
  assert.match(startSuccessMessage(1, 3), /Il reste 3 pièces à commencer\.$/);
});
