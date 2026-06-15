import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const dashboardPermissions: PermissionItem[] = [
  { key: 'dashboard.view', name: 'Accès au Dashboard', desc: 'Consulter le tableau de bord principal.', module: 'tableau_de_bord', category: 'Lecture' },
  { key: 'dashboard.read_analytics', name: 'Statistiques & KPIs', desc: "Visualiser les chiffres clés et courbes d'activité.", module: 'tableau_de_bord', category: 'Lecture' },
  { key: 'ANALYTICS_ACCESS', name: 'Rapports & Stats de performance', desc: 'Accéder aux graphiques de ventes journalières et évaluations de marge.', module: 'tableau_de_bord', category: 'Lecture' },
  { key: 'dashboard.margins', name: 'Consulter les marges', desc: 'Afficher les marges par produit et taux de rentabilité.', module: 'tableau_de_bord', category: 'Lecture' },
  { key: 'dashboard.compare', name: 'Comparaison de périodes', desc: "Comparer les ventes d'un mois sur l'autre.", module: 'tableau_de_bord', category: 'Lecture' },
  { key: 'dashboard.export_pdf', name: 'Exporter en PDF', desc: 'Générer des rapports au format PDF professionnel.', module: 'tableau_de_bord', category: 'Actions' },
  { key: 'dashboard.export_excel', name: 'Exporter en Excel', desc: 'Exporter des rapports multi-onglets au format Excel.', module: 'tableau_de_bord', category: 'Actions' }
]

export const dashboardDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    ANALYTICS_ACCESS: true,
    'dashboard.view': true,
    'dashboard.read_analytics': true,
    'dashboard.margins': true,
    'dashboard.compare': true,
    'dashboard.export_pdf': true,
    'dashboard.export_excel': true
  },
  MANAGER: {
    ANALYTICS_ACCESS: true,
    'dashboard.view': true,
    'dashboard.read_analytics': true,
    'dashboard.margins': true,
    'dashboard.compare': true,
    'dashboard.export_pdf': true,
    'dashboard.export_excel': true
  },
  CASHIER: {
    ANALYTICS_ACCESS: false,
    'dashboard.view': false,
    'dashboard.read_analytics': false,
    'dashboard.margins': false,
    'dashboard.compare': false,
    'dashboard.export_pdf': false,
    'dashboard.export_excel': false
  },
  SERVER: {
    ANALYTICS_ACCESS: false,
    'dashboard.view': false,
    'dashboard.read_analytics': false,
    'dashboard.margins': false,
    'dashboard.compare': false,
    'dashboard.export_pdf': false,
    'dashboard.export_excel': false
  },
  KITCHEN: {
    ANALYTICS_ACCESS: false,
    'dashboard.view': false,
    'dashboard.read_analytics': false,
    'dashboard.margins': false,
    'dashboard.compare': false,
    'dashboard.export_pdf': false,
    'dashboard.export_excel': false
  },
  DELIVERY: {
    ANALYTICS_ACCESS: false,
    'dashboard.view': false,
    'dashboard.read_analytics': false,
    'dashboard.margins': false,
    'dashboard.compare': false,
    'dashboard.export_pdf': false,
    'dashboard.export_excel': false
  },
  LIVREUR: {
    ANALYTICS_ACCESS: false,
    'dashboard.view': false,
    'dashboard.read_analytics': false,
    'dashboard.margins': false,
    'dashboard.compare': false,
    'dashboard.export_pdf': false,
    'dashboard.export_excel': false
  },
  ADMIN: {
    ANALYTICS_ACCESS: true,
    'dashboard.view': true,
    'dashboard.read_analytics': true,
    'dashboard.margins': true,
    'dashboard.compare': true,
    'dashboard.export_pdf': true,
    'dashboard.export_excel': true
  },
  SUPER_ADMIN: {
    ANALYTICS_ACCESS: true,
    'dashboard.view': true,
    'dashboard.read_analytics': true,
    'dashboard.margins': true,
    'dashboard.compare': true,
    'dashboard.export_pdf': true,
    'dashboard.export_excel': true
  },
  STORE_MANAGER: {
    ANALYTICS_ACCESS: true,
    'dashboard.view': true,
    'dashboard.read_analytics': true,
    'dashboard.margins': true,
    'dashboard.compare': true,
    'dashboard.export_pdf': true,
    'dashboard.export_excel': true
  },
  STORE_EMPLOYEE: {
    ANALYTICS_ACCESS: false,
    'dashboard.view': false,
    'dashboard.read_analytics': false,
    'dashboard.margins': false,
    'dashboard.compare': false,
    'dashboard.export_pdf': false,
    'dashboard.export_excel': false
  }
}
