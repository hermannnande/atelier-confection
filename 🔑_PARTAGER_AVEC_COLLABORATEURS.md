# 🔑 INFORMATIONS À PARTAGER AVEC LES NOUVEAUX COLLABORATEURS

## 📋 Checklist pour ajouter un nouveau développeur

---

## 1️⃣ AJOUTER COMME COLLABORATEUR GITHUB

### Étapes :

1. Aller sur : https://github.com/hermannnande/atelier-confection
2. **Cliquer** : `Settings` (en haut à droite)
3. **Menu gauche** : `Collaborators and teams`
4. **Cliquer** : `Add people`
5. **Entrer** l'email ou username GitHub du collaborateur
6. **Sélectionner** le niveau d'accès :
   - **Write** : Peut push des branches et créer des PR (recommandé)
   - **Admin** : Accès complet (uniquement pour les personnes de confiance)
7. **Cliquer** : `Add [nom] to this repository`

Le collaborateur recevra un email d'invitation qu'il devra accepter.

---

## 2️⃣ PARTAGER LES CLÉS D'ACCÈS SUPABASE

### Option A : Inviter au projet Supabase (Recommandé)

1. Aller sur : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss/settings/general
2. **Onglet** : `Team`
3. **Cliquer** : `Invite member`
4. **Entrer l'email** du collaborateur
5. **Choisir le rôle** :
   - **Developer** : Peut voir et modifier (recommandé)
   - **Owner** : Accès total (uniquement personnes de confiance)
6. Le collaborateur recevra un email d'invitation

### Option B : Partager les clés API (Plus Simple)

**Partager ces informations via email sécurisé ou message privé** :

```env
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndm9qaWFjc2l0enRwZG1ydXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA3NjM5MiwiZXhwIjoyMDgzNjUyMzkyfQ.g_G0r5yWx7qbX5BiE9cecqy9l9a4OsTcOC6qqzAJ9MY
JWT_SECRET=votre_secret_jwt_actuel
```

⚠️ **IMPORTANT** : 
- Ne JAMAIS partager ces clés publiquement (GitHub, Discord, Slack public, etc.)
- Utiliser email privé, message direct sécurisé, ou outil de partage de secrets (1Password, LastPass, etc.)

---

## 3️⃣ PARTAGER LA DOCUMENTATION

**Envoyer au collaborateur** :

1. **Lien du repository GitHub** :
   ```
   https://github.com/hermannnande/atelier-confection
   ```

2. **Guide d'onboarding** :
   ```
   Une fois le repo cloné, lis le fichier :
   👥_GUIDE_COLLABORATION_CURSOR.md
   ```

3. **Credentials de test** :
   ```
   Email : admin@atelier.com
   Mot de passe : admin123
   ```

4. **Liens utiles** :
   ```
   App en production : https://atelier-confection.vercel.app
   Supabase Dashboard : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
   ```

---

## 4️⃣ VÉRIFIER QUE LE COLLABORATEUR EST PRÊT

### Lui demander de confirmer :

- [ ] ✅ J'ai cloné le repository GitHub
- [ ] ✅ J'ai installé toutes les dépendances (npm install)
- [ ] ✅ J'ai créé les fichiers `.env` (backend et frontend)
- [ ] ✅ Le backend démarre sur http://localhost:5000
- [ ] ✅ Le frontend démarre sur http://localhost:5173
- [ ] ✅ Je peux me connecter avec admin@atelier.com
- [ ] ✅ J'ai créé ma première branche de développement
- [ ] ✅ J'ai lu la documentation du projet

---

## 5️⃣ ACCÈS VERCEL (Optionnel)

Si le collaborateur doit déployer en production :

1. Aller sur : https://vercel.com/dashboard
2. **Sélectionner** le projet `atelier-confection`
3. **Onglet** : `Settings` → `Team`
4. **Cliquer** : `Invite Member`
5. **Entrer l'email** et choisir le rôle

---

## 📧 TEMPLATE EMAIL POUR NOUVEAU COLLABORATEUR

