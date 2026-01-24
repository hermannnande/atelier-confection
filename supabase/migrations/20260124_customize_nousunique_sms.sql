-- ============================================
-- 🎨 PERSONNALISATION SMS "NousUnique"
-- ============================================
-- Ce script met à jour les templates SMS existants
-- et ajoute le nouveau template "attente_depot"
-- ============================================

-- ============================================
-- SMS 1 : Confirmation de commande reçue
-- ============================================
UPDATE public.sms_templates
SET 
  nom = 'Confirmation Commande Reçue',
  message = E'NousUnique 🤍\nMerci pour votre commande. Elle a bien été reçue et est en cours de vérification.\nUn membre de notre équipe vous contactera très rapidement pour la validation.\nMerci pour votre confiance ✨',
  description = 'Envoyé dès qu''une nouvelle commande est créée',
  actif = true
WHERE code = 'commande_recue';

-- ============================================
-- SMS 2 : Commande en attente de dépôt (NOUVEAU)
-- ============================================
INSERT INTO public.sms_templates (code, nom, message, description, actif)
VALUES (
  'attente_depot',
  'Demande Avance Confirmation',
  E'NousUnique 🤍\nVotre commande est prête à être validée.\nMerci d''effectuer une avance de confirmation de 2 000 FCFA afin de lancer la confection.\n\nPaiement :\nWave : 0749404905\nOrange Money : 0778004562\nMTN Money : 0566569061\n\nLe solde sera réglé à la livraison.\nSAV : 0705881116 / 0714820990',
  'Envoyé quand la commande est confirmée et attend le dépôt',
  true
)
ON CONFLICT (code) DO UPDATE SET
  message = EXCLUDED.message,
  nom = EXCLUDED.nom,
  description = EXCLUDED.description,
  actif = EXCLUDED.actif;

-- ============================================
-- SMS 3 : Commande validée et mise en confection
-- ============================================
UPDATE public.sms_templates
SET 
  nom = 'Commande Validée - En Confection',
  message = E'NousUnique 🤍\nNous confirmons la réception de votre avance.\nVotre commande est validée et vient d''entrer en confection.\nMerci pour votre confiance ✨',
  description = 'Envoyé après réception de l''avance (statut: en_couture)',
  actif = true
WHERE code = 'en_couture';

-- ============================================
-- SMS 4 : Confection terminée
-- ============================================
UPDATE public.sms_templates
SET 
  nom = 'Confection Terminée',
  message = E'NousUnique 🤍\nBonne nouvelle !\nLa confection de votre tenue est terminée.\nElle est en préparation pour la livraison.\nMerci de rester joignable 💖',
  description = 'Envoyé quand la couture est terminée (statut: confectionnee)',
  actif = true
WHERE code = 'confectionnee';

-- ============================================
-- SMS 5 : Livraison sous 24h
-- ============================================
UPDATE public.sms_templates
SET 
  nom = 'Livraison dans 24h',
  message = E'NousUnique 🤍\nVotre commande sera livrée dans les 24h qui suivent.\nMerci de rester joignable afin de faciliter la livraison.\nMerci pour votre confiance ✨',
  description = 'Envoyé quand la commande est assignée à un livreur (statut: en_livraison)',
  actif = true
WHERE code = 'en_livraison';

-- ============================================
-- DÉSACTIVER LES ANCIENS SMS (plus utilisés)
-- ============================================
UPDATE public.sms_templates
SET actif = false
WHERE code IN ('commande_validee', 'livree');

-- ============================================
-- CONFIGURATION AUTO-SEND
-- ============================================

-- Auto-send pour "Commande Reçue"
INSERT INTO public.sms_config (cle, valeur, description)
VALUES (
  'auto_send_commande_recue',
  'true',
  'Envoyer SMS automatique lors de la création'
)
ON CONFLICT (cle) DO UPDATE SET
  valeur = EXCLUDED.valeur;

-- Auto-send pour "Demande Avance"
INSERT INTO public.sms_config (cle, valeur, description)
VALUES (
  'auto_send_attente_depot',
  'true',
  'Envoyer SMS automatique pour demande d''avance'
)
ON CONFLICT (cle) DO UPDATE SET
  valeur = EXCLUDED.valeur;

-- Auto-send pour "En Couture"
INSERT INTO public.sms_config (cle, valeur, description)
VALUES (
  'auto_send_en_couture',
  'true',
  'Envoyer SMS automatique quand la commande entre en couture'
)
ON CONFLICT (cle) DO UPDATE SET
  valeur = EXCLUDED.valeur;

-- Auto-send pour "Confectionnée"
INSERT INTO public.sms_config (cle, valeur, description)
VALUES (
  'auto_send_confectionnee',
  'true',
  'Envoyer SMS automatique quand la confection est terminée'
)
ON CONFLICT (cle) DO UPDATE SET
  valeur = EXCLUDED.valeur;

-- Auto-send pour "En Livraison"
INSERT INTO public.sms_config (cle, valeur, description)
VALUES (
  'auto_send_en_livraison',
  'true',
  'Envoyer SMS automatique à l''assignation du livreur'
)
ON CONFLICT (cle) DO UPDATE SET
  valeur = EXCLUDED.valeur;

-- ============================================
-- ✅ MIGRATION TERMINÉE
-- ============================================
-- Les SMS "NousUnique" sont maintenant configurés !
-- Workflow:
--   1. Commande créée → SMS "Commande Reçue"
--   2. Bouton "Attente" → SMS "Demande Avance"
--   3. Paiement reçu → SMS "En Confection"
--   4. Couture finie → SMS "Confection Terminée"
--   5. Assigné livreur → SMS "Livraison 24h"
-- ============================================


