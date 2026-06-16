# Structure de notre projet POS Restaurant

```text
restaurant/
├── .env                          
├── .gitignore                    
├── DOCUMENTATION.md              
├── Dockerfile                    
├── GUIDE_FORMATION.md            
├── README.md                     
├── docker-compose.yml              # Configuration Docker locale
├── docker-entrypoint.sh          
├── docker-entrypoint.shy         
├── eslint.config.mjs             
├── middleware.ts                   # Middleware (auth, routing)
├── next-env.d.ts                 
├── next.config.ts                  # Configuration Next.js
├── package-lock.json             
├── package.json                    # Dépendances du projet
├── playwright.config.ts          
├── postcss.config.mjs            
├── project_structure.md          
├── reset_pass.js                 
├── sentry.client.config.ts       
├── sentry.server.config.ts       
├── temp_check.js                 
├── temp_check_db.js              
├── temp_list_all.js              
├── temp_list_users.js            
├── temp_test_order.js            
├── test_pass.js                  
├── tsconfig.json                 
├── tsconfig.tsbuildinfo          
├── update-db.sh                  
├── vitest.config.ts              
├── 📁 .github/                      # Configuration GitHub
│   ├── 📁 workflows/                    # Workflows CI/CD
│   │   └── ci.yml                          # Tests automatisés
├── 📁 k8s/                          # Manifestes Kubernetes
│   ├── app-deployment.yaml           
│   ├── app-service.yaml              
│   ├── namespace.yaml                
│   ├── postgres-statefulset.yaml     
│   ├── redis-deployment.yaml         
│   └── secret.yaml                   
├── 📁 prisma/                       # Base de données ORM
│   ├── schema.prisma                   # Schéma de base de données
│   ├── seed.ts                       
│   ├── 📁 migrations/                 
│   │   ├── migration_lock.toml           
│   │   ├── 📁 20260508004123_init/        
│   │   │   └── migration.sql                 
│   │   ├── 📁 20260510235900_add_order_payments/
│   │   │   └── migration.sql                 
│   │   ├── 📁 20260512221000_external_delivery_integrations/
│   │   │   └── migration.sql                 
│   │   ├── 📁 20260513101500_add_server_role_and_prep_timing/
│   │   │   └── migration.sql                 
├── 📁 public/                       # Fichiers statiques
│   ├── file.svg                      
│   ├── globe.svg                     
│   ├── manifest.json                 
│   ├── next.svg                      
│   ├── restaurant-interior.jpg       
│   ├── sw.js                         
│   ├── vercel.svg                    
│   ├── window.svg                    
│   ├── workbox-c18c662b.js           
│   ├── 📁 sounds/                     
│   │   └── notification.mp3              
├── 📁 scripts/                    
│   ├── apply-rls.js                  
│   ├── backup.sh                     
│   └── benchmark-db.js               
├── 📁 src/                          # Code source de l'application
│   ├── instrumentation.ts            
│   ├── proxy.ts                      
│   ├── 📁 app/                          # App Router Next.js
│   │   ├── favicon.ico                   
│   │   ├── globals.css                   
│   │   ├── layout.tsx                    
│   │   ├── page.tsx                      
│   │   ├── 📁 actions/                    
│   │   │   ├── admin.ts                      
│   │   │   ├── adminCategories.ts            
│   │   │   ├── analytics.ts                  
│   │   │   ├── clients.ts                    
│   │   │   ├── delivery.ts                   
│   │   │   ├── finances.ts                   
│   │   │   ├── inventory.ts                  
│   │   │   ├── loyalty.ts                    
│   │   │   ├── orderLifecycle.ts             
│   │   │   ├── orderManagement.ts            
│   │   │   ├── orderNotifications.ts         
│   │   │   ├── orders.ts                     
│   │   │   ├── payouts.ts                    
│   │   │   ├── productOptions.ts             
│   │   │   ├── products.ts                   
│   │   │   ├── promotions.ts                 
│   │   │   ├── reservations.ts               
│   │   │   ├── staff.ts                      
│   │   │   ├── storeConfig.ts                
│   │   │   ├── stores.ts                     
│   │   │   ├── superviseur.ts                
│   │   │   ├── support.ts                    
│   │   │   ├── tables.ts                     
│   │   │   ├── users.ts                      
│   │   │   ├── 📁 rh/                         
│   │   │   │   ├── analytics.ts                  
│   │   │   │   ├── configuration.ts              
│   │   │   │   ├── contracts.ts                  
│   │   │   │   ├── employees.ts                  
│   │   │   │   ├── evaluations.ts                
│   │   │   │   ├── leaves.ts                     
│   │   │   │   ├── loans.ts                      
│   │   │   │   └── payroll.ts                    
│   │   ├── 📁 admin/                      
│   │   │   ├── layout.tsx                    
│   │   │   ├── 📁 analytics/                  
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 categories/                 
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 clients/                    
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 commandes/                  
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 config/                     
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 dashboard/                  
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 finances/                   
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 inventaire/                 
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 notifications/              
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 produits/                   
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 profil/                     
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 promotions/                 
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 restaurants/                
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 superviseur/                
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 supervision/                
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 supplements/                
│   │   │   │   ├── AdminSupplementsClient.tsx    
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 support/                    
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 tables/                     
│   │   │   │   ├── AdminTablesClient.tsx         
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 utilisateurs/               
│   │   │   │   └── page.tsx                      
│   │   ├── 📁 api/                          # Routes API
│   │   │   ├── 📁 auth/                       
│   │   │   │   ├── 📁 [...nextauth]/              
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 login/                      
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 logout/                     
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 session/                    
│   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 call-server/                
│   │   │   │   └── route.ts                      
│   │   │   ├── 📁 exports/                    
│   │   │   │   ├── 📁 finances/                   
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 sales/                      
│   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 glovo-webhook/              
│   │   │   │   └── route.ts                      
│   │   │   ├── 📁 hardware/                   
│   │   │   │   ├── 📁 cash-drawer/                
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 payment-terminal/           
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 print/                      
│   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 kds/                        
│   │   │   │   ├── 📁 stream/                     
│   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 orders/                     
│   │   │   │   ├── route.ts                      
│   │   │   │   ├── 📁 [id]/                       
│   │   │   │   │   ├── 📁 status/                     
│   │   │   │   │   │   └── route.ts                      
│   │   │   │   │   ├── 📁 ticket/                     
│   │   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 payments/                   
│   │   │   │   ├── 📁 mobile/                     
│   │   │   │   │   ├── route.ts                      
│   │   │   │   │   ├── 📁 notify/                     
│   │   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 pos/                        
│   │   │   │   ├── 📁 alerts/                     
│   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 remote-order/               
│   │   │   │   └── route.ts                      
│   │   │   ├── 📁 stock/                      
│   │   │   │   ├── 📁 alerts/                     
│   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 tables/                     
│   │   │   │   ├── route.ts                      
│   │   │   │   ├── 📁 [id]/                       
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 events/                     
│   │   │   │   │   └── route.ts                      
│   │   │   ├── 📁 v1/                         
│   │   │   │   ├── 📁 categories/                 
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 orders/                     
│   │   │   │   │   └── route.ts                      
│   │   │   │   ├── 📁 products/                   
│   │   │   │   │   └── route.ts                      
│   │   ├── 📁 espaces/                    
│   │   │   └── page.tsx                      
│   │   ├── 📁 kds/                        
│   │   │   └── page.tsx                      
│   │   ├── 📁 login/                      
│   │   │   └── page.tsx                      
│   │   ├── 📁 menu/                       
│   │   │   ├── page.tsx                      
│   │   │   ├── 📁 [storeId]/                  
│   │   │   │   ├── 📁 [tableId]/                  
│   │   │   │   │   └── page.tsx                      
│   │   ├── 📁 order/                      
│   │   │   ├── 📁 [storeId]/                  
│   │   │   │   ├── 📁 [tableId]/                  
│   │   │   │   │   └── page.tsx                      
│   │   ├── 📁 restaurateur/               
│   │   │   ├── layout.tsx                    
│   │   │   ├── 📁 categories/                 
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 commandes/                  
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 config/                     
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 livraisons/                 
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 produits/                   
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 rh/                         
│   │   │   │   ├── page.tsx                      
│   │   │   │   ├── 📁 avances-prets/              
│   │   │   │   │   └── page.tsx                      
│   │   │   │   ├── 📁 configuration/              
│   │   │   │   │   └── page.tsx                      
│   │   │   │   ├── 📁 conges/                     
│   │   │   │   │   └── page.tsx                      
│   │   │   │   ├── 📁 contrats/                   
│   │   │   │   │   └── page.tsx                      
│   │   │   │   ├── 📁 dashboard/                  
│   │   │   │   │   └── page.tsx                      
│   │   │   │   ├── 📁 effectifs/                  
│   │   │   │   │   └── page.tsx                      
│   │   │   │   ├── 📁 evaluations/                
│   │   │   │   │   └── page.tsx                      
│   │   │   │   ├── 📁 paie/                       
│   │   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 staff/                      
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 stats/                      
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 stocks/                     
│   │   │   │   ├── IngredientsTab.tsx            
│   │   │   │   ├── ProductsTab.tsx               
│   │   │   │   ├── RecipesTab.tsx                
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 supplements/                
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 support/                    
│   │   │   │   └── page.tsx                      
│   │   │   ├── 📁 tables/                     
│   │   │   │   └── page.tsx                      
│   │   ├── 📁 serveur/                    
│   │   │   └── page.tsx                      
│   │   ├── 📁 unauthorized/               
│   │   │   └── page.tsx                      
│   ├── 📁 components/                   # Composants React
│   │   ├── Providers.tsx                 
│   │   ├── 📁 admin/                      
│   │   │   ├── AdminCustomersClient.tsx      
│   │   │   ├── AdminInventoryClient.tsx      
│   │   │   ├── AdminUsersClient.tsx          
│   │   │   ├── FloorPlanDesigner.tsx         
│   │   │   ├── ProductsAdminClient.tsx       
│   │   │   ├── SalesChart.tsx                
│   │   │   ├── 📁 subcomponents/              
│   │   │   │   ├── AddCustomerModal.tsx          
│   │   │   │   ├── AddIngredientModal.tsx        
│   │   │   │   ├── AddProductModal.tsx           
│   │   │   │   ├── AddUserModal.tsx              
│   │   │   │   └── UpdateInventoryModal.tsx      
│   │   ├── 📁 customer/                   
│   │   │   ├── CustomerCartModal.tsx         
│   │   │   ├── CustomerOrderClient.tsx       
│   │   │   ├── CustomerUIBlocks.tsx          
│   │   │   └── ProductCustomizerModal.tsx    
│   │   ├── 📁 kds/                        
│   │   │   ├── KDSClient.tsx                 
│   │   │   └── KDSColumn.tsx                 
│   │   ├── 📁 pos/                        
│   │   │   ├── FloorPlanView.tsx             
│   │   │   ├── POSClient.tsx                 
│   │   │   ├── ReservationModal.tsx          
│   │   │   ├── 📁 hooks/                      
│   │   │   │   ├── serverOrderFlow.ts            
│   │   │   │   ├── usePOSCheckout.helpers.ts     
│   │   │   │   ├── usePOSCheckout.ts             
│   │   │   │   ├── usePOSRealtime.ts             
│   │   │   │   └── usePOSSyncState.ts            
│   │   │   ├── 📁 lib/                          # Utilitaires et services métier
│   │   │   │   ├── payment-types.ts              
│   │   │   │   └── pos-helpers.ts                
│   │   │   ├── 📁 subcomponents/              
│   │   │   │   ├── AlertModal.tsx                
│   │   │   │   ├── CartItem.tsx                  
│   │   │   │   ├── CashierStatsModal.tsx         
│   │   │   │   ├── ConnectionStatus.tsx          
│   │   │   │   ├── Numpad.tsx                    
│   │   │   │   ├── OptionsModal.tsx              
│   │   │   │   ├── POSHeader.tsx                 
│   │   │   │   ├── POSNotificationBell.tsx       
│   │   │   │   ├── POSOrderSidebar.tsx           
│   │   │   │   ├── POSWorkspace.tsx              
│   │   │   │   ├── PaymentModal.tsx              
│   │   │   │   ├── ProductCard.tsx               
│   │   │   │   ├── ReceiptModal.tsx              
│   │   │   │   ├── ReservationsList.tsx          
│   │   │   │   ├── ServerMenuView.tsx            
│   │   │   │   ├── Sidebar.tsx                   
│   │   │   │   ├── TableStatusModal.tsx          
│   │   │   │   ├── 📁 payment-modal/              
│   │   │   │   │   ├── PaymentCashPanel.tsx          
│   │   │   │   │   ├── PaymentCustomerSection.tsx    
│   │   │   │   │   ├── PaymentModeSelector.tsx       
│   │   │   │   │   ├── PaymentPromoSection.tsx       
│   │   │   │   │   ├── PaymentSummaryPanel.tsx       
│   │   │   │   │   └── PaymentTerminalPanel.tsx      
│   │   ├── 📁 rh/                         
│   │   │   ├── ContractModal.tsx             
│   │   │   ├── ContractPrint.tsx             
│   │   │   ├── EmployeeModal.tsx             
│   │   │   ├── EvaluationModal.tsx           
│   │   │   ├── KpiCard.tsx                   
│   │   │   ├── LeaveRequestModal.tsx         
│   │   │   ├── LoanRequestModal.tsx          
│   │   │   ├── PayrollPayslipTemplate.tsx    
│   │   │   └── PrintLayout.tsx               
│   │   ├── 📁 serveur/                    
│   │   │   ├── ServerColumn.tsx              
│   │   │   └── ServerTicketsClient.tsx       
│   │   ├── 📁 ui/                           # Design system
│   │   │   ├── Modal.tsx                     
│   │   │   └── ParabellumCrudTable.tsx       
│   ├── 📁 hooks/                      
│   │   ├── usePrintTicket.ts             
│   │   └── useRealtimeOrders.ts          
│   ├── 📁 lib/                          # Utilitaires et services métier
│   │   ├── api-response.ts               
│   │   ├── auth.ts                       
│   │   ├── client-image.ts               
│   │   ├── db.ts                         
│   │   ├── errors.ts                     
│   │   ├── exports.ts                    
│   │   ├── external-orders.ts            
│   │   ├── idb.ts                        
│   │   ├── orderService.ts               
│   │   ├── prep-estimates.ts             
│   │   ├── printService.ts               
│   │   ├── prisma.ts                     
│   │   ├── rate-limit.ts                 
│   │   ├── redis-sub-manager.ts          
│   │   ├── redis.ts                      
│   │   ├── 📁 hardware/                   
│   │   │   └── agent.ts                      
│   │   ├── 📁 rh/                         
│   │   │   └── ivoryCoastTax.ts              
│   │   ├── 📁 validation/                 
│   │   │   └── schemas.ts                    
│   ├── 📁 shared/                     
│   │   ├── 📁 hooks/                      
│   │   │   └── useEnterpriseLogo.ts          
│   ├── 📁 store/                      
│   │   └── useCart.ts                    
├── 📁 tests/                        # Tests
│   ├── 📁 e2e/                          # Tests End-to-End
│   │   └── pos-flows.spec.ts             
│   ├── 📁 unit/                         # Tests unitaires
│   │   └── loyalty.test.ts               
├── 📁 types/                      
│   └── next-auth.d.ts                
```

