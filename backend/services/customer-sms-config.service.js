import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const CONFIG_KEYS = Object.freeze({
  API_KEY: 'smsenvoie_api_key_encrypted',
  ENABLED: 'customer_sms_enabled',
  PROVIDER: 'customer_sms_provider',
  DEVICE_ID: 'smsenvoie_device_id',
  SIM_SLOT: 'smsenvoie_sim_slot',
});
const CIPHER_VERSION = 'v1';

function getEncryptionKey(env = process.env) {
  const source = String(env.SUPABASE_SERVICE_KEY || '').trim();
  if (!source) throw new Error('SUPABASE_SERVICE_KEY est requis pour chiffrer la configuration SMS');
  return createHash('sha256')
    .update(`atelier-confection:customer-sms:${CIPHER_VERSION}:${source}`)
    .digest();
}

export function encryptCustomerSmsSecret(secret, env = process.env) {
  const value = String(secret || '').trim();
  if (!value) throw new Error('Clé SMSEnvoie vide');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    CIPHER_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptCustomerSmsSecret(payload, env = process.env) {
  const [version, ivPart, tagPart, encryptedPart] = String(payload || '').split(':');
  if (version !== CIPHER_VERSION || !ivPart || !tagPart || !encryptedPart) {
    throw new Error('Configuration SMS chiffrée invalide');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(env),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export async function readStoredCustomerSmsConfig(db, env = process.env) {
  const keys = Object.values(CONFIG_KEYS);
  const { data, error } = await db.from('sms_config').select('cle, valeur').in('cle', keys);
  if (error) throw new Error(`Lecture configuration SMS impossible : ${error.message}`);
  const values = Object.fromEntries((data || []).map((row) => [row.cle, row.valeur]));
  const encryptedApiKey = String(values[CONFIG_KEYS.API_KEY] || '').trim();
  return {
    enabled: String(values[CONFIG_KEYS.ENABLED] || '').toLowerCase() === 'true',
    provider: String(values[CONFIG_KEYS.PROVIDER] || 'smsenvoie').trim().toLowerCase(),
    apiKey: encryptedApiKey ? decryptCustomerSmsSecret(encryptedApiKey, env) : '',
    deviceId: String(values[CONFIG_KEYS.DEVICE_ID] || '').trim(),
    simSlot: String(values[CONFIG_KEYS.SIM_SLOT] ?? '').trim(),
  };
}

export async function saveStoredCustomerSmsConfig(config, db, env = process.env) {
  const apiKey = String(config.apiKey || '').trim();
  const deviceId = String(config.deviceId || '').trim();
  const simSlot = Number.parseInt(String(config.simSlot), 10);
  if (!/^sk_(live|test)_[A-Za-z0-9_-]{20,}$/.test(apiKey)) throw new Error('Clé SMSEnvoie invalide');
  if (!/^[0-9a-f-]{20,}$/i.test(deviceId)) throw new Error('Identifiant appareil SMSEnvoie invalide');
  if (simSlot !== 0 && simSlot !== 1) throw new Error('Slot SIM invalide');

  const rows = [
    {
      cle: CONFIG_KEYS.API_KEY,
      valeur: encryptCustomerSmsSecret(apiKey, env),
      description: 'Clé API SMSEnvoie chiffrée pour NousUnique',
    },
    {
      cle: CONFIG_KEYS.ENABLED,
      valeur: config.enabled === false ? 'false' : 'true',
      description: 'Activation des messages SMS clients NousUnique',
    },
    {
      cle: CONFIG_KEYS.PROVIDER,
      valeur: 'smsenvoie',
      description: 'Fournisseur des messages SMS clients NousUnique',
    },
    {
      cle: CONFIG_KEYS.DEVICE_ID,
      valeur: deviceId,
      description: 'Appareil Android SMSEnvoie NousUnique',
    },
    {
      cle: CONFIG_KEYS.SIM_SLOT,
      valeur: String(simSlot),
      description: `Slot SMSEnvoie ${simSlot} (SIM ${simSlot + 1})`,
    },
  ];
  const { error } = await db.from('sms_config').upsert(rows, { onConflict: 'cle' });
  if (error) throw new Error(`Enregistrement configuration SMS impossible : ${error.message}`);
  return { enabled: config.enabled !== false, configured: true, provider: 'smsenvoie', deviceId, simSlot };
}
