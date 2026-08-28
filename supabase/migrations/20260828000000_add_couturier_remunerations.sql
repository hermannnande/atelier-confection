-- Rémunération des couturiers à la pièce.
-- Les montants historiques sont figés au moment de la déclaration afin qu'un
-- changement de tarif ne modifie jamais les gains déjà enregistrés.

create table if not exists public.tarifs_confection (
  id uuid primary key default gen_random_uuid(),
  pays_code text not null default 'CI' references public.pays(code)
    check (pays_code = 'CI'),
  modele_id uuid not null references public.modeles(id),
  montant_unitaire numeric(12, 2) not null check (montant_unitaire >= 0),
  actif boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tarifs_confection_pays_modele_unique unique (pays_code, modele_id)
);

create table if not exists public.productions_couturiers (
  id uuid primary key default gen_random_uuid(),
  pays_code text not null default 'CI' references public.pays(code)
    check (pays_code = 'CI'),
  couturier_id uuid not null references public.users(id),
  modele_id uuid not null references public.modeles(id),
  date_production date not null,
  quantite integer not null check (quantite > 0 and quantite <= 1000),
  tarif_unitaire numeric(12, 2) not null check (tarif_unitaire >= 0),
  montant_total numeric(14, 2) generated always as (quantite * tarif_unitaire) stored,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'validee', 'refusee')),
  motif_refus text,
  validee_par uuid references public.users(id),
  validee_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une déclaration refusée peut être corrigée et resoumise. Une déclaration
-- encore en attente ou déjà validée ne peut pas être comptée deux fois.
create unique index if not exists idx_productions_couturiers_active_unique
  on public.productions_couturiers (pays_code, couturier_id, date_production, modele_id)
  where statut in ('en_attente', 'validee');

create table if not exists public.paiements_couturiers (
  id uuid primary key default gen_random_uuid(),
  pays_code text not null default 'CI' references public.pays(code)
    check (pays_code = 'CI'),
  couturier_id uuid not null references public.users(id),
  montant numeric(14, 2) not null check (montant > 0),
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'payee', 'refusee')),
  note_couturier text,
  note_admin text,
  traitee_par uuid references public.users(id),
  traitee_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tarifs_confection_pays
  on public.tarifs_confection (pays_code, actif);
create index if not exists idx_productions_couturiers_user_date
  on public.productions_couturiers (pays_code, couturier_id, date_production desc);
create index if not exists idx_productions_couturiers_statut
  on public.productions_couturiers (pays_code, statut, created_at desc);
create index if not exists idx_paiements_couturiers_user
  on public.paiements_couturiers (pays_code, couturier_id, created_at desc);
create index if not exists idx_paiements_couturiers_statut
  on public.paiements_couturiers (pays_code, statut, created_at desc);

drop trigger if exists update_tarifs_confection_updated_at on public.tarifs_confection;
create trigger update_tarifs_confection_updated_at
  before update on public.tarifs_confection
  for each row execute function update_updated_at_column();

drop trigger if exists update_productions_couturiers_updated_at on public.productions_couturiers;
create trigger update_productions_couturiers_updated_at
  before update on public.productions_couturiers
  for each row execute function update_updated_at_column();

drop trigger if exists update_paiements_couturiers_updated_at on public.paiements_couturiers;
create trigger update_paiements_couturiers_updated_at
  before update on public.paiements_couturiers
  for each row execute function update_updated_at_column();

alter table public.tarifs_confection enable row level security;
alter table public.productions_couturiers enable row level security;
alter table public.paiements_couturiers enable row level security;

drop policy if exists "service_role_only" on public.tarifs_confection;
create policy "service_role_only" on public.tarifs_confection
  for all using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

drop policy if exists "service_role_only" on public.productions_couturiers;
create policy "service_role_only" on public.productions_couturiers
  for all using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

drop policy if exists "service_role_only" on public.paiements_couturiers;
create policy "service_role_only" on public.paiements_couturiers
  for all using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Crée atomiquement une demande de paiement et réserve son montant. Le verrou
-- empêche deux clics simultanés de demander davantage que le solde disponible.
create or replace function public.demander_paiement_couturier(
  p_couturier_id uuid,
  p_pays_code text,
  p_montant numeric,
  p_note text default null
)
returns public.paiements_couturiers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gains numeric(14, 2);
  v_payes numeric(14, 2);
  v_reserves numeric(14, 2);
  v_disponible numeric(14, 2);
  v_role text;
  v_user_country text;
  v_paiement public.paiements_couturiers;
begin
  if p_pays_code is distinct from 'CI' then
    raise exception 'La rémunération des couturiers est disponible uniquement en Côte d''Ivoire';
  end if;

  if p_montant is null or p_montant <= 0 then
    raise exception 'Le montant demandé doit être supérieur à zéro';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_couturier_id::text || ':' || p_pays_code));

  select role, pays_code into v_role, v_user_country
  from public.users
  where id = p_couturier_id and actif = true;

  if v_role is distinct from 'couturier' or v_user_country is distinct from p_pays_code then
    raise exception 'Couturier invalide pour ce pays';
  end if;

  select coalesce(sum(montant_total), 0) into v_gains
  from public.productions_couturiers
  where couturier_id = p_couturier_id
    and pays_code = p_pays_code
    and statut = 'validee';

  select
    coalesce(sum(montant) filter (where statut = 'payee'), 0),
    coalesce(sum(montant) filter (where statut = 'en_attente'), 0)
  into v_payes, v_reserves
  from public.paiements_couturiers
  where couturier_id = p_couturier_id
    and pays_code = p_pays_code;

  v_disponible := v_gains - v_payes - v_reserves;
  if p_montant > v_disponible then
    raise exception 'Solde disponible insuffisant (% FCFA)', v_disponible;
  end if;

  insert into public.paiements_couturiers (
    pays_code, couturier_id, montant, note_couturier
  ) values (
    p_pays_code, p_couturier_id, p_montant, nullif(trim(p_note), '')
  ) returning * into v_paiement;

  return v_paiement;
end;
$$;

revoke all on function public.demander_paiement_couturier(uuid, text, numeric, text) from public;
grant execute on function public.demander_paiement_couturier(uuid, text, numeric, text) to service_role;
