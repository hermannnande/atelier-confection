import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeRequestError,
  isRequestCanceled,
  isRetryableRequestError,
  retryDelayMs,
} from './requestErrors.js';

const httpError = (status, data = {}, headers = {}) => ({ response: { status, data, headers } });

test('un délai dépassé donne un message clair', () => {
  assert.equal(
    describeRequestError({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }),
    'Le serveur met trop de temps à répondre.',
  );
});

test('sans connexion Internet, le message le dit avant tout', () => {
  assert.equal(describeRequestError({ code: 'ERR_NETWORK' }, { online: false }), 'Pas de connexion Internet.');
  assert.equal(
    describeRequestError({ code: 'ERR_NETWORK' }, { online: true }),
    'Serveur injoignable. Vérifiez la connexion Internet.',
  );
});

test('le message du serveur est repris quand il existe', () => {
  assert.equal(
    describeRequestError(httpError(503, { message: 'Service en redémarrage. Réessayez dans quelques secondes.' }), { online: true }),
    'Service en redémarrage. Réessayez dans quelques secondes.',
  );
  assert.equal(describeRequestError(httpError(500), { online: true }), 'Erreur du serveur lors du chargement.');
  assert.equal(describeRequestError(httpError(504), { online: true }), 'Le serveur ne répond pas pour le moment.');
});

test('seules les pannes passagères sont retentées automatiquement', () => {
  assert.equal(isRetryableRequestError({ code: 'ERR_NETWORK' }), true);
  assert.equal(isRetryableRequestError(httpError(503)), true);
  assert.equal(isRetryableRequestError(httpError(502)), true);
  assert.equal(isRetryableRequestError(httpError(500)), false);
  assert.equal(isRetryableRequestError(httpError(403)), false);
  assert.equal(isRetryableRequestError({ code: 'ERR_CANCELED', name: 'CanceledError' }), false);
  assert.equal(isRequestCanceled({ name: 'CanceledError' }), true);
});

test('la nouvelle tentative suit le Retry-After du serveur, borné à 5 s', () => {
  assert.equal(retryDelayMs(httpError(503, {}, { 'retry-after': '2' })), 2000);
  assert.equal(retryDelayMs(httpError(503, {}, { get: (name) => (name === 'retry-after' ? '1' : null) })), 1000);
  assert.equal(retryDelayMs(httpError(503, {}, { 'retry-after': '120' })), 5000);
  assert.equal(retryDelayMs({ code: 'ERR_NETWORK' }), 1500);
});
