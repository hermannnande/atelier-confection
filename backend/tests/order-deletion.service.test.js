import test from 'node:test';
import assert from 'node:assert/strict';
import { deletePreparationOrder, deletionOperation } from '../services/order-deletion.service.js';
import { buildStockSynchronization, stockVariationKey } from '../services/stock-synchronization.service.js';

const copy = value => structuredClone(value);
const at = (row, field) => field.split(/->>?/).reduce((value, key) => value?.[key], row);

// Base simulée : filtres utilisés par les services, mises à jour atomiques sur updated_at.
class Database {
  constructor(tables) { this.tables = copy(tables); this.sequence = 1; }
  from(table) { return new Query(this, table); }
}
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.action = 'select'; }
  select() { return this; }
  eq(field, value) { this.filters.push(row => at(row, field) === value); return this; }
  in(field, values) { this.filters.push(row => values.includes(row[field])); return this; }
  order() { return this; }
  range(start, end) { this.slice = [start, end + 1]; return this; }
  update(updates) { this.action = 'update'; this.updates = updates; return this; }
  delete() { this.action = 'delete'; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  async execute() {
    const table = this.db.tables[this.table] ||= [];
    let rows = table.filter(row => this.filters.every(filter => filter(row)));
    if (this.action === 'update') for (const row of rows) Object.assign(row, copy(this.updates), { updated_at: `v${this.db.sequence++}` });
    if (this.action === 'delete') this.db.tables[this.table] = table.filter(row => !rows.includes(row));
    if (this.slice) rows = rows.slice(...this.slice);
    return { data: copy(this.one ? rows[0] || null : rows), error: null };
  }
}

const VALIDATION = { statut: 'validee', action: 'Commande validée', utilisateur: 'appelant-1', date: '2026-10-06T09:00:00.000Z' };
const order = (id, extra = {}) => ({ id, pays_code: 'CI', numero_commande: `CMD-${id}`, statut: 'validee',
  modele: { nom: 'Robe DAVICHI' }, couleur: 'Rose', taille: 'M', client: { nom: 'Awa', ville: 'Abidjan' },
  created_at: '2026-10-05T08:00:00.000Z', updated_at: 'v0', historique: [VALIDATION], atelier_pieces: {}, ...extra });
const inPreparation = (id, reservation = ['principal'], extra = {}) => order(id, { statut: 'en_stock',
  historique: [VALIDATION, { statut: 'en_stock', action: 'Commande modifiée', date: '2026-10-07T10:00:00.000Z', reservationStock: reservation }],
  ...extra });
const stockRow = (id, extra = {}) => ({ id, pays_code: 'CI', modele: 'Robe DAVICHI', couleur: 'Rose', taille: 'M',
  quantite_principale: 0, quantite_en_livraison: 0, mouvements: [], updated_at: 'v0', created_at: '2026-09-01T00:00:00.000Z', ...extra });
const KEY = stockVariationKey(stockRow('x'));
const remove = (db, id, extra = {}) => deletePreparationOrder(db, { country: 'CI', orderId: id, userId: 'admin', actorName: 'Serge', ...extra });
const disponible = db => buildStockSynchronization({ orders: db.tables.commandes, stock: db.tables.stock })
  .variations.find(v => v.key === KEY)?.quantiteDisponible;

test('supprimer : la commande disparaît et sa robe sort du stock au lieu de redevenir disponible', async () => {
  // 2 robes : une dans le colis de a, une prise par la commande validée b.
  const db = new Database({ commandes: [inPreparation('a'), order('b')], stock: [stockRow('s1', { quantite_principale: 2 })], livraisons: [] });
  assert.equal(disponible(db), 0);
  const r = await remove(db, 'a', { motif: 'robe abîmée' });
  assert.deepEqual(r, { numero: 'CMD-a', pieces: [{ tenue: 'Robe DAVICHI Rose M', resultat: 'retiree' }] });
  assert.deepEqual(db.tables.commandes.map(c => c.id), ['b']);
  const row = db.tables.stock[0];
  assert.equal(row.quantite_principale, 1);
  const m = row.mouvements.at(-1);
  assert.equal(m.type, 'sortie');
  assert.equal(m.destination, 'Supprimée avec la commande');
  assert.equal(m.operation, deletionOperation('a', 'principal'));
  assert.match(m.commentaire, /CMD-a supprimée depuis Préparation Colis par Serge.*robe abîmée/);
  // Une annulation aurait libéré la robe ; ici b garde la sienne et aucune robe libre n'apparaît.
  assert.equal(disponible(db), 0);
});

