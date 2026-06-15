// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PaiePage from '@/app/restaurateur/rh/paie/page'
import { getPayrolls, generatePayrollForPeriod, markPayrollAsPaid } from '@/app/actions/rh/payroll'
import { useSession } from 'next-auth/react'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

// Mock payroll actions
vi.mock('@/app/actions/rh/payroll', () => ({
  getPayrolls: vi.fn(),
  generatePayrollForPeriod: vi.fn(),
  markPayrollAsPaid: vi.fn(),
}))

// Mock the payslip template component to keep test isolated
vi.mock('@/components/rh/PayrollPayslipTemplate', () => ({
  PayrollPayslipTemplate: () => <div data-testid="payslip-template">Mock Payslip Template</div>,
}))

describe('Composant PaiePage', () => {
  const mockSession = {
    user: {
      id: 'manager-1',
      role: 'RESTAURATEUR',
      storeId: 'store-1',
    },
  }

  const mockPayrolls = [
    {
      id: 'payroll-1',
      period: '2026-06',
      baseSalary: 350000,
      socialSecurity: 19600,
      netSalary: 330400,
      employerCost: 395000,
      paymentStatus: 'PENDING',
      user: {
        name: 'Koffi Yao',
        matricule: 'EMP001',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any)
    vi.mocked(getPayrolls).mockResolvedValue({ success: true, payrolls: mockPayrolls } as any)
  })

  it('doit charger et afficher les bulletins de la période', async () => {
    await act(async () => {
      render(<PaiePage />)
    })

    expect(getPayrolls).toHaveBeenCalled()
    expect(screen.getByText('Koffi Yao')).toBeDefined()
    expect(screen.getByText('EMP001')).toBeDefined()
    expect(screen.getAllByText('330 400 F').length).toBeGreaterThan(0)
    expect(screen.getAllByText('EN ATTENTE').length).toBeGreaterThan(0)
  })

  it('doit appeler generatePayrollForPeriod lors du clic sur le bouton de génération', async () => {
    vi.mocked(generatePayrollForPeriod).mockResolvedValue({ success: true } as any)

    await act(async () => {
      render(<PaiePage />)
    })

    const generateBtn = screen.getByRole('button', { name: /générer bulletins/i })
    await act(async () => {
      fireEvent.click(generateBtn)
    })

    expect(generatePayrollForPeriod).toHaveBeenCalled()
  })

  it('doit appeler markPayrollAsPaid lors du clic sur le bouton de paiement', async () => {
    vi.mocked(markPayrollAsPaid).mockResolvedValue({ success: true } as any)

    await act(async () => {
      render(<PaiePage />)
    })

    const payBtn = screen.getByRole('button', { name: /payer/i })
    await act(async () => {
      fireEvent.click(payBtn)
    })

    expect(markPayrollAsPaid).toHaveBeenCalledWith('payroll-1', 'VIREMENT_MANUEL')
  })

  it('doit ouvrir l\'aperçu du bulletin lors du clic sur Fiche', async () => {
    await act(async () => {
      render(<PaiePage />)
    })

    const ficheBtn = screen.getByRole('button', { name: /fiche/i })
    await act(async () => {
      fireEvent.click(ficheBtn)
    })

    expect(screen.getByText('Aperçu du Bulletin')).toBeDefined()
    expect(screen.getAllByTestId('payslip-template').length).toBeGreaterThan(0)
  })
})
