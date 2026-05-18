# Plan d'action de mise en conformite - Systeme POS Restaurant

Date: 17 mai 2026  
Objectif: corriger les ecarts non conformes identifies dans le dossier `analyse` et amener le projet vers une version pre-production exploitable.

## 1. Priorites d'execution

### Priorite P0 - Supprimer les mocks visibles

Ces points doivent etre traites en premier, car ils donnent une fausse impression de fonctionnalite terminee.

1. Remplacer les tickets mockes de l'espace support.
2. Remplacer les categories mockees de l'admin.
3. Remplacer l'ecran analytics "en cours de developpement".
4. Supprimer les montants hardcodes dans les finances.

### Priorite P1 - Finaliser les fonctions metier attendues

1. Export PDF/Excel reel.
2. Impression robuste des tickets et factures.
3. Integration materiel minimale: TPE, imprimante ticket, tiroir-caisse.
4. Support reel: creation, suivi, changement de statut des tickets.

### Priorite P2 - Securite, qualite et production

1. Validation Zod des entrees.
2. Rate limiting sur routes sensibles.
3. Tests integration/E2E.
4. Monitoring Sentry.
5. Documentation technique et procedures d'exploitation.

Etat au 18 mai 2026:

- Validation Zod ajoutee sur les entrees publiques et sensibles: appel serveur, paiement mobile, notification paiement, commande externe, webhook Glovo, support et categories admin.
- Rate limiting Redis ajoute sur les routes sensibles exposees.
- Suite E2E Playwright ajoutee et validee sur les routes publiques/protegees et la validation API.
- Monitoring Sentry prepare cote serveur et navigateur via variables d'environnement.
- Documentation d'exploitation creee dans `docs/EXPLOITATION_TECHNIQUE.md`.

## 2. Phase 1 - Suppression des mocks et donnees hardcodees

### 2.1. Support admin reel

Fichier actuel:

- `src/app/admin/support/page.tsx`

Probleme:

- la page contient des tickets hardcodes;
- les statistiques sont fixes;
- les boutons ne sont pas relies a la base de donnees.

Actions:

1. Creer des actions serveur dans `src/app/actions/support.ts`:
   - `getSupportTickets()`;
   - `createSupportTicket(data)`;
   - `updateSupportTicketStatus(id, status)`;
   - `getSupportStats()`.
2. Connecter la page admin support au modele Prisma `SupportTicket`.
3. Ajouter la creation de ticket cote restaurateur si absente.
4. Ajouter les filtres par statut, priorite et restaurant.
5. Supprimer toutes les donnees hardcodees.

Critere de validation:

- un ticket cree en base apparait dans `/admin/support`;
- les compteurs changent selon les vrais tickets;
- le changement de statut persiste apres rechargement.

### 2.2. Categories admin reelles

Fichier actuel:

- `src/app/admin/categories/page.tsx`

Probleme:

- categories en dur;
- images externes hardcodees;
- creation/suppression non connectees a Prisma.

Actions:

1. Remplacer la liste locale par `getCategories()` ou une action dediee multi-sites.
2. Ajouter un select restaurant si le Franchiseur cree une categorie pour un restaurant precis.
3. Brancher creation, modification, suppression sur Prisma.
4. Afficher le nombre reel de produits rattaches.
5. Supprimer les images Unsplash hardcodees.

Critere de validation:

- les categories affichees viennent de PostgreSQL;
- une nouvelle categorie creee apparait apres rechargement;
- la suppression est bloquee si des produits sont rattaches ou geree explicitement.

### 2.3. Analytics admin reel

Fichier actuel:

- `src/app/admin/analytics/page.tsx`

Probleme:

- page placeholder;
- aucune donnee multi-sites exploitable.

Actions:

1. Creer `src/app/actions/analytics.ts`.
2. Ajouter les agregations Prisma:
   - chiffre d'affaires par jour;
   - commandes par restaurant;
   - panier moyen;
   - produits les plus vendus;
   - repartition des paiements;
   - delais moyens de preparation;
   - evolution des commissions.
3. Creer une interface admin analytics avec cartes, tableaux et graphiques simples.
4. Ajouter filtres:
   - periode;
   - restaurant;
   - mode de paiement;
   - statut commande.

Critere de validation:

- `/admin/analytics` n'affiche plus de placeholder;
- les chiffres correspondent aux commandes en base;
- les filtres changent les resultats.

### 2.4. Finances sans valeurs fixes

Fichier actuel:

- `src/app/admin/finances/page.tsx`

Probleme:

