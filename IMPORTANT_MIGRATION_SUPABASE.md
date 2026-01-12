# ⚠️ MIGRATION IMPORTANTE - Caisse Livreurs

## Problème Identifié

Si le bouton "CONFIRMER" dans la page **Caisse Livreurs** affiche une erreur, c'est parce que les colonnes nécessaires n'existent pas encore dans votre base de données Supabase.

## Solution Rapide

### Étape 1 : Ouvrir Supabase Dashboard

1. Allez sur [https://supabase.com](https://supabase.com)
2. Connectez-vous à votre compte
3. Ouvrez votre projet **atelier-confection**

### Étape 2 : Exécuter la Migration SQL

1. Dans le menu de gauche, cliquez sur **SQL Editor** (icône 📝)
2. Cliquez sur **New query** (Nouvelle requête)
3. Copiez et collez le code suivant :

```sql
-- Ajouter les champs de suivi des paiements
ALTER TABLE livraisons 
ADD COLUMN IF NOT EXISTS paiement_recu BOOLEAN DEFAULT FALSE;

ALTER TABLE livraisons 
ADD COLUMN IF NOT EXISTS date_paiement TIMESTAMP WITH TIME ZONE;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_livraisons_paiement_recu ON livraisons(paiement_recu);
```

4. Cliquez sur **Run** (Exécuter) en bas à droite
5. Attendez le message de succès ✅

### Étape 3 : Vérifier que ça fonctionne

1. Retournez sur votre application web
2. Actualisez la page **Caisse Livreurs** (F5)
3. Essayez de cliquer sur **CONFIRMER** à nouveau

✅ **Ça devrait fonctionner maintenant !**

## Que font ces colonnes ?

- **`paiement_recu`** : Indique si le gestionnaire a confirmé avoir reçu l'argent du livreur
- **`date_paiement`** : Enregistre la date et l'heure de confirmation du paiement

## Si vous utilisez MongoDB

Pas besoin de migration ! Le modèle a déjà été mis à jour automatiquement.

## Besoin d'aide ?

Si vous voyez toujours une erreur après la migration, vérifiez :

1. **Console du navigateur** (F12) → Onglet "Console" pour voir l'erreur exacte
2. **Logs du serveur** → Les erreurs détaillées s'affichent dans les logs backend
3. **Authentification** → Assurez-vous d'être connecté en tant que Gestionnaire ou Administrateur

## Support

Si le problème persiste, contactez l'équipe technique avec :
- Le message d'erreur complet (copie depuis F12 → Console)
- Votre rôle utilisateur (Gestionnaire/Administrateur)
- Le système de base de données utilisé (MongoDB ou Supabase)

