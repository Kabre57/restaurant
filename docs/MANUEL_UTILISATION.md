# Manuel d'utilisation - Systeme POS Restaurant

Version: 17 mai 2026  
Application locale: `http://localhost:3003`

Ce manuel decrit l'utilisation complete des espaces fonctionnels du systeme POS Restaurant: Franchiseur, Manager, Caissier, Serveur, Cuisine KDS, Carte/Menu client et support.

## 1. Connexion et roles

### Acceder a l'application

1. Ouvrir `http://localhost:3003/login`.
2. Choisir le role correspondant a l'utilisateur.
3. Saisir l'email et le mot de passe.
4. Valider la connexion.

### Roles disponibles

| Role interface | Role technique | Espace | Mission principale |
| --- | --- | --- | --- |
| Franchiseur | `ADMIN` | `/admin/dashboard` | Supervision multi-sites, commissions, validations, support |
| Manager / Restaurateur | `RESTAURATEUR` | `/restaurateur/produits` | Gestion d'un restaurant: menu, tables, personnel, stocks |
| Caissier | `CASHIER` | `/` | Caisse, commandes directes, encaissement |
| Serveur | `SERVER` | `/serveur` | Service en salle, tables, commandes, service client |
| Cuisine | `KITCHEN` | `/kds` | Preparation des commandes et suivi KDS |
| Client | Public | `/menu/{storeId}/{tableId}` | Consultation Carte/Menu et commande depuis une table |

Le role selectionne sur l'ecran de connexion sert a guider l'utilisateur, mais le vrai droit d'acces vient du compte en base de donnees.

## 2. Espace Franchiseur

URL principale: `/admin/dashboard`  
Role requis: `ADMIN`

L'admin de la plateforme est le Franchiseur. Il n'est pas rattache a un restaurant unique: il supervise tous les restaurants de la plateforme.

### Fonctionnalites principales

- Consulter les statistiques globales.
- Superviser plusieurs restaurants.
- Creer des restaurants.
- Creer des comptes Manager pour chaque restaurant.
- Creer d'autres comptes Franchiseur.
- Suivre les commissions par restaurant.
- Consulter les finances et analytics.
- Gerer les promotions plateforme.
- Suivre les validations en attente.
- Gerer le support.

### Tableau de bord

URL: `/admin/dashboard`

Le tableau de bord affiche:

- nombre de commandes;
- nombre de restaurants;
- chiffre d'affaires global;
- commissions generees;
- restaurants les plus performants;
- commandes recentes;
- validations en attente.

Utilisation:

1. Se connecter comme Franchiseur.
2. Ouvrir `Tableau de bord`.
3. Verifier les indicateurs multi-sites.
4. Utiliser les raccourcis du menu lateral pour naviguer vers restaurants, finances ou support.

### Creation d'un restaurant

URL: `/admin/restaurants`

Le Franchiseur peut creer plusieurs restaurants. Chaque restaurant peut avoir son propre manager, ses tables, produits, commandes et commissions.

Etapes:

1. Ouvrir `Restaurants`.
2. Remplir `Nom restaurant`.
3. Renseigner si disponible: adresse, telephone, email restaurant.
4. Definir la commission, par defaut `15%`.
5. Renseigner le compte manager:
   - nom manager;
   - email manager;
   - mot de passe manager.
6. Cliquer sur `Creer le restaurant`.

Resultat:

- le restaurant est cree en base;
- le manager est cree avec le role `RESTAURATEUR`;
- le manager pourra se connecter a l'espace Manager;
- le restaurant apparait dans la liste des restaurants existants.

### Creation d'un compte Franchiseur

URL: `/admin/franchiseurs`

Etapes:

1. Se connecter avec un compte Franchiseur existant.
2. Ouvrir `Franchiseurs`.
3. Remplir:
   - nom complet;
   - email;
   - mot de passe.
4. Cliquer sur `Creer le compte`.

Resultat:

- un compte `ADMIN` est cree;
- ce compte a acces a tous les restaurants;
- il peut gerer les multi-sites, commissions et validations.

### Finances et commissions

URL: `/admin/finances`

Objectif:

- suivre les revenus de la plateforme;
- analyser les commissions;
- verifier les montants generes par restaurant.

Regle metier:

- chaque restaurant possede un taux de commission;
- par defaut, la commission est `15%`;
- les commissions sont calculees sur les commandes finalisees.

### Analytics

URL: `/admin/analytics`

Objectif:

- analyser les performances multi-sites;
- comparer les restaurants;
- identifier les restaurants les plus actifs.

### Promotions plateforme

URL: `/admin/promotions`

Objectif:

- creer ou suivre des promotions;
- associer une promotion a un restaurant;
- permettre l'utilisation de codes promo dans les commandes.

### Support

URL: `/admin/support`

