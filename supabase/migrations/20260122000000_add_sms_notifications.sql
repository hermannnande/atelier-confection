-- Migration: Système de Notifications SMS
-- Date: 2026-01-22
-- Description: Tables pour gérer les templates SMS et l'historique des envois

-- ========================================
-- TABLE: sms_templates
-- Templates de messages SMS personnalisables
-- ========================================
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'commande_validee', 'en_couture', 'confectionnee', 'en_livraison'
  nom TEXT NOT NULL,
  message TEXT NOT NULL, -- Template avec variables {client}, {numero}, etc.
  actif BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_sms_templates_code ON public.sms_templates(code);
CREATE INDEX IF NOT EXISTS idx_sms_templates_actif ON public.sms_templates(actif);

-- ========================================
-- TABLE: sms_historique
-- Historique de tous les SMS envoyés
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
  response_api JSONB, -- Réponse de l'API SMS8.io
  message_id TEXT, -- ID du message depuis SMS8.io
  erreur TEXT,
  envoye_par UUID REFERENCES public.users(id) ON DELETE SET NULL,
  est_test BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_sms_historique_commande ON public.sms_historique(commande_id);
CREATE INDEX IF NOT EXISTS idx_sms_historique_statut ON public.sms_historique(statut);
CREATE INDEX IF NOT EXISTS idx_sms_historique_telephone ON public.sms_historique(destinataire_telephone);
CREATE INDEX IF NOT EXISTS idx_sms_historique_created ON public.sms_historique(created_at DESC);

-- ========================================
-- TABLE: sms_config
-- Configuration globale du système SMS
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
-- TRIGGERS: Updated_at automatique
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_config_updated_at
  BEFORE UPDATE ON public.sms_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DONNÉES INITIALES: Templates par défaut
-- ========================================
INSERT INTO public.sms_templates (code, nom, message, description) VALUES
(
  'commande_validee',
  'Commande Validée',
  'Bonjour {client},
Votre commande #{numero} a été validée ! 
Modèle: {modele}
Nous démarrons la confection de votre tenue.
- Atelier Confection',
  'Envoyé quand l''appelant confirme la commande (statut: validee)'
),
(
  'en_couture',
  'En Cours de Confection',
  'Bonjour {client},
Bonne nouvelle ! Votre {modele} est en cours de confection.
Commande: #{numero}
Nos artisans travaillent avec soin sur votre tenue.
- Atelier Confection',
  'Envoyé quand le couturier démarre la couture (statut: en_couture)'
),
(
  'confectionnee',
  'Confection Terminée',
  'Bonjour {client},
Excellente nouvelle ! Votre {modele} est terminée ! ✨
Commande: #{numero}
Votre tenue est prête et sera bientôt livrée.
- Atelier Confection',
  'Envoyé quand la couture est terminée (statut: confectionnee)'
),
(
  'en_livraison',
  'Livraison dans 24h',
  'Bonjour {client},
Votre commande #{numero} sera livrée dans les 24h ! 🚚
Merci de rester joignable au {telephone} pour faciliter la livraison.
À très bientôt !
- Atelier Confection',
  'Envoyé quand la commande est assignée à un livreur (statut: en_livraison)'
),
(
  'livree',
  'Commande Livrée',
  'Bonjour {client},
Votre commande #{numero} a été livrée avec succès ! 🎉
Merci pour votre confiance.
N''hésitez pas à nous recontacter pour vos prochaines commandes.
- Atelier Confection',
  'Envoyé quand le livreur marque la commande comme livrée (optionnel)'
);

-- Configuration initiale (sera remplie par les variables d'environnement)
INSERT INTO public.sms_config (cle, valeur, description) VALUES
('sms_enabled', 'false', 'Activer/Désactiver l''envoi automatique de SMS'),
('auto_send_commande_validee', 'true', 'Envoyer SMS automatique lors de la validation'),
('auto_send_en_couture', 'true', 'Envoyer SMS automatique au démarrage couture'),
('auto_send_confectionnee', 'true', 'Envoyer SMS automatique fin de confection'),
('auto_send_en_livraison', 'true', 'Envoyer SMS automatique lors de l''assignation livraison'),
('auto_send_livree', 'false', 'Envoyer SMS automatique lors de la livraison (optionnel)');

-- ========================================
-- PERMISSIONS (RLS - Row Level Security)
-- ========================================

-- Activer RLS
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

-- Politiques pour sms_templates
CREATE POLICY "Admin et Gestionnaire peuvent tout faire sur templates"
  ON public.sms_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrateur', 'gestionnaire')
    )
  );

CREATE POLICY "Tous peuvent lire les templates actifs"
  ON public.sms_templates
  FOR SELECT
  USING (actif = true);

-- Politiques pour sms_historique
CREATE POLICY "Admin et Gestionnaire peuvent tout voir"
  ON public.sms_historique
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrateur', 'gestionnaire')
    )
  );

CREATE POLICY "Système peut insérer dans historique"
  ON public.sms_historique
  FOR INSERT
  WITH CHECK (true);

-- Politiques pour sms_config
CREATE POLICY "Admin peut gérer la config"
  ON public.sms_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'administrateur'
    )
  );

CREATE POLICY "Tous peuvent lire la config"
  ON public.sms_config
  FOR SELECT
  USING (true);

-- ========================================
-- COMMENTAIRES
-- ========================================
COMMENT ON TABLE public.sms_templates IS 'Templates de messages SMS personnalisables avec variables';
COMMENT ON TABLE public.sms_historique IS 'Historique complet de tous les SMS envoyés aux clients';
COMMENT ON TABLE public.sms_config IS 'Configuration globale du système de notifications SMS';

COMMENT ON COLUMN public.sms_templates.code IS 'Code unique identifiant le template (ex: commande_validee)';
COMMENT ON COLUMN public.sms_templates.message IS 'Template avec variables: {client}, {numero}, {modele}, {telephone}, {ville}';
COMMENT ON COLUMN public.sms_historique.statut IS 'Statut: en_attente | envoye | echoue | test';
COMMENT ON COLUMN public.sms_historique.response_api IS 'Réponse complète de l''API SMS8.io en JSON';
COMMENT ON COLUMN public.sms_historique.est_test IS 'true si envoyé en mode test (SMS_ENABLED=false)';