- commission affichee a `10%` alors que le modele `Store.commission` peut etre `15%` ou autre;
- "Versements Restants", "Prochain Versement" et certaines tendances sont fixes;
- export PDF visible mais non fonctionnel.

Actions:

1. Renforcer `src/app/actions/finances.ts`.
2. Calculer:
   - volume total paye;
   - commissions par restaurant selon `Store.commission`;
   - montant net restaurateur;
   - montant restant a reverser;
   - transactions recentes;
   - repartition par mode de paiement.
3. Remplacer les valeurs fixes par des resultats reels.
4. Ajouter une table de versements si le besoin de reversement est confirme:
   - `Payout`;
   - statut `PENDING`, `PAID`, `FAILED`;
   - montant brut, commission, montant net.

Critere de validation:

- aucune valeur financiere n'est hardcodee;
- les commissions suivent le taux de chaque restaurant;
- les totaux correspondent aux paiements `REUSSIE`.

## 3. Phase 2 - Exports PDF et Excel reels

### Objectif

Permettre au Franchiseur et au Manager d'exporter les rapports attendus dans le cahier des charges.

Actions:

1. Ajouter des endpoints d'export:
   - `src/app/api/exports/sales/route.ts`;
   - `src/app/api/exports/finances/route.ts`;
   - `src/app/api/exports/stocks/route.ts`.
2. Ajouter les formats:
   - CSV dans un premier temps;
   - Excel via `xlsx` ou equivalent;
   - PDF via generation serveur ou HTML print propre.
3. Ajouter les filtres:
   - restaurant;
   - periode;
   - statut;
   - mode de paiement.
4. Brancher les boutons existants.

Critere de validation:

- cliquer sur export telecharge un fichier;
- le fichier contient les vraies donnees;
- les totaux exportes correspondent aux totaux affiches.

## 4. Phase 3 - Tickets, factures et impression

### 4.1. Recu navigateur robuste

Fichiers concernes:

- `src/components/pos/subcomponents/ReceiptModal.tsx`
- nouveaux styles print dans `src/app/globals.css`

Actions:

1. Ajouter un bouton `Imprimer`.
2. Ajouter une feuille CSS `@media print`.
3. Generer une mise en page 80mm compatible imprimante thermique.
4. Inclure:
   - nom restaurant;
   - date;
   - numero commande;
   - table;
   - articles;
   - total;
   - mode de paiement;
   - statut paiement.

Critere de validation:

- l'impression navigateur sort un ticket propre;
- aucun element UI parasite n'apparait sur le ticket.

### 4.2. Integration imprimante et tiroir-caisse

Actions:

1. Definir un module materiel:
   - `src/lib/hardware/printer.ts`;
   - `src/lib/hardware/cash-drawer.ts`;
   - `src/lib/hardware/payment-terminal.ts`.
2. Prevoir deux modes:
   - mode navigateur: `window.print()`;
   - mode passerelle locale: appel HTTP vers un agent local.
3. Ajouter une configuration restaurant:
   - imprimante active;
   - URL agent local;
   - ouverture tiroir apres paiement especes.

Critere de validation:

- en mode navigateur, le ticket s'imprime;
- en mode agent local, l'application appelle l'URL configuree;
- le tiroir-caisse ne s'ouvre qu'apres paiement especes reussi.

## 5. Phase 4 - Integration materiel TPE

### Objectif

Preparer l'application pour terminaux de paiement et paiements cartes/mobile money.

Actions:

1. Creer une abstraction paiement:
   - `src/lib/payments/payment-provider.ts`;
   - `src/lib/payments/cinetpay-provider.ts`;
   - futur `terminal-provider.ts`.
2. Normaliser les statuts:
   - `EN_ATTENTE`;
   - `REUSSIE`;
   - `ECHOUEE`;
   - `REMBOURSEE`.
3. Ajouter une configuration par restaurant:
   - fournisseur mobile money;
   - terminal CB;
   - URL callback;
   - cle publique ou identifiant marchand.
4. Journaliser les tentatives de paiement.

Critere de validation:

- le POS ne depend pas directement d'un fournisseur unique;
- CinetPay reste branche via l'interface commune;
- un futur TPE peut etre ajoute sans modifier le flux caisse.

## 6. Phase 5 - Securite et validation

### 6.1. Zod generalise

Actions:

1. Installer `zod`.
2. Creer `src/lib/validation`.
3. Ajouter des schemas pour:
   - commandes;
   - paiements;
   - restaurants;
   - utilisateurs;
   - produits;
   - categories;
   - reservations;
   - tickets support.
