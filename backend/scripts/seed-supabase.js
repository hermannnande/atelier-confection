import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY manquants dans backend/.env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const users = [
  { nom: 'Admin Principal', email: 'admin@atelier.com', role: 'administrateur', telephone: '+225 07 00 00 00 01' },
  { nom: 'Gestionnaire Principal', email: 'gestionnaire@atelier.com', role: 'gestionnaire', telephone: '+225 07 00 00 00 02' },
  { nom: 'Appelant Marie', email: 'appelant@atelier.com', role: 'appelant', telephone: '+225 07 00 00 00 03' },
  { nom: 'Appelant Jean', email: 'appelant2@atelier.com', role: 'appelant', telephone: '+225 07 00 00 00 04' },
  { nom: 'Styliste Fatou', email: 'styliste@atelier.com', role: 'styliste', telephone: '+225 07 00 00 00 05' },
  { nom: 'Couturier Amadou', email: 'couturier@atelier.com', role: 'couturier', telephone: '+225 07 00 00 00 06' },
  { nom: 'Couturier Aïcha', email: 'couturier2@atelier.com', role: 'couturier', telephone: '+225 07 00 00 00 07' },
  { nom: 'Livreur Koffi', email: 'livreur@atelier.com', role: 'livreur', telephone: '+225 07 00 00 00 08' },
  { nom: 'Livreur Didier', email: 'livreur2@atelier.com', role: 'livreur', telephone: '+225 07 00 00 00 09' },
];

async function run() {
  console.log('🔧 Seed Supabase: création des utilisateurs de test…');
  const passwordHash = await bcrypt.hash('password123', 10);

  for (const u of users) {
    const email = u.email.toLowerCase();
    const { data: existing, error: e1 } = await supabase.from('users').select('id, email').eq('email', email).maybeSingle();
    if (e1) throw e1;

    if (existing) {
      const { error: e2 } = await supabase
        .from('users')
        .update({ nom: u.nom, role: u.role, telephone: u.telephone, actif: true })
        .eq('id', existing.id);
      if (e2) throw e2;
      console.log(`↻ MAJ: ${email} (${u.role})`);
      continue;
    }

    const { error: e3 } = await supabase.from('users').insert({
      nom: u.nom,
      email,
      password: passwordHash,
      role: u.role,
      telephone: u.telephone,
      actif: true,
    });
    if (e3) throw e3;
    console.log(`✓ Créé: ${email} (${u.role})`);
  }

  console.log('✅ Seed terminé.');
}

run().catch((e) => {
  console.error('❌ Seed échoué:', e?.message || e);
  process.exit(1);
});



