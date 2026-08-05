import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const API_KEY_CONFIG = 'wasender_api_key_encrypted';
const ENABLED_CONFIG = 'whatsapp_enabled';
const CIPHER_VERSION = 'v1';

function getEncryptionKey(env = process.env) {
  const source = String(env.SUPABASE_SERVICE_KEY || '').trim();
  if (!source) {
    throw new Error('SUPABASE_SERVICE_KEY est requis pour chiffrer la configuration WhatsApp');
  }

  return createHash('sha256')
    .update(`atelier-confection:whatsapp:${CIPHER_VERSION}:${source}`)
    .digest();
}

export function encryptWhatsAppSecret(secret, env = process.env) {
  const value = String(secret || '').trim();
  if (!value) throw new Error('Clé WaSenderAPI vide');

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

export function decryptWhatsAppSecret(payload, env = process.env) {
  const [version, ivPart, tagPart, encryptedPart] = String(payload || '').split(':');
  if (version !== CIPHER_VERSION || !ivPart || !tagPart || !encryptedPart) {
    throw new Error('Configuration WhatsApp chiffrée invalide');
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

export async function readStoredWhatsAppConfig(db, env = process.env) {
  const { data, error } = await db
    .from('sms_config')
    .select('cle, valeur')
    .in('cle', [API_KEY_CONFIG, ENABLED_CONFIG]);

  if (error) throw new Error(`Lecture configuration WhatsApp impossible : ${error.message}`);

  const values = Object.fromEntries((data || []).map((row) => [row.cle, row.valeur]));
  const encryptedApiKey = String(values[API_KEY_CONFIG] || '').trim();

  return {
    enabled: String(values[ENABLED_CONFIG] || '').toLowerCase() === 'true',
    apiKey: encryptedApiKey ? decryptWhatsAppSecret(encryptedApiKey, env) : '',
  };
}

export async function saveStoredWhatsAppConfig({ apiKey, enabled = true }, db, env = process.env) {
  const encryptedApiKey = encryptWhatsAppSecret(apiKey, env);
  const { error } = await db.from('sms_config').upsert([
    {
      cle: API_KEY_CONFIG,
      valeur: encryptedApiKey,
      description: 'Clé WaSenderAPI chiffrée pour la session NousUnique',
    },
    {
      cle: ENABLED_CONFIG,
      valeur: enabled ? 'true' : 'false',
      description: 'Activation des notifications WhatsApp NousUnique',
    },
  ], { onConflict: 'cle' });

  if (error) throw new Error(`Enregistrement configuration WhatsApp impossible : ${error.message}`);
  return { enabled: Boolean(enabled), configured: true };
}
