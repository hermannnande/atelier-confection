export function mapTimestamps(row) {
  if (!row) return row;
  const { created_at, updated_at, ...rest } = row;
  return {
    ...rest,
    createdAt: created_at ?? row.createdAt,
    updatedAt: updated_at ?? row.updatedAt,
  };
}

export function withMongoShape(row) {
  if (!row) return row;
  const { id, ...rest } = row;
  return { _id: id, ...rest };
}

export function mapCommande(row) {
  if (!row) return row;
  return withMongoShape(
    mapTimestamps({
      ...row,
      noteAppelant: row.note_appelant,
      numeroCommande: row.numero_commande,
      appelant: row.appelant ?? undefined,
      styliste: row.styliste ?? undefined,
      couturier: row.couturier ?? undefined,
      livreur: row.livreur ?? undefined,
      appelant_id: row.appelant_id,
      styliste_id: row.styliste_id,
      couturier_id: row.couturier_id,
      livreur_id: row.livreur_id,
      dateDecoupe: row.date_decoupe,
      dateCouture: row.date_couture,
      dateLivraison: row.date_livraison,
      motifRefus: row.motif_refus,
    })
  );
}

export function mapUser(row) {
  if (!row) return row;
  return withMongoShape(mapTimestamps(row));
}

export function mapStock(row) {
  if (!row) return row;
  return withMongoShape(
    mapTimestamps({
      ...row,
      quantitePrincipale: row.quantite_principale,
      quantiteEnLivraison: row.quantite_en_livraison,
    })
  );
}

export function mapLivraison(row) {
  if (!row) return row;
  return withMongoShape(
    mapTimestamps({
      ...row,
      commande: row.commande ?? undefined,
      livreur: row.livreur ?? undefined,
      gestionnaire: row.gestionnaire ?? undefined,
      dateAssignation: row.date_assignation,
      dateLivraison: row.date_livraison,
      adresseLivraison: row.adresse_livraison,
      motifRefus: row.motif_refus,
      photoRefus: row.photo_refus,
      dateRetour: row.date_retour,
      verifieParGestionnaire: row.verifie_par_gestionnaire,
      commentaireGestionnaire: row.commentaire_gestionnaire,
      paiementRecu: row.paiement_recu,
      datePaiement: row.date_paiement,
    })
  );
}



