# 🔄 Instructions de Réinitialisation Complète

## 📋 Description

Ce guide explique comment supprimer **TOUTES** les commandes pour repartir à zéro.

---

## ⚠️ ATTENTION

Cette opération va :
- ✅ Supprimer **TOUTES** les commandes
- ✅ Effacer tout l'historique
- ✅ Réinitialiser les performances
- ❌ **Action IRRÉVERSIBLE**

Les données suivantes **NE seront PAS** supprimées :
- Utilisateurs (comptes)
- Stock
- Modèles

---

## 🚀 Méthode 1 : Via l'interface (Recommandée)

### Étapes :

1. **Connectez-vous** en tant qu'**Administrateur**
2. Ouvrez la page **"Gestion Avancée"** (menu latéral)
3. Cliquez sur le bouton **"🗑️ Réinitialiser tout"** (section "Zone dangereuse")
4. Tapez **REINITIALISER** dans le champ de confirmation
5. Cliquez sur **"Supprimer tout"**

✅ C'est fait ! Toutes les commandes sont supprimées.

---

## 🔧 Méthode 2 : Via script (Avancé)

### Option A : Avec MongoDB local

Si vous utilisez MongoDB localement :

```bash
cd backend
npm run reset
```

### Option B : Via l'API REST

Si vous utilisez une base distante (Supabase, MongoDB Atlas, etc.) :

1. **Démarrez le serveur** (terminal 1) :
```bash
cd backend
npm start
```

2. **Exécutez le script** (terminal 2) :
```bash
cd backend
npm run reset-api
```

⚠️ **Note** : Ajustez les identifiants admin dans `backend/scripts/reset-via-api.js` si nécessaire.

---

## 🔑 Identifiants Admin par défaut

```
Email: admin@atelier.com
Password: admin123
```

---

## 📊 Résultat

Après la réinitialisation, vous verrez :

```
✅ RÉINITIALISATION TERMINÉE !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   156 commande(s) supprimée(s)
   Système prêt pour de nouvelles données
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 Pages affectées

Après la réinitialisation :

| Page | État |
|------|------|
| 📞 Appel | Vide |
| 📦 Commandes | Vide |
| 📋 Historique | Vide |
| ✂️ Atelier Styliste | Vide |
| 👔 Atelier Couturier | Vide |
| 🚚 Livraisons | Vide |
| 💰 Caisse Livreurs | Vide |
| 🛡️ Gestion Avancée | Vide |
| 📊 Performances | 0/0 |

---

## 💡 Conseils

### Avant de réinitialiser :

1. ⚠️ **Prévenez l'équipe**
2. 📥 **Exportez les données** importantes (si besoin)
3. 🔍 **Vérifiez** que c'est bien ce que vous voulez

### Après la réinitialisation :

1. ✅ Le système est prêt pour recevoir de nouvelles commandes
2. ✅ L'intégration Google Sheets fonctionne normalement
3. ✅ Toutes les fonctionnalités sont opérationnelles

---

## 🐛 Problèmes courants

### "Échec de l'authentification"
- Vérifiez les identifiants admin dans le script
- Assurez-vous qu'un compte admin existe

### "Impossible de se connecter"
- Vérifiez que le serveur backend est démarré
- Vérifiez l'URL de l'API dans le fichier `.env`

### "ECONNREFUSED"
- MongoDB n'est pas démarré (si MongoDB local)
- Utilisez la méthode via API dans ce cas

---

## ✅ Succès !

Votre système est maintenant complètement réinitialisé et prêt à recevoir de nouvelles données ! 🎉

