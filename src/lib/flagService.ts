export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// flagService.ts
export interface CompanyFlag {
  flag_type: string;
  flag_description: string;
  risk_level: string;
  status: string;
}

export function getActiveFlags(flags: CompanyFlag[]) {
  return flags.filter(flag => flag.status === 'raised');
}
