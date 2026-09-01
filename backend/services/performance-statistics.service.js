function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(value, range) {
  const date = validDate(value);
  return Boolean(date && date >= range.start && date < range.endExclusive);
}

function historyEvent(commande, statut) {
  const historique = Array.isArray(commande?.historique) ? commande.historique : [];
  for (let index = historique.length - 1; index >= 0; index -= 1) {
    const event = historique[index];
    if (event?.statut !== statut) continue;
    const date = validDate(event.date);
    if (date) return { ...event, date };
  }
  return null;
}

function eventOwner(records, event, fallbackId) {
  const actorId = event?.utilisateur?.id || event?.utilisateur;
  if (actorId) return records.get(actorId) || null;
  return records.get(fallbackId) || null;
}

function person(user) {
  return {
    id: user.id,
    nom: user.nom,
    email: user.email || null,
    telephone: user.telephone || null,
  };
}

function modelName(value) {
  const name = value?.nom || value || 'Modèle inconnu';
  return String(name).trim() || 'Modèle inconnu';
}

function addModel(record, modelValue, field, quantity = 1, amount = 0) {
  const nom = modelName(modelValue);
  const current = record._modeles.get(nom) || {
    nom,
    recues: 0,
    validees: 0,
    livrees: 0,
    annulees: 0,
    demarrees: 0,
    terminees: 0,
    piecesValidees: 0,
    piecesEnAttente: 0,
    assignees: 0,
    refusees: 0,
    montant: 0,
    bonus: 0,
  };
  current[field] += quantity;
  current.montant += Number(amount) || 0;
  record._modeles.set(nom, current);
}

function finish(records, sortField) {
  return Array.from(records.values())
    .map(({ _modeles, ...record }) => ({
      ...record,
      detailsParModele: Array.from(_modeles.values())
        .sort((a, b) => (
          (b[sortField] || 0) - (a[sortField] || 0)
          || a.nom.localeCompare(b.nom, 'fr')
        )),
    }))
    .sort((a, b) => (
      (b[sortField] || 0) - (a[sortField] || 0)
      || a.personne.nom.localeCompare(b.personne.nom, 'fr')
    ));
}

export function buildPerformanceStatistics({
  users = [],
  commandes = [],
  livraisons = [],
  productions = [],
  range,
}) {
  const appelants = new Map();
  const stylistes = new Map();
  const couturiers = new Map();
  const livreurs = new Map();

  for (const user of users.filter((item) => item.actif !== false)) {
    const base = { personne: person(user), _modeles: new Map() };
    if (user.role === 'appelant') {
      appelants.set(user.id, {
        ...base,
        recues: 0,
        validees: 0,
        livrees: 0,
        annulees: 0,
        montantLivre: 0,
      });
    } else if (user.role === 'styliste') {
      stylistes.set(user.id, { ...base, demarrees: 0, terminees: 0 });
    } else if (user.role === 'couturier') {
      couturiers.set(user.id, {
        ...base,
        piecesValidees: 0,
        piecesEnAttente: 0,
        gainsBase: 0,
        bonus: 0,
        totalGagne: 0,
      });
    } else if (user.role === 'livreur') {
      livreurs.set(user.id, {
        ...base,
        assignees: 0,
        livrees: 0,
        refusees: 0,
        montantLivre: 0,
        tauxReussite: 0,
      });
    }
  }

  const commandesById = new Map(commandes.map((commande) => [commande.id, commande]));

  for (const commande of commandes) {
    const createur = appelants.get(commande.appelant_id);
    const validation = historyEvent(commande, 'validee');
    const responsable = eventOwner(appelants, validation, commande.appelant_id);
    const annulation = historyEvent(commande, 'annulee');
    const annuleePar = eventOwner(appelants, annulation, commande.appelant_id);

    if (createur && inRange(commande.created_at, range)) {
      createur.recues += 1;
      addModel(createur, commande.modele, 'recues');
    }
    if (responsable && inRange(validation?.date, range)) {
      responsable.validees += 1;
      addModel(responsable, commande.modele, 'validees');
    }
    if (responsable && commande.statut === 'livree' && inRange(commande.date_livraison, range)) {
      const amount = Number(commande.prix) || 0;
      responsable.livrees += 1;
      responsable.montantLivre += amount;
      addModel(responsable, commande.modele, 'livrees', 1, amount);
    }
    if (annuleePar && inRange(annulation?.date, range)) {
      annuleePar.annulees += 1;
      addModel(annuleePar, commande.modele, 'annulees');
    }

    const styliste = stylistes.get(commande.styliste_id);
    if (styliste) {
      if (inRange(commande.date_decoupe, range)) {
        styliste.demarrees += 1;
        addModel(styliste, commande.modele, 'demarrees');
      }
      if (inRange(historyEvent(commande, 'en_couture')?.date, range)) {
        styliste.terminees += 1;
        addModel(styliste, commande.modele, 'terminees');
      }
    }
  }

  for (const production of productions) {
    const couturier = couturiers.get(production.couturier_id);
    if (!couturier || !inRange(`${production.date_production}T12:00:00.000Z`, range)) continue;
    const quantity = Number(production.quantite) || 0;
    if (production.statut === 'validee') {
      const baseAmount = Number(production.montant_total) || 0;
      const bonus = Number(production.montant_bonus) || 0;
      couturier.piecesValidees += quantity;
      couturier.gainsBase += baseAmount;
      couturier.bonus += bonus;
      couturier.totalGagne += baseAmount + bonus;
      addModel(couturier, production.modele, 'piecesValidees', quantity, baseAmount + bonus);
      const detail = couturier._modeles.get(modelName(production.modele));
      detail.bonus += bonus;
    } else if (production.statut === 'en_attente') {
      couturier.piecesEnAttente += quantity;
      addModel(couturier, production.modele, 'piecesEnAttente', quantity);
    }
  }

  for (const livraison of livraisons) {
    const livreur = livreurs.get(livraison.livreur_id);
    if (!livreur) continue;
    const commande = commandesById.get(livraison.commande_id);
    const modele = commande?.modele;

    if (inRange(livraison.date_assignation, range)) {
      livreur.assignees += 1;
      addModel(livreur, modele, 'assignees');
    }
    if (livraison.statut === 'livree' && inRange(livraison.date_livraison, range)) {
      const amount = Number(commande?.prix) || 0;
      livreur.livrees += 1;
      livreur.montantLivre += amount;
      addModel(livreur, modele, 'livrees', 1, amount);
    }
    if (['refusee', 'retournee'].includes(livraison.statut)
      && inRange(livraison.date_livraison || livraison.date_retour, range)) {
      livreur.refusees += 1;
      addModel(livreur, modele, 'refusees');
    }
  }

  for (const livreur of livreurs.values()) {
    const completed = livreur.livrees + livreur.refusees;
    livreur.tauxReussite = completed > 0
      ? Number(((livreur.livrees / completed) * 100).toFixed(1))
      : 0;
  }

  return {
    appelants: finish(appelants, 'validees'),
    stylistes: finish(stylistes, 'terminees'),
    couturiers: finish(couturiers, 'piecesValidees'),
    livreurs: finish(livreurs, 'livrees'),
  };
}
