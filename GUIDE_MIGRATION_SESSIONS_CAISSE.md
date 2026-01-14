# 🎯 Guide de Migration - Système de Sessions Caisse Livreurs

## ✅ Ce qui a été fait automatiquement

### 1. **Backend (MongoDB + Supabase)**
- ✅ Modèle `SessionCaisse` créé
- ✅ Champ `session_caisse` ajouté au modèle `Livraison`
- ✅ Routes API créées (GET, POST pour clôture, ajout livraisons, historique)
- ✅ Routes enregistrées dans `server.js`

### 2. **Frontend**
- ✅ Page `CaisseLivreurs.jsx` complètement refaite
- ✅ Système de sessions automatiques par livreur
- ✅ Affichage des sessions actives + historique
- ✅ Boutons "Clôturer" et "Vérifier nouvelles livraisons"
- ✅ Gestion des permissions (gestionnaire + administrateur uniquement)
- ✅ Messages d'erreur clairs si migration non faite

### 3. **Migration SQL**
- ✅ Fichier `supabase/migrations/20260114000000_add_sessions_caisse.sql` créé
- ⚠️ **VOUS DEVEZ L'EXÉCUTER MANUELLEMENT** (voir ci-dessous)

---

## 🚨 ACTION REQUISE : Exécuter la Migration Supabase

### Étape 1 : Se connecter à Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet : **rgvojiacsitztpdmruss**

### Étape 2 : Ouvrir l'éditeur SQL

1. Dans le menu de gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"New Query"**

### Étape 3 : Copier-Coller le Script

**IMPORTANT : Copiez TOUT le contenu ci-dessous et collez-le dans l'éditeur SQL**

```sql
-- Migration: Créer le système de sessions pour la caisse livreurs
-- Date: 2026-01-14

-- Créer la table sessions_caisse
CREATE TABLE IF NOT EXISTS sessions_caisse (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  livreur_id UUID NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ouverte',
  montant_total NUMERIC NOT NULL DEFAULT 0,
  nombre_livraisons INTEGER NOT NULL DEFAULT 0,
  date_debut TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_cloture TIMESTAMP WITH TIME ZONE,
  gestionnaire_id UUID,
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT sessions_caisse_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_caisse_livreur_id_fkey FOREIGN KEY (livreur_id) REFERENCES users (id),
  CONSTRAINT sessions_caisse_gestionnaire_id_fkey FOREIGN KEY (gestionnaire_id) REFERENCES users (id),
  CONSTRAINT sessions_caisse_statut_check CHECK (
    statut = ANY (ARRAY['ouverte'::TEXT, 'cloturee'::TEXT])
  )
);

-- Ajouter le champ session_caisse_id à la table livraisons
ALTER TABLE livraisons 
ADD COLUMN IF NOT EXISTS session_caisse_id UUID;

-- Ajouter la contrainte de clé étrangère
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'livraisons_session_caisse_id_fkey'
  ) THEN
    ALTER TABLE livraisons 
    ADD CONSTRAINT livraisons_session_caisse_id_fkey 
    FOREIGN KEY (session_caisse_id) REFERENCES sessions_caisse (id);
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_caisse_livreur ON sessions_caisse(livreur_id, statut);
CREATE INDEX IF NOT EXISTS idx_sessions_caisse_date_cloture ON sessions_caisse(date_cloture);
CREATE INDEX IF NOT EXISTS idx_livraisons_session_caisse ON livraisons(session_caisse_id);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_sessions_caisse_updated_at ON sessions_caisse;
CREATE TRIGGER update_sessions_caisse_updated_at 
BEFORE UPDATE ON sessions_caisse
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Activer Row Level Security
ALTER TABLE sessions_caisse ENABLE ROW LEVEL SECURITY;

-- Politique RLS (accès via service_role uniquement)
DROP POLICY IF EXISTS "service_role_only" ON sessions_caisse;
CREATE POLICY "service_role_only" ON sessions_caisse
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

-- Commentaires pour documentation
COMMENT ON TABLE sessions_caisse IS 'Sessions de caisse pour grouper les livraisons d''un livreur';
COMMENT ON COLUMN sessions_caisse.statut IS 'Statut de la session: ouverte (en cours) ou cloturee (argent remis)';
COMMENT ON COLUMN sessions_caisse.montant_total IS 'Montant total de la session (somme des prix des commandes)';
COMMENT ON COLUMN sessions_caisse.nombre_livraisons IS 'Nombre de livraisons dans cette session';
COMMENT ON COLUMN livraisons.session_caisse_id IS 'Lien vers la session de caisse à laquelle appartient cette livraison';
```

