-- Bonus de productivité journaliers des couturiers (Côte d'Ivoire).
-- Les montants sont figés sur chaque ligne afin qu'une future modification
-- de règle ou de tarif ne change jamais l'historique.

alter table public.productions_couturiers
  add column if not exists quantite_bonus integer not null default 0
    check (quantite_bonus >= 0 and quantite_bonus <= quantite),
  add column if not exists bonus_unitaire numeric(12, 2) not null default 0
    check (bonus_unitaire >= 0),
  add column if not exists montant_bonus numeric(14, 2)
    generated always as (quantite_bonus * bonus_unitaire) stored;

-- Le solde disponible et les demandes de paiement incluent désormais les bonus.
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

  select coalesce(sum(montant_total + coalesce(montant_bonus, 0)), 0) into v_gains
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
