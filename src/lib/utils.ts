import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BatchYearRecord {
  batch_year?: string | number;
  batchYear?: string | number;
  year?: string | number;
  [key: string]: unknown;
}

export const normalizeBatchYear = (record: BatchYearRecord | null | undefined): string => {
  return String(record?.batch_year ?? record?.batchYear ?? record?.year ?? '').trim();
};

export const normalizePlacementStatus = (value: unknown): string => {
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return String(obj.placement_status ?? obj.placementStatus ?? '').trim().toLowerCase();
  }
  return String(value ?? '').trim().toLowerCase();
};

interface DepartmentRecord {
  department?: string;
  dept?: string;
  [key: string]: unknown;
}

export const normalizeDepartment = (record: DepartmentRecord | null | undefined): string => {
  return String(record?.department ?? record?.dept ?? '').trim().toUpperCase();
};

export const parsePackageValue = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

interface PlacementRecord {
  batch_year?: string | number;
  batchYear?: string | number;
  year?: string | number;
  company?: string;
  [key: string]: unknown;
}

interface CompanyRecord {
  company_name?: string;
  [key: string]: unknown;
}

export const getFilteredCompaniesForYear = (
  companies: CompanyRecord[],
  placements: PlacementRecord[],
  year: string
): CompanyRecord[] => {
  const isAllYears = !year || year.toLowerCase() === 'all';
  if (isAllYears) return companies;

  const allowedCompanyNames = new Set(
    placements
      .filter((placement: PlacementRecord) => normalizeBatchYear(placement) === year)
      .map((placement: PlacementRecord) => String(placement.company ?? '').trim())
      .filter(Boolean)
  );

  return companies.filter((company: CompanyRecord) =>
    allowedCompanyNames.has(String(company.company_name ?? '').trim())
  );
};

export const mapStatus = (status: string): 'Visiting' | 'Ongoing' | 'Completed' => {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'active' || normalized === 'ongoing') return 'Ongoing';
  return 'Visiting'; // default fallback matching Company.status options
};


