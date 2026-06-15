import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const settingsPermissions: PermissionItem[] = [
  { key: 'CONFIG_ACCESS', name: 'Configuration Système & Imprimantes', desc: "Modifier les adresses IP des imprimantes locales, jetons d'API et webhook.", module: 'configuration_systeme', category: 'Système' },
  { key: 'admin.users_manage', name: 'Gérer utilisateurs', desc: 'Créer, éditer ou suspendre des comptes de connexion.', module: 'configuration_systeme', category: 'Administration' },
  { key: 'admin.roles_permissions', name: 'Gérer permissions', desc: 'Changer les permissions par défaut liées aux rôles.', module: 'configuration_systeme', category: 'Administration' },
  { key: 'admin.store_edit', name: 'Fiche Établissement', desc: 'Mettre à jour le SIRET, téléphone et logo du restaurant.', module: 'configuration_systeme', category: 'Administration' },
  { key: 'admin.api_tokens', name: "Jetons d'API", desc: 'Générer des clés secrètes pour intégrations tierces.', module: 'configuration_systeme', category: 'Système' },
  { key: 'admin.printers_manage', name: 'Configurer imprimantes', desc: 'Déclarer les imprimantes de tickets thermiques.', module: 'configuration_systeme', category: 'Système' },
  { key: 'admin.rounding_rules', name: 'Arrondis monétaires', desc: "Configurer l'arrondi de caisse pour le rendu de monnaie.", module: 'configuration_systeme', category: 'Configuration' },
  { key: 'admin.security_settings', name: 'Double facteur (2FA)', desc: "Activer l'authentification renforcée obligatoire.", module: 'configuration_systeme', category: 'Configuration' },
  { key: 'admin.audit_logs', name: "Journaux d'audit", desc: "Consulter l'historique des connexions et actions critiques.", module: 'configuration_systeme', category: 'Lecture' },
  { key: 'admin.db_backup', name: 'Sauvegarder base', desc: 'Lancer un export SQL de sécurité de la base.', module: 'configuration_systeme', category: 'Actions' }
]

export const settingsDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    CONFIG_ACCESS: true,
    'admin.users_manage': true,
    'admin.roles_permissions': true,
    'admin.store_edit': true,
    'admin.api_tokens': true,
    'admin.printers_manage': true,
    'admin.rounding_rules': true,
    'admin.security_settings': true,
    'admin.audit_logs': true,
    'admin.db_backup': true
  },
  MANAGER: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': true,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': true,
    'admin.db_backup': false
  },
  CASHIER: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': false,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': false,
    'admin.db_backup': false
  },
  SERVER: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': false,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': false,
    'admin.db_backup': false
  },
  KITCHEN: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': false,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': false,
    'admin.db_backup': false
  },
  DELIVERY: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': false,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': false,
    'admin.db_backup': false
  },
  LIVREUR: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': false,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': false,
    'admin.db_backup': false
  },
  ADMIN: {
    CONFIG_ACCESS: true,
    'admin.users_manage': true,
    'admin.roles_permissions': true,
    'admin.store_edit': true,
    'admin.api_tokens': true,
    'admin.printers_manage': true,
    'admin.rounding_rules': true,
    'admin.security_settings': true,
    'admin.audit_logs': true,
    'admin.db_backup': true
  },
  SUPER_ADMIN: {
    CONFIG_ACCESS: true,
    'admin.users_manage': true,
    'admin.roles_permissions': true,
    'admin.store_edit': true,
    'admin.api_tokens': true,
    'admin.printers_manage': true,
    'admin.rounding_rules': true,
    'admin.security_settings': true,
    'admin.audit_logs': true,
    'admin.db_backup': true
  },
  STORE_MANAGER: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': true,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': true,
    'admin.db_backup': false
  },
  STORE_EMPLOYEE: {
    CONFIG_ACCESS: false,
    'admin.users_manage': false,
    'admin.roles_permissions': false,
    'admin.store_edit': false,
    'admin.api_tokens': false,
    'admin.printers_manage': false,
    'admin.rounding_rules': false,
    'admin.security_settings': false,
    'admin.audit_logs': false,
    'admin.db_backup': false
  }
}
