-- Additive migration: seuil minimal par variante de stock, lots « pour le stock »,
-- réception d'une pièce dont la commande n'attend plus. Aucune quantité ni aucun
-- statut existant n'est modifié. Peut être exécutée deux fois.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.stock add column if not exists seuil_minimal integer not null default 0;
alter table public.stock drop constraint if exists stock_seuil_minimal_valide;
alter table public.stock add constraint stock_seuil_minimal_valide check (seuil_minimal between 0 and 1000);

-- Un lot « pour le stock » n'est rattaché à aucune commande : ses pièces arrivent libres.
alter table public.atelier_lots add column if not exists pour_stock boolean not null default false;
create index if not exists atelier_lots_stock_ouverts on public.atelier_lots(pays_code, variation_key)
 where pour_stock and recues < quantite;

create or replace function public.atelier_start_stock(p_id uuid, p_country text, p_actor uuid,
 p_revision text, p_key text, p_article jsonb, p_quantity integer, p_open integer) returns jsonb
language plpgsql security definer set search_path = public set lock_timeout = '3s' as $$
declare l public.atelier_lots; v_open integer;
begin
 perform public.atelier_actor(p_actor,p_country,array['styliste','gestionnaire','administrateur']);
 lock table public.commandes, public.stock, public.livraisons in share row exclusive mode;
 select * into l from public.atelier_lots where id=p_id;
 if found then
  if l.pays_code<>p_country or l.cree_par<>p_actor or l.variation_key<>p_key or not l.pour_stock or l.quantite<>p_quantity then
   raise exception 'Identifiant déjà utilisé';
  end if;
  return to_jsonb(l);
 end if;
 if p_revision is distinct from public.atelier_revision(p_country) then
  raise exception 'La liste vient de changer. Actualisez avant de commencer.' using errcode='40001';
 end if;
 if p_quantity is null or p_quantity not between 1 and 500 then raise exception 'Quantité invalide'; end if;
 -- Deux appareils ne peuvent pas lancer les mêmes pièces : la lecture se fait sous le verrou ci-dessus.
 select coalesce(sum(quantite-recues),0)::integer into v_open from public.atelier_lots
  where pays_code=p_country and variation_key=p_key and pour_stock and recues<quantite;
 if v_open is distinct from p_open then
  raise exception 'La liste vient de changer. Actualisez avant de commencer.' using errcode='40001';
 end if;
 insert into public.atelier_lots(id,pays_code,variation_key,article,pieces,quantite,cree_par,pour_stock)
 values(p_id,p_country,p_key,p_article,
  (select jsonb_agg(jsonb_build_object('pourStock',true)) from generate_series(1,p_quantity)),
  p_quantity,p_actor,true) returning * into l;
 return to_jsonb(l);
end $$;

-- Une pièce est encore attendue si sa commande est validée (ou en rappel, donc peut-être
-- reconfirmée) et reste liée à ce lot. Sinon, elle arrive libre dans le stock.
create or replace function public.atelier_piece_attendue(p_piece jsonb, p_lot uuid, p_country text) returns boolean
language sql stable set search_path = public as $$
 select exists(select 1 from public.commandes o
  where o.id::text=p_piece->>'commandeId' and o.pays_code=p_country
   and o.statut in ('validee','a_rappeler')
   and o.atelier_pieces->(p_piece->>'articleKey')->>'lotId'=p_lot::text
   and o.atelier_pieces->(p_piece->>'articleKey')->>'etat'='en_cours');
$$;

create or replace function public.atelier_receive(p_id uuid, p_lot uuid, p_country text, p_actor uuid,
 p_quantity integer, p_expected integer) returns jsonb
