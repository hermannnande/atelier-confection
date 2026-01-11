# 📚 Guide d'Utilisation - Atelier de Confection

## 🎯 Vue d'Ensemble

Cette application gère l'intégralité du processus de votre atelier de confection, de la prise de commande à la livraison.

## 👥 Les Rôles

### 1. 🔴 Administrateur
**Accès**: Tout  
**Responsabilités**:
- Supervision générale
- Gestion des utilisateurs
- Accès à toutes les fonctionnalités

### 2. 🔵 Gestionnaire
**Accès**: Presque tout (sauf création d'admins)  
**Responsabilités**:
- Gestion du stock
- Assignation des livraisons
- Consultation des performances
- Création d'utilisateurs

### 3. 🟢 Appelant
**Accès**: Commandes  
**Responsabilités**:
- Recevoir les commandes (téléphone, Google Sheet)
- Créer les commandes dans le système
- Appeler les clients pour validation
- Modifier les commandes si nécessaire
- Valider les commandes

### 4. 🟡 Styliste
**Accès**: Atelier de découpe  
**Responsabilités**:
- Voir les commandes validées
- Découper les modèles
- Envoyer en couture

### 5. 🟠 Couturier
**Accès**: Atelier de couture  
**Responsabilités**:
- Voir les commandes à coudre
- Confectionner les tenues
- Marquer comme terminé

### 6. 🟣 Livreur
**Accès**: Livraisons  
**Responsabilités**:
- Voir ses livraisons assignées
- Livrer aux clients
- Marquer livré ou refusé

## 📋 Workflow Complet

### Étape 1: Prise de Commande (Appelant)
1. Se connecter à l'application
2. Cliquer sur **"Nouvelle Commande"**
3. Remplir le formulaire:
   - **Client**: Nom, contact, ville
   - **Modèle**: Nom, image (URL), description
   - **Spécifications**: Taille, couleur, prix
   - **Options**: Urgent, note pour l'atelier
4. Cliquer sur **"Créer la Commande"**
5. Appeler le client pour confirmer
6. Dans les détails de la commande, cliquer **"Valider"**

### Étape 2: Découpe (Styliste)
1. Aller dans **"Atelier - Styliste"**
2. Voir la liste des commandes validées
3. Pour chaque commande:
   - Lire les détails et les notes
   - Cliquer **"Commencer"** pour marquer en découpe
   - Effectuer la découpe physique
   - Cliquer **"Envoyer en couture"**

### Étape 3: Couture (Couturier)
1. Aller dans **"Atelier - Couturier"**
2. Voir la liste des commandes à coudre
3. Pour chaque commande:
   - Lire les instructions
   - Effectuer la couture
   - Cliquer **"Terminer"**
   - ✅ L'article est automatiquement ajouté au stock principal

### Étape 4: Assignation (Gestionnaire)
1. Aller dans **"Stock"**
2. Vérifier la disponibilité
3. Aller dans **"Livraisons"**
4. Cliquer **"Assigner Livraison"**
5. Sélectionner:
   - Une commande en stock
   - Un livreur disponible
6. Cliquer **"Assigner"**
7. ✅ Le stock passe automatiquement de "Principal" à "En Livraison"

### Étape 5: Livraison (Livreur)
1. Aller dans **"Livraisons"**
2. Voir les livraisons assignées
3. Livrer au client
4. Deux options:
   - **Livrée**: Cliquer "Livrée" ✅ Le stock en livraison est réduit
   - **Refusée**: Cliquer "Refusée", indiquer le motif ❌ Le stock reste chez le livreur

### Étape 6: Retour (si refusé)
1. Le livreur revient à l'atelier
2. Le **Gestionnaire** va dans **"Livraisons"**
3. Trouve la livraison refusée
4. Cliquer **"Confirmer Retour"**
5. ✅ Le stock revient automatiquement au stock principal

## 🎨 Fonctionnalités Avancées

### Modification de Commande
- L'appelant peut modifier une commande avant validation
- Modifier: modèle, taille, couleur, prix
- Le prix total se réajuste automatiquement

### Commandes Urgentes
- Cocher "Marquer comme urgent" lors de la création
- Badge rouge "Urgent" affiché partout
- Les urgences apparaissent en premier

### Notes pour l'Atelier
- L'appelant peut ajouter des instructions spéciales
- Visibles par le styliste et le couturier
- Utile pour détails techniques, préférences client, etc.

### Historique Complet
- Chaque action est enregistrée
- Qui a fait quoi et quand
- Traçabilité totale de la commande

## 📊 Tableau de Bord

### Vue Générale (Dashboard)
- Total des commandes
- Commandes par statut
- Taux de réussite global
- Chiffre d'affaires
- Statistiques de l'équipe

### Performances
Accessible aux gestionnaires et admins:

**Appelants**:
- Nombre de commandes créées
- Taux de validation
- Chiffre d'affaires généré

**Stylistes**:
- Commandes découpées
- Commandes en cours

**Couturiers**:
- Pièces terminées
- Commandes en cours
- Temps moyen de confection

**Livreurs**:
- Livraisons effectuées
- Taux de réussite
- Chiffre d'affaires livré

## 🔍 Recherche et Filtres

### Commandes
- Recherche par: numéro, client, modèle
- Filtrer par: statut, urgence
- Tri automatique: urgentes en premier

### Stock
- Recherche par: modèle, taille, couleur
- Alertes automatiques:
  - ❌ Rupture de stock (0 articles)
  - ⚠️ Faible stock (< 5 articles)

### Livraisons
- Filtrer par: statut, livreur
- Voir: en cours, livrées, refusées

## 💡 Conseils d'Utilisation

### Pour les Appelants
✅ **À FAIRE**:
- Vérifier toutes les informations avant validation
- Ajouter des notes détaillées pour l'atelier
- Marquer urgent seulement si vraiment nécessaire
- Appeler le client avant de valider

❌ **À ÉVITER**:
- Créer des doublons
- Oublier de valider après confirmation client
- Laisser des champs vides

### Pour les Stylistes/Couturiers
✅ **À FAIRE**:
- Lire les notes avant de commencer
- Traiter les urgences en priorité
- Marquer "terminé" immédiatement après

❌ **À ÉVITER**:
- Oublier de marquer l'avancement
- Ignorer les instructions spéciales

### Pour les Livreurs
✅ **À FAIRE**:
- Vérifier l'adresse avant de partir
- Avoir le contact du client
- Marquer le statut immédiatement après livraison
- Indiquer un motif précis si refusé

❌ **À ÉVITER**:
- Oublier de marquer "livré"
- Ne pas revenir à l'atelier si refusé

### Pour les Gestionnaires
✅ **À FAIRE**:
- Vérifier le stock avant d'assigner
- Répartir équitablement entre livreurs
- Consulter régulièrement les performances
- Confirmer les retours rapidement

❌ **À ÉVITER**:
- Assigner sans stock disponible
- Négliger les retours de colis

## 🆘 Situations Courantes

### "Je ne vois pas mes commandes"
➡️ Vérifiez que vous êtes dans la bonne section selon votre rôle

### "La commande n'apparaît pas chez le styliste"
➡️ Assurez-vous qu'elle a été **validée** par l'appelant

### "Je ne peux pas assigner une livraison"
➡️ Vérifiez que:
1. La commande est "en_stock"
2. Il y a du stock disponible
3. Un livreur est actif

### "Le stock ne se met pas à jour"
➡️ Le stock se met à jour automatiquement quand:
- Un couturier marque "terminé" → +1 stock principal
- Une livraison est assignée → -1 principal, +1 en livraison
- Une livraison est livrée → -1 en livraison
- Un retour est confirmé → -1 en livraison, +1 principal

## 📱 Navigation

### Menu Latéral
Cliquez sur le menu (☰) en haut à gauche sur mobile

### Badges de Statut
- 🔵 Bleu = Info/En cours
- 🟢 Vert = Succès/Terminé
- 🟡 Jaune = Attention/En attente
- 🔴 Rouge = Urgent/Erreur

### Retour
Utilisez le bouton "←" ou le menu pour naviguer

## 🔐 Sécurité

- Changez votre mot de passe régulièrement
- Ne partagez pas vos identifiants
- Déconnectez-vous après utilisation
- Les admins peuvent désactiver un compte si nécessaire

## 📞 Support

En cas de problème:
1. Vérifiez ce guide d'utilisation
2. Consultez l'historique de la commande
3. Contactez l'administrateur système

---

**Bonne utilisation ! 🎉**




