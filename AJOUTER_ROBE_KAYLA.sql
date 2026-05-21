-- 🎨 Ajouter "Robe Kayla" dans la bibliothèque de modèles
-- ✅ Exécute ce script dans Supabase SQL Editor

INSERT INTO public.modeles (nom, categorie, image, prix_base, actif)
VALUES (
  'Robe Kayla',
  'Robe',
  'https://nousunique.com/wp-content/uploads/2026/05/ChatGPT-Image-12-mai-2026-23_13_41-1.jpg',
  17000,
  true
)
ON CONFLICT (nom) DO UPDATE SET
  categorie = EXCLUDED.categorie,
  image = EXCLUDED.image,
  prix_base = EXCLUDED.prix_base,
  actif = EXCLUDED.actif,
  updated_at = NOW();

-- ✅ Vérification
SELECT * FROM public.modeles WHERE nom = 'Robe Kayla';
