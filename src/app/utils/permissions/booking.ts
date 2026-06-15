import { Role } from '@prisma/client'
import { PermissionItem } from './types'

export const bookingPermissions: PermissionItem[] = [
  { key: 'booking.view', name: 'Voir réservations', desc: "Visualiser l'agenda et les réservations du jour.", module: 'reservations_salles', category: 'Salle' },
  { key: 'booking.create', name: 'Créer réservation', desc: 'Enregistrer une table réservée par téléphone ou en ligne.', module: 'reservations_salles', category: 'Salle' },
  { key: 'booking.tables_manage', name: 'Plan de table', desc: "Modifier l'implantation des tables en salle.", module: 'reservations_salles', category: 'Salle' },
  { key: 'booking.settings', name: 'Paramètres réservations', desc: "Définir les plages horaires et la capacité d'accueil.", module: 'reservations_salles', category: 'Configuration' },
  { key: 'booking.cancel', name: 'Annuler réservation', desc: 'Annuler une réservation avec motif.', module: 'reservations_salles', category: 'Actions' },
  { key: 'booking.check_in', name: 'Installer clients', desc: 'Marquer une table comme "Occupée" à l\'arrivée.', module: 'reservations_salles', category: 'Salle' },
  { key: 'booking.notifications', name: 'Rappels automatiques', desc: "Déclencher l'envoi de SMS de confirmation de table.", module: 'reservations_salles', category: 'Actions' },
  { key: 'booking.history', name: "Statistiques d'occupation", desc: "Consulter le taux de remplissage des tables.", module: 'reservations_salles', category: 'Lecture' }
]

export const bookingDefaultPermissions: Record<Role, Record<string, boolean>> = {
  RESTAURATEUR: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': true,
    'booking.settings': true,
    'booking.cancel': true,
    'booking.check_in': true,
    'booking.notifications': true,
    'booking.history': true
  },
  MANAGER: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': true,
    'booking.settings': true,
    'booking.cancel': true,
    'booking.check_in': true,
    'booking.notifications': true,
    'booking.history': true
  },
  CASHIER: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': false,
    'booking.settings': false,
    'booking.cancel': false,
    'booking.check_in': true,
    'booking.notifications': false,
    'booking.history': false
  },
  SERVER: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': false,
    'booking.settings': false,
    'booking.cancel': false,
    'booking.check_in': true,
    'booking.notifications': false,
    'booking.history': false
  },
  KITCHEN: {
    'booking.view': false,
    'booking.create': false,
    'booking.tables_manage': false,
    'booking.settings': false,
    'booking.cancel': false,
    'booking.check_in': false,
    'booking.notifications': false,
    'booking.history': false
  },
  DELIVERY: {
    'booking.view': false,
    'booking.create': false,
    'booking.tables_manage': false,
    'booking.settings': false,
    'booking.cancel': false,
    'booking.check_in': false,
    'booking.notifications': false,
    'booking.history': false
  },
  LIVREUR: {
    'booking.view': false,
    'booking.create': false,
    'booking.tables_manage': false,
    'booking.settings': false,
    'booking.cancel': false,
    'booking.check_in': false,
    'booking.notifications': false,
    'booking.history': false
  },
  ADMIN: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': true,
    'booking.settings': true,
    'booking.cancel': true,
    'booking.check_in': true,
    'booking.notifications': true,
    'booking.history': true
  },
  SUPER_ADMIN: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': true,
    'booking.settings': true,
    'booking.cancel': true,
    'booking.check_in': true,
    'booking.notifications': true,
    'booking.history': true
  },
  STORE_MANAGER: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': true,
    'booking.settings': true,
    'booking.cancel': true,
    'booking.check_in': true,
    'booking.notifications': true,
    'booking.history': true
  },
  STORE_EMPLOYEE: {
    'booking.view': true,
    'booking.create': true,
    'booking.tables_manage': false,
    'booking.settings': false,
    'booking.cancel': false,
    'booking.check_in': true,
    'booking.notifications': false,
    'booking.history': false
  }
}
