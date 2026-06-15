import { prisma } from '@/infrastructure/prisma/client';
import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { Prisma } from '@prisma/client';

export class PayrollRepository {
  private static getClient(tx?: TransactionClient) {
    return tx || prisma;
  }

  static async findPayrollsByStore(storeId: string, userId?: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    const whereClause: Prisma.PayrollWhereInput = { user: { storeId } };
    if (userId) {
      whereClause.userId = userId;
    }

    return client.payroll.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricule: true }
        }
      },
      orderBy: [
        { period: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  static async findClotureMois(storeId: string, period: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.clotureMois.findFirst({
      where: { storeId, period, isClosed: true }
    });
  }

  static async findHrConfiguration(storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.hrConfiguration.findFirst({
      where: { storeId }
    });
  }

  static async findActiveEmployeesWithContracts(storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.findMany({
      where: {
        storeId,
        status: { not: 'INACTIVE' },
        contracts: { some: { status: 'ACTIVE' } }
      },
      include: {
        contracts: { where: { status: 'ACTIVE' }, take: 1 }
      }
    });
  }

  static async findPayrollByEmployeeAndPeriod(userId: string, period: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.payroll.findFirst({
      where: { userId, period }
    });
  }

  static async findPreviousPayrollsInYear(userId: string, periodPattern: string, excludePeriod: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.payroll.findMany({
      where: {
        userId,
        period: {
          startsWith: periodPattern,
          not: excludePeriod
        }
      }
    });
  }

  static async createPayroll(data: Prisma.PayrollUncheckedCreateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.payroll.create({ data });
  }

  static async findPayrollById(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.payroll.findUnique({
      where: { id },
      include: { user: { select: { storeId: true } } }
    });
  }

  static async updatePayroll(id: string, data: Prisma.PayrollUpdateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.payroll.update({
      where: { id },
      data
    });
  }

  static async upsertClotureMois(storeId: string, period: string, isClosed: boolean, closedBy: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.clotureMois.upsert({
      where: {
        storeId_period: { storeId, period }
      },
      update: {
        isClosed,
        closedAt: new Date(),
        closedBy
      },
      create: {
        storeId,
        period,
        isClosed,
        closedBy
      }
    });
  }

  static async updateClotureMois(storeId: string, period: string, isClosed: boolean, closedBy: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.clotureMois.update({
      where: {
        storeId_period: { storeId, period }
      },
      data: {
        isClosed,
        closedAt: new Date(),
        closedBy
      }
    });
  }
}
