// lib/startupApi.ts
import { API_BASE_URL } from "./api";


export interface Startup {
  id: number;
  name: string;
  website?: string;
  status: string;
  location?: string;
  description?: string;
  industry?: string;
  is_unicorn: boolean;
  founded_year?: number;
  number_of_employees?: number;
  total_funding_raised?: number;
  funding_stage?: string;
  total_valuation?: number;
  arr?: number;
  created_at: string;
}

export interface Company {
  id: number;
  company_name: string;
  ai_generated_info?: any;
  search_query?: string;
  search_timestamp: string;
  created_at: string;
}

export class StartupApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  async getStartups(search?: string, skip: number = 0, limit: number = 50): Promise<Startup[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(search ? { search } : {}),
    });

    const response = await fetch(`${API_BASE_URL}/startup/all?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch startups');
    }

    return response.json();
  }

  async getCompanies(search?: string, skip: number = 0, limit: number = 50): Promise<Company[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(search ? { search } : {}),
    });

    const response = await fetch(`${API_BASE_URL}/company/all?${params}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch companies');
    }

    return response.json();
  }
}

// Export a singleton instance
export const startupApiService = new StartupApiService();