## Analyse & Cartographie Détaillée du Projet

Cette section détaille les rôles, les responsabilités de chaque dossier clé et répond aux nuances architecturales du projet **Progi-teck POS**.

---

### 1. Fichiers Générés et Rapports de Tests (`coverage/`)
* **`coverage/` & `.nyc_output/`** *(non commités)* : Contiennent les rapports de couverture de code générés lors de l'exécution des suites de tests unitaires et d'intégration via Vitest.
* **`📁 tests/`** : 
  * `e2e/` : Scénarios complets d'interface (flux de caisse, commande client, cycle KDS) orchestrés par Playwright.
  * `unit/` : Tests de logique métier isolée (calculs de fidélité, fiscalité ivoirienne).

---

### 2. Services : Client (`src/lib/`) vs Server Actions (`src/app/actions/`)
Pour éviter toute redondance et respecter la frontière d'exécution Next.js :
* **Wrappers API Client (`src/lib/`)** : Les fichiers comme `orderService.ts` et `printService.ts` contiennent les appels API client-side, les requêtes `fetch`, les interactions avec le cache `IndexedDB` local et les interfaces d'intégration matérielle.
* **Logique Métier Serveur (`src/app/actions/`)** : Les Server Actions (ex: `orders.ts`, `inventory.ts`, `loyalty.ts`) s'exécutent exclusivement côté serveur. Ils interagissent directement avec la base de données via Prisma, gèrent les transactions complexes, la validation Zod et la sécurité d'accès.

