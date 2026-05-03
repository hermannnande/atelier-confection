-- ============================================================================
-- MIGRATION : SUPPORT MULTI-PAYS
-- Date    : 03 mai 2026
-- Objectif: Ajouter le support multi-pays (CI, BF, FR) sans toucher aux donnees existantes.
--           Toutes les lignes actuelles deviennent automatiquement 'CI' (Cote d'Ivoire).
--
-- IMPORTANT - PROPRIETE DE NON-DESTRUCTIVITE :
--   * Cette migration est IDEMPOTENTE (peut etre rejouee sans erreur)
--   * Toutes les colonnes ajoutees ont DEFAULT 'CI' donc les donnees existantes
--     sont automatiquement taggees Cote d'Ivoire
--   * Aucune donnee n'est supprimee, modifiee ou perdue
--   * Modeles + ecommerce_products = PARTAGES entre pays (pas de pays_code)
-- ============================================================================


-- ============================================================================
-- 1) TABLE pays : referentiel des pays supportes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pays (
  code           TEXT PRIMARY KEY,                  -- 'CI', 'BF', 'FR' (ISO 3166-1 alpha-2)
  nom            TEXT NOT NULL,                     -- 'Cote d''Ivoire'
  devise         TEXT NOT NULL DEFAULT 'XOF',       -- 'XOF', 'EUR', etc.
  symbole_devise TEXT NOT NULL DEFAULT 'FCFA',      -- 'FCFA', '€', etc.
  indicatif_tel  TEXT NOT NULL DEFAULT '+225',      -- '+225', '+226', '+33'
  drapeau        TEXT NOT NULL DEFAULT '🇨🇮',        -- emoji drapeau
  ordre          INTEGER NOT NULL DEFAULT 0,        -- ordre d'affichage dans le selector
  actif          BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at (reutilise la fonction existante)
DROP TRIGGER IF EXISTS update_pays_updated_at ON public.pays;
CREATE TRIGGER update_pays_updated_at
  BEFORE UPDATE ON public.pays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertion des 3 pays initiaux (idempotent via ON CONFLICT)
INSERT INTO public.pays (code, nom, devise, symbole_devise, indicatif_tel, drapeau, ordre, actif) VALUES
  ('CI', 'Cote d''Ivoire',  'XOF', 'FCFA', '+225', '🇨🇮', 1, true),
  ('BF', 'Burkina Faso',    'XOF', 'FCFA', '+226', '🇧🇫', 2, true),
  ('FR', 'France',          'EUR', '€',    '+33',  '🇫🇷', 3, true)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- 2) HELPER : ajouter une colonne pays_code (idempotent + FK + index)
--    Utilise un DO bloc PL/pgSQL pour ne pas planter si la table n'existe pas
-- ============================================================================

-- ----- USERS : pays_code (pays principal) + pays_autorises (admin multi-pays)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    -- pays_code : NOT NULL avec default 'CI' -> les rows existantes deviennent CI
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='pays_code') THEN
      ALTER TABLE public.users ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;

    -- pays_autorises : tableau optionnel pour admin/gestionnaire qui voient plusieurs pays
    -- NULL ou {} = limite a son pays_code
    -- ['CI','BF','FR'] = peut switcher entre ces pays
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='pays_autorises') THEN
      ALTER TABLE public.users ADD COLUMN pays_autorises TEXT[] NULL;
    END IF;

    -- FK vers pays
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_pays_code_fkey') THEN
      ALTER TABLE public.users ADD CONSTRAINT users_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_users_pays_code ON public.users(pays_code);
  END IF;
END $$;

-- Pour les admins/gestionnaires existants : leur donner acces a TOUS les pays par defaut
-- (les autres roles restent limites a leur pays_code='CI')
UPDATE public.users
SET pays_autorises = ARRAY['CI','BF','FR']
WHERE role IN ('administrateur','gestionnaire')
  AND (pays_autorises IS NULL OR cardinality(pays_autorises) = 0);


-- ----- COMMANDES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='commandes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='commandes' AND column_name='pays_code') THEN
      ALTER TABLE public.commandes ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='commandes_pays_code_fkey') THEN
      ALTER TABLE public.commandes ADD CONSTRAINT commandes_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_commandes_pays_code ON public.commandes(pays_code);
    CREATE INDEX IF NOT EXISTS idx_commandes_pays_statut ON public.commandes(pays_code, statut);
  END IF;
END $$;


-- ----- STOCK
-- ATTENTION : la contrainte UNIQUE actuelle est (modele, taille, couleur).
-- On doit la remplacer par (pays_code, modele, taille, couleur) sinon impossible
-- d'avoir le meme modele dans plusieurs pays.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stock') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock' AND column_name='pays_code') THEN
      ALTER TABLE public.stock ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stock_pays_code_fkey') THEN
      ALTER TABLE public.stock ADD CONSTRAINT stock_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;

    -- Remplacer la contrainte UNIQUE (modele, taille, couleur) par (pays_code, modele, taille, couleur)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stock_modele_taille_couleur_key') THEN
      ALTER TABLE public.stock DROP CONSTRAINT stock_modele_taille_couleur_key;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stock_pays_modele_taille_couleur_key') THEN
      ALTER TABLE public.stock ADD CONSTRAINT stock_pays_modele_taille_couleur_key UNIQUE (pays_code, modele, taille, couleur);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_stock_pays_code ON public.stock(pays_code);
  END IF;
