-- Supabase AI is experimental and may produce incorrect answers
-- Always verify the output before executing

-- Table des utilisateurs
create table
  public.users (
    id uuid not null default gen_random_uuid (),
    nom text not null,
    email text not null,
    password text not null,
    role text not null,
    telephone text null,
    actif boolean not null default true,
    stats jsonb null default '{}'::jsonb,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint users_pkey primary key (id),
    constraint users_email_key unique (email),
    constraint users_role_check check (
      (
        role = any (
          array[
            'administrateur'::text,
            'gestionnaire'::text,
            'appelant'::text,
            'styliste'::text,
            'couturier'::text,
            'livreur'::text
          ]
        )
      )
    )
  ) tablespace pg_default;

-- Table des commandes
create table
  public.commandes (
    id uuid not null default gen_random_uuid (),
    numero_commande text not null,
    client jsonb not null,
    modele jsonb not null,
    taille text not null,
    couleur text not null default 'Non spécifié'::text,
    prix numeric not null,
    statut text not null default 'nouvelle'::text,
    urgence boolean not null default false,
    appelant_id uuid null,
    note_appelant text null,
    styliste_id uuid null,
    date_decoupe timestamp with time zone null,
    couturier_id uuid null,
    date_couture timestamp with time zone null,
    livreur_id uuid null,
    date_livraison timestamp with time zone null,
    motif_refus text null,
    historique jsonb null default '[]'::jsonb,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint commandes_pkey primary key (id),
    constraint commandes_numero_commande_key unique (numero_commande),
    constraint commandes_appelant_id_fkey foreign key (appelant_id) references users (id),
    constraint commandes_couturier_id_fkey foreign key (couturier_id) references users (id),
    constraint commandes_livreur_id_fkey foreign key (livreur_id) references users (id),
    constraint commandes_styliste_id_fkey foreign key (styliste_id) references users (id),
    constraint commandes_statut_check check (
      (
        statut = any (
          array[
            'nouvelle'::text,
            'validee'::text,
            'en_attente_paiement'::text,
            'en_decoupe'::text,
            'en_couture'::text,
            'en_stock'::text,
            'en_livraison'::text,
            'livree'::text,
            'refusee'::text,
            'annulee'::text
          ]
        )
      )
    )
  ) tablespace pg_default;

-- Table du stock
create table
  public.stock (
    id uuid not null default gen_random_uuid (),
    modele text not null,
    taille text not null,
    couleur text not null,
    quantite_principale integer not null default 0,
    quantite_en_livraison integer not null default 0,
    prix numeric not null,
    image text null,
    mouvements jsonb null default '[]'::jsonb,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint stock_pkey primary key (id),
    constraint stock_modele_taille_couleur_key unique (modele, taille, couleur),
    constraint stock_quantite_en_livraison_check check ((quantite_en_livraison >= 0)),
    constraint stock_quantite_principale_check check ((quantite_principale >= 0))
  ) tablespace pg_default;

-- Table des livraisons
create table
  public.livraisons (
    id uuid not null default gen_random_uuid (),
    commande_id uuid not null,
    livreur_id uuid not null,
    statut text not null default 'assignee'::text,
    date_assignation timestamp with time zone null default now(),
    date_livraison timestamp with time zone null,
    adresse_livraison jsonb null,
    instructions text null,
    motif_refus text null,
    photo_refus text null,
    date_retour timestamp with time zone null,
    verifie_par_gestionnaire boolean not null default false,
    gestionnaire_id uuid null,
    commentaire_gestionnaire text null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint livraisons_pkey primary key (id),
    constraint livraisons_commande_id_fkey foreign key (commande_id) references commandes (id),
    constraint livraisons_gestionnaire_id_fkey foreign key (gestionnaire_id) references users (id),
    constraint livraisons_livreur_id_fkey foreign key (livreur_id) references users (id),
    constraint livraisons_statut_check check (
      (
        statut = any (
          array[
            'assignee'::text,
            'en_cours'::text,
            'livree'::text,
            'refusee'::text,
            'retournee'::text
          ]
        )
      )
    )
  ) tablespace pg_default;

-- Fonction pour auto-incrémenter le numéro de commande
create or replace function generate_numero_commande()
returns trigger as $$
begin
  if new.numero_commande is null or new.numero_commande = '' then
    select 'CMD' || lpad((coalesce(max(substring(numero_commande from 4)::integer), 0) + 1)::text, 6, '0')
    into new.numero_commande
    from commandes;
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger pour auto-générer le numéro de commande
create trigger generate_numero_commande_trigger
before insert on commandes
for each row
execute function generate_numero_commande();

-- Fonction pour mettre à jour updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers pour updated_at
create trigger update_users_updated_at before update on users
for each row execute function update_updated_at_column();

create trigger update_commandes_updated_at before update on commandes
for each row execute function update_updated_at_column();

create trigger update_stock_updated_at before update on stock
for each row execute function update_updated_at_column();

create trigger update_livraisons_updated_at before update on livraisons
for each row execute function update_updated_at_column();

-- Index pour les performances
create index idx_commandes_appelant on commandes(appelant_id);
create index idx_commandes_statut on commandes(statut);
create index idx_commandes_urgence on commandes(urgence);
create index idx_livraisons_livreur on livraisons(livreur_id);
create index idx_livraisons_statut on livraisons(statut);
create index idx_stock_modele on stock(modele);

-- Activer Row Level Security (RLS)
alter table users enable row level security;
alter table commandes enable row level security;
alter table stock enable row level security;
alter table livraisons enable row level security;

-- Politiques RLS (à adapter selon vos besoins)
-- Accès uniquement via la clé SERVICE_ROLE (backend)
-- NOTE: les requêtes venant de la clé anon doivent être BLOQUÉES par défaut.
create policy "service_role_only" on users
  for all
  using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

create policy "service_role_only" on commandes
  for all
  using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

create policy "service_role_only" on stock
  for all
  using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');

create policy "service_role_only" on livraisons
  for all
  using (current_setting('request.jwt.claim.role', true) = 'service_role')
  with check (current_setting('request.jwt.claim.role', true) = 'service_role');


