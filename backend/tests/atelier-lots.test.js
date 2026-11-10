import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { buildStockSynchronization } from '../services/stock-synchronization.service.js';
import { validateStartInput, validateStockStartInput } from '../services/atelier-lots.service.js';

const article = { modele: 'DAVICHI', taille: 'M', couleur: 'Blanc', prix: 10000, image: '' };
const key = 'davichi::blanc::m';
const order = (id, state, overrides = {}) => ({ id, statut: 'validee', ...article,
  atelier_pieces: state ? { principal: { etat: state, lotId: 'lot', variationKey: key } } : {}, ...overrides });

test('a started piece is never requested again, even after stock changes', () => {
  for (const quantite_principale of [0, 1, 5]) {
    const result = buildStockSynchronization({ orders: [order('started', 'en_cours')], stock: [{ ...article, quantite_principale }] });
    assert.equal(result.uncoveredOrders.length, 0);
    assert.equal(result.totals.enCours, 1);
    assert.equal(result.couvertureCommandes.started.couvertParStock, false);
  }
});
test('a received piece remains reserved when a new urgent order arrives', () => {
  const result = buildStockSynchronization({ orders: [order('urgent', null, { urgence: true }), order('original', 'recue')],
    stock: [{ ...article, quantite_principale: 1 }] });
  assert.equal(result.couvertureCommandes.original.couvertParStock, true);
  assert.equal(result.couvertureCommandes.urgent.couvertParStock, false);
  assert.deepEqual(result.uncoveredOrders.map(o => o.id), ['urgent']);
});
test('a missing received piece needs verification, not a new cut', () => {
  const result = buildStockSynchronization({ orders: [order('original', 'recue')], stock: [] });
  assert.equal(result.totals.aVerifier, 1);
  assert.equal(result.totals.aConfectionner, 0);
  assert.equal(result.couvertureCommandes.original.couvertParStock, false);
});
test('supplement lots keep their own identity and the whole order waits for all articles', () => {
  const o = order('multi', 'recue', { supplements: [{ id: 'extra', articleCatalogue: true, libelle: 'ROBE', taille: 'L', couleur: 'Noir' }],
    atelier_pieces: { principal: { etat: 'recue' }, 'supplement-1': { etat: 'en_cours' } } });
  const result = buildStockSynchronization({ orders: [o], stock: [{ ...article, quantite_principale: 1 }] });
  assert.equal(result.couvertureCommandes.multi.couvertParStock, false);
  assert.deepEqual(result.articlesReserves.multi, ['principal']);
  assert.equal(result.uncoveredOrders.length, 0);
});
test('starting one piece out of two leaves the other one to start', () => {
  const result = buildStockSynchronization({ orders: [order('started', 'en_cours'), order('waiting', null)], stock: [] });
  assert.deepEqual(result.uncoveredOrders.map(o => o.id), ['waiting']);
  assert.equal(result.totals.enCours, 1);
  assert.equal(result.totals.aConfectionner, 1);
});
test('start rejects duplicate piece references and missing action identifiers', () => {
  const p = { commandeId: randomUUID(), articleKey: 'principal' };
  assert.throws(() => validateStartInput({ operationId: randomUUID(), key, pieces: [p, p] }));
  assert.throws(() => validateStartInput({ key, pieces: [p] }));
});
test('a stock lot start needs a real variation and a whole positive quantity', () => {
  const valid = { operationId: randomUUID(), key, quantity: 2 };
  assert.doesNotThrow(() => validateStockStartInput(valid));
  for (const quantity of [0, -1, 1.5, '2', 501]) assert.throws(() => validateStockStartInput({ ...valid, quantity }));
  assert.throws(() => validateStockStartInput({ ...valid, key: 'davichi' }));
  assert.throws(() => validateStockStartInput({ ...valid, operationId: 'x' }));
});
test('received pieces remain held between courier assignment and physical stock debit', () => {
  const dispatched = order('dispatch', 'expedition', { statut: 'en_livraison', historique: [{ statut: 'en_livraison', operation: 'delivery' }] });
  const other = order('waiting', null);
  const stock = [{ ...article, quantite_principale: 1, mouvements: [] }];
  let sync = buildStockSynchronization({ orders: [dispatched, other], stock });
  assert.equal(sync.totals.reservePreparation, 1);
  assert.equal(sync.couvertureCommandes.waiting.couvertParStock, false);
  stock[0].quantite_principale = 0;
  stock[0].mouvements.push({ operation: 'assignation:delivery:principal' });
  sync = buildStockSynchronization({ orders: [dispatched, other], stock });
  assert.equal(sync.totals.reservePreparation, 0);
  assert.equal(sync.couvertureCommandes.waiting.couvertParStock, false);
});
test('only explicit standard-size synonyms match; M is never merged with Standard', () => {
  const sync = buildStockSynchronization({ orders: [order('standard', null, { taille: 'Taille standard' }),order('medium',null)],
    stock: [{ ...article, taille: 'Standard', quantite_principale: 2 }] });
  assert.equal(sync.couvertureCommandes.standard.couvertParStock,true);
  assert.equal(sync.couvertureCommandes.medium.couvertParStock,false);
});