END $$;


-- ----- LIVRAISONS
-- On stocke le pays sur chaque livraison (denormalisation pour requetes faciles)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='livraisons') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='livraisons' AND column_name='pays_code') THEN
      ALTER TABLE public.livraisons ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='livraisons_pays_code_fkey') THEN
      ALTER TABLE public.livraisons ADD CONSTRAINT livraisons_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_livraisons_pays_code ON public.livraisons(pays_code);
  END IF;
END $$;


-- ----- SESSIONS_CAISSE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sessions_caisse') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions_caisse' AND column_name='pays_code') THEN
      ALTER TABLE public.sessions_caisse ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sessions_caisse_pays_code_fkey') THEN
      ALTER TABLE public.sessions_caisse ADD CONSTRAINT sessions_caisse_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_sessions_caisse_pays_code ON public.sessions_caisse(pays_code);
  END IF;
END $$;


-- ----- ATTENDANCES (presence GPS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attendances') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='attendances' AND column_name='pays_code') THEN
      ALTER TABLE public.attendances ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='attendances_pays_code_fkey') THEN
      ALTER TABLE public.attendances ADD CONSTRAINT attendances_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_attendances_pays_code ON public.attendances(pays_code);
  END IF;
END $$;


-- ----- STORE_CONFIG (config atelier : un par pays)
-- Adresse atelier + GPS atelier different par pays (pour le pointage GPS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='store_config') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_config' AND column_name='pays_code') THEN
      ALTER TABLE public.store_config ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='store_config_pays_code_fkey') THEN
      ALTER TABLE public.store_config ADD CONSTRAINT store_config_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;
    -- Un seul store_config par pays
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='store_config_pays_unique') THEN
      ALTER TABLE public.store_config ADD CONSTRAINT store_config_pays_unique UNIQUE (pays_code);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_store_config_pays_code ON public.store_config(pays_code);
  END IF;
END $$;


-- ----- SMS_HISTORIQUE (les templates restent partages, l'historique est par pays)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sms_historique') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sms_historique' AND column_name='pays_code') THEN
      ALTER TABLE public.sms_historique ADD COLUMN pays_code TEXT NOT NULL DEFAULT 'CI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sms_historique_pays_code_fkey') THEN
      ALTER TABLE public.sms_historique ADD CONSTRAINT sms_historique_pays_code_fkey FOREIGN KEY (pays_code) REFERENCES public.pays(code);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_sms_historique_pays_code ON public.sms_historique(pays_code);
  END IF;
END $$;


-- ============================================================================
-- 3) TABLES PARTAGEES : pas de pays_code (catalogue commun a tous les pays)
--    - modeles            (catalogue produit unique pour la marque)
--    - ecommerce_products (catalogue site-web unique)
--    - sms_templates      (templates de messages partages)
--    - sms_config         (config globale SMS8.io)
-- ============================================================================


-- ============================================================================
-- 4) RLS sur la table pays (lecture par service_role uniquement comme les autres)
-- ============================================================================
ALTER TABLE public.pays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.pays;
CREATE POLICY "service_role_only" ON public.pays
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');


-- ============================================================================
-- 5) COMMENTAIRES (documentation)
-- ============================================================================
COMMENT ON TABLE  public.pays                    IS 'Referentiel des pays supportes par l''application multi-pays.';
COMMENT ON COLUMN public.pays.code               IS 'Code ISO 3166-1 alpha-2 du pays (CI, BF, FR).';
COMMENT ON COLUMN public.pays.devise             IS 'Code ISO 4217 de la devise (XOF, EUR).';
COMMENT ON COLUMN public.users.pays_code         IS 'Pays principal de l''utilisateur. Defaut CI pour la retrocompatibilite.';
COMMENT ON COLUMN public.users.pays_autorises    IS 'Liste des pays auxquels l''utilisateur peut acceder. NULL = limite a pays_code uniquement. Utile pour admin/gestionnaire multi-pays.';
COMMENT ON COLUMN public.commandes.pays_code     IS 'Pays auquel appartient cette commande (filtrage automatique cote serveur).';
COMMENT ON COLUMN public.stock.pays_code         IS 'Pays auquel appartient ce stock (catalogue separe par pays).';
COMMENT ON COLUMN public.livraisons.pays_code    IS 'Pays auquel appartient cette livraison (denormalise depuis la commande).';
COMMENT ON COLUMN public.sessions_caisse.pays_code IS 'Pays de la session de caisse (correspond au pays_code du livreur).';
