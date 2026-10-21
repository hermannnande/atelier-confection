// Fusionne les anciennes lignes de stock en double.
//   node scripts/merge-duplicate-stock.mjs --env <fichier.env>            → affiche le plan, ne change rien
//   node scripts/merge-duplicate-stock.mjs --env <fichier.env> --apply    → sauvegarde puis fusionne
// Relançable : une fusion interrompue reprend là où elle s'est arrêtée.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mergeDuplicateRow, planDuplicateMerges } from '../services/stock-duplicates.service.js';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const envFile = option('--env');
const apply = args.includes('--apply');
const backupDir = option('--backup') || process.cwd();
if (!envFile) { console.error('Usage : node scripts/merge-duplicate-stock.mjs --env <fichier.env> [--apply] [--backup <dossier>]'); process.exit(1); }
dotenv.config({ path: envFile, quiet: true });
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function readAll(table, configure = q => q) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await configure(db.from(table).select('*')).order('id').range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}

const stock = await readAll('stock');
const lots = (await readAll('atelier_lots')).filter(lot => lot.recues < lot.quantite);
const { merges, skipped } = planDuplicateMerges(stock, lots);
const describe = row => `« ${row.modele} | ${row.couleur} | ${row.taille} » stock ${row.quantite_principale}, livraison ${row.quantite_en_livraison}, ${(row.mouvements || []).length} mvts`;
for (const merge of merges) {
  console.log(`\n${merge.cle}\n  garde   ${describe(merge.keeper)}`);
  for (const duplicate of merge.duplicates) console.log(`  fusionne ${describe(duplicate)}`);
  console.log(`  → total ${merge.quantitePrincipale} en stock, ${merge.quantiteEnLivraison} en livraison`);
}
for (const item of skipped) console.log(`\nIGNORÉ ${item.cle} : ${item.raison}`);
console.log(`\n${merges.length} variante(s) à fusionner, ${skipped.length} ignorée(s).`);
if (!apply) { console.log('Aucune modification (ajoutez --apply pour fusionner).'); process.exit(0); }

const involved = merges.flatMap(merge => [merge.keeper, ...merge.duplicates]);
const backup = path.join(backupDir, `stock-doublons-avant-fusion-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backup, JSON.stringify(involved, null, 1), { flag: 'wx', mode: 0o600 });
console.log(`Sauvegarde : ${backup}`);

let failures = 0;
for (const merge of merges) {
  for (const duplicate of merge.duplicates) {
    try {
      const result = await mergeDuplicateRow(db, { keeperId: merge.keeper.id, duplicateId: duplicate.id, country: merge.keeper.pays_code });
      console.log(`OK  ${merge.cle} : ${result.etat}${result.etat === 'fusionnee' ? ` (stock ${result.quantitePrincipale}, livraison ${result.quantiteEnLivraison})` : ''}`);
    } catch (error) {
      failures += 1;
      console.error(`ÉCHEC ${merge.cle} : ${error.message}`);
    }
  }
}
// Contrôle final : plus aucune variante en double, totaux identiques.
const after = await readAll('stock');
const totals = rows => rows.reduce((sum, row) => [sum[0] + (row.quantite_principale || 0), sum[1] + (row.quantite_en_livraison || 0)], [0, 0]);
console.log(`Totaux avant ${totals(stock).join(' / ')} · après ${totals(after).join(' / ')} · doublons restants ${planDuplicateMerges(after, lots).merges.length}`);
process.exitCode = failures ? 1 : 0;
