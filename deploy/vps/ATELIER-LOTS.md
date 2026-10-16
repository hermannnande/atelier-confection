# Suivi des lots atelier — 16 octobre 2026

Blaise démarre les pièces depuis « Modèles en attente ». Armanda ouvre « Stock »
et confirme « Tout reçu » ou « Reçu une partie ». Chaque article de commande,
y compris les suppléments, reste lié à son lot. Les commandes restent dans
« Commandes » ; le badge de disponibilité apparaît lorsque tous leurs articles
sont reçus ou couverts. L'envoi au livreur conserve le parcours existant.

Les anciennes découpes et coutures restent visibles pour vérification. La
migration ne modifie aucune quantité historique, ne fusionne aucune commande
et ne suppose pas qu'une pièce ancienne a réellement été fabriquée.

## Installation

1. Sauvegarder commandes, stock, livraisons, structure SQL et version active.
2. Exécuter uniquement `backend/supabase/migrations/20261016_atelier_lots.sql`.
   La migration ajoute les lots, réceptions et repères par article. Elle rétablit
   les dates de modification nécessaires aux contrôles de concurrence.
3. Publier le backend compatible, puis le frontend compilé avec `/api` et
   `/atelier/`. Conserver les assets précédents pendant le renouvellement des onglets.
4. Vérifier les lectures authentifiées avec les rôles styliste et gestionnaire
   de stock, et le refus d'une réception par un styliste. Actualiser les onglets.

## Garanties et vérifications

Le démarrage vérifie une révision récente des commandes et du stock sous verrou
PostgreSQL. Les articles déjà commencés ne peuvent pas être repris. La réception
écrit le stock, les repères par article et l'historique dans une seule transaction.
Un identifiant de requête et le total déjà reçu protègent les doubles clics,
les reprises réseau et les confirmations depuis deux appareils.

Les pièces reçues passent avant de nouvelles urgences dans l'allocation. Elles
restent réservées pendant la préparation et le débit au départ du livreur. Une
commande contenant encore des pièces en cours ne peut pas être expédiée. Une
entrée manuelle visant un lot ouvert est redirigée vers sa réception. Une quantité
reçue manquante au stock devient une anomalie à vérifier, jamais une nouvelle découpe.

Les fins de couture individuelles historiques sont également transactionnelles
et ne créditent plus le stock une seconde fois. Les anciennes nouvelles demandes
de découpe sont dirigées vers les lots. Les synonymes explicites « Standard » et
« Taille standard » correspondent ; les tailles M et Standard restent distinctes.

Tests : `node --test backend/tests/*.test.js frontend/src/utils/*.test.js`.
Les tests PostgreSQL utilisent PGlite en mémoire et ne créent aucune donnée réelle.
Compiler aussi le frontend et vérifier le parcours de réception dans le navigateur.

## Reprise

Conserver la version précédente et l'index HTML avant publication. Une bascule
échouée avant usage peut rétablir les fichiers précédents. Après le premier lot
réel, ne pas revenir à une interface ignorant les lots : conserver les tables,
repères et protections SQL, puis corriger en avançant. Ne jamais réimporter une
sauvegarde complète sur les ventes intervenues depuis. Les cas physiques ambigus
nécessitent une vérification du responsable avant correction des données.