test('PostgreSQL transactions: partial receipt, retries, rollback, rights and stable reservations', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table pays(code text primary key); insert into pays values('CI'),('TG');
    create table users(id uuid primary key, role text, actif boolean default true, pays_code text, pays_autorises text[]);
    create table commandes(id uuid primary key, pays_code text references pays(code), statut text, modele jsonb,
      taille text,couleur text,supplements jsonb default '[]',historique jsonb default '[]',urgence boolean default false,
      couturier_id uuid, date_couture timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
    create table stock(id uuid primary key default gen_random_uuid(),pays_code text references pays(code),modele text,taille text,couleur text,
      quantite_principale int default 0 check(quantite_principale>=0),quantite_en_livraison int default 0,prix numeric,image text,
      mouvements jsonb default '[]',created_at timestamptz default now(),updated_at timestamptz default now(),unique(pays_code,modele,taille,couleur));
    create table livraisons(id uuid primary key,pays_code text,statut text,updated_at timestamptz default now());
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261016_atelier_lots.sql', import.meta.url), 'utf8'));
  const seuilMigration = await readFile(new URL('../supabase/migrations/20261110_seuil_stock.sql', import.meta.url), 'utf8');
  await db.exec(seuilMigration);
  await db.exec(seuilMigration); // Peut être exécutée deux fois sans effet.
  const blaise=randomUUID(), armanda=randomUUID(), manager=randomUUID();
  for (const [id,role] of [[blaise,'styliste'],[armanda,'gestionnaire_stock'],[manager,'gestionnaire']]) {
    await db.query('insert into users(id,role,pays_code) values($1,$2,$3)',[id,role,'CI']);
  }
  const createOrder = async (status='validee', supplements=[]) => {
    const id=randomUUID();
    await db.query('insert into commandes(id,pays_code,statut,modele,taille,couleur,supplements) values($1,$2,$3,$4,$5,$6,$7)',
      [id,'CI',status,JSON.stringify({nom:article.modele}),article.taille,article.couleur,JSON.stringify(supplements)]);
    return id;
  };
  const revision = async () => (await db.query("select atelier_revision('CI') as value")).rows[0].value;
  const quantity = async () => Number((await db.query('select coalesce(sum(quantite_principale),0) as value from stock')).rows[0].value);
  const start = async (id, ids, rev, actor=blaise, country='CI') => (await db.query(
    'select atelier_start($1,$2,$3,$4,$5,$6,$7) as lot',
    [id,country,actor,rev ?? await revision(),key,JSON.stringify(article),JSON.stringify(ids.map(commandeId=>({commandeId,articleKey:'principal'})))])).rows[0].lot;
  const receive = async (id,lot,n,before,actor=armanda,country='CI') => (await db.query(
    'select atelier_receive($1,$2,$3,$4,$5,$6) as lot',[id,lot,country,actor,n,before])).rows[0].lot;
  const ids=[await createOrder(),await createOrder(),await createOrder()];
  const lot=randomUUID();
  await t.test('start reserves exactly the requested pieces and is idempotent', async () => {
    assert.equal((await start(lot,ids)).quantite,3);
    assert.equal((await start(lot,ids,'old revision')).quantite,3);
    assert.equal(await quantity(),0);
    await assert.rejects(()=>start(randomUUID(),[ids[0]]),/déjà commencée/);
    assert.equal((await db.query('select count(*)::int as n from atelier_lots')).rows[0].n,1);
  });
  const firstReceipt=randomUUID();
  await t.test('partial receipt credits once and pins only received pieces',async()=>{
    assert.equal((await receive(firstReceipt,lot,1,0)).recues,1);
    assert.equal((await receive(firstReceipt,lot,1,0)).recues,1);
    await assert.rejects(()=>receive(randomUUID(),lot,1,0),/déjà changé/);
    await assert.rejects(()=>receive(firstReceipt,lot,2,0),/déjà été utilisée/);
    assert.equal(await quantity(),1);
    const rows=(await db.query('select * from commandes')).rows;
    const sync=buildStockSynchronization({orders:rows,stock:(await db.query('select * from stock')).rows});
    assert.equal(sync.totals.reserveCommandes,1); assert.equal(sync.totals.enCours,2); assert.equal(sync.totals.aConfectionner,0);
  });
  await t.test('over-receipt and cross-role/country actions cannot write',async()=>{
    await assert.rejects(()=>receive(randomUUID(),lot,3,1),/invalide/);
    await assert.rejects(()=>receive(randomUUID(),lot,1,1,blaise),/non autorisée/);
    await assert.rejects(()=>receive(randomUUID(),lot,1,1,armanda,'TG'),/non autorisée/);
    await assert.rejects(()=>db.exec("set role anon; select atelier_revision('CI')"),/permission denied/);
    await db.exec('reset role');
    assert.equal(await quantity(),1);
  });
  await t.test('article edits and premature shipment are blocked',async()=>{
    await assert.rejects(()=>db.query("update commandes set taille='XL' where id=$1",[ids[1]]),/vérifier le lot/);
    await assert.rejects(()=>db.query("update commandes set statut='en_stock' where id=$1",[ids[1]]),/encore à recevoir/);
  });
  await t.test('manual stock entry cannot double an open workshop lot',async()=>{
    await assert.rejects(()=>db.query('update stock set quantite_principale=quantite_principale+1, mouvements=mouvements||$1::jsonb',
      [JSON.stringify([{source:'Ajout manuel'}])]),/lot en cours/);
    assert.equal(await quantity(),1);
  });
  await t.test('final receipt closes the lot; a later replay adds nothing',async()=>{
    const last=randomUUID();
    assert.equal((await receive(last,lot,2,1)).recues,3);
    assert.equal((await receive(firstReceipt,lot,1,0)).recues,3);
    assert.equal(await quantity(),3);
    await assert.rejects(()=>receive(randomUUID(),lot,1,3),/invalide/);
    await db.query("update commandes set statut='en_stock' where id=$1",[ids[0]]);
    await db.query("update commandes set statut='en_livraison' where id=$1",[ids[0]]);
    assert.equal((await db.query('select atelier_pieces from commandes where id=$1',[ids[0]])).rows[0].atelier_pieces.principal.etat,'expedition');
  });
  await t.test('a stale planning snapshot cannot start new cutting',async()=>{
    const id=await createOrder(), rev=await revision();
    await db.query('update stock set quantite_principale=quantite_principale+1');
    await assert.rejects(()=>start(randomUUID(),[id],rev),/liste vient de changer/);
  });
  await t.test('legacy completion and supplementary pieces commit once together',async()=>{
    const id=await createOrder('en_couture',[{articleCatalogue:true,libelle:'ROBE',taille:'L',couleur:'Noir'}]);
    const updated=(await db.query('select updated_at::text from commandes where id=$1',[id])).rows[0].updated_at;
    const articles=[{...article,id:'principal'},{modele:'ROBE',taille:'L',couleur:'Noir',id:'supplement-1',prix:10000}];
    const call=()=>db.query('select atelier_finish_legacy($1,$2,$3,$4,$5)',[id,'CI',manager,updated,JSON.stringify(articles)]);
    const before=await quantity();
    await call(); await call();
    assert.equal(await quantity(),before+2);
  });
  await t.test('one piece out of two can be started now and the other one later',async()=>{
    const pair=[await createOrder(),await createOrder()];
    const pending=async()=>buildStockSynchronization({stock:[],
      orders:(await db.query('select * from commandes where id in ($1,$2)',pair)).rows});
    assert.equal((await start(randomUUID(),[pair[0]])).quantite,1);
    let sync=await pending();
    assert.deepEqual(sync.uncoveredOrders.map(o=>o.id),[pair[1]]);
    assert.equal(sync.totals.enCours,1);
    assert.equal((await start(randomUUID(),[pair[1]])).quantite,1);
    sync=await pending();
    assert.equal(sync.uncoveredOrders.length,0);
    assert.equal(sync.totals.enCours,2);
  });

  const orderRow = async id => (await db.query('select * from commandes where id=$1',[id])).rows[0];
  const davichiStock = async () => (await db.query('select * from stock where modele=$1',[article.modele])).rows[0];
  const lastMovement = async () => (await davichiStock()).mouvements.at(-1);
  await t.test('a cancelled order never blocks its lot: the waiting client is served first, then the piece enters stock free',async()=>{
    const [cancelled,kept]=[await createOrder(),await createOrder()];
    const id=randomUUID();
    await start(id,[cancelled,kept]);
    await db.query("update commandes set statut='annulee' where id=$1",[cancelled]);
    const before=await quantity();

    assert.equal((await receive(randomUUID(),id,1,0)).recues,1);
    assert.equal(await quantity(),before+1);
    assert.equal((await orderRow(kept)).atelier_pieces.principal.etat,'recue');
    assert.equal((await orderRow(cancelled)).atelier_pieces.principal.etat,'en_cours');

    assert.equal((await receive(randomUUID(),id,1,1)).recues,2);
    assert.equal(await quantity(),before+2);
    const released=await orderRow(cancelled);
    assert.equal(released.statut,'annulee');
    assert.deepEqual(released.atelier_pieces,{});
    assert.equal(released.historique.at(-1).action,'atelier_recu_libre');
    assert.match((await lastMovement()).commentaire,/pièces libres/);
  });
  await t.test('an order validated again after its piece went free starts over as a normal need',async()=>{
    const cancelled=await createOrder();
    const id=randomUUID();
    await start(id,[cancelled]);
    await db.query("update commandes set statut='annulee' where id=$1",[cancelled]);
    await receive(randomUUID(),id,1,0);
    await db.query("update commandes set statut='validee' where id=$1",[cancelled]);
    const sync=buildStockSynchronization({orders:[await orderRow(cancelled)],stock:[]});
    assert.deepEqual(sync.uncoveredOrders.map(o=>o.id),[cancelled]);
  });
  await t.test('an order sent back to reminders keeps its received piece',async()=>{
    const reminded=await createOrder();
    const id=randomUUID();
    await start(id,[reminded]);
    await db.query("update commandes set statut='a_rappeler' where id=$1",[reminded]);
    await receive(randomUUID(),id,1,0);
    assert.equal((await orderRow(reminded)).atelier_pieces.principal.etat,'recue');
    assert.match((await lastMovement()).commentaire,/réservées aux commandes/);
  });
  await t.test('a deleted order does not block reception either',async()=>{
    const removed=await createOrder();
    const id=randomUUID();
    await start(id,[removed]);
    await db.query('delete from commandes where id=$1',[removed]);
    const before=await quantity();
    assert.equal((await receive(randomUUID(),id,1,0)).recues,1);
    assert.equal(await quantity(),before+1);
  });

  const startStock = async (id,n,open,rev,actor=blaise,country='CI') => (await db.query(
    'select atelier_start_stock($1,$2,$3,$4,$5,$6,$7,$8) as lot',
    [id,country,actor,rev ?? await revision(),key,JSON.stringify(article),n,open])).rows[0].lot;
  const stockLots = async () => (await db.query('select * from atelier_lots where pour_stock')).rows;
  await t.test('a stock lot needs no order, cannot be started twice and adds free pieces',async()=>{
    const id=randomUUID();
    const started=await startStock(id,2,0);
    assert.equal(started.pour_stock,true);
    assert.equal(started.quantite,2);
    assert.equal((await startStock(id,2,0,'old revision')).quantite,2);
    await assert.rejects(()=>startStock(randomUUID(),1,0),/liste vient de changer/);
    assert.equal((await stockLots()).length,1);

    const orders=JSON.stringify((await db.query('select id,statut,atelier_pieces from commandes order by id')).rows);
    const before=await quantity();
    assert.equal((await receive(randomUUID(),id,1,0)).recues,1);
    assert.equal(await quantity(),before+1);
    assert.match((await lastMovement()).commentaire,/pour le stock/);
    assert.equal((await receive(randomUUID(),id,1,1)).recues,2);
    assert.equal(await quantity(),before+2);
    assert.equal(JSON.stringify((await db.query('select id,statut,atelier_pieces from commandes order by id')).rows),orders);
  });
  await t.test('a stock lot follows the same rights and freshness rules as a client lot',async()=>{
    await assert.rejects(()=>startStock(randomUUID(),1,0,undefined,armanda),/non autorisée/);
    await assert.rejects(()=>startStock(randomUUID(),1,0,undefined,blaise,'TG'),/non autorisée/);
    await assert.rejects(()=>startStock(randomUUID(),1,0,'stale'),/liste vient de changer/);
    await assert.rejects(()=>startStock(randomUUID(),0,0),/invalide/);
    await assert.rejects(()=>db.exec(`set role authenticated; select atelier_start_stock('${randomUUID()}','CI','${blaise}','x','k','{}',1,0)`),/permission denied/);
    await db.exec('reset role');
    assert.equal((await stockLots()).length,1);
  });
  await t.test('the threshold is stored once per line and refuses negative values',async()=>{
    await db.query('update stock set seuil_minimal=5 where modele=$1',[article.modele]);
    await assert.rejects(()=>db.query('update stock set seuil_minimal=-1'),/stock_seuil_minimal_valide/);
    await assert.rejects(()=>db.query('update stock set seuil_minimal=1001'),/stock_seuil_minimal_valide/);
  });
  await t.test('pieces started for stock are deducted from the need until they are received',async()=>{
    await db.query('update stock set quantite_principale=3 where modele=$1',[article.modele]);
    const need=async()=>buildStockSynchronization({orders:[],stock:[await davichiStock()],
      lotsPourStock:await stockLots()}).totals.aCoudrePourStock;
    assert.equal(await need(),2);
    const id=randomUUID();
    await startStock(id,2,0);
    assert.equal(await need(),0);
    await receive(randomUUID(),id,2,0);
    assert.equal((await davichiStock()).quantite_principale,5);
    assert.equal(await need(),0);
  });
});
