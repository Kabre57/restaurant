'use client'

import React from 'react'

interface PayrollPayslipTemplateProps {
  payroll: any
  companyConfig?: any
}

export function PayrollPayslipTemplate({ payroll, companyConfig }: PayrollPayslipTemplateProps) {
  if (!payroll) return null

  // Defaults if companyConfig is not fully set
  const companyName = companyConfig?.nomEntreprise || "Nom de l'entreprise"
  const companyAddress = companyConfig?.adresseSiege || "Adresse non définie"
  const companyPhone = companyConfig?.telephone || "Téléphone non défini"
  const companyCnps = companyConfig?.numeroCnps || "N/A"
  
  const empName = payroll.user?.name || "Employé"
  const empMatricule = payroll.user?.matricule || "N/A"
  const empRole = payroll.user?.role || "N/A"
  const empCnps = payroll.user?.numeroCnps || "N/A"

  const periodParts = payroll.period.split('-')
  const periodLabel = periodParts.length === 2 ? `${periodParts[1]}/${periodParts[0]}` : payroll.period

  return (
    <div className="payslip-print-area bg-white text-black p-8 max-w-4xl mx-auto w-full font-sans">
      {/* En-tête */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest">{companyName}</h1>
          <p className="text-sm mt-1">{companyAddress}</p>
          <p className="text-sm">Tél: {companyPhone}</p>
          <p className="text-sm mt-2 font-bold">N° Employeur CNPS: {companyCnps}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase border-2 border-black p-2 inline-block">
            Bulletin de Paie
          </h2>
          <p className="text-lg font-bold mt-2">Période : {periodLabel}</p>
        </div>
      </div>

      {/* Informations Employé */}
      <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-6">
        <div>
          <p className="text-sm"><span className="font-bold">Nom & Prénoms :</span> {empName}</p>
          <p className="text-sm"><span className="font-bold">Matricule :</span> {empMatricule}</p>
        </div>
        <div>
          <p className="text-sm"><span className="font-bold">Fonction :</span> {empRole}</p>
          <p className="text-sm"><span className="font-bold">N° CNPS Employé :</span> {empCnps}</p>
        </div>
      </div>

      {/* Détail du calcul */}
      <table className="w-full border-collapse border border-black mb-6 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left w-1/2">Désignation</th>
            <th className="border border-black p-2 text-right">Base / Montant</th>
            <th className="border border-black p-2 text-right">Retenues</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2">Salaire de Base</td>
            <td className="border border-black p-2 text-right font-bold">{payroll.baseSalary.toLocaleString()} F</td>
            <td className="border border-black p-2 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-2">Cotisation CNPS (Part Salariale)</td>
            <td className="border border-black p-2 text-right"></td>
            <td className="border border-black p-2 text-right text-red-600 font-bold">{payroll.socialSecurity.toLocaleString()} F</td>
          </tr>
          {/* Espacement pour donner l'apparence d'un vrai bulletin */}
          <tr className="h-32">
            <td className="border-l border-r border-black p-2"></td>
            <td className="border-l border-r border-black p-2"></td>
            <td className="border-l border-r border-black p-2"></td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 border-t-2 border-black">
            <td className="border border-black p-3 font-black text-right uppercase" colSpan={2}>
              Net à Payer
            </td>
            <td className="border border-black p-3 font-black text-right text-lg">
              {payroll.netSalary.toLocaleString()} F
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Pied de page et signatures */}
      <div className="mt-8 flex justify-between text-sm pt-8">
        <div className="text-center w-1/3">
          <p className="font-bold border-t border-black pt-2">L'Employeur</p>
        </div>
        <div className="text-center w-1/3">
          <p className="font-bold border-t border-black pt-2">L'Employé(e)</p>
          <p className="text-xs text-gray-500 mt-1">(Pour acquit)</p>
        </div>
      </div>

      <div className="mt-12 text-xs text-center text-gray-500 border-t border-gray-300 pt-4">
        Ce bulletin de paie est généré électroniquement. Conservez-le sans limitation de durée.
      </div>
    </div>
  )
}
