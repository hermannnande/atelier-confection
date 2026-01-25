-- ============================================
-- 🔁 Automation: Rappel SMS pendant la couture
-- Date: 2026-01-25
-- ============================================

-- Template: rappel pendant "en_couture"
INSERT INTO public.sms_templates (code, nom, message, description, actif)
VALUES (
  'rappel_en_couture',
  'Rappel - Commande en Confection',
  E'NousUnique 🤍\nVotre commande est toujours en cours de confection à l''atelier.\nNous vous tiendrons informé(e) dès qu''elle sera prête.\nMerci pour votre patience ✨\nSAV : 0705881116 / 0714820990',
  'Rappel automatique envoyé tant que la commande est en couture (selon intervalle)',
  true
)
ON CONFLICT (code) DO UPDATE SET
  nom = EXCLUDED.nom,
  message = EXCLUDED.message,
  description = EXCLUDED.description,
  actif = EXCLUDED.actif,
  updated_at = NOW();

-- Config: activation + intervalle
INSERT INTO public.sms_config (cle, valeur, description)
VALUES
  ('auto_send_rappel_en_couture', 'false', 'Envoyer un rappel automatique pendant la couture (cron)'),
  ('rappel_en_couture_interval_hours', '24', 'Intervalle minimum entre 2 rappels (heures)'),
  ('rappel_en_couture_min_age_hours', '24', 'Ne pas envoyer de rappel avant X heures après entrée en couture'),
  ('rappel_en_couture_batch_limit', '50', 'Nombre max de commandes traitées par exécution du cron')
ON CONFLICT (cle) DO UPDATE SET
  valeur = EXCLUDED.valeur,
  description = EXCLUDED.description,
  updated_at = NOW();


