'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// Define a type for employee creation/update
export type EmployeeData = {
  name: string
  email: string
  password?: string
  role?: string

  // Champs RH — noms alignés sur le schéma Prisma
  matricule?:      string
  civilite?:       string
  sexe?:           string
  dateNaissance?:  Date | null   // était: dateBirth (n'existe pas dans Prisma)
  nationalite?:    string        // était: nationality
  address?:        string
  phone?:          string
  // personalPhone supprimé (n'existe pas dans Prisma)

  salary?:         number
  contractType?:   string
  hireDate?:       Date | null
  status?:         string

  cnpsNumber?:     string
  bankName?:       string
  bankAccount?:    string        // était: rib (n'existe pas dans Prisma)
}

export async function getEmployees(storeId: string) {
  try {
    const employees = await prisma.user.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    })
    return { success: true, employees }
  } catch (error) {
    console.error("Failed to fetch employees:", error)
    return { success: false, error: 'Impossible de récupérer les employés.' }
  }
}

export async function getEmployeeById(id: string) {
  try {
    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        contracts: true,
        payrolls: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        loans: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })
    return { success: true, employee }
  } catch (error) {
    console.error("Failed to fetch employee:", error)
    return { success: false, error: 'Employé non trouvé.' }
  }
}

export async function createEmployee(storeId: string, data: EmployeeData) {
  try {
    if (!data.name || !data.email || !data.password) {
      return { success: false, error: 'Nom, email et mot de passe sont requis.' }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() }
    })

    if (existingUser) {
      return { success: false, error: 'Cet email est déjà utilisé.' }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const newEmployee = await prisma.user.create({
      data: {
        storeId,
        name:     data.name.trim(),
        email:    data.email.trim().toLowerCase(),
        password: hashedPassword,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: (data.role as any) || 'CASHIER',

        matricule:     data.matricule,
        civilite:      data.civilite,
        sexe:          data.sexe,
        dateNaissance: data.dateNaissance,   // champ Prisma correct
        nationalite:   data.nationalite,     // champ Prisma correct
        address:       data.address,
        phone:         data.phone,
        // personalPhone n'existe pas dans Prisma — supprimé

        salary:       data.salary,
        contractType: data.contractType,
        hireDate:     data.hireDate,
        status:       data.status || 'ACTIVE',

        cnpsNumber:  data.cnpsNumber,
        bankName:    data.bankName,
        bankAccount: data.bankAccount,       // champ Prisma correct
      }
    })

    revalidatePath('/restaurateur/rh/effectifs')
    revalidatePath('/restaurateur/rh/dashboard')

    return { success: true, employee: newEmployee }
  } catch (error) {
    console.error("Failed to create employee:", error)
    return { success: false, error: 'Erreur lors de la création de l\'employé.' }
  }
}

export async function updateEmployee(id: string, data: Partial<EmployeeData>) {
  try {
    const updateData: any = { ...data }
    
    if (data.email) {
      updateData.email = data.email.trim().toLowerCase()
    }
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: updateData
    })

    revalidatePath('/restaurateur/rh/effectifs')
    revalidatePath(`/restaurateur/rh/effectifs/${id}`)

    return { success: true, employee: updatedEmployee }
  } catch (error) {
    console.error("Failed to update employee:", error)
    return { success: false, error: 'Erreur lors de la mise à jour de l\'employé.' }
  }
}

export async function deleteEmployee(id: string) {
  try {
    await prisma.user.delete({
      where: { id }
    })
    
    revalidatePath('/restaurateur/rh/effectifs')
    
    return { success: true }
  } catch (error) {
    console.error("Failed to delete employee:", error)
    return { success: false, error: 'Impossible de supprimer cet employé (il a peut-être des contrats ou bulletins liés).' }
  }
}
