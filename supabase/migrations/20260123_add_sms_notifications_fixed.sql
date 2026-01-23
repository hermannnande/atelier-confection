-- Migration SAFE: Système de Notifications SMS
-- Version corrigée avec messages sur une ligne
-- Date: 2026-01-23

-- ========================================
-- NETTOYAGE (optionnel - décommentez si besoin)
-- ========================================
-- DROP TABLE IF EXISTS public.sms_historique CASCADE;
-- DROP TABLE IF EXISTS public.sms_templates CASCADE;
-- DROP TABLE IF EXISTS public.sms_config CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- TABLE: sms_templates
-- ========================================
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  message TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_code ON public.sms_templates(code);
CREATE INDEX IF NOT EXISTS idx_sms_templates_actif ON public.sms_templates(actif);

-- ========================================
-- TABLE: sms_historique
-- ========================================
CREATE TABLE IF NOT EXISTS public.sms_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID REFERENCES public.commandes(id) ON DELETE SET NULL,
  numero_commande TEXT,
  destinataire_nom TEXT NOT NULL,
  destinataire_telephone TEXT NOT NULL,
  message TEXT NOT NULL,
  template_code TEXT,
  statut TEXT CHECK (statut IN ('en_attente', 'envoye', 'echoue', 'test')) DEFAULT 'en_attente',
  response_api JSONB,
  message_id TEXT,
  erreur TEXT,
  envoye_par UUID REFERENCES public.users(id) ON DELETE SET NULL,
  est_test BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_historique_commande ON public.sms_historique(commande_id);
CREATE INDEX IF NOT EXISTS idx_sms_historique_statut ON public.sms_historique(statut);
CREATE INDEX IF NOT EXISTS idx_sms_historique_telephone ON public.sms_historique(destinataire_telephone);
CREATE INDEX IF NOT EXISTS idx_sms_historique_created ON public.sms_historique(created_at DESC);

-- ========================================
-- TABLE: sms_config
-- ========================================
CREATE TABLE IF NOT EXISTS public.sms_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle TEXT UNIQUE NOT NULL,
  valeur TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sms_templates_updated_at ON public.sms_templates;
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_config_updated_at ON public.sms_config;
CREATE TRIGGER update_sms_config_updated_at
  BEFORE UPDATE ON public.sms_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DONNÉES INITIALES
-- ========================================
INSERT INTO public.sms_templates (code, nom, message, description) 
VALUES
  ('commande_validee', 'Commande Validée', E'Bonjour {client},\nVotre commande #{numero} a été validée !\nModèle: {modele}\nNous démarrons la confection de votre tenue.\n- Atelier Confection', 'Envoyé quand l''appelant confirme la commande (statut: validee)'),
  ('en_couture', 'En Cours de Confection', E'Bonjour {client},\nBonne nouvelle ! Votre {modele} est en cours de confection.\nCommande: #{numero}\nNos artisans travaillent avec soin sur votre tenue.\n- Atelier Confection', 'Envoyé quand le couturier démarre la couture (statut: en_couture)'),
  ('confectionnee', 'Confection Terminée', E'Bonjour {client},\nExcellente nouvelle ! Votre {modele} est terminée ! ✨\nCommande: #{numero}\nVotre tenue est prête et sera bientôt livrée.\n- Atelier Confection', 'Envoyé quand la couture est terminée (statut: confectionnee)'),
  ('en_livraison', 'Livraison dans 24h', E'Bonjour {client},\nVotre commande #{numero} sera livrée dans les 24h ! 🚚\nMerci de rester joignable au {telephone} pour faciliter la livraison.\nÀ très bientôt !\n- Atelier Confection', 'Envoyé quand la commande est assignée à un livreur (statut: en_livraison)'),
  ('livree', 'Commande Livrée', E'Bonjour {client},\nVotre commande #{numero} a été livrée avec succès ! 🎉\nMerci pour votre confiance.\nN''hésitez pas à nous recontacter pour vos prochaines commandes.\n- Atelier Confection', 'Envoyé quand le livreur marque la commande comme livrée (optionnel)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.sms_config (cle, valeur, description) 
VALUES
  ('sms_enabled', 'false', 'Activer/Désactiver l''envoi automatique de SMS'),
  ('auto_send_commande_validee', 'true', 'Envoyer SMS automatique lors de la validation'),
  ('auto_send_en_couture', 'true', 'Envoyer SMS automatique au démarrage couture'),
  ('auto_send_confectionnee', 'true', 'Envoyer SMS automatique fin de confection'),
  ('auto_send_en_livraison', 'true', 'Envoyer SMS automatique lors de l''assignation livraison'),
  ('auto_send_livree', 'false', 'Envoyer SMS automatique lors de la livraison (optionnel)')
ON CONFLICT (cle) DO NOTHING;

-- ========================================
-- PERMISSIONS (RLS)
-- ========================================
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin et Gestionnaire peuvent tout faire sur templates" ON public.sms_templates;
CREATE POLICY "Admin et Gestionnaire peuvent tout faire sur templates"
  ON public.sms_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrateur', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Tous peuvent lire les templates actifs" ON public.sms_templates;
CREATE POLICY "Tous peuvent lire les templates actifs"
  ON public.sms_templates FOR SELECT
  USING (actif = true);

DROP POLICY IF EXISTS "Admin et Gestionnaire peuvent tout voir" ON public.sms_historique;
CREATE POLICY "Admin et Gestionnaire peuvent tout voir"
  ON public.sms_historique FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrateur', 'gestionnaire')
    )
  );

DROP POLICY IF EXISTS "Système peut insérer dans historique" ON public.sms_historique;
CREATE POLICY "Système peut insérer dans historique"
  ON public.sms_historique FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin peut gérer la config" ON public.sms_config;
CREATE POLICY "Admin peut gérer la config"
  ON public.sms_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'administrateur'
    )
  );

DROP POLICY IF EXISTS "Tous peuvent lire la config" ON public.sms_config;
CREATE POLICY "Tous peuvent lire la config"
  ON public.sms_config FOR SELECT
  USING (true);

-- Message final
SELECT 'Migration SMS terminée avec succès !' as message;

