-- Épinglage partagé des cartes de modèles dans la gestion du stock.
alter table public.modeles
  add column if not exists epingle_stock boolean not null default false;

create index if not exists idx_modeles_epingle_stock
  on public.modeles (epingle_stock desc, nom asc);

