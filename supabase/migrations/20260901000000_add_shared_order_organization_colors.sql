-- Marquage visuel partagé des commandes.
-- La couleur est liée à l'étape courante et disparaît dès que le statut change.

alter table public.commandes
  add column if not exists couleur_organisation text,
  add column if not exists couleur_organisation_statut text,
  add column if not exists couleur_organisation_par uuid references public.users(id) on delete set null,
  add column if not exists couleur_organisation_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'commandes_couleur_organisation_check'
      and conrelid = 'public.commandes'::regclass
  ) then
    alter table public.commandes
      add constraint commandes_couleur_organisation_check
      check (
        couleur_organisation is null
        or couleur_organisation in ('yellow', 'green', 'blue', 'pink', 'purple')
      );
  end if;
end;
$$;

create or replace function public.clear_commande_organization_color_on_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.statut is distinct from old.statut then
    new.couleur_organisation := null;
    new.couleur_organisation_statut := null;
    new.couleur_organisation_par := null;
    new.couleur_organisation_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists clear_commande_organization_color_on_status_change on public.commandes;
create trigger clear_commande_organization_color_on_status_change
before update of statut on public.commandes
for each row
execute function public.clear_commande_organization_color_on_status_change();