Objectif:

- consulter les tickets ouverts par les restaurants;
- suivre les demandes;
- traiter les problemes operationnels.

## 3. Espace Manager / Restaurateur

URL principale: `/restaurateur/produits`  
Role requis: `RESTAURATEUR`

Le Manager gere un seul restaurant. Il configure le menu, les tables, le personnel, les stocks et les parametres du restaurant.

### Produits

URL: `/restaurateur/produits`

Objectif:

- creer les produits vendus;
- definir les prix;
- associer les produits aux categories;
- definir si un produit est disponible;
- gerer le suivi de stock si active.

Etapes courantes:

1. Ouvrir `Produits`.
2. Ajouter ou modifier un produit.
3. Renseigner le nom, le prix, la categorie et l'image si disponible.
4. Activer ou desactiver la disponibilite.

Bonnes pratiques:

- utiliser des noms courts et lisibles pour la caisse et le client;
- classer les produits par categories;
- desactiver rapidement un produit en rupture.

### Categories

URL: `/restaurateur/categories`

Objectif:

- organiser la Carte/Menu;
- separer entrees, plats, boissons, formules et desserts.

Exemples de categories:

- Entrees;
- Plats principaux;
- Boissons;
- Formules;
- Desserts.

### Tables et Carte/Menu par table

URL: `/restaurateur/tables`

Objectif:

- configurer le plan de salle;
- creer les tables;
- definir capacite et position;
- generer les liens Carte/Menu clients par table.

Important:

- le client ne doit pas ouvrir `/menu/[storeId]/[tableId]`;
- ce lien est seulement un modele;
- le vrai lien est genere dans `/restaurateur/tables`;
- chaque table a son lien `/menu/{storeId}/{tableId}`.

Parcours:

1. Le Manager ouvre `Tables`.
2. Il configure les tables du restaurant.
3. Pour chaque table, il recupere le lien Carte/Menu.
4. Ce lien peut etre imprime en QR code ou pose sur la table.
5. Le client scanne le lien et commande sur la table associee.

Regle metier:

- une commande passee depuis la Carte/Menu est liee a la table;
- la table ne doit pas etre traitee comme libre tant qu'une commande active ou un client assis existe;
- une reservation doit etre visible et prise en compte avant d'installer un client.

### Personnel

URL: `/restaurateur/staff`

Objectif:

- creer les comptes du personnel;
- rattacher les utilisateurs au restaurant;
- attribuer les roles.

Roles possibles:

- `CASHIER`: caisse;
- `SERVER`: service en salle;
- `KITCHEN`: cuisine/KDS;
- `RESTAURATEUR`: manager.

Etapes:

1. Ouvrir `Personnel`.
2. Cliquer sur ajout de membre.
3. Saisir nom, email, mot de passe.
4. Choisir le role.
5. Valider.

### Stocks

URL: `/restaurateur/stocks`

Objectif:

- suivre les quantites disponibles;
- verifier les seuils critiques;
- eviter de vendre un produit en rupture.

Utilisation:

1. Ouvrir `Stocks`.
2. Verifier les produits suivis.
3. Ajuster les quantites si besoin.
4. Surveiller les alertes de seuil.

### Commandes

URL: `/restaurateur/commandes`

Objectif:

- voir l'activite du restaurant;
- suivre les commandes;
- controler les statuts.

### Statistiques

URL: `/restaurateur/stats`

Objectif:

- consulter les performances du restaurant;
- suivre les ventes;
- analyser l'activite par periode.

### Configuration restaurant

URL: `/restaurateur/config`

Objectif:

- modifier les informations du restaurant;
- acceder aux raccourcis de configuration;
- gerer la configuration Carte/Menu.

## 4. Espace Caissier / POS

URL: `/`  
Role requis: `CASHIER` ou `RESTAURATEUR`

L'espace POS sert a prendre des commandes directes, suivre les tables, encaisser et recevoir les notifications.

### Fonctions principales

- selectionner une table;
- ajouter des produits au panier;
- appliquer une promotion;
- valider une commande;
- encaisser une table;
- recevoir les notifications temps reel;
- suivre les commandes pretes;
- traiter les appels serveur.

### Prendre une commande directe

1. Ouvrir l'espace caisse.
2. Choisir une table si la commande est en salle.
3. Ajouter les produits.
4. Verifier le panier.
5. Valider la commande.
6. La commande est envoyee vers le KDS cuisine.

### Encaisser une table

1. Selectionner la table.
2. Ouvrir le detail de commande.
3. Cliquer sur `Encaisser la table`.
4. Choisir le mode de paiement.
5. Valider.

Regle importante:

- si une commande est marquee servie mais pas encore payee, le bouton d'encaissement doit rester disponible;
- la table ne doit etre liberee qu'apres paiement et fin du service.

