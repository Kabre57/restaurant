import { ModuleInfo } from './types'

export const MODULES_LIST: ModuleInfo[] = [
  {
    id: 'tableau_de_bord',
    name: 'Tableau de Bord',
    desc: "Suivi des performances, indicateurs clés de vente et rapports d'activité transversaux.",
    pages: [
      { name: 'Dashboard global', path: '/restaurateur/dashboard' },
      { name: 'Rapports avancés', path: '/restaurateur/analytics' }
    ]
  },
  {
    id: 'commercial_pos',
    name: 'Commercial & POS',
    desc: 'Opérations de caisse physiques, prise de commande sur place et gestion du tiroir-caisse.',
    pages: [
      { name: 'Interface Point de Vente (POS)', path: '/cashier' },
      { name: 'Sessions de caisse', path: '/cashier/shifts' }
    ]
  },
  {
    id: 'cuisine_kds',
    name: 'Cuisine (KDS)',
    desc: 'Affichage en cuisine et gestion du flux de préparation des plats en temps réel.',
    pages: [
      { name: 'Écran Cuisine (KDS)', path: '/kitchen' }
    ]
  },
  {
    id: 'stocks_inventaire',
    name: 'Achats & Stocks',
    desc: "Suivi des stocks d'ingrédients et produits, commandes fournisseurs et inventaires.",
    pages: [
      { name: 'Fiche Article & Stock', path: '/restaurateur/stock' },
      { name: 'Commandes Fournisseurs', path: '/restaurateur/stock/orders' },
      { name: 'Mouvements de stock', path: '/restaurateur/stock/movements' }
    ]
  },
  {
    id: 'ressources_humaines',
    name: 'Ressources Humaines',
    desc: 'Dossiers du personnel, fiches de présence, contrats de travail et évaluations.',
    pages: [
      { name: 'Gestion du Personnel', path: '/restaurateur/staff' },
      { name: 'Fiches de Présence', path: '/restaurateur/staff/presences' },
      { name: 'Évaluations', path: '/restaurateur/staff/evaluations' }
    ]
  },
  {
    id: 'comptabilite_paie',
    name: 'Comptabilité & Paie',
    desc: 'Bulletins de paie mensuels des collaborateurs et clôtures comptables de périodes.',
    pages: [
      { name: 'Gestion de la Paie', path: '/restaurateur/payroll' },
      { name: 'Clôtures de mois', path: '/restaurateur/payroll/closures' }
    ]
  },
  {
    id: 'livraison',
    name: 'Gestion des Livraisons',
    desc: 'Prise en charge des livraisons, affectation des livreurs et suivi GPS en direct.',
    pages: [
      { name: 'Suivi des Livraisons', path: '/restaurateur/delivery' }
    ]
  },
  {
    id: 'fidelisation_clients',
    name: 'Fidélisation & CRM',
    desc: 'Gestion des profils clients, fidélisation, cumul de points et codes promotions.',
    pages: [
      { name: 'Fiche Clients & Fidélité', path: '/restaurateur/clients' }
    ]
  },
  {
    id: 'reservations_salles',
    name: 'Réservations & Tables',
    desc: "Gestion des réservations de tables et plan de salle interactif de l'établissement.",
    pages: [
      { name: 'Agenda des Réservations', path: '/restaurateur/bookings' },
      { name: 'Plan de salle', path: '/restaurateur/tables' }
    ]
  },
  {
    id: 'ecommerce_web',
    name: 'E-commerce & Web',
    desc: 'Gestion de la commande en ligne e-commerce, catalogue public et paiements Stripe/OM/MTN.',
    pages: [
      { name: 'Catalogue Public Web', path: '/restaurateur/ecommerce' },
      { name: 'Commandes en ligne', path: '/restaurateur/ecommerce/orders' }
    ]
  },
  {
    id: 'configuration_systeme',
    name: 'Configuration & API',
    desc: "Paramétrage des adresses IP des imprimantes, jetons d'API et webhooks globaux.",
    pages: [
      { name: 'Paramètres généraux', path: '/restaurateur/settings' },
      { name: 'Imprimantes réseau', path: '/restaurateur/settings/printers' },
      { name: 'Intégrations & API', path: '/restaurateur/settings/api' }
    ]
  }
]