### Étape 4 : Exécuter le Script

1. Cliquez sur le bouton **"Run"** (ou `Ctrl + Enter`)
2. Attendez quelques secondes
3. Vérifiez qu'il n'y a **aucune erreur** en rouge

### Étape 5 : Vérifier la Migration

Dans le **SQL Editor**, exécutez cette requête pour vérifier :

```sql
-- Vérifier que la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'sessions_caisse';

-- Vérifier les colonnes de sessions_caisse
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions_caisse';

-- Vérifier que le champ a été ajouté à livraisons
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'livraisons' 
AND column_name = 'session_caisse_id';
```

✅ Si tout est OK, vous devriez voir :
- La table `sessions_caisse` avec 11 colonnes
- Le champ `session_caisse_id` dans la table `livraisons`

---

## 📋 Comment fonctionne le nouveau système ?

### Workflow automatique

1. **Livreur livre un colis**
   - Dans la page "Livraisons", le livreur marque un colis comme **"Livrée"**
   
2. **Session créée automatiquement**
   - À la prochaine visite du gestionnaire sur "Caisse Livreurs", une session s'ouvre automatiquement
   - La session regroupe toutes les livraisons "Livrée" du livreur

3. **Gestionnaire vérifie**
   - Le gestionnaire voit le **nombre de colis** et le **montant total**
   - Il peut cliquer sur **"Vérifier nouvelles livraisons"** pour rafraîchir

4. **Clôture de session**
   - Quand le livreur remet l'argent, le gestionnaire clique sur **"Clôturer"**
   - Toutes les livraisons de la session sont marquées comme **payées** (`paiement_recu = true`)
   - La session apparaît dans l'**historique**

### Avantages

✅ **Plus simple** : Pas de gestion manuelle des lots  
✅ **Automatique** : Les sessions se créent toutes seules  
✅ **Traçable** : Historique complet par livreur  
✅ **Clair** : Un seul bouton "Clôturer" quand l'argent est remis  

---

## 🔧 Après la migration Supabase

### 1. Redéployer sur Vercel (automatique)

- Vercel détecte automatiquement le push sur GitHub
- Il redéploie l'application avec les nouveaux fichiers
- **Attendez 2-3 minutes** que le déploiement se termine

### 2. Tester l'application

1. Connectez-vous en tant que **Gestionnaire** ou **Administrateur**
2. Cliquez sur **"Caisse Livreurs"** dans le menu
3. Vous devriez voir la nouvelle interface avec les sessions

### 3. Vérifier les permissions

- Si vous voyez un message d'erreur "Migration non exécutée", c'est que vous n'avez pas fait l'Étape 3
- Si vous êtes déconnecté, videz le cache du navigateur (`Ctrl + Shift + Suppr`) et reconnectez-vous

---

## 🆘 En cas de problème

### Erreur : "relation 'sessions_caisse' does not exist"
➡️ **Solution** : Vous n'avez pas exécuté le script SQL sur Supabase (retournez à l'Étape 3)

### Erreur : "Token invalide" ou déconnexion
➡️ **Solution** :
1. Videz le cache du navigateur (`Ctrl + Shift + Suppr`)
2. Reconnectez-vous
3. Vérifiez que vos variables d'environnement Vercel sont correctes :
   - `SUPABASE_URL` = `https://rgvojiacsitztpdmruss.supabase.co`
   - `SUPABASE_SERVICE_KEY` = (votre clé service_role)

### Erreur : "Accès refusé"
➡️ **Solution** : Cette page est uniquement pour les **gestionnaires** et **administrateurs**. Connectez-vous avec un compte ayant ces permissions.

### Aucune session ne s'affiche
➡️ **C'est normal** : Les sessions se créent uniquement quand les livreurs marquent des colis comme "Livrée". Testez en créant une livraison et en la marquant "Livrée" dans la page "Livraisons".

---

## 📌 Rappel

**VOUS DEVEZ EXÉCUTER LA MIGRATION SQL SUR SUPABASE AVANT QUE LE SYSTÈME FONCTIONNE !**

Une fois fait, tout sera automatique. 🎉

