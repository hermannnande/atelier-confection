-- Suivi global du petit indicateur "+" dans la page Modèles en attente.
-- Une seule date de consultation est partagée par pays pour les utilisateurs non-admin.
-- L'administrateur utilise toujours une fenêtre indépendante de 24 heures.

create table if not exists public.modeles_attente_vues (
  pays_code text primary key references public.pays(code) on delete cascade,
  vu_global_at timestamptz not null default to_timestamp(0),
  updated_by uuid null references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.modeles_attente_vues enable row level security;

insert into public.modeles_attente_vues (pays_code, vu_global_at)
values ('CI', to_timestamp(0))
on conflict (pays_code) do nothing;