---

### 3. Hooks Personnalisés (`src/hooks/`)
Ce dossier centralise la logique d'état et les effets réutilisables à travers l'application :
* **`usePrintTicket.ts`** : Gère l'envoi asynchrone des requêtes d'impression physique vers l'agent d'impression local.
* **`useRealtimeOrders.ts`** : Établit la connexion SSE (Server-Sent Events) pour la synchronisation en temps réel des flux de commandes.
* **`useCart.ts`** *(sous `src/store/`)* : Hook de gestion d'état global du panier utilisateur basé sur Zustand.

---

### 4. Déclarations de Types (`src/types/`)
* Contient les extensions de types globaux TypeScript pour le projet (ex: `next-auth.d.ts` pour enrichir la session utilisateur avec les rôles et permissions du personnel).
* Les entités métier principales (Order, Product, Ingredient) sont directement dérivées et générées via le client `@prisma/client`.

---

### 5. Fichiers de Documentation de Référence (Racine)
* **`DOCUMENTATION.md`** : Guide technique complet détaillant l'architecture globale, les schémas de base de données, l'infrastructure Kubernetes (`k8s/`) et les API d'intégration matérielle.
* **`GUIDE_FORMATION.md`** : Support opérationnel destiné à la formation des différents profils d'utilisateurs (Caissiers, Serveurs, Chefs de cuisine KDS et Restaurateurs/Gérants).

