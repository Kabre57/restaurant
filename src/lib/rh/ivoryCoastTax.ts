export interface SalaryCalculationResult {
  baseSalary: number;
  cnpsSalarial: number;
  its: number;
  contributionNationale: number;
  igr: number;
  totalTaxes: number;
  netSalary: number;
  cnpsPatronal: number;
  employerCost: number;
  bonus13thMonth?: number;
}

type TaxBracket = {
  min: number;
  max?: number;
  rate: number;
  deduction?: number;
}

type TaxPartRule = {
  base: number;
  withChildrenBase: number;
  perChild: number;
}

type TaxPartsConfig = {
  maxParts?: number;
  [status: string]: TaxPartRule | number | undefined;
}

type TaxRatesConfig = {
  cnBrackets?: TaxBracket[];
  igrBrackets?: TaxBracket[];
  partsConfig?: TaxPartsConfig;
}

/**
 * Calcule le nombre de parts fiscales selon le statut marital et le nombre d'enfants (Côte d'Ivoire)
 */
export function calculateTaxParts(
  maritalStatus: string | null | undefined, 
  children: number,
  config?: TaxPartsConfig
): number {
  const status = maritalStatus?.toUpperCase() || 'SINGLE';
  if (!config || Object.keys(config).length === 0) {
    return 1; // Fallback sécuritaire si la base de données n'a pas transmis les règles
  }
  const rules = config;

  const statusRules = (rules[status] || rules['SINGLE']) as TaxPartRule | undefined;
  if (!statusRules) return 1;

  let parts = statusRules.base;
  
  if (children > 0) {
    parts = statusRules.withChildrenBase + (children - 1) * statusRules.perChild;
    // Correction pour la logique ivoirienne exacte si fournie, 
    // ou on utilise la formule base + (children * perChild) 
    // En CI: 1 enfant pour célib = 2 parts, 2 enfants = 2.5 parts
    // withChildrenBase = 2 pour célibataire avec 1 enfant (1.5 + 0.5)
    parts = statusRules.withChildrenBase === statusRules.base 
      ? statusRules.base + children * statusRules.perChild
      : statusRules.withChildrenBase + (children - 1) * statusRules.perChild;
  }
  
  return Math.min(parts, rules.maxParts || 5);
}

/**
 * Calcule le salaire net et les retenues selon la législation de la Côte d'Ivoire.
 * @param baseSalary Salaire brut
 * @param maritalStatus Statut marital (ex: 'SINGLE', 'MARRIED')
 * @param numberOfChildren Nombre d'enfants à charge
 * @param rates Taux configurables de la base de données
 * @param bonus13thMonth Gratification / 13ème mois
 */
export function calculateIvoryCoastSalary(
  baseSalary: number,
  maritalStatus: string | null | undefined = 'SINGLE',
  numberOfChildren: number = 0,
  rates: {
    cnpsEmployeeRate?: number;
    cnpsEmployerRate?: number;
    itsRate?: number;
    baseImposableRate?: number;
    cnpsCeiling?: number;
    igrBaseRate?: number;
    taxRates?: TaxRatesConfig;
  } = {},
  bonus13thMonth: number = 0
): SalaryCalculationResult {
  // Extraction des taux avec valeurs par défaut ivoiriennes
  const cnpsEmployeeRate = (rates.cnpsEmployeeRate ?? 6.3) / 100;
  const cnpsEmployerRate = (rates.cnpsEmployerRate ?? 16.45) / 100;
  const itsRate = (rates.itsRate ?? 1.2) / 100;
  const baseImposableRate = (rates.baseImposableRate ?? 80.0) / 100;
  const cnpsCeiling = rates.cnpsCeiling ?? 1647315;
  const igrBaseRate = (rates.igrBaseRate ?? 85.0) / 100;
  
  const cnBrackets = rates.taxRates?.cnBrackets || [];
  const igrBrackets = rates.taxRates?.igrBrackets || [];
  const partsConfig = rates.taxRates?.partsConfig;

  // Calcul du brut total imposable (Brut mensuel + Gratification/13ème mois)
  const totalBrut = baseSalary + bonus13thMonth;

  // 1. CNPS Salariale (par défaut 6.3% du salaire brut, plafonné à 1 647 315 FCFA)
  const cnpsBase = Math.min(totalBrut, cnpsCeiling);
  const cnpsSalarial = Math.round(cnpsBase * cnpsEmployeeRate);

  // 2. Base imposable (par défaut 80% du salaire brut)
  const baseImposable = totalBrut * baseImposableRate;

  // 3. ITS (Impôt sur les Traitements et Salaires) - par défaut 1.2% de la base imposable
  const its = Math.round(baseImposable * itsRate);

  // 4. CN (Contribution Nationale)
  let contributionNationale = 0;
  for (const bracket of cnBrackets) {
    if (baseImposable > bracket.min) {
      const taxableInBracket = Math.min(baseImposable, bracket.max || Infinity) - bracket.min;
      contributionNationale += taxableInBracket * bracket.rate;
    }
  }
  contributionNationale = Math.round(contributionNationale);

  // 5. IGR (Impôt Général sur le Revenu) avec calcul par parts
  const parts = calculateTaxParts(maritalStatus, numberOfChildren, partsConfig);
  const baseIGR = (baseImposable - its - contributionNationale) * igrBaseRate;
  const q = baseIGR / parts;
  let igrPart = 0;

  // Barème mensuel Q pour l'IGR
  const sortedIgr = [...igrBrackets].sort((a, b) => b.min - a.min);
  for (const bracket of sortedIgr) {
    if (q > bracket.min) {
      igrPart = q * bracket.rate - (bracket.deduction ?? 0);
      break;
    }
  }

  let igr = Math.round(igrPart * parts);
  igr = Math.max(0, igr);

  const totalTaxes = cnpsSalarial + its + contributionNationale + igr;
  const netSalary = totalBrut - totalTaxes;

  const cnpsPatronal = Math.round(cnpsBase * cnpsEmployerRate);
  const employerCost = totalBrut + cnpsPatronal;

  return {
    baseSalary,
    cnpsSalarial,
    its,
    contributionNationale,
    igr,
    totalTaxes,
    netSalary,
    cnpsPatronal,
    employerCost,
    bonus13thMonth
  };
}

