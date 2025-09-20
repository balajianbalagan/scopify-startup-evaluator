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
  pitch_deck_url?: string;
  benchmark_status?: string;
  benchmark_info?: string;
  dealnote_info?: string;
  deal_notes_status?: string;
  created_at: string;
}

export interface CompanyCreate {
  company_name: string;
  ai_generated_info?: any;
  search_query?: string;
  pitch_deck_url?: string;
  benchmark_status?: string;
  benchmark_info?: string;
  dealnote_info?: string;
  deal_notes_status?: string;
}

export interface CompanySearch extends Company {
  requested_by_id?: number;
  updated_at?: string;
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

  buildCompanyPayloadFromAnalysis(
    analysis: any,
    extras?: {
      pitch_deck_url?: string | null;
      benchmark_status?: string | null;
      benchmark_info?: string | null;
      dealnote_info?: string | null;
      deal_notes_status?: string | null;
    }
  ): CompanyCreate {
    const company_name =
      analysis?.named_entities?.organizations?.company?.legal_name?.toString()?.trim();

    if (!company_name) {
      console.error('[startupApi] buildCompanyPayloadFromAnalysis: legal_name missing', {
        path: 'named_entities.organizations.company.legal_name',
      });
      throw new Error("Company legal_name not found in analysis payload.");
    }

    const payload: CompanyCreate = {
      company_name,
      ai_generated_info: analysis,
      search_query: analysis?.extraction_output?.summary?.company_snapshot ?? undefined,
      pitch_deck_url: extras?.pitch_deck_url ?? analysis?.company_info?.pitch_deck_url ?? undefined,
      benchmark_status: extras?.benchmark_status ?? analysis?.company_info?.benchmark_status ?? undefined,
      benchmark_info: extras?.benchmark_info ?? analysis?.company_info?.benchmark_info ?? undefined,
      dealnote_info: extras?.dealnote_info ?? analysis?.company_info?.dealnote_info ?? undefined,
      deal_notes_status: extras?.deal_notes_status ?? analysis?.company_info?.deal_notes_status ?? undefined,
    };

    return payload;
  }

  async createCompany(payload: CompanyCreate): Promise<Company> {
    const url = `${API_BASE_URL}/company/`;
    const startedAt =
      (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    console.log('[startupApi] createCompany: POST', { url, company_name: payload.company_name });

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      const dur =
        ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - startedAt;
      throw networkErr;
    }

    const durationMs =
      ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - startedAt;

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || "Failed to create company");
    }

    const json = await res.json();
    return json;
  }

  async createCompanyFromAnalysis(
    analysis: any,
    extras?: {
      pitch_deck_url?: string | null;
      benchmark_status?: string | null;
      benchmark_info?: string | null;
      dealnote_info?: string | null;
      deal_notes_status?: string | null;
      raw_data?: any;
    }
  ): Promise<Company> {
    console.log('[startupApi] createCompanyFromAnalysis: start');
    const payload = this.buildCompanyPayloadFromAnalysis(analysis, extras);
    return this.createCompany(payload);
  }

  async getMyCompanySearches(skip: number = 0, limit: number = 50): Promise<CompanySearch[]> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });
    const url = `${API_BASE_URL}/company/searches/my?${params}`;
    console.log('[startupApi] getMyCompanySearches: GET', { url, skip, limit });

    const res = await fetch(url, { headers: this.getAuthHeaders() });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      console.error('[startupApi] getMyCompanySearches: failed', { status: res.status, body: msg?.slice(0, 300) });
      throw new Error(msg || 'Failed to fetch my company searches');
    }

    const json = await res.json();
    console.log('[startupApi] getMyCompanySearches: success', { count: Array.isArray(json) ? json.length : 'n/a' });
    return json;
  }

  async getCompanySearch(id: number): Promise<CompanySearch> {
    if (!Number.isFinite(id)) throw new Error('Invalid company search id');
    const url = `${API_BASE_URL}/company/searches/${id}`;
    console.log('[startupApi] getCompanySearch: GET', { url, id });

    const res = await fetch(url, { headers: this.getAuthHeaders() });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      console.error('[startupApi] getCompanySearch: failed', { status: res.status, body: msg?.slice(0, 300) });
      throw new Error(msg || 'Failed to fetch company search');
    }

    const json = await res.json();
    console.log('[startupApi] getCompanySearch: success', { id: json?.id, company_name: json?.company_name });
    return json as CompanySearch;
  }
}

// Export a singleton instance
export const startupApiService = new StartupApiService();
