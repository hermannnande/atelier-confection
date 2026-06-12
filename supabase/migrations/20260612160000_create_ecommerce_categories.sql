-- Table des catégories du site e-commerce
-- Permet de stocker les catégories côté serveur (plus de dépendance au localStorage)

CREATE TABLE IF NOT EXISTS ecommerce_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ecommerce_categories_slug ON ecommerce_categories (slug);

-- Catégories par défaut (mêmes que celles du panneau admin)
INSERT INTO ecommerce_categories (id, name, slug, description, active) VALUES
  ('1', 'Élégant', 'elegant', 'Collection élégante et raffinée', TRUE),
  ('2', 'Perle Rare', 'perle-rare', 'Pièces uniques et précieuses', TRUE),
  ('3', 'Perle Unique', 'perle-unique', 'Créations exclusives', TRUE),
  ('4', 'Style Event', 'style-event', 'Tenues pour événements', TRUE)
ON CONFLICT (id) DO NOTHING;
