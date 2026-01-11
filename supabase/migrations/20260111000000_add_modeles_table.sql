-- Table des modèles (bibliothèque de modèles)
create table if not exists public.modeles (
  id uuid not null default gen_random_uuid (),
  nom text not null unique,
  description text,
  image text,
  prix_base numeric(10, 2) not null default 0,
  categorie text default 'Autre',
  actif boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint modeles_pkey primary key (id),
  constraint modeles_nom_key unique (nom),
  constraint modeles_categorie_check check (
    categorie = any (
      array[
        'Robe'::text,
        'Chemise'::text,
        'Pantalon'::text,
        'Ensemble'::text,
        'Accessoire'::text,
        'Autre'::text
      ]
    )
  )
);

-- Index pour recherche rapide
create index if not exists idx_modeles_nom on public.modeles (nom);
create index if not exists idx_modeles_categorie on public.modeles (categorie);
create index if not exists idx_modeles_actif on public.modeles (actif);

-- Activer RLS
alter table public.modeles enable row level security;

-- Politique RLS (accès pour service_role)
create policy "Enable all for service role" on public.modeles
  for all using (true);

-- Fonction de mise à jour du timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger pour updated_at
create trigger update_modeles_updated_at
  before update on public.modeles
  for each row
  execute function update_updated_at_column();

-- Modifier la table stock pour référencer les modèles
-- Au lieu de stocker le nom du modèle comme string, on va référencer l'ID du modèle
alter table public.stock 
  add column if not exists modele_id uuid references public.modeles(id);

-- Index pour la relation
create index if not exists idx_stock_modele_id on public.stock (modele_id);

-- Note: Pour la transition, on garde aussi la colonne 'modele' (text) existante
-- pour compatibilité avec les données existantes
