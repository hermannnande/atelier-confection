import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isStaleCopy,
  keepOptimizedMedia,
  optimizedSourceName,
  originalSourceName,
  protectCatalogRows,
} from '../services/ecommerce-catalog-sync.service.js';

const uploads = 'https://nousunique.com/wp-content/uploads';
const current = {
  id: '17',
  thumbnail: `${uploads}/2026/08/Robe-Sadiya-2-optimized-thumbnail-5cd19cb32890.webp`,
  images: [
    `${uploads}/2026/08/Robe-Sadiya-optimized-gallery-08b96bc24a94.webp`,
    `${uploads}/2026/09/Robe-Sadiya-dos-optimized-1.webp`,
  ],
  video: `${uploads}/2026/08/robe-optimized-video-f51d3f7105e0.mp4`,
  updated_at: '2026-10-06T18:20:00.000Z',
};

function row(overrides = {}) {
  return {
    id: '17',
    name: 'Robe Sadiya',
    thumbnail: `${uploads}/2026/08/Robe-Sadiya-2.png`,
    images: [`${uploads}/2026/08/Robe-Sadiya.png`, `${uploads}/2026/09/Robe-Sadiya-dos-optimized-1.webp`],
    video: 'https://obrille.com/wp-content/uploads/2026/06/robe.mp4',
    clientUpdatedAt: '2026-10-06T18:25:00.000Z',
    ...overrides,
  };
}

test('les noms des fichiers allégés retrouvent leur original', () => {
  assert.equal(optimizedSourceName(current.thumbnail), 'robe-sadiya-2');
  assert.equal(optimizedSourceName(current.images[1]), 'robe-sadiya-dos');
  assert.equal(optimizedSourceName(current.video), 'robe');
  assert.equal(optimizedSourceName(`${uploads}/2026/08/Robe-Sadiya.png`), null);
  assert.equal(originalSourceName(`${uploads}/2026/08/Robe-Sadiya.png?v=2`), 'robe-sadiya');
  assert.equal(originalSourceName(current.thumbnail), null);
});

test('une ancienne copie ne remet pas les photos et la vidéo lourdes', () => {
  const kept = keepOptimizedMedia(row(), current);
  assert.equal(kept.thumbnail, current.thumbnail);
  assert.deepEqual(kept.images, current.images);
  assert.equal(kept.video, current.video);
});

test('une nouvelle photo ou une photo retirée reste le choix de l’administrateur', () => {
  const kept = keepOptimizedMedia(row({
    thumbnail: `${uploads}/2026/10/Robe-Sadiya-verte-optimized.webp`,
    images: [`${uploads}/2026/10/Nouvelle-photo.png`],
    video: null,
  }), current);
  assert.equal(kept.thumbnail, `${uploads}/2026/10/Robe-Sadiya-verte-optimized.webp`);
  assert.deepEqual(kept.images, [`${uploads}/2026/10/Nouvelle-photo.png`]);
  assert.equal(kept.video, null);
});

test('une image et une vidéo de même nom ne se remplacent pas entre elles', () => {
  const kept = keepOptimizedMedia(row({ thumbnail: `${uploads}/2026/08/robe.png` }), current);
  assert.equal(kept.thumbnail, `${uploads}/2026/08/robe.png`);
  assert.equal(kept.video, current.video);
});

test('une copie de plus de 10 minutes plus ancienne que la fiche en ligne est ignorée', () => {
  assert.equal(isStaleCopy('2026-09-17T08:00:00.000Z', current.updated_at), true);
  assert.equal(isStaleCopy('2026-10-06T18:15:00.000Z', current.updated_at), false);
  assert.equal(isStaleCopy(undefined, current.updated_at), false);
  assert.equal(isStaleCopy('pas une date', current.updated_at), false);
});

test('le tri garde les nouveautés et les modifications récentes, ignore les copies périmées', () => {
  const result = protectCatalogRows([
    row(),
    row({ id: '18', clientUpdatedAt: '2026-08-01T10:00:00.000Z' }),
    row({ id: '19' }),
  ], [current, { ...current, id: '18' }]);
  assert.deepEqual(result.skippedIds, ['18']);
  assert.deepEqual(result.rows.map((r) => r.id), ['17', '19']);
  assert.equal(result.rows[0].thumbnail, current.thumbnail);
  assert.equal(result.rows[1].thumbnail, `${uploads}/2026/08/Robe-Sadiya-2.png`);
  assert.equal('clientUpdatedAt' in result.rows[0], false);
});
