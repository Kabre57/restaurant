import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { Prisma } from '@prisma/client';

export interface IStaffRepository {
  findEmployeesByStore(storeId: string, tx?: TransactionClient): Promise<any[]>;
  findEmployeeById(id: string, tx?: TransactionClient): Promise<any>;
  findEmployeeStoreId(id: string, tx?: TransactionClient): Promise<any>;
  findUserByEmail(email: string, tx?: TransactionClient): Promise<any>;
  createEmployee(data: Prisma.UserUncheckedCreateInput, tx?: TransactionClient): Promise<any>;
  updateEmployee(id: string, data: Prisma.UserUpdateInput, tx?: TransactionClient): Promise<any>;
  deleteEmployee(id: string, tx?: TransactionClient): Promise<any>;
  countActiveEmployees(storeId: string, tx?: TransactionClient): Promise<number>;
  countActiveContracts(storeId: string, tx?: TransactionClient): Promise<number>;
  countExpiringContracts(storeId: string, dateLimit: Date, tx?: TransactionClient): Promise<number>;
  findActiveContractsBaseSalary(storeId: string, tx?: TransactionClient): Promise<any[]>;
  countProcessedPayrollsByPeriod(storeId: string, period: string, tx?: TransactionClient): Promise<number>;
}
