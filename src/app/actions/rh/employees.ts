'use server'

import { Prisma, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { requireAuth, assertSameStore } from '@/lib/auth-guard'
import { StaffRepository } from '@/modules/staff/repositories/staff.repository'

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
  dateNaissance?:  Date | null
  nationalite?:    string
  address?:        string
  phone?:          string
  salary?:         number
  contractType?:   string
  hireDate?:       Date | null
  status?:         string

  cnpsNumber?:     string
  bankName?:       string
  bankAccount?:    string
}

export async function getEmployees() {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const employees = await StaffRepository.findEmployeesByStore(storeId)
    return { success: true, employees }
  } catch (error) {
    console.error("Failed to fetch employees:", error)
    return { success: false, error: 'Impossible de récupérer les employés.' }
  }
}

export async function getEmployeeById(id: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    const employee = await StaffRepository.findEmployeeById(id)

    if (!employee) {
      return { success: false, error: 'Employé non trouvé.' }
    }

    // Isolation multi-tenant : vérifier que l'employé appartient au store
    assertSameStore(employee.storeId, storeId, "Employé")

    return { success: true, employee }
  } catch (error) {
    console.error("Failed to fetch employee:", error)
    return { success: false, error: 'Employé non trouvé.' }
  }
}

export async function createEmployee(data: EmployeeData) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    if (!data.name || !data.email || !data.password) {
      return { success: false, error: 'Nom, email et mot de passe sont requis.' }
    }

    const existingUser = await StaffRepository.findUserByEmail(data.email.trim().toLowerCase())

    if (existingUser) {
      return { success: false, error: 'Cet email est déjà utilisé.' }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const newEmployee = await StaffRepository.createEmployee({
      storeId, // ✅ Utilise le storeId de la session, jamais du client
      name:     data.name.trim(),
      email:    data.email.trim().toLowerCase(),
      password: hashedPassword,
      role: (data.role as Role | undefined) || Role.CASHIER,

      matricule:     data.matricule,
      civilite:      data.civilite,
      sexe:          data.sexe,
      dateNaissance: data.dateNaissance,
      nationalite:   data.nationalite,
      address:       data.address,
      phone:         data.phone,
      salary:       data.salary,
      contractType: data.contractType,
      hireDate:     data.hireDate,
      status:       data.status || 'ACTIVE',

      cnpsNumber:  data.cnpsNumber,
      bankName:    data.bankName,
      bankAccount: data.bankAccount,
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
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    // Vérifier que l'employé appartient au store avant modification
    const existing = await StaffRepository.findEmployeeStoreId(id)
    if (!existing) return { success: false, error: 'Employé non trouvé.' }
    assertSameStore(existing.storeId, storeId, "Employé")

    const updateData: Prisma.UserUpdateInput = {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role as Role | undefined,
      matricule: data.matricule,
      civilite: data.civilite,
      sexe: data.sexe,
      dateNaissance: data.dateNaissance,
      nationalite: data.nationalite,
      address: data.address,
      phone: data.phone,
      salary: data.salary,
      contractType: data.contractType,
      hireDate: data.hireDate,
      status: data.status,
      cnpsNumber: data.cnpsNumber,
      bankName: data.bankName,
      bankAccount: data.bankAccount,
    }
    
    if (data.email) {
      updateData.email = data.email.trim().toLowerCase()
    }
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    const updatedEmployee = await StaffRepository.updateEmployee(id, updateData)

    revalidatePath('/restaurateur/rh/effectifs')
    revalidatePath(`/restaurateur/rh/effectifs/${id}`)

    return { success: true, employee: updatedEmployee }
  } catch (error) {
    console.error("Failed to update employee:", error)
    return { success: false, error: 'Erreur lors de la mise à jour de l\'employé.' }
  }
}

export async function deleteEmployee(id: string) {
  const { storeId } = await requireAuth(["ADMIN", "RESTAURATEUR", "MANAGER"])

  try {
    // Vérifier que l'employé appartient au store avant suppression
    const existing = await StaffRepository.findEmployeeStoreId(id)
    if (!existing) return { success: false, error: 'Employé non trouvé.' }
    assertSameStore(existing.storeId, storeId, "Employé")

    await StaffRepository.deleteEmployee(id)
    
    revalidatePath('/restaurateur/rh/effectifs')
    
    return { success: true }
  } catch (error) {
    console.error("Failed to delete employee:", error)
    return { success: false, error: 'Impossible de supprimer cet employé (il a peut-être des contrats ou bulletins liés).' }
  }
}
