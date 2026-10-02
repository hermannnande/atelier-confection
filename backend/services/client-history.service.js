// Historique d'un client retrouvé par son numéro de téléphone, quel que soit son
// format : « +225 07 12 34 56 78 » et « 0712345678 » désignent le même client.
import { readCountryRows } from './courier-stock.service.js';

const PHONE_LENGTH = { CI: 10, BF: 8, FR: 9 };
const HISTORY_LIMIT = 10;
const INDEX_TTL = 2 * 60 * 1000;
const DETAIL_CHUNK = 100;

// Textes ajoutés automatiquement par l'application : ce ne sont pas des motifs.
const GENERIC_COMMENTS = [
  /^Modification des détails/i,
  /^Envoi direct en Préparation Colis/i,
];

const asText = (value) => String(value ?? '').trim();
const day = (value) => asText(value).slice(0, 10);
const reason = (value) => {
  const text = asText(value);
  return GENERIC_COMMENTS.some((pattern) => pattern.test(text)) ? '' : text;
};

export function clientPhoneKey(contact, country = 'CI') {
  const digits = String(contact ?? '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits.slice(-(PHONE_LENGTH[country] || PHONE_LENGTH.CI));
}

function lastEntry(order, statut) {
  const entries = Array.isArray(order?.historique) ? order.historique : [];
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index]?.statut === statut) return entries[index];
  }
  return null;
}

// Issue d'une commande passée, du point de vue de la fiabilité du client. Un refus
// à la livraison compte tant que la commande n'a pas été livrée ensuite.
export function orderOutcome(order) {
  const entries = Array.isArray(order?.historique) ? order.historique : [];
  if (order?.statut === 'livree') return 'livree';
  if (order?.statut === 'refusee'
    || entries.some((entry) => entry?.statut === 'refusee' || /refus/i.test(entry?.action || ''))) {
    return 'refusee';
  }
  if (order?.statut === 'annulee') {
    return entries.some((entry) => entry?.statut === 'validee') ? 'annulee_apres_validation' : 'annulee';
  }
  return 'en_cours';
}

function outcomeReason(order, outcome) {
  if (outcome === 'refusee') return reason(order?.motif_refus) || reason(lastEntry(order, 'refusee')?.commentaire);
  if (outcome.startsWith('annulee')) return reason(lastEntry(order, 'annulee')?.commentaire);
  return '';
}

function modelName(order) {
  const modele = order?.modele;
  return asText(modele && typeof modele === 'object' ? (modele.nom || modele.sku) : modele);
}

export function buildClientHistory(order, previousOrders = []) {
  const currentDay = day(order?.created_at ?? order?.createdAt);
  const commandes = previousOrders
    .filter((other) => other && String(other.id) !== String(order?.id))
    .map((other) => {
      const issue = orderOutcome(other);
      return {
        id: other.id,
        numero: asText(other.numero_commande),
        date: other.created_at,
        modele: modelName(other),
        taille: asText(other.taille),
        couleur: asText(other.couleur),
        prix: Number(other.prix) || 0,
        statut: other.statut,
        issue,
        motif: outcomeReason(other, issue),
        autreJour: day(other.created_at) !== currentDay,
      };
    })
    .sort((a, b) => asText(b.date).localeCompare(asText(a.date)));

  const count = (issue) => commandes.filter((commande) => commande.issue === issue).length;
  const refus = commandes.filter((commande) => commande.issue === 'refusee');
  // Carte grise : le client a déjà refusé un colis à la livraison, un autre jour.
  const carteGrise = refus.some((commande) => commande.autreJour);
  const livrees = count('livree');
  const annuleesApresValidation = count('annulee_apres_validation');

  let profil = 'nouveau';
  if (commandes.length > 0) {
    if (carteGrise) profil = 'risque';
    else if (refus.length > 0 || annuleesApresValidation > 0) profil = 'surveiller';
    else if (livrees > 0) profil = 'fiable';
    else profil = 'connu';
  }

  return {
    profil,
    carteGrise,
    total: commandes.length,
    livrees,
    refusees: refus.length,
    annuleesApresValidation,
    annulees: count('annulee'),
    enCours: count('en_cours'),
    montantLivre: commandes
      .filter((commande) => commande.issue === 'livree')
      .reduce((sum, commande) => sum + commande.prix, 0),
    clientDepuis: commandes.at(-1)?.date || null,
    dernierRefus: refus[0] ? { date: refus[0].date, motif: refus[0].motif } : null,
    commandes: commandes.slice(0, HISTORY_LIMIT).map(({ autreJour, ...commande }) => commande),
  };
}

// L'index léger des numéros est renouvelé toutes les 2 minutes en arrière-plan :
// la page Appel se rafraîchit toutes les 10 secondes sans relire toutes les
// commandes ni attendre la reconstruction de l'index.
export function createClientHistoryLoader({ ttl = INDEX_TTL, now = () => Date.now() } = {}) {
  const indexes = new Map();

  function buildIndex(db, country) {
    return readCountryRows(db, 'commandes', country, (q) => q, 'id, contact:client->>contact')
      .then((rows) => {
        const byKey = new Map();
        for (const row of rows) {
          const key = clientPhoneKey(row.contact, country);
          if (!key) continue;
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key).push(row.id);
        }
        return byKey;
      });
  }

  function phoneIndex(db, country) {
    const cached = indexes.get(country);
    if (!cached) {
      const entry = { builtAt: now(), promise: buildIndex(db, country), refreshing: false };
      indexes.set(country, entry);
      entry.promise.catch(() => indexes.delete(country));
      return entry.promise;
    }
    if (now() - cached.builtAt >= ttl && !cached.refreshing) {
      cached.refreshing = true;
      buildIndex(db, country)
        .then((byKey) => indexes.set(country, { builtAt: now(), promise: Promise.resolve(byKey), refreshing: false }))
        .catch(() => { cached.refreshing = false; });
    }
    return cached.promise;
  }

  return async function loadClientHistories(db, country, orders = []) {
    const byKey = await phoneIndex(db, country);
    const keyByOrder = new Map(orders.map((order) => [order.id, clientPhoneKey(order.client?.contact, country)]));
    const ids = [...new Set([...keyByOrder.values()].flatMap((key) => (key && byKey.get(key)) || []))];

    const details = new Map();
    for (let offset = 0; offset < ids.length; offset += DETAIL_CHUNK) {
      const { data, error } = await db.from('commandes')
        .select('id, numero_commande, statut, created_at, prix, modele, taille, couleur, historique, motif_refus')
        .eq('pays_code', country)
        .in('id', ids.slice(offset, offset + DETAIL_CHUNK));
      if (error) throw error;
      for (const row of data || []) details.set(row.id, row);
    }

    return new Map(orders.map((order) => {
      const key = keyByOrder.get(order.id);
      const previous = key ? (byKey.get(key) || []).map((id) => details.get(id)) : [];
      return [order.id, buildClientHistory(order, previous)];
    }));
  };
}
