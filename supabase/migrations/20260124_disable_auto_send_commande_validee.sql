-- ============================================
-- 🔧 FIX WORKFLOW SMS NousUnique
-- ============================================
-- Le template "commande_validee" est désactivé dans NousUnique,
-- donc on désactive aussi son auto-send pour éviter des tentatives inutiles.
-- ============================================

INSERT INTO public.sms_config (cle, valeur, description)
VALUES (
  'auto_send_commande_validee',
  'false',
  'Désactivé (NousUnique): on ne déclenche plus de SMS au statut validee'
)
ON CONFLICT (cle) DO UPDATE SET
  valeur = EXCLUDED.valeur,
  description = EXCLUDED.description,
  updated_at = now();


