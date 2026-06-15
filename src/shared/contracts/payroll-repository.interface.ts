import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { Prisma } from '@prisma/client';

export interface IPayrollRepository {
  findPayrollsByStore(storeId: string, userId?: string, tx?: TransactionClient): Promise<any[]>;
  findClotureMois(storeId: string, period: string, tx?: TransactionClient): Promise<any>;
  findHrConfiguration(storeId: string, tx?: TransactionClient): Promise<any>;
  findActiveEmployeesWithContracts(storeId: string, tx?: TransactionClient): Promise<any[]>;
  findPayrollByEmployeeAndPeriod(userId: string, period: string, tx?: TransactionClient): Promise<any>;
  findPreviousPayrollsInYear(userId: string, periodPattern: string, excludePeriod: string, tx?: TransactionClient): Promise<any[]>;
  createPayroll(data: Prisma.PayrollUncheckedCreateInput, tx?: TransactionClient): Promise<any>;
  findPayrollById(id: string, tx?: TransactionClient): Promise<any>;
  updatePayroll(id: string, data: Prisma.PayrollUpdateInput, tx?: TransactionClient): Promise<any>;
  upsertClotureMois(storeId: string, period: string, isClosed: boolean, closedBy: string, tx?: TransactionClient): Promise<any>;
  updateClotureMois(storeId: string, period: string, isClosed: boolean, closedBy: string, tx?: TransactionClient): Promise<any>;
}
