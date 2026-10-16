-- Additive migration: no historical stock quantity or order status is changed.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.commandes add column if not exists atelier_pieces jsonb not null default '{}';
create table if not exists public.atelier_lots (
 id uuid primary key,
 pays_code text not null references public.pays(code),
 variation_key text not null,
 article jsonb not null,
 pieces jsonb not null check (jsonb_typeof(pieces) = 'array' and jsonb_array_length(pieces) > 0),
 quantite integer not null check (quantite > 0),
 recues integer not null default 0 check (recues >= 0 and recues <= quantite),
 cree_par uuid not null references public.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists atelier_lots_pending on public.atelier_lots(pays_code, created_at) where recues < quantite;
create index if not exists atelier_commandes_dispatch on public.commandes(pays_code,id) where statut='en_livraison' and atelier_pieces <> '{}';
create table if not exists public.atelier_receptions (
 id uuid primary key,
 lot_id uuid not null references public.atelier_lots(id),
 quantite integer not null check (quantite > 0),
 avant integer not null,
 utilisateur uuid not null references public.users(id),
 created_at timestamptz not null default now(),
 unique (lot_id, avant)
);
alter table public.atelier_lots enable row level security;
alter table public.atelier_receptions enable row level security;
revoke all on public.atelier_lots, public.atelier_receptions from anon, authenticated;
grant all on public.atelier_lots, public.atelier_receptions to service_role;

-- These columns are the optimistic-lock tokens used by the delivery service.
create or replace function public.atelier_touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
drop trigger if exists atelier_touch on public.stock;
create trigger atelier_touch before update on public.stock for each row execute function public.atelier_touch_updated_at();
drop trigger if exists atelier_touch on public.commandes;
create trigger atelier_touch before update on public.commandes for each row execute function public.atelier_touch_updated_at();
drop trigger if exists atelier_touch on public.livraisons;
create trigger atelier_touch before update on public.livraisons for each row execute function public.atelier_touch_updated_at();

create or replace function public.atelier_order_articles(o public.commandes) returns jsonb
language sql stable set search_path = public as $$
 select jsonb_build_array(jsonb_build_object('modele',coalesce(o.modele->>'nom', o.modele->>'sku', o.modele#>>'{}'),'taille',o.taille,'couleur',o.couleur))
 || coalesce((select jsonb_agg(jsonb_build_object('modele',s->>'libelle','taille',s->>'taille','couleur',s->>'couleur') order by n)
 from jsonb_array_elements(coalesce(o.supplements,'[]')) with ordinality t(s,n) where s->>'articleCatalogue'='true'),'[]');
$$;
create or replace function public.atelier_guard_order() returns trigger
language plpgsql set search_path = public as $$
begin
 if (new.statut='en_decoupe' and old.statut<>'en_decoupe') or
    (new.statut='en_couture' and old.statut not in ('en_decoupe','en_couture')) then
  raise exception 'Commencez les nouvelles pièces dans Modèles en attente, avec le bouton Je commence ces pièces.';
 end if;
 if new.historique->-1->>'action'='Couture terminée' and new.historique is distinct from old.historique
    and old.statut not in ('en_couture','en_decoupe') then
  raise exception 'Cette confection est déjà terminée ou n’a pas été commencée. Aucun nouvel ajout au stock.';
 end if;
 if old.atelier_pieces <> '{}' then
  if exists(select 1 from jsonb_each(old.atelier_pieces) p where p.value->>'etat' in ('en_cours','recue')) and
     public.atelier_order_articles(old) is distinct from public.atelier_order_articles(new) then
   raise exception 'Cette tenue est suivie à l’atelier. Le responsable doit vérifier le lot avant de modifier ses articles.' using errcode='P0001';
  end if;
  if new.statut='validee' and old.statut<>'validee' and exists(select 1 from jsonb_each(old.atelier_pieces) p where p.value->>'etat'='expedition') then
   raise exception 'Cette commande a déjà été expédiée. Vérifiez son retour avec le responsable avant de demander une nouvelle confection.';
  end if;
  if new.statut in ('en_decoupe','en_couture') and new.statut <> old.statut then
   raise exception 'Cette commande possède déjà un lot atelier. Suivez ce lot dans Modèles en attente.' using errcode='P0001';
  end if;
  if new.statut in ('en_stock','en_livraison') and old.statut <> new.statut and
     exists(select 1 from jsonb_each(old.atelier_pieces) p where p.value->>'etat'='en_cours') then
   raise exception 'Des pièces sont encore à recevoir. Armanda doit confirmer leur réception.' using errcode='P0001';
  end if;
  if new.statut='en_livraison' and old.statut <> new.statut then
   select jsonb_object_agg(key, case when value->>'etat'='recue' then value || '{"etat":"expedition"}'::jsonb else value end)
   into new.atelier_pieces from jsonb_each(new.atelier_pieces);
  end if;
 end if;
 return new;
end $$;
drop trigger if exists atelier_guard on public.commandes;
create trigger atelier_guard before update on public.commandes for each row execute function public.atelier_guard_order();

create or replace function public.atelier_guard_manual_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
 if new.quantite_principale > (case when tg_op='INSERT' then 0 else old.quantite_principale end)
   and new.mouvements->-1->>'source' in ('Ajout manuel','Création','Modification manuelle','Ajustement')
   and exists(select 1 from public.atelier_lots l where l.pays_code=new.pays_code and l.recues<l.quantite
     and lower(trim(l.article->>'modele'))=lower(trim(new.modele))
     and lower(trim(l.article->>'taille'))=lower(trim(new.taille))
     and lower(trim(l.article->>'couleur'))=lower(trim(new.couleur))) then
  raise exception 'Ces pièces ont un lot en cours. Confirmez leur réception dans Tenues à recevoir.';
 end if;
 return new;
end $$;
drop trigger if exists atelier_guard_manual on public.stock;
create trigger atelier_guard_manual before insert or update on public.stock for each row execute function public.atelier_guard_manual_stock();

-- A revision covers all data used by the planner, including returned pieces.
-- A start locks writers briefly and verifies the revision before taking work.
create or replace function public.atelier_revision(p_country text) returns text
language sql volatile security definer set search_path = public as $$
 select md5(coalesce((select string_agg(id::text || updated_at::text || statut,',' order by id) from public.commandes where pays_code=p_country and statut in ('validee','en_stock')),'')
 || '|' || coalesce((select string_agg(id::text || updated_at::text,',' order by id) from public.stock where pays_code=p_country),'')
 || '|' || coalesce((select string_agg(id::text || updated_at::text,',' order by id) from public.livraisons where pays_code=p_country and statut='retournee'),'') );
$$;
create or replace function public.atelier_actor(p_actor uuid, p_country text, p_roles text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
 if not exists(select 1 from public.users where id=p_actor and actif and role=any(p_roles)
 and (pays_code=p_country or p_country=any(pays_autorises) or role='administrateur')) then
 raise exception 'Action atelier non autorisée' using errcode='42501'; end if;
end $$;

create or replace function public.atelier_start(p_id uuid, p_country text, p_actor uuid,
 p_revision text, p_key text, p_article jsonb, p_pieces jsonb) returns jsonb
language plpgsql security definer set search_path = public set lock_timeout = '3s' as $$
declare l public.atelier_lots; p jsonb; o public.commandes;
begin
 perform public.atelier_actor(p_actor,p_country,array['styliste','gestionnaire','administrateur']);
 lock table public.commandes, public.stock, public.livraisons in share row exclusive mode;
 select * into l from public.atelier_lots where id=p_id;
 if found then
  if l.pays_code<>p_country or l.cree_par<>p_actor or l.variation_key<>p_key or l.pieces is distinct from p_pieces then raise exception 'Identifiant déjà utilisé'; end if;
  return to_jsonb(l);
 end if;
 if p_revision is distinct from public.atelier_revision(p_country) then
  raise exception 'La liste vient de changer. Actualisez avant de commencer.' using errcode='40001';
 end if;
 if jsonb_typeof(p_pieces)<>'array' or jsonb_array_length(p_pieces) not between 1 and 500 then raise exception 'Quantité invalide'; end if;
 insert into public.atelier_lots(id,pays_code,variation_key,article,pieces,quantite,cree_par)
 values(p_id,p_country,p_key,p_article,p_pieces,jsonb_array_length(p_pieces),p_actor) returning * into l;
 for p in select value from jsonb_array_elements(p_pieces) loop
  select * into o from public.commandes where id=(p->>'commandeId')::uuid and pays_code=p_country for update;
  if not found or o.statut<>'validee' or o.atelier_pieces ? (p->>'articleKey') then raise exception 'Pièce déjà commencée ou commande modifiée'; end if;
  if not exists(select 1 from jsonb_array_elements(public.atelier_order_articles(o)) with ordinality a(v,n)
    where (case when n=1 then 'principal' else 'supplement-'||(n-1)::text end)=p->>'articleKey') then raise exception 'Article introuvable'; end if;
  update public.commandes set atelier_pieces=atelier_pieces || jsonb_build_object(p->>'articleKey',
   jsonb_build_object('lotId',p_id,'etat','en_cours','variationKey',p_key)),
   historique=coalesce(historique,'[]') || jsonb_build_array(jsonb_build_object('action','atelier_commence','lotId',p_id,'article',p->>'articleKey','utilisateur',p_actor,'date',now(),'commentaire','Pièce commencée à l’atelier'))
   where id=o.id;
 end loop;
 return to_jsonb(l);
end $$;

create or replace function public.atelier_receive(p_id uuid, p_lot uuid, p_country text, p_actor uuid,
 p_quantity integer, p_expected integer) returns jsonb
language plpgsql security definer set search_path = public set lock_timeout = '3s' as $$
declare l public.atelier_lots; r public.atelier_receptions; p jsonb; o public.commandes; s public.stock; movement jsonb; i integer;
begin
 perform public.atelier_actor(p_actor,p_country,array['gestionnaire_stock','gestionnaire','administrateur']);
 lock table public.commandes, public.stock, public.livraisons in share row exclusive mode;
 select * into l from public.atelier_lots where id=p_lot and pays_code=p_country for update;
 if not found then raise exception 'Lot introuvable'; end if;
 select * into r from public.atelier_receptions where id=p_id;
 if found then
  if r.lot_id<>p_lot or r.quantite<>p_quantity or r.avant<>p_expected or r.utilisateur<>p_actor then raise exception 'Cette réception a déjà été utilisée'; end if;
  return to_jsonb(l);
 end if;
 if l.recues<>p_expected then raise exception 'Cette réception a déjà changé. Actualisez la liste.' using errcode='40001'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>l.quantite-l.recues then raise exception 'Quantité reçue invalide'; end if;
 for i in l.recues..l.recues+p_quantity-1 loop
  p := l.pieces->i;
  select * into o from public.commandes where id=(p->>'commandeId')::uuid and pays_code=p_country for update;
  if not found or o.statut<>'validee' or o.atelier_pieces->(p->>'articleKey')->>'lotId' is distinct from l.id::text
    or o.atelier_pieces->(p->>'articleKey')->>'etat' is distinct from 'en_cours' then
   raise exception 'Une commande de ce lot a changé. Le responsable doit la vérifier avant réception.';
  end if;
  update public.commandes set atelier_pieces=jsonb_set(atelier_pieces,array[p->>'articleKey','etat'],'"recue"'),
    historique=coalesce(historique,'[]') || jsonb_build_array(jsonb_build_object('action','atelier_recu','lotId',l.id,'receptionId',p_id,'article',p->>'articleKey','utilisateur',p_actor,'date',now(),'commentaire','Pièce reçue et réservée à cette commande'))
    where id=o.id;
 end loop;
 movement:=jsonb_build_object('type','entree','quantite',p_quantity,'source','Atelier','destination','Stock principal','utilisateur',p_actor,'date',now(),
   'operation','atelier:'||p_id::text,'lotId',l.id,'commentaire','Réception du lot atelier, pièces réservées aux commandes');
 select * into s from public.stock where pays_code=p_country and modele=l.article->>'modele' and taille=l.article->>'taille' and couleur=l.article->>'couleur' for update;
 if found then
  update public.stock set quantite_principale=quantite_principale+p_quantity, mouvements=coalesce(mouvements,'[]')||jsonb_build_array(movement) where id=s.id;
 else
  insert into public.stock(pays_code,modele,taille,couleur,quantite_principale,prix,image,mouvements)
   values(p_country,l.article->>'modele',l.article->>'taille',l.article->>'couleur',p_quantity,coalesce((l.article->>'prix')::numeric,0),l.article->>'image',jsonb_build_array(movement));
 end if;
 insert into public.atelier_receptions(id,lot_id,quantite,avant,utilisateur) values(p_id,l.id,p_quantity,l.recues,p_actor);
 update public.atelier_lots set recues=recues+p_quantity, updated_at=clock_timestamp() where id=l.id returning * into l;
 return to_jsonb(l);
end $$;

-- Compatibility for the old individual couture screen: stock and status commit together.
create or replace function public.atelier_finish_legacy(p_order uuid, p_country text, p_actor uuid,
 p_updated_at timestamptz, p_articles jsonb) returns jsonb
language plpgsql security definer set search_path = public set lock_timeout = '3s' as $$
declare o public.commandes; a jsonb; s public.stock; movement jsonb; article_keys jsonb;
begin
 perform public.atelier_actor(p_actor,p_country,array['couturier','styliste','gestionnaire','administrateur']);
 lock table public.commandes, public.stock, public.livraisons in share row exclusive mode;
 select * into o from public.commandes where id=p_order and pays_code=p_country for update;
 if not found then raise exception 'Commande introuvable'; end if;
 if o.statut='en_stock' and exists(select 1 from jsonb_array_elements(coalesce(o.historique,'[]')) h where h->>'action'='Couture terminée') then return to_jsonb(o); end if;
 if o.statut not in ('en_couture','en_decoupe') or o.atelier_pieces<>'{}' then raise exception 'Utilisez la réception du lot atelier pour cette commande.'; end if;
 if o.updated_at is distinct from p_updated_at then raise exception 'Cette commande a changé. Actualisez.' using errcode='40001'; end if;
 if jsonb_array_length(p_articles)<>jsonb_array_length(public.atelier_order_articles(o)) then raise exception 'Articles incomplets'; end if;
 for a in select value from jsonb_array_elements(p_articles) loop
  movement:=jsonb_build_object('type','entree','quantite',1,'source','Atelier de confection','destination','Stock principal',
    'commande',o.id,'utilisateur',p_actor,'date',now(),'operation','couture:'||o.id::text||':'||(a->>'id'),'commentaire','Ajout après confection');
  select * into s from public.stock where pays_code=p_country and modele=a->>'modele' and taille=a->>'taille' and couleur=a->>'couleur' for update;
  if found then
   update public.stock set quantite_principale=quantite_principale+1, mouvements=coalesce(mouvements,'[]')||jsonb_build_array(movement) where id=s.id;
  else
   insert into public.stock(pays_code,modele,taille,couleur,quantite_principale,prix,image,mouvements)
    values(p_country,a->>'modele',a->>'taille',a->>'couleur',1,coalesce((a->>'prix')::numeric,0),a->>'image',jsonb_build_array(movement));
  end if;
 end loop;
 select jsonb_agg(item->>'id') into article_keys from jsonb_array_elements(p_articles) item;
 update public.commandes set statut='en_stock',couturier_id=p_actor,date_couture=now(),
  historique=coalesce(historique,'[]')||jsonb_build_array(jsonb_build_object('action','Couture terminée','statut','en_stock',
    'utilisateur',p_actor,'date',now(),'reservationStock',article_keys)) where id=o.id returning * into o;
 return to_jsonb(o);
end $$;
revoke all on function public.atelier_finish_legacy(uuid,text,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.atelier_finish_legacy(uuid,text,uuid,timestamptz,jsonb) to service_role;

revoke all on function public.atelier_revision(text), public.atelier_actor(uuid,text,text[]), public.atelier_start(uuid,text,uuid,text,text,jsonb,jsonb), public.atelier_receive(uuid,uuid,text,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.atelier_revision(text), public.atelier_start(uuid,text,uuid,text,text,jsonb,jsonb), public.atelier_receive(uuid,uuid,text,uuid,integer,integer) to service_role;
notify pgrst, 'reload schema';
commit;