language plpgsql security definer set search_path = public set lock_timeout = '3s' as $$
declare l public.atelier_lots; r public.atelier_receptions; p jsonb; o public.commandes; movement jsonb; i integer;
 s public.stock; cle text; libres integer := 0;
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

 -- Lors d'une réception partielle, les pièces encore attendues par un client passent d'abord.
 if not l.pour_stock then
  select jsonb_agg(e.piece order by
    case when e.rang<=l.recues then 0 when public.atelier_piece_attendue(e.piece,l.id,p_country) then 1 else 2 end, e.rang)
   into l.pieces from jsonb_array_elements(l.pieces) with ordinality as e(piece,rang);
 end if;

 for i in l.recues..l.recues+p_quantity-1 loop
  p := l.pieces->i;
  if l.pour_stock then
   libres := libres+1;
   continue;
  end if;
  cle := p->>'articleKey';
  select * into o from public.commandes where id=(p->>'commandeId')::uuid and pays_code=p_country for update;
  if found and public.atelier_piece_attendue(p,l.id,p_country) then
   update public.commandes set atelier_pieces=jsonb_set(atelier_pieces,array[cle,'etat'],'"recue"'),
    historique=coalesce(historique,'[]') || jsonb_build_array(jsonb_build_object('action','atelier_recu','lotId',l.id,'receptionId',p_id,'article',cle,'utilisateur',p_actor,'date',now(),'commentaire','Pièce reçue et réservée à cette commande'))
    where id=o.id;
  else
   libres := libres+1;
   -- La commande perd son lien : si elle est validée de nouveau, elle repart comme une nouvelle demande.
   if found and o.atelier_pieces->cle->>'lotId'=l.id::text and o.atelier_pieces->cle->>'etat'='en_cours' then
    update public.commandes set atelier_pieces=atelier_pieces-cle,
     historique=coalesce(historique,'[]') || jsonb_build_array(jsonb_build_object('action','atelier_recu_libre','lotId',l.id,'receptionId',p_id,'article',cle,'utilisateur',p_actor,'date',now(),'commentaire','Pièce reçue après annulation de la commande : entrée en stock comme pièce libre'))
     where id=o.id;
   end if;
  end if;
 end loop;

 movement:=jsonb_build_object('type','entree','quantite',p_quantity,'source','Atelier','destination','Stock principal','utilisateur',p_actor,'date',now(),
   'operation','atelier:'||p_id::text,'lotId',l.id,'commentaire',
   case when l.pour_stock then 'Réception du lot atelier pour le stock'
        when libres=p_quantity then 'Réception du lot atelier, pièces libres : commandes annulées'
        when libres>0 then 'Réception du lot atelier, pièces réservées aux commandes et '||libres||' pièce(s) libre(s)'
        else 'Réception du lot atelier, pièces réservées aux commandes' end);
 select * into s from public.stock where pays_code=p_country and modele=l.article->>'modele' and taille=l.article->>'taille' and couleur=l.article->>'couleur' for update;
 if found then
  update public.stock set quantite_principale=quantite_principale+p_quantity, mouvements=coalesce(mouvements,'[]')||jsonb_build_array(movement) where id=s.id;
 else
  insert into public.stock(pays_code,modele,taille,couleur,quantite_principale,prix,image,mouvements)
   values(p_country,l.article->>'modele',l.article->>'taille',l.article->>'couleur',p_quantity,coalesce((l.article->>'prix')::numeric,0),l.article->>'image',jsonb_build_array(movement));
 end if;
 insert into public.atelier_receptions(id,lot_id,quantite,avant,utilisateur) values(p_id,l.id,p_quantity,l.recues,p_actor);
 update public.atelier_lots set pieces=l.pieces, recues=recues+p_quantity, updated_at=clock_timestamp() where id=l.id returning * into l;
 return to_jsonb(l);
end $$;

revoke all on function public.atelier_start_stock(uuid,text,uuid,text,text,jsonb,integer,integer),
 public.atelier_piece_attendue(jsonb,uuid,text),
 public.atelier_receive(uuid,uuid,text,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.atelier_start_stock(uuid,text,uuid,text,text,jsonb,integer,integer),
 public.atelier_receive(uuid,uuid,text,uuid,integer,integer) to service_role;
notify pgrst, 'reload schema';
commit;
