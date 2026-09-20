# Atelier sur le VPS — mise en service du 20 septembre 2026

- Gestion : https://nousunique.com/atelier/
- API : https://nousunique.com/api/
- Boutique et gestion du catalogue : adresses existantes sur nousunique.com.
- Supabase, JWT, SMS et données métier : mêmes configuration et base qu'avant.
- L'infogérance LWS, WordPress et les médias existants sont conservés.

## Processus et reprise

Le compte SSH est chrooté. Le runtime Node 22 et la bibliothèque libdl sont
dans `/private/atelier-runtime`, le code dans `/private/atelier-app/releases`.
`/private/atelier-app/current` est un lien **relatif** vers la version active.
Les liens historiques sous `/home/defaultboutique` restent utilisables en SSH.

Le superviseur écoute uniquement sur 127.0.0.1:15819 et relance l'API
sur 127.0.0.1:15818 après un arrêt. Apache termine HTTPS et relaie `/api/`.
Le fichier `production.env` reste privé, avec permissions 600, et n'est pas
versionné. Les scripts calculent leurs chemins pour fonctionner en SSH chrooté
comme depuis PHP sous le chemin hôte réel.

`atelier-runtime.php` vérifie le service à chaque chargement HTML, avant le
JavaScript de l'application. Si le service est arrêté, il relance le superviseur.
Apache l'appelle aussi sur une erreur de connexion 503. Cette requête reçoit
503 + Retry-After: 2 et n'est jamais rejouée, pour éviter de doubler une commande.
La suivante fonctionne. Ce mécanisme a été testé en arrêtant le superviseur.
Ce n'est pas un service systemd : après un redémarrage du VPS, le démarrage
est déclenché par la première visite/requête. Aucun accès root n'est nécessaire.

## Vercel conservé pour compatibilité

Les anciennes pages redirigent en 307 vers le VPS. Les anciennes routes `/api/`
et le cron SMS quotidien à 17:30 UTC restent actifs pour ne pas casser les
intégrations externes ni les onglets ouverts avant la migration. Les nouveaux
chargements et la boutique utilisent directement le VPS, sans proxy Vercel.
Faire actualiser les anciens onglets aux utilisateurs pour arrêter leur polling
vers Vercel. Une nouvelle connexion peut être nécessaire avec le changement
d'origine. Ne pas supprimer Vercel tant que les intégrations n'ont pas été migrées.
L'abonnement Vercel et les autres projets ne sont pas résiliés par ce changement.

## Déploiements suivants

1. Partir du dernier code, conserver le basename React issu de `BASE_URL`.
2. Dans frontend, compiler avec `VITE_API_URL=/api npm run build -- --base=/atelier/`.
   PowerShell : `$env:VITE_API_URL='/api'; npm.cmd run build -- --base=/atelier/`.
3. Copier `frontend.htaccess` dans le dist sous le nom `.htaccess`, puis publier
   le dist sous `/web/atelier`. Garder les anciens assets pendant la transition.
4. Publier le backend dans une nouvelle version privée, puis `npm ci --omit=dev`.
   Utiliser le Node privé avec `LD_LIBRARY_PATH=/private/atelier-runtime`.
5. Changer le lien relatif `current`, relancer le superviseur, vérifier `/api/health`.
6. Ne pas remplacer le site statique en ligne par une ancienne copie Git : les
   ajustements de migration ont été appliqués à la version réellement en ligne.
7. La configuration racine Apache est dans `root.htaccess`; la sauvegarder avant
   tout changement pour préserver aussi les règles WordPress.

## Vérifications effectuées

Build React réussi ; catalogue et catégories identiques entre Vercel et VPS ;
lectures authentifiées de l'utilisateur, pays, commandes, stock et modèles OK ;
refus 401 sans authentification ; refus 400 d'une commande incomplète ; reprise
après arrêt complet ; routes profondes `/atelier/login` et assets servis en HTTPS.
Aucune commande réelle ni SMS de test créés.

## Retour arrière

L'archive `/home/defaultboutique/backups/before-vps-migration-20260920.tar.gz`
contient les fichiers boutique et `.htaccess` avant bascule. Une copie est aussi
gardée localement dans le répertoire privé de migration. Restaurer ses fichiers
remet les appels boutique vers Vercel. Restaurer l'ancien déploiement Vercel
`dpl_9F7awiMU9SRyQ7gXB9qny38u5H9j` remet l'interface précédente.
La base Supabase étant inchangée, il n'y a pas de restauration de données à faire.
