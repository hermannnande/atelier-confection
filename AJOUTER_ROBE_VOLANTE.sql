-- 🎨 Ajouter "Robe Volante" dans la bibliothèque de modèles
-- ✅ Exécute ce script dans Supabase SQL Editor

INSERT INTO public.modeles (nom, categorie, image, prix_base, actif)
VALUES (
  'Robe Volante',
  'Robe',
  'https://nousunique.com/wp-content/uploads/2025/12/Femme-en-robe-bleu-ciel-avec-talons-noirs-1.png',
  11000,
  true
)
ON CONFLICT (nom) DO UPDATE SET
  categorie = EXCLUDED.categorie,
  image = EXCLUDED.image,
  prix_base = EXCLUDED.prix_base,
  actif = EXCLUDED.actif,
  updated_at = NOW();

-- ✅ Vérification
SELECT * FROM public.modeles WHERE nom = 'Robe Volante';