```
Objet : Bienvenue dans le projet Atelier Confection 🎉

Salut [Nom] !

Je t'ajoute officiellement comme collaborateur sur le projet Atelier Confection ! 🚀

📋 ÉTAPES À SUIVRE :

1. GITHUB
   - Tu as reçu une invitation par email
   - Accepte l'invitation : https://github.com/hermannnande/atelier-confection

2. SUPABASE
   [Option A] J'ai envoyé une invitation au projet Supabase (vérifie tes emails)
   [Option B] Voici les clés API à utiliser : [voir ci-dessous]

3. SETUP LOCAL
   - Clone le projet : git clone https://github.com/hermannnande/atelier-confection.git
   - Lis le guide complet : 👥_GUIDE_COLLABORATION_CURSOR.md
   - Suis les instructions étape par étape

4. CREDENTIALS DE TEST
   - Email : admin@atelier.com
   - Mot de passe : admin123

5. LIENS UTILES
   - App en prod : https://atelier-confection.vercel.app
   - Supabase : https://supabase.com/dashboard/project/rgvojiacsitztpdmruss
   - Doc complète : 📚_SAUVEGARDE_COMPLETE_PROJET.md

🔑 CLÉS SUPABASE (confidentiel) :
[Si Option B]
SUPABASE_URL=https://rgvojiacsitztpdmruss.supabase.co
SUPABASE_SERVICE_KEY=[la clé complète]
JWT_SECRET=[le secret]

⚠️ Ne partage jamais ces clés publiquement !

📞 BESOIN D'AIDE ?
Si tu bloques pendant le setup, n'hésite pas à me contacter.

Bienvenue dans l'équipe ! 🎉

[Ton nom]
```

---

## 🔒 SÉCURITÉ

### ✅ Bonnes pratiques :

1. **Vérifier l'identité** du collaborateur avant de donner les accès
2. **Donner les accès minimum** nécessaires au début
3. **Utiliser des rôles appropriés** (Developer plutôt que Owner)
4. **Partager les clés via canal sécurisé** (email privé, outil de gestion de secrets)
5. **Activer la 2FA** sur GitHub et Supabase si possible

### ⚠️ Si un collaborateur quitte le projet :

1. **GitHub** : Settings → Collaborators → Remove
2. **Supabase** : Team → Remove member
3. **Vercel** : Team → Remove member
4. **Rotation des secrets** (si nécessaire) :
   - Régénérer JWT_SECRET
   - Régénérer SUPABASE_SERVICE_KEY (si le collaborateur avait accès)
   - Mettre à jour les variables d'environnement Vercel

---

## 📊 SUIVI DES COLLABORATEURS

### Créer un tableau de suivi (optionnel) :

| Nom | GitHub | Supabase | Vercel | Date d'ajout | Rôle | Statut |
|-----|--------|----------|--------|--------------|------|--------|
| Toi | ✅ Owner | ✅ Owner | ✅ Owner | 2026-01 | Propriétaire | Actif |
| [Nom] | ✅ Write | ✅ Developer | ❌ | 2026-01 | Développeur | Actif |

---

## 🎯 CHECKLIST COMPLÈTE

Avant de dire "Tu es prêt !" au collaborateur, vérifie :

- [ ] ✅ Invitation GitHub envoyée et acceptée
- [ ] ✅ Accès Supabase configuré (invitation ou clés partagées)
- [ ] ✅ Email de bienvenue envoyé avec toutes les infos
- [ ] ✅ Le collaborateur a confirmé qu'il peut lancer le projet localement
- [ ] ✅ Le collaborateur a créé sa première branche
- [ ] ✅ Le collaborateur a lu la documentation
- [ ] ✅ Les règles de contribution sont claires (branches, PR, reviews)

---

## 💡 CONSEILS

1. **Communication claire** : Explique bien le workflow Git (branches, PR)
2. **Sois disponible** les premiers jours pour répondre aux questions
3. **Organise une session** de pair programming pour l'onboarding
4. **Définis les responsabilités** de chacun clairement
5. **Utilise les issues GitHub** pour organiser les tâches

---

**🎉 Avec ce guide, l'onboarding d'un nouveau collaborateur sera rapide et efficace !**
