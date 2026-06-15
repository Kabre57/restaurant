import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const accountingPermissions: PermissionItem[] = [
  { key: 'accounting.payroll_generate', name: 'Générer bulletins', desc: 'Calculer la paie mensuelle et appliquer les taxes CNPS/ITS.', module: 'comptabilite_paie', category: 'Comptabilité' },
  { key: 'accounting.payroll_pay', name: 'Payer salaires', desc: 'Émettre les ordres de paiement des salaires.', module: 'comptabilite_paie', category: 'Comptabilité' },
  { key: 'accounting.payroll_view', name: 'Consulter bulletins', desc: 'Accéder aux archives des bulletins de paie édités.', module: 'comptabilite_paie', category: 'Comptabilité' },
  { key: 'accounting.closures_view', name: 'Voir clôtures', desc: 'Consulter les clôtures mensuelles archivées.', module: 'comptabilite_paie', category: 'Comptabilité' },
  { key: 'accounting.closures_create', name: 'Clôturer période', desc: "Figer les comptes d'un mois de paie écoulé.", module: 'comptabilite_paie', category: 'Comptabilité' },
  { key: 'accounting.payouts_manage', name: 'Demande décaissement', desc: 'Tracer les retraits de caisse pour frais exceptionnels.', module: 'comptabilite_paie', category: 'Comptabilité' },
  { key: 'accounting.taxes_export', name: 'Déclaration fiscale', desc: 'Exporter les états fiscaux CNPS, IGR et CN.', module: 'comptabilite_paie', category: 'Actions' },
  { key: 'accounting.sales_journal', name: 'Journal de ventes', desc: 'Consulter le récapitulatif des recettes par compte comptable.', module: 'comptabilite_paie', category: 'Lecture' },
  { key: 'accounting.expenses_create', name: 'Déclarer charge', desc: "Saisir les factures d'eau, électricité, loyer.", module: 'comptabilite_paie', category: 'Comptabilité' },
  { key: 'accounting.bank_reconciliation', name: 'Rapprochement bancaire', desc: 'Valider la concordance des extraits de banque.', module: 'comptabilite_paie', category: 'Comptabilité' }
]

export const accountingDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    'accounting.payroll_generate': true,
    'accounting.payroll_pay': true,
    'accounting.payroll_view': true,
    'accounting.closures_view': true,
    'accounting.closures_create': true,
    'accounting.payouts_manage': true,
    'accounting.taxes_export': true,
    'accounting.sales_journal': true,
    'accounting.expenses_create': true,
    'accounting.bank_reconciliation': true
  },
  MANAGER: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': true,
    'accounting.closures_view': true,
    'accounting.closures_create': false,
    'accounting.payouts_manage': true,
    'accounting.taxes_export': false,
    'accounting.sales_journal': true,
    'accounting.expenses_create': true,
    'accounting.bank_reconciliation': false
  },
  CASHIER: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': false,
    'accounting.closures_view': false,
    'accounting.closures_create': false,
    'accounting.payouts_manage': false,
    'accounting.taxes_export': false,
    'accounting.sales_journal': false,
    'accounting.expenses_create': false,
    'accounting.bank_reconciliation': false
  },
  SERVER: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': false,
    'accounting.closures_view': false,
    'accounting.closures_create': false,
    'accounting.payouts_manage': false,
    'accounting.taxes_export': false,
    'accounting.sales_journal': false,
    'accounting.expenses_create': false,
    'accounting.bank_reconciliation': false
  },
  KITCHEN: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': false,
    'accounting.closures_view': false,
    'accounting.closures_create': false,
    'accounting.payouts_manage': false,
    'accounting.taxes_export': false,
    'accounting.sales_journal': false,
    'accounting.expenses_create': false,
    'accounting.bank_reconciliation': false
  },
  DELIVERY: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': false,
    'accounting.closures_view': false,
    'accounting.closures_create': false,
    'accounting.payouts_manage': false,
    'accounting.taxes_export': false,
    'accounting.sales_journal': false,
    'accounting.expenses_create': false,
    'accounting.bank_reconciliation': false
  },
  LIVREUR: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': false,
    'accounting.closures_view': false,
    'accounting.closures_create': false,
    'accounting.payouts_manage': false,
    'accounting.taxes_export': false,
    'accounting.sales_journal': false,
    'accounting.expenses_create': false,
    'accounting.bank_reconciliation': false
  },
  ADMIN: {
    'accounting.payroll_generate': true,
    'accounting.payroll_pay': true,
    'accounting.payroll_view': true,
    'accounting.closures_view': true,
    'accounting.closures_create': true,
    'accounting.payouts_manage': true,
    'accounting.taxes_export': true,
    'accounting.sales_journal': true,
    'accounting.expenses_create': true,
    'accounting.bank_reconciliation': true
  },
  SUPER_ADMIN: {
    'accounting.payroll_generate': true,
    'accounting.payroll_pay': true,
    'accounting.payroll_view': true,
    'accounting.closures_view': true,
    'accounting.closures_create': true,
    'accounting.payouts_manage': true,
    'accounting.taxes_export': true,
    'accounting.sales_journal': true,
    'accounting.expenses_create': true,
    'accounting.bank_reconciliation': true
  },
  STORE_MANAGER: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': true,
    'accounting.closures_view': true,
    'accounting.closures_create': false,
    'accounting.payouts_manage': true,
    'accounting.taxes_export': false,
    'accounting.sales_journal': true,
    'accounting.expenses_create': true,
    'accounting.bank_reconciliation': false
  },
  STORE_EMPLOYEE: {
    'accounting.payroll_generate': false,
    'accounting.payroll_pay': false,
    'accounting.payroll_view': false,
    'accounting.closures_view': false,
    'accounting.closures_create': false,
    'accounting.payouts_manage': false,
    'accounting.taxes_export': false,
    'accounting.sales_journal': false,
    'accounting.expenses_create': false,
    'accounting.bank_reconciliation': false
  }
}