### Notifications POS

Le POS recoit les alertes suivantes:

- nouvelle commande passee;
- commande prete;
- table reservee;
- appel serveur depuis la Carte/Menu client;
- alerte stock.

Utilisation:

- lire la notification;
- ouvrir la table ou la commande concernee;
- traiter l'action demandee.

## 5. Espace Serveur

URL: `/serveur`  
Role requis: `SERVER` ou `RESTAURATEUR`

Le serveur gere le service en salle. Il voit les tables, les commandes actives et les commandes pretes.

### Fonctions principales

- consulter le plan de salle;
- voir les tables libres, occupees, reservees ou pretes;
- prendre une commande pour une table;
- ajouter des articles;
- marquer une commande comme servie;
- demander l'encaissement;
- recevoir les appels clients.

### Prendre une commande en salle

1. Ouvrir `/serveur`.
2. Selectionner une table libre ou occupee.
3. Ajouter les produits.
4. Valider la commande.
5. La commande part vers le KDS.

### Marquer une commande comme servie

1. Attendre que la cuisine marque la commande comme prete.
2. Ouvrir la table.
3. Cliquer sur `Marquer servie`.
4. Servir le client.

Regle importante:

- `Marquer servie` ne doit pas supprimer l'encaissement;
- si le paiement est encore en attente, la table reste a encaisser;
- la table ne redevient libre qu'apres paiement finalise.

### Reservation et occupation

Avant d'installer un client:

1. verifier si la table est reservee;
2. verifier si une commande active existe;
3. verifier si un client est encore assis;
4. utiliser une autre table si la table n'est pas disponible.

## 6. Espace Cuisine KDS

URL: `/kds`  
Role requis: `KITCHEN` ou `RESTAURATEUR`

Le KDS affiche les commandes a preparer en temps reel.

### Colonnes principales

- Nouvelles commandes;
- En preparation;
- Pret / A servir.

### Traiter une commande

1. La commande arrive dans `Nouvelles commandes`.
2. Le cuisinier accepte ou commence la preparation.
3. La commande passe en `En preparation`.
4. Une fois terminee, elle passe en `Pret / A servir`.
5. Le serveur est notifie que la commande peut etre servie.

### Notifications KDS

Le KDS peut afficher:

- nouvelle commande;
- appel serveur;
- commande prete;
- mise a jour de commande.

### Stations cuisine

Selon la configuration, le KDS peut filtrer par station:

- Tout;
- Cuisine;
- Bar.

Objectif:

- chaque ecran voit les commandes qui le concernent;
- le bar ne traite pas les plats cuisine;
- la cuisine ne traite pas les boissons si une station bar existe.

## 7. Espace Carte/Menu Client

URL generique: `/menu`  
URL reelle par table: `/menu/{storeId}/{tableId}`  
Acces: public, par lien ou QR code.

Cet espace remplace l'appellation "Client QR". Le bon nom fonctionnel est `Carte/Menu`.

### Objectif

Le client consulte:

- entrees;
- plats principaux;
- boissons;
- formules;
- desserts;
- prix;
- disponibilites.

Il peut ensuite commander depuis sa table.

### Parcours client

1. Le client scanne le QR code pose sur la table.
2. Il ouvre la Carte/Menu liee a cette table.
3. Il parcourt les categories.
4. Il ajoute des produits au panier.
5. Il renseigne un code promo si disponible.
6. Il choisit le mode de paiement:
   - payer au comptoir;
   - paiement mobile selon les options configurees.
7. Il confirme la commande.
8. La commande arrive au POS et au KDS.

### Paiement mobile

Les operateurs prevus dans le parcours:

- Wave;
- Orange Money;
- MTN MoMo;
- Moov;
- Tresor Pay.

Pour un paiement mobile:

1. choisir `Mobile Money`;
2. choisir l'operateur;
3. saisir le numero de telephone;
4. confirmer.

La commande conserve les informations de paiement dans le backend.

### Appeler un serveur

Depuis la Carte/Menu, le client peut appeler un serveur.

Resultat:

- une notification est envoyee au POS;
- une notification est envoyee au KDS;
- la table concernee est indiquee.

## 8. Reservations

Les reservations impactent le plan de salle.

### Regles metier

- une table reservee doit etre visible;
- une table reservee ne doit pas etre traitee comme libre sans verification;
- une notification de reservation doit alerter le POS;
- le serveur doit verifier la reservation avant de prendre une commande.

### Cycle conseille

1. Le Manager ou le personnel cree une reservation.
2. La table apparait comme reservee.
3. A l'arrivee du client, le serveur installe le client.
4. La table devient occupee si une commande ou une presence client existe.
5. La table redevient libre seulement apres service et paiement.

## 9. Cycle complet d'une commande

