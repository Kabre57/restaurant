'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createCustomer(data: {
  firstName: string
  lastName: string
  email?: string
  phone?: string
}) {
  try {
    if (!data.firstName || !data.lastName) {
      return { success: false, error: 'Prénom et Nom sont requis.' }
    }

    const customer = await prisma.customer.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        loyalty: {
          create: { points: 0 }
        }
      }
    })

    revalidatePath('/admin/clients')
    return { success: true, customer }
  } catch (error) {
    console.error("Failed to create customer:", error)
    return { success: false, error: "Impossible de créer le client (Peut-être qu'un client avec ce téléphone existe déjà)." }
  }
}
