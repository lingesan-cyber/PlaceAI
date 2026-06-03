import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const normalizeBatchYear = (record: any): string => {
  return String(record?.batch_year ?? record?.batchYear ?? record?.year ?? '').trim();
};

export const normalizePlacementStatus = (value: any): string => {
  if (typeof value === 'object' && value !== null) {
    return String(value?.placement_status ?? value?.placementStatus ?? '').trim().toLowerCase();
  }
  return String(value ?? '').trim().toLowerCase();
};

export const normalizeDepartment = (record: any): string => {
  return String(record?.department ?? record?.dept ?? '').trim().toUpperCase();
};

export const parsePackageValue = (value: any): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getFilteredCompaniesForYear = (companies: any[], placements: any[], year: string): any[] => {
  const isAllYears = !year || year.toLowerCase() === 'all';
  if (isAllYears) return companies;

  const allowedCompanyNames = new Set(
    placements
      .filter((placement: any) => normalizeBatchYear(placement) === year)
      .map((placement: any) => String(placement.company ?? '').trim())
      .filter(Boolean)
  );

  return companies.filter((company: any) =>
    allowedCompanyNames.has(String(company.company_name ?? '').trim())
  );
};

export const mapStatus = (status: string): 'Visiting' | 'Ongoing' | 'Completed' => {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'active' || normalized === 'ongoing') return 'Ongoing';
  return 'Visiting'; // default fallback matching Company.status options
};

