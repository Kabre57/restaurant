'use server';

import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Adresse e-mail invalide').trim().toLowerCase(),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  companyName: z.string().min(2, 'Le nom de la société doit contenir au moins 2 caractères').trim(),
  country: z.string().min(2).default("Côte d'Ivoire"),
});

export async function registerStore(rawData: unknown) {
  try {
    const validated = registerSchema.parse(rawData);

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true },
    });

    if (existingUser) {
      return { success: false, error: 'Cette adresse e-mail est déjà associée à un compte.' };
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // Créer le magasin (Store) et l'utilisateur (User) avec le rôle RESTAURATEUR
    const store = await prisma.store.create({
      data: {
        name: validated.companyName,
        address: validated.country, // On peut mettre le pays dans l'adresse par défaut
        users: {
          create: {
            name: 'Propriétaire ' + validated.companyName,
            email: validated.email,
            password: hashedPassword,
            role: 'RESTAURATEUR',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        users: true,
      },
    });

    return {
      success: true,
      store: {
        id: store.id,
        name: store.name,
      },
      user: {
        id: store.users[0].id,
        email: store.users[0].email,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error('[Registration Error]:', error);
    return { success: false, error: 'Une erreur est survenue lors de la création de votre compte.' };
  }
}
