const DEFAULT_API_URL = 'https://smsenvoie.com/api/v1';
const DEFAULT_TIMEOUT_MS = 15000;

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSimSlot(value) {
  const parsed = parseInteger(value, null);
  return parsed === 0 || parsed === 1 ? parsed : null;
}

export function getSmsEnvoieConfiguration(env = process.env) {
  const simSlot = normalizeSimSlot(env.SMSENVOIE_SIM_SLOT);
  return {
    apiKey: String(env.SMSENVOIE_API_KEY || '').trim(),
    apiUrl: String(env.SMSENVOIE_API_URL || DEFAULT_API_URL).trim().replace(/\/+$/, ''),
    deviceId: String(env.SMSENVOIE_DEVICE_ID || '').trim(),
    simSlot,
    priority: Math.min(2, Math.max(0, parseInteger(env.SMSENVOIE_PRIORITY, 0))),
    timeoutMs: Math.max(1000, parseInteger(env.SMSENVOIE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)),
  };
}

export function parseSmsEnvoieResponse(payload = {}) {
  const ok = payload?.ok === true;
  return {
    success: ok,
    campaignId: payload?.campaign_id ? String(payload.campaign_id) : null,
    total: Number(payload?.total || 0),
    skippedOptout: Number(payload?.skipped_optout || 0),
    invalid: Number(payload?.invalid || 0),
    status: payload?.status ? String(payload.status).toLowerCase() : null,
    error: ok ? null : String(payload?.error || 'SMSEnvoie a refusé la requête'),
    code: ok ? null : String(payload?.code || 'smsenvoie_error'),
  };
}

async function sendMessage(payload, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const config = getSmsEnvoieConfiguration(env);
  if (typeof fetchImpl !== 'function') throw new Error('Client HTTP indisponible');
  if (!config.apiKey) throw new Error('Clé API SMSEnvoie manquante');
  if (!config.deviceId) throw new Error('Appareil SMSEnvoie manquant');
  if (config.simSlot === null) throw new Error('Slot SIM SMSEnvoie invalide');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(`${config.apiUrl}/sms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to,
        message: payload.message,
        device_id: config.deviceId,
        sim_slot: config.simSlot,
        priority: config.priority,
      }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let responsePayload;
    try {
      responsePayload = JSON.parse(rawText);
    } catch {
      responsePayload = {
        ok: false,
        error: `Réponse SMSEnvoie non-JSON (${response.status})`,
        code: 'invalid_response',
      };
    }

    const parsed = parseSmsEnvoieResponse(responsePayload);
    if (!response.ok || !parsed.success) {
      const error = new Error(parsed.error || `Erreur SMSEnvoie ${response.status}`);
      error.code = parsed.code;
      error.httpStatus = response.status;
      throw error;
    }

    return {
      success: true,
      pending: ['queued', 'sending'].includes(parsed.status),
      campaignId: parsed.campaignId,
      providerStatus: parsed.status,
      response: responsePayload,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const smsEnvoieAdapter = {
  isConfigured(env = process.env) {
    const config = getSmsEnvoieConfiguration(env);
    return Boolean(config.apiKey && config.deviceId && config.simSlot !== null);
  },

  getPublicConfiguration(env = process.env) {
    const config = getSmsEnvoieConfiguration(env);
    return {
      providerLabel: 'SMSEnvoie',
      deviceId: config.deviceId || null,
      simSlot: config.simSlot,
      simLabel: config.simSlot === null ? null : `SIM ${config.simSlot + 1}`,
    };
  },

  sendMessage,
};

export default smsEnvoieAdapter;
