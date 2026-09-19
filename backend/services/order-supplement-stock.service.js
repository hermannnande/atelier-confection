// Déplace uniquement les tenues supplémentaires créées depuis le catalogue.
// La tenue principale reste gérée par les routes de livraison existantes.
export async function moveOrderSupplementStock({
  supabase,
  commande,
  country,
  userId,
  action,
  commentaire = '',
}) {
  const supplements = Array.isArray(commande?.supplements)
    ? commande.supplements.filter((item) => item?.articleCatalogue === true)
    : [];

  for (const article of supplements) {
    const modele = String(article.libelle || '').trim();
    const taille = String(article.taille || '').trim();
    const couleur = String(article.couleur || '').trim();
    if (!modele || !taille || !couleur) continue;

    const query = () => supabase.from('stock')
      .select('*')
      .eq('pays_code', country)
      .eq('modele', modele)
      .eq('taille', taille)
      .eq('couleur', couleur)
      .maybeSingle();
    const { data: stockItem, error: readError } = await query();
    if (readError) throw readError;

    const isAssign = action === 'assigner';
    const isDelivered = action === 'livree';
    const isReturn = action === 'refusee' || action === 'retour';
    const isProduction = action === 'production';
    if (!isAssign && !isDelivered && !isReturn && !isProduction) {
      throw new Error(`Mouvement de stock inconnu : ${action}`);
    }
    if (isAssign && (!stockItem || Number(stockItem.quantite_principale) < 1)) continue;
    if (isDelivered && (!stockItem || Number(stockItem.quantite_en_livraison) < 1)) continue;
    if (action === 'retour' && (!stockItem || Number(stockItem.quantite_en_livraison) < 1)) continue;

    const mouvement = {
      type: isAssign ? 'transfert' : isDelivered ? 'sortie' : isProduction ? 'entree' : 'retour',
      quantite: 1,
      source: isProduction ? 'Atelier de confection' : isAssign ? 'Stock principal' : 'Stock en livraison',
      destination: isAssign ? 'Stock en livraison' : isDelivered ? 'Client' : 'Stock principal',
      commande: commande.id || commande._id,
      utilisateur: userId,
      date: new Date().toISOString(),
      commentaire: commentaire || `Article supplémentaire : ${modele}`,
    };

    if (stockItem) {
      const mouvements = [...(Array.isArray(stockItem.mouvements) ? stockItem.mouvements : []), mouvement];
      const updates = { mouvements };
      if (isAssign) {
        updates.quantite_principale = Number(stockItem.quantite_principale || 0) - 1;
        updates.quantite_en_livraison = Number(stockItem.quantite_en_livraison || 0) + 1;
      } else if (isDelivered) {
        updates.quantite_en_livraison = Math.max(0, Number(stockItem.quantite_en_livraison || 0) - 1);
      } else if (isProduction) {
        updates.quantite_principale = Number(stockItem.quantite_principale || 0) + 1;
      } else {
        updates.quantite_principale = Number(stockItem.quantite_principale || 0) + 1;
        updates.quantite_en_livraison = Math.max(0, Number(stockItem.quantite_en_livraison || 0) - 1);
      }
      const { error: updateError } = await supabase.from('stock').update(updates).eq('id', stockItem.id);
      if (updateError) throw updateError;
      continue;
    }

    // Une tenue peut être envoyée sans stock déclaré ; après refus elle
    // devient physiquement disponible dans la variation correspondante.
    const insert = () => supabase.from('stock').insert({
      pays_code: country,
      modele,
      taille,
      couleur,
      quantite_principale: 1,
      quantite_en_livraison: 0,
      prix: Number(article.montant || 0),
      image: article.image || null,
      mouvements: [mouvement],
    });
    const { error: insertError } = await insert();
    if (!insertError) continue;
    if (insertError.code !== '23505') throw insertError;

    // Une autre opération a pu créer la variation pendant l'insertion.
    const { data: concurrentStock, error: concurrentError } = await query();
    if (concurrentError) throw concurrentError;
    if (!concurrentStock) throw insertError;
    const { error: retryError } = await supabase.from('stock').update({
      quantite_principale: Number(concurrentStock.quantite_principale || 0) + 1,
      quantite_en_livraison: Math.max(0, Number(concurrentStock.quantite_en_livraison || 0) - 1),
      mouvements: [...(Array.isArray(concurrentStock.mouvements) ? concurrentStock.mouvements : []), mouvement],
    }).eq('id', concurrentStock.id);
    if (retryError) throw retryError;
  }
}
