-- Table catégories e-commerce (pour site-web)
-- Permet de stocker les catégories côté serveur (plus de dépendance au localStorage)
-- Conventions identiques à public.ecommerce_products (RLS service_role + trigger updated_at)
create table if not exists public.ecommerce_categories (
  id text not null,
  name text not null,
  slug text not null,
  description text null,
  active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint ecommerce_categories_pkey primary key (id)
);

create unique index if not exists idx_ecommerce_categories_slug on public.ecommerce_categories (slug);
create index if not exists idx_ecommerce_categories_active on public.ecommerce_categories (active);

-- RLS: accès uniquement service_role (via backend)
alter table public.ecommerce_categories enable row level security;

drop policy if exists "service_role_only" on public.ecommerce_categories;
create policy "service_role_only" on public.ecommerce_categories
  for all
  using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Trigger updated_at
drop trigger if exists update_ecommerce_categories_updated_at on public.ecommerce_categories;
create trigger update_ecommerce_categories_updated_at
  before update on public.ecommerce_categories
  for each row
  execute function update_updated_at_column();

-- Catégories par défaut (mêmes que celles du panneau admin)
insert into public.ecommerce_categories (id, name, slug, description, active) values
  ('1', 'Élégant', 'elegant', 'Collection élégante et raffinée', true),
  ('2', 'Perle Rare', 'perle-rare', 'Pièces uniques et précieuses', true),
  ('3', 'Perle Unique', 'perle-unique', 'Créations exclusives', true),
  ('4', 'Style Event', 'style-event', 'Tenues pour événements', true)
on conflict (id) do nothing;
