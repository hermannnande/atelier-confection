import 'dotenv/config';
import { getSupabaseAdmin } from '../supabase/client.js';

function looksLikeJwt(key) {
  return typeof key === 'string' && key.split('.').length === 3;
}

function exitWithHelp(message) {
  console.error(`❌ ${message}`);
  console.error('');
  console.error('✅ Vérifie `backend/.env` :');
  console.error('- SUPABASE_URL doit ressembler à: https://xxxxxxxxxxxxxxxxxxxx.supabase.co');
  console.error('- SUPABASE_SERVICE_KEY doit être la clé `service_role` (long JWT qui commence souvent par `eyJ...`)');
  process.exit(1);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  console.log('🔎 Check Supabase config...');
  console.log('SUPABASE_URL:', url || '(manquant)');
  console.log('SUPABASE_ANON_KEY:', anonKey ? '(présent)' : '(manquant)');
  console.log('SUPABASE_SERVICE_KEY:', serviceKey ? '(présent)' : '(manquant)');

  if (!url || !serviceKey) {
    exitWithHelp('Configuration Supabase incomplète.');
  }

  if (String(url).includes('supabase.com/dashboard')) {
    exitWithHelp("SUPABASE_URL pointe vers le dashboard Supabase. Utilise le 'Project URL' (en .supabase.co), pas une URL du dashboard.");
  }

  if (!String(url).startsWith('https://') || !String(url).includes('.supabase.co')) {
    console.warn("⚠️ SUPABASE_URL ne ressemble pas à une URL Supabase Cloud (.supabase.co). Vérifie qu'il n'y a pas d'espaces ou de chemin en trop.");
  }

  if (String(serviceKey).startsWith('sb_publishable_')) {
    exitWithHelp('SUPABASE_SERVICE_KEY semble être une publishable key (sb_publishable_...). Il faut la clé service_role (SECRET).');
  }

  if (!looksLikeJwt(serviceKey)) {
    console.warn("⚠️ SUPABASE_SERVICE_KEY ne ressemble pas à un JWT (format xxx.yyy.zzz). Vérifie que c'est bien la clé service_role.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('users').select('id').limit(1);

  if (error) {
    const msg = String(error.message || '');
    if (msg.startsWith('<!DOCTYPE html') || msg.includes('<html')) {
      exitWithHelp("Supabase renvoie une page HTML (404). Très probable que SUPABASE_URL est incorrecte (dashboard au lieu de .supabase.co).");
    }
    console.error('❌ Requête Supabase échouée:', msg);
    process.exit(1);
  }

  console.log('✅ Connexion Supabase OK. Table `users` accessible.');
  console.log('Aperçu:', data?.[0] || null);
}

main().catch((e) => {
  console.error('❌ Check échoué:', e?.message || e);
  process.exit(1);
});

