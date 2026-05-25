'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { useEnterpriseLogo } from '@/shared/hooks/useEnterpriseLogo';

interface ContractPrintProps {
  contract: {
    id: string;
    type: 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE' | string;
    employee: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      address?: string;
      position?: string;
    };
    startDate: string | Date;
    endDate?: string | Date;
    salary?: number;
    workingHours?: string;
    benefits?: string;
    clauses?: string;
    createdAt: string | Date;
  };
  onClose: () => void;
}

const contractTypeLabels: Record<string, string> = {
  CDI: 'Contrat à Durée Indéterminée',
  CDD: 'Contrat à Durée Déterminée',
  STAGE: 'Convention de Stage',
  FREELANCE: 'Contrat de Freelance',
};

export default function ContractPrint({ contract, onClose }: ContractPrintProps) {
  const { companyName } = useEnterpriseLogo();
  const formatDate = (date: string | Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  return (
    <PrintLayout
      title={contractTypeLabels[contract.type] || contract.type}
      subtitle={`N° ${contract.id.slice(0, 8).toUpperCase()}`}
      meta={`Date: ${formatDate(contract.createdAt)}`}
      onClose={onClose}
    >
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase">Entre les soussignés:</h3>

        <div className="mb-6">
          <h4 className="font-bold text-gray-700 mb-2">L'EMPLOYEUR:</h4>
          <div className="pl-4 space-y-1">
            <p className="text-gray-700">
              <span className="font-semibold">Raison sociale:</span> {companyName || 'L\'ENTREPRISE'}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">IDU:</span> CI-2019-0046392 R
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">N° CNPS:</span> 1234567
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Représentée par:</span> Le Gérant
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-gray-700 mb-2">LE SALARIÉ:</h4>
          <div className="pl-4 space-y-1">
            <p className="text-gray-700">
              <span className="font-semibold">Nom et Prénom:</span>{' '}
              {contract.employee.lastName.toUpperCase()} {contract.employee.firstName}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> {contract.employee.email}
            </p>
            {contract.employee.phone && (
              <p className="text-gray-700">
                <span className="font-semibold">Téléphone:</span> {contract.employee.phone}
              </p>
            )}
            {contract.employee.address && (
              <p className="text-gray-700">
                <span className="font-semibold">Adresse:</span> {contract.employee.address}
              </p>
            )}
            {contract.employee.position && (
              <p className="text-gray-700">
                <span className="font-semibold">Poste:</span> {contract.employee.position}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase">Il a été convenu ce qui suit:</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-700 mb-2">Article 1 - Type et durée du contrat</h4>
            <p className="pl-4 text-gray-700">
              Le présent contrat est un <strong>{contractTypeLabels[contract.type] || contract.type}</strong>.
              <br />
              Date de début: <strong>{formatDate(contract.startDate)}</strong>
              {contract.endDate && (
                <>
                  <br />
                  Date de fin: <strong>{formatDate(contract.endDate)}</strong>
                </>
              )}
            </p>
          </div>

          {contract.salary !== undefined && contract.salary !== null && (
            <div>
              <h4 className="font-bold text-gray-700 mb-2">Article 2 - Rémunération</h4>
              <p className="pl-4 text-gray-700">
                La rémunération brute mensuelle est fixée à{' '}
                <strong>{formatCurrency(contract.salary)}</strong>.
              </p>
            </div>
          )}

          {contract.workingHours && (
            <div>
              <h4 className="font-bold text-gray-700 mb-2">Article 3 - Horaires de travail</h4>
              <p className="pl-4 text-gray-700 whitespace-pre-wrap">{contract.workingHours}</p>
            </div>
          )}

          {contract.benefits && (
            <div>
              <h4 className="font-bold text-gray-700 mb-2">Article 4 - Avantages</h4>
              <p className="pl-4 text-gray-700 whitespace-pre-wrap">{contract.benefits}</p>
            </div>
          )}

          {contract.clauses && (
            <div>
              <h4 className="font-bold text-gray-700 mb-2">
                Article 5 - Clauses particulières
              </h4>
              <p className="pl-4 text-gray-700 whitespace-pre-wrap">{contract.clauses}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t-2 border-gray-300">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="font-bold text-gray-700 mb-16">L'EMPLOYEUR</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Signature et cachet</p>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-700 mb-16">LE SALARIÉ</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Signature</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-xs text-gray-600">
          <strong>Mentions légales:</strong> Contrat établi conformément au Code du Travail de
          Côte d'Ivoire. En cas de litige, les parties s'engagent à rechercher une solution
          amiable avant toute procédure judiciaire.
        </p>
      </div>
    </PrintLayout>
  );
}
