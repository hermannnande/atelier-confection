/**
 * Middleware multi-pays : determine le pays "actif" de la requete et controle
 * que l'utilisateur authentifie a bien le droit d'y acceder.
 *
 * Ordre de resolution du pays demande :
 *   1) Header HTTP `X-Country` (utilise par le frontend interne)
 *   2) Query string `?country=XX` (utilise pour debug ou liens directs)
 *   3) Body field `country` (utilise par les routes publiques type Google Sheets)
 *   4) Fallback `pays_code` de l'utilisateur connecte (si authenticate a deja tourne)
 *   5) Fallback ultime : 'CI' (retrocompatibilite avec l'app actuelle)
 *
 * Le code est valide contre la liste blanche [CI, BF, FR, ...] (3 lettres max).
 *
 * Apres execution, la requete contient :
 *   - req.country         : code du pays actif (ex. 'CI')
 *   - req.allowedCountries: liste des pays auxquels l'user a droit (utile pour /api/pays)
 *
 * IMPORTANT : ce middleware doit etre monte APRES `authenticate` pour que req.user existe.
 *             Pour les routes publiques sans auth, on utilise resolveCountryPublic().
 */

// Pattern strict : 2 lettres MAJUSCULES uniquement (ISO 3166-1 alpha-2)
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

const DEFAULT_COUNTRY = 'CI';

/**
 * Lit le pays demande depuis les differentes sources et le normalise.
 * Retourne null si rien n'a ete fourni (le caller decidera du fallback).
 */
function readRequestedCountry(req) {
  const fromHeader = req.header?.('X-Country') || req.headers?.['x-country'];
  const fromQuery = req.query?.country;
  const fromBody = req.body?.country;

  const raw = fromHeader || fromQuery || fromBody;
  if (!raw) return null;

  const normalized = String(raw).trim().toUpperCase();
  if (!COUNTRY_CODE_REGEX.test(normalized)) return null;

  return normalized;
}

/**
 * Calcule la liste des pays auxquels l'utilisateur authentifie a acces.
 *
 *   - admin / gestionnaire : si pays_autorises est defini (ex. ['CI','BF','FR']),
 *                            ils peuvent switcher entre ces pays.
 *                            Sinon ils sont limites a leur pays_code.
 *   - autres roles         : limites a leur pays_code uniquement.
 */
export function getAllowedCountriesForUser(user) {
  if (!user) return [DEFAULT_COUNTRY];

  const userCountry = user.pays_code || DEFAULT_COUNTRY;
  const role = (user.role || '').toLowerCase();

  if (role === 'administrateur' || role === 'gestionnaire') {
    const explicit = Array.isArray(user.pays_autorises) ? user.pays_autorises : null;
    if (explicit && explicit.length > 0) {
      // On retourne la liste explicite, en s'assurant que le pays principal est dedans
      return explicit.includes(userCountry) ? explicit : [userCountry, ...explicit];
    }
    // Pas de liste explicite : limite a son pays principal
    return [userCountry];
  }

  // Roles operationnels : strictement limite a leur pays
  return [userCountry];
}

/**
 * Middleware principal pour les routes authentifiees.
 * Doit etre monte APRES `authenticate`.
 */
export const resolveCountry = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentification requise pour resolveCountry' });
  }

  const allowed = getAllowedCountriesForUser(req.user);
  req.allowedCountries = allowed;

  const userPrimary = req.user.pays_code || DEFAULT_COUNTRY;
  const requested = readRequestedCountry(req);

  if (!requested) {
    // Aucun pays explicite : on prend le pays principal de l'user
    req.country = userPrimary;
    return next();
  }

  // L'user a demande un pays specifique : on verifie qu'il y a droit
  if (!allowed.includes(requested)) {
    return res.status(403).json({
      message: `Acces refuse au pays ${requested}. Pays autorises : ${allowed.join(', ')}`,
      requested,
      allowed,
    });
  }

  req.country = requested;
  next();
};

/**
 * Middleware pour les routes PUBLIQUES (sans auth) type Google Sheets / site web.
 * Le pays vient uniquement du body/query/header (pas d'user a verifier).
 * Si rien n'est fourni, fallback sur 'CI' pour la retrocompatibilite totale.
 */
export const resolveCountryPublic = (req, res, next) => {
  const requested = readRequestedCountry(req);
  req.country = requested || DEFAULT_COUNTRY;
  next();
};

/**
 * Helper utilitaire pour les routes : applique le filtre `pays_code` a un query Supabase.
 * Usage :
 *   let q = supabase.from('commandes').select('*');
 *   q = scopeQueryToCountry(q, req.country);
 */
export function scopeQueryToCountry(query, country) {
  if (!country) return query;
  return query.eq('pays_code', country);
}

/**
 * Helper : verifie qu'une ressource (avec un champ pays_code) est accessible
 * a l'utilisateur courant. Renvoie true si OK, sinon repond 403/404 et retourne false.
 *
 * Usage standard apres un SELECT :
 *   const { data: existing } = await supabase.from('xxx').select('*').eq('id', id).single();
 *   if (!existing) return res.status(404).json({ message: 'Non trouve' });
 *   if (!ensureCountryAccess(existing, req, res)) return; // repond automatiquement
 */
export function ensureCountryAccess(row, req, res) {
  if (!row) {
    res.status(404).json({ message: 'Ressource introuvable' });
    return false;
  }
  const allowed = req.allowedCountries || [req.user?.pays_code || DEFAULT_COUNTRY];
  const rowCountry = row.pays_code || DEFAULT_COUNTRY;
  if (!allowed.includes(rowCountry)) {
    res.status(403).json({
      message: `Acces refuse : cette ressource appartient au pays ${rowCountry}.`,
    });
    return false;
  }
  return true;
}
