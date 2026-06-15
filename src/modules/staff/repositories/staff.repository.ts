import { prisma } from '@/infrastructure/prisma/client';
import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { Prisma } from '@prisma/client';

export class StaffRepository {
  private static getClient(tx?: TransactionClient) {
    return tx || prisma;
  }

  static async findEmployeesByStore(storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });
  }

  static async findEmployeeById(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.findUnique({
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
    });
  }

  static async findEmployeeStoreId(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.findUnique({
      where: { id },
      select: { storeId: true }
    });
  }

  static async findUserByEmail(email: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.findUnique({
      where: { email }
    });
  }

  static async createEmployee(data: Prisma.UserUncheckedCreateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.create({ data });
  }

  static async updateEmployee(id: string, data: Prisma.UserUpdateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.update({
      where: { id },
      data
    });
  }

  static async deleteEmployee(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.delete({
      where: { id }
    });
  }

  static async countActiveEmployees(storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.user.count({
      where: { storeId, status: { not: 'INACTIVE' } }
    });
  }

  static async countActiveContracts(storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.contract.count({
      where: {
        user: { storeId },
        status: 'ACTIVE'
      }
    });
  }

  static async countExpiringContracts(storeId: string, dateLimit: Date, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.contract.count({
      where: {
        user: { storeId },
        status: 'ACTIVE',
        endDate: {
          lte: dateLimit,
          gte: new Date()
        }
      }
    });
  }

  static async findActiveContractsBaseSalary(storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.contract.findMany({
      where: {
        user: { storeId },
        status: 'ACTIVE'
      },
      select: { baseSalary: true }
    });
  }

  static async countProcessedPayrollsByPeriod(storeId: string, period: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.payroll.count({
      where: {
        user: { storeId },
        period
      }
    });
  }
}
