-- Table produits e-commerce (pour site-web)
create table if not exists public.ecommerce_products (
  id text not null,
  name text not null,
  category text null,
  price numeric(12, 2) not null default 0,
  original_price numeric(12, 2) not null default 0,
  stock integer not null default 0,
  description text null,
  sizes text[] not null default '{}'::text[],
  colors text[] not null default '{}'::text[],
  images jsonb not null default '[]'::jsonb, -- array d'URLs
  video text null,
  thumbnail text null,
  active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint ecommerce_products_pkey primary key (id)
);

create index if not exists idx_ecommerce_products_updated_at on public.ecommerce_products (updated_at desc);
create index if not exists idx_ecommerce_products_active on public.ecommerce_products (active);

-- RLS: accès uniquement service_role (via backend)
alter table public.ecommerce_products enable row level security;

create policy "service_role_only" on public.ecommerce_products
  for all
  using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Trigger updated_at
drop trigger if exists update_ecommerce_products_updated_at on public.ecommerce_products;
create trigger update_ecommerce_products_updated_at
  before update on public.ecommerce_products
  for each row
  execute function update_updated_at_column();