test('une commande envoyée sans pièce est supprimée sans toucher au stock', async () => {
  const db = new Database({ commandes: [inPreparation('a', [])], stock: [stockRow('s1', { quantite_principale: 1 })], livraisons: [] });
  assert.deepEqual((await remove(db, 'a')).pieces, []);
  assert.equal(db.tables.commandes.length, 0);
  assert.equal(db.tables.stock[0].quantite_principale, 1);
  assert.equal(db.tables.stock[0].mouvements.length, 0);
});

test('les articles ajoutés réservés au colis sortent aussi du stock', async () => {
  const db = new Database({
    commandes: [inPreparation('a', ['principal', 'supplement-1'], {
      supplements: [{ id: 'x', articleCatalogue: true, libelle: 'Jupe Peniel', taille: 'L', couleur: 'Noir', montant: 5000 }],
    })],
    stock: [stockRow('s1', { quantite_principale: 1 }), stockRow('s2', { modele: 'Jupe Peniel', couleur: 'Noir', taille: 'L', quantite_principale: 3 })],
    livraisons: [],
  });
  const r = await remove(db, 'a');
  assert.deepEqual(r.pieces, [
    { tenue: 'Robe DAVICHI Rose M', resultat: 'retiree' }, { tenue: 'Jupe Peniel Noir L', resultat: 'retiree' }]);
  assert.deepEqual(db.tables.stock.map(s => s.quantite_principale), [0, 2]);
});

test('commande à l’atelier, en couture, avec livreur ou livraison : rien n’est supprimé', async () => {
  const refusees = [
    order('a', { statut: 'en_couture' }),
    inPreparation('a', ['principal'], { livreur_id: 'driver' }),
    inPreparation('a', ['principal'], { atelier_pieces: { principal: { etat: 'en_cours', lotId: 'l1' } } }),
  ];
  for (const commande of refusees) {
    const db = new Database({ commandes: [commande], stock: [stockRow('s1', { quantite_principale: 1 })], livraisons: [] });
    await assert.rejects(remove(db, 'a'), /annulez-la/);
    assert.equal(db.tables.commandes.length, 1);
    assert.equal(db.tables.stock[0].quantite_principale, 1);
  }
  const db = new Database({ commandes: [inPreparation('a')], stock: [stockRow('s1', { quantite_principale: 1 })],
    livraisons: [{ id: 'l1', pays_code: 'CI', commande_id: 'a' }] });
  await assert.rejects(remove(db, 'a'), /déjà une livraison/);
  assert.equal(db.tables.commandes.length, 1);
  assert.equal(db.tables.stock[0].quantite_principale, 1);
  await assert.rejects(remove(new Database({ commandes: [], stock: [], livraisons: [] }), 'a'), /introuvable/);
});

test('commande modifiée pendant la suppression (partie avec un livreur) : ni commande ni robe touchées', async () => {
  class Concurrente extends Database {
    from(table) {
      const query = super.from(table);
      if (table === 'commandes' && !this.lue) {
        this.lue = true;
        const execute = query.execute.bind(query);
        query.execute = async () => { const r = await execute(); this.tables.commandes[0].updated_at = 'v-autre'; return r; };
      }
      return query;
    }
  }
  const db = new Concurrente({ commandes: [inPreparation('a')], stock: [stockRow('s1', { quantite_principale: 1 })], livraisons: [] });
  await assert.rejects(remove(db, 'a'), /vient de changer/);
  assert.equal(db.tables.commandes.length, 1);
  assert.equal(db.tables.stock[0].quantite_principale, 1);
});

test('reprise : une robe déjà retirée ne sort pas deux fois ; sans robe comptée, le stock ne passe pas sous zéro', async () => {
  const deja = { type: 'sortie', quantite: 1, operation: deletionOperation('a', 'principal') };
  const db = new Database({ commandes: [inPreparation('a')], stock: [stockRow('s1', { quantite_principale: 1, mouvements: [deja] })], livraisons: [] });
  assert.deepEqual((await remove(db, 'a')).pieces.map(p => p.resultat), ['deja_retiree']);
  assert.equal(db.tables.stock[0].quantite_principale, 1);

  const vide = new Database({ commandes: [inPreparation('a')], stock: [stockRow('s1')], livraisons: [] });
  assert.deepEqual((await remove(vide, 'a')).pieces.map(p => p.resultat), ['absente']);
  assert.equal(vide.tables.stock[0].quantite_principale, 0);
  assert.equal(vide.tables.commandes.length, 0);
});
