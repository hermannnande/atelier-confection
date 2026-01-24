-- ============================================
-- ✏️ MAJ SMS Étape 2 (attente_depot)
-- ============================================
-- Envoyer l'étape 2 uniquement à la confirmation
-- et mettre à jour le contenu demandé.
-- ============================================

UPDATE public.sms_templates
SET
  nom = 'Commande Validée - Mise en Confection',
  message = E'NousUnique\nVotre commande est validée et part à l''atelier de confection. Vous aurez par message toutes étapes jusqu''à la livraison. Contactez-nous si vous avez des préoccupations ou si vous voulez une annulation aux\nSAV : 0705881116 / 0714820990',
  description = 'Envoyé lors de la confirmation (bouton confirmer/urgent)',
  actif = true,
  updated_at = NOW()
WHERE code = 'attente_depot';