4. Utiliser ces schemas dans:
   - Server Actions;
   - API routes;
   - callbacks paiement;
   - webhooks externes.

Critere de validation:

- une entree invalide retourne une erreur propre;
- aucune action sensible n'accepte un objet non valide.

### 6.2. Rate limiting

Actions:

1. Ajouter un utilitaire `src/lib/rate-limit.ts`.
2. Appliquer sur:
   - login;
   - creation commande publique Carte/Menu;
   - appel serveur;
   - paiement mobile;
   - webhooks externes;
   - creation de comptes.
3. Stocker les compteurs dans Redis.

Critere de validation:

- trop de requetes successives retourne `429`;
- les routes publiques ne peuvent pas etre spammees.

### 6.3. Renforcement droits d'acces

Actions:

1. Ajouter des helpers:
   - `requireAdmin()`;
   - `requireStoreUser(storeId)`;
   - `requireRestaurateur()`.
2. Verifier les permissions dans toutes les Server Actions sensibles.
3. Bloquer les operations multi-sites pour un manager restaurant.

Critere de validation:

- un manager ne peut pas modifier un autre restaurant;
- un utilisateur non admin ne peut pas creer de Franchiseur.

## 7. Phase 6 - Tests d'integration et E2E

### Objectif

Valider les flux critiques du cahier des charges.

Actions:

1. Ajouter Playwright.
2. Ajouter tests E2E:
   - connexion Franchiseur;
   - creation restaurant + manager;
   - creation produits/categories;
   - creation table + ouverture Carte/Menu;
   - commande client depuis table;
   - reception KDS;
   - commande prete;
   - serveur marque servie;
   - encaissement final;
   - table liberee apres paiement;
   - reservation bloquante;
   - export finances.
3. Ajouter tests integration Server Actions:
   - creation commande;
   - sync offline batch;
   - paiement;
   - promotions;
   - support.

Critere de validation:

- `npm run test:e2e` passe;
- les flux critiques sont rejouables automatiquement.

## 8. Phase 7 - Monitoring et production

### Sentry

Actions:

1. Installer et configurer Sentry pour Next.js.
2. Ajouter:
   - capture erreurs serveur;
   - capture erreurs client;
   - traces des API critiques;
   - tags `storeId`, `role`, `route`.
3. Masquer les donnees sensibles:
   - mots de passe;
   - tokens paiement;
   - numeros complets.

Critere de validation:

- une erreur volontaire remonte dans Sentry;
- les erreurs contiennent le contexte sans donnees sensibles.

### Logs metier

Actions:

1. Ajouter une table ou un flux `AuditLog`.
2. Journaliser:
   - creation restaurant;
   - creation compte;
   - paiement;
   - changement statut commande;
   - export financier;
   - modification stock.

Critere de validation:

- les actions sensibles sont tracables.

## 9. Ordre recommande de realisation

### Sprint Correctif 1 - Anti-mock

1. Support reel.
2. Categories admin reelles.
3. Analytics reel minimal.
4. Finances sans hardcode.

Livrable:

- plus aucun mock visible dans les espaces admin critiques.

### Sprint Correctif 2 - Reporting et documents

1. Export CSV/Excel.
2. Export PDF.
3. Recu imprimable.
4. Documentation d'impression.

Livrable:

- rapports telechargeables et tickets imprimables.

### Sprint Correctif 3 - Materiel et paiement

1. Abstraction paiement.
2. Abstraction imprimante.
3. Agent local optionnel.
4. Configuration materiel par restaurant.

Livrable:

- base technique pour imprimantes, tiroirs-caisses et TPE.

### Sprint Correctif 4 - Securite et robustesse

1. Zod.
2. Rate limiting Redis.
3. Helpers d'autorisation.
4. Audit logs.

Livrable:

- entrees validees et routes sensibles protegees.

### Sprint Correctif 5 - Tests et monitoring

1. Playwright.
2. Tests E2E des flux principaux.
3. Sentry.
4. Verification pre-production.

Livrable:

- pipeline de validation exploitable avant deploiement.

## 10. Definition de termine

Le projet sera considere conforme au dossier `analyse` lorsque:

1. aucune page critique n'utilise de donnees mockees;
2. les rapports et exports fonctionnent;
3. les tickets/factures sont imprimables;
4. les flux materiels sont au moins abstraits et configurables;
5. les entrees sensibles sont validees;
6. les routes publiques et sensibles sont limitees;
7. les tests E2E couvrent le parcours commande complet;
8. le monitoring remonte les erreurs;
9. le manuel utilisateur et la documentation technique sont a jour.