### Commande depuis une table via Carte/Menu

1. Client scanne le lien de table.
2. Client selectionne les produits.
3. Client confirme la commande.
4. La commande est creee en base.
5. Le POS recoit une notification `commande passee`.
6. Le KDS recoit la commande.
7. La cuisine prepare.
8. La cuisine marque la commande `prete`.
9. Le POS et le serveur recoivent une notification `pret`.
10. Le serveur sert la table.
11. Le paiement est encaisse.
12. La commande est finalisee.
13. La table peut redevenir libre.

### Commande prise par serveur

1. Serveur choisit une table.
2. Serveur ajoute les produits.
3. Serveur valide la commande.
4. KDS prepare la commande.
5. Cuisine marque `pret`.
6. Serveur marque `servie`.
7. Caisse encaisse.
8. Table liberee apres paiement.

### Commande directe caisse

1. Caissier ajoute les produits.
2. Caissier valide la commande.
3. Paiement immediate ou en attente selon le flux.
4. KDS prepare si necessaire.
5. Commande finalisee.

## 10. Etats importants

### Table

| Etat | Signification | Action attendue |
| --- | --- | --- |
| Libre | aucune commande active, aucun client assis | disponible |
| Reservee | reservation active | verifier avant installation |
| Occupee | client ou commande active | suivre service |
| Prete | commande prete en cuisine | serveur doit servir |
| A encaisser | commande servie mais paiement en attente | encaisser avant liberation |

### Commande

| Etat | Signification |
| --- | --- |
| Nouvelle | commande creee |
| En preparation | cuisine en cours |
| Prete | cuisine terminee |
| Servie | client servi |
| Payee / Completee | paiement finalise et commande terminee |

## 11. Regles de securite et acces

- `/admin/*` est reserve au role `ADMIN`.
- `/restaurateur/*` est reserve au role `RESTAURATEUR`.
- `/serveur` est accessible a `SERVER` et `RESTAURATEUR`.
- `/kds` est accessible a `KITCHEN` et `RESTAURATEUR`.
- `/` est accessible a `CASHIER` et `RESTAURATEUR`.
- `/menu/{storeId}/{tableId}` est public pour les clients.

Si un utilisateur arrive sur un espace interdit, il est redirige vers la page adaptee.

## 12. Problemes frequents

### La page `/menu/[storeId]/[tableId]` ne montre pas le vrai menu

Cause:

- `[storeId]` et `[tableId]` sont des exemples.

Solution:

1. Se connecter comme Manager.
2. Ouvrir `/restaurateur/tables`.
3. Copier le vrai lien de la table.
4. Utiliser `/menu/{storeId}/{tableId}`.

### Un Franchiseur ne voit pas l'espace admin

Verifier:

- le compte a bien le role `ADMIN`;
- l'utilisateur se connecte depuis `/login`;
- il choisit le profil Franchiseur;
- il n'utilise pas un compte Manager.

### Le Manager ne voit pas ses tables ou produits

Verifier:

- le compte Manager est rattache au bon restaurant;
- le restaurant a ete cree par le Franchiseur;
- les produits et categories existent.

### Une table semble libre alors qu'elle ne devrait pas l'etre

Verifier:

- reservation active;
- commande active;
- commande servie mais non encaissee;
- client encore assis.

### Les notifications n'arrivent pas

Verifier:

- Redis est demarre;
- le navigateur est en ligne;
- l'utilisateur est sur le bon restaurant;
- le KDS/POS est ouvert.

## 13. Comptes de demarrage

Si le seed de developpement a ete execute, un compte admin peut exister:

- Email: `admin@pos.com`
- Mot de passe: `Password123`
- Role: Franchiseur / `ADMIN`

Les autres comptes doivent etre crees depuis:

- Franchiseur: `/admin/franchiseurs`
- Restaurant + Manager: `/admin/restaurants`
- Personnel restaurant: `/restaurateur/staff`

## 14. Resume par acteur

### Franchiseur

- Cree les restaurants.
- Cree les Franchiseurs.
- Suit les commissions.
- Supervise tous les sites.
- Controle validations et support.

### Manager

- Configure son restaurant.
- Cree produits, categories, tables.
- Genere les liens Carte/Menu par table.
- Gere personnel, stocks et statistiques.

### Caissier

- Prend les commandes.
- Encaisse les tables.
- Suit les notifications.
- Finalise les paiements.

### Serveur

- Gere la salle.
- Sert les commandes pretes.
- Ajoute des articles.
- Signale une table servie sans perdre l'encaissement.

### Cuisine

- Recoit les commandes.
- Prepare.
- Marque les commandes pretes.
- Notifie le service.

### Client

- Consulte la Carte/Menu.
- Commande depuis sa table.
- Appelle un serveur.
- Choisit son mode de paiement.
