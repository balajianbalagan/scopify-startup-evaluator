import { API_BASE_URL } from '@/lib/api';

const BENCHMARK_AGENT_URL =
  process.env.NEXT_PUBLIC_BENCHMARK_AGENT_URL ||
  'https://benchmark-agent-634194827064.us-central1.run.app';

/**
 * Service to call:
 * curl --location '<API>/bigquery/process-document' \
 *   --form 'file=@"/path/to/file.pdf"'
 */
class BigQueryService {
  private getAuthHeader(): HeadersInit {
    // Optional Authorization header (kept consistent with agentService template)
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Process a PDF document using multipart/form-data.
   * Pass a File from an <input type="file">.
   */
  async processDocument(file: File): Promise<any> {
    if (!file) throw new Error('No file provided');
    const form = new FormData();
    form.append('file', file, file.name);

    const res = await fetch(`${API_BASE_URL}/bigquery/process-document`, {
      method: 'POST',
      headers: {
        // Do not set Content-Type manually; the browser will add the boundary.
        ...this.getAuthHeader(),
        accept: 'application/json',
      },
      body: form,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      let message = 'BigQuery process-document failed';
      try {
        const j = JSON.parse(errBody);
        message = j.detail || j.message || message;
      } catch {
        if (errBody) message = `${message}: ${errBody}`;
      }
      throw new Error(message);
    }

    return res.json();
  }

  async getDocumentsByCompany(companyName: string): Promise<any[]> {
    if (!companyName) throw new Error('companyName is required');
    const url = new URL(`${API_BASE_URL}/bigquery/documents`);
    url.searchParams.set('company_name', companyName);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeader(),
        accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      let message = 'BigQuery get-documents failed';
      try {
        const j = JSON.parse(errBody);
        message = j.detail || j.message || message;
      } catch {
        if (errBody) message = `${message}: ${errBody}`;
      }
      throw new Error(message);
    }

    return res.json();
  }

  /**
   * Optional helper if you already have a Blob (e.g., from fetch or canvas).
   */
  async processDocumentBlob(blob: Blob, filename = 'document.pdf'): Promise<any> {
    const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
    return this.processDocument(file);
  }
}

export const bigQueryService = new BigQueryService();