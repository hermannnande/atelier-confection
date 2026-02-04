# 🎛️ Guide d'Administration - Atelier Confection

## 🔐 Connexion

### Accès au panneau admin
- URL : `site-web/admin/index.html`
- Identifiants par défaut :
  - **Utilisateur** : `admin`
  - **Mot de passe** : `admin123`

⚠️ **Important** : Changez ces identifiants après la première connexion !

---

## 📦 Gestion des Produits

### Ajouter un produit
1. Cliquez sur **"Nouveau Produit"**
2. Remplissez le formulaire :
   - **Nom** : Nom du produit (ex: Robe Élégante Satin)
   - **Catégorie** : Sélectionnez dans la liste
   - **Prix** : Prix de vente en FCFA
   - **Prix original** : (Optionnel) Pour afficher une réduction
   - **Stock** : Quantité disponible
   - **Description** : Description détaillée
   - **Tailles** : Séparées par virgule (ex: S, M, L, XL)
   - **Couleurs** : Séparées par virgule (ex: Noir, Blanc, Beige)
   - **Images** : 
     - **Option 1** : Cliquez sur la zone pour uploader depuis votre ordinateur
     - **Option 2** : Entrez une URL d'image et cliquez "Ajouter URL"
3. Cliquez **"Enregistrer"**

### Modifier un produit
1. Cliquez sur l'icône **crayon** sur la ligne du produit
2. Modifiez les informations
3. Cliquez **"Enregistrer"**

### Supprimer un produit
1. Cliquez sur l'icône **poubelle**
2. Confirmez la suppression

---

## 🏷️ Gestion des Catégories

### Catégories par défaut
- **Élégant** : Collection élégante et raffinée
- **Perle Rare** : Pièces uniques et précieuses
- **Perle Unique** : Créations exclusives
- **Style Event** : Tenues pour événements

### Ajouter une catégorie
1. Cliquez sur **"Nouvelle Catégorie"**
2. Remplissez :
   - **Nom** : Nom de la catégorie
   - **Slug** : URL-friendly (ex: ma-categorie)
   - **Description** : Description courte
3. Cliquez **"Créer"**

### Modifier / Supprimer
- Même principe que les produits

---

## 📋 Gestion des Commandes

### Voir les commandes
- Toutes les commandes passées sur le site apparaissent ici
- Informations affichées :
  - Numéro de commande
  - Client (nom, téléphone)
  - Produits commandés
  - Montant total
  - Statut
  - Date

### Statuts des commandes
- **En attente** : Nouvelle commande
- **Confirmée** : Commande acceptée
- **En préparation** : Produits en cours de préparation
- **En livraison** : Commande expédiée
- **Livrée** : Commande reçue par le client
- **Annulée** : Commande annulée

### Changer le statut
1. Cliquez sur **"Changer statut"**
2. Sélectionnez le nouveau statut
3. Confirmez

---

## ⚙️ Paramètres

### Informations du site
- **Nom du site** : Nom affiché sur le site
- **Email** : Email de contact
- **Téléphone** : Numéro de téléphone
- **Adresse** : Adresse physique
- **Description** : Description pour SEO

### Réseaux sociaux
- **Facebook** : URL de la page Facebook
- **Instagram** : URL du profil Instagram
- **WhatsApp** : Numéro WhatsApp

### Paramètres de livraison
- **Frais de livraison** : Coût de la livraison
- **Livraison gratuite à partir de** : Montant minimum
- **Zones de livraison** : Communes desservies

---

## 📊 Dashboard

### Statistiques affichées
- **Nombre de produits** : Total des produits en catalogue
- **Nombre de catégories** : Total des catégories
- **Nombre de commandes** : Total des commandes
- **Revenus** : Chiffre d'affaires total

### Activité récente
- Liste des 10 dernières actions effectuées
- Affichage en temps réel

### Actions rapides
- Créer un nouveau produit
- Créer une nouvelle catégorie
- Voir les commandes
- Aperçu du site public

---

## 💾 Sauvegarde des Données

### LocalStorage
Toutes les données sont sauvegardées dans le **LocalStorage** du navigateur :
- `atelier-admin-products` : Produits
- `atelier-admin-categories` : Catégories
- `atelier-admin-orders` : Commandes
- `atelier-admin-settings` : Paramètres
- `atelier-admin-auth` : Authentification
- `atelier-admin-activity` : Activités

### Exporter / Importer
**À venir** : Fonctionnalité pour exporter les données en JSON et les importer.

---

## 🔒 Sécurité

### Bonnes pratiques
1. ✅ Changez les identifiants par défaut
2. ✅ Ne partagez pas vos identifiants
3. ✅ Déconnectez-vous après chaque session
4. ✅ Utilisez un mot de passe fort
5. ✅ Sauvegardez régulièrement vos données

### Session
- La session expire après **24 heures**
- Déconnexion automatique si inactif

---

## 📱 Responsive

Le panneau admin fonctionne sur :
- 💻 Desktop (1920px+)
- 💻 Laptop (1024px+)
- 📱 Tablette (768px+)
- 📱 Mobile (320px+)

---

## 🆘 Dépannage

### Je ne peux pas me connecter
- Vérifiez les identifiants : `admin` / `admin123`
- Videz le cache du navigateur
- Essayez en navigation privée

### Les produits n'apparaissent pas sur le site
- Vérifiez que le produit a des images
- Vérifiez que le stock > 0
- Rafraîchissez la page du site

### J'ai perdu mes données
- Si vous avez vidé le LocalStorage, les données sont perdues
- Pensez à exporter régulièrement

---

## 🎯 Workflow Recommandé

1. **Créer les catégories** (si besoin de nouvelles)
2. **Ajouter les produits** avec photos et descriptions
3. **Vérifier sur le site** que tout s'affiche correctement
4. **Gérer les commandes** au fur et à mesure
5. **Consulter les statistiques** régulièrement

---

## 🚀 Prochaines Fonctionnalités

- [ ] Export / Import des données
- [ ] Gestion des utilisateurs admin
- [ ] Statistiques avancées avec graphiques
- [ ] Gestion des promotions et réductions
- [ ] Notification par email pour les commandes
- [ ] Intégration avec un vrai backend

---

**Besoin d'aide ?** Consultez ce guide ou contactez le support technique.

**Version** : 1.0.0
**Date** : 25 Janvier 2026
