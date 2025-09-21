import { API_BASE_URL } from "@/lib/api";

class AgentService {
  
  private getAuthHeader(): HeadersInit {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Runs an agent session with a file upload (multipart/form-data).
   * Mirrors:
   * curl --location '<API>/agent/run-session' --header 'Authorization: Bearer <token>' \
   *   --form 'app_name="startup-analyser"' --form 'user_id="123"' --form 'session_id="abc-1"' --form 'file=@"/path/file.pdf"'
   */
  async runSession( userId: string, sessionId: string, file: File): Promise<any> {
    const form = new FormData();
    form.append("user_id", userId);
    form.append("session_id", sessionId);
    form.append("file", file, file.name);

    const res = await fetch(`${API_BASE_URL}/agent/run-session`, {
      method: "POST",
      headers: {
        // Do NOT set Content-Type; the browser will set the proper multipart boundary.
        ...this.getAuthHeader(),
        accept: "application/json",
      },
      body: form,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let message = "Agent run-session failed";
      try {
        const j = JSON.parse(errBody);
        message = j.detail || j.message || message;
      } catch {
        if (errBody) message = `${message}: ${errBody}`;
      }
      throw new Error(message);
    }

    // Response is expected to be JSON
    return res.json();
  }

  async benchmarkResearch(payload: any, companyId: number): Promise<any> {
    const url = `${API_BASE_URL}/agent/benchmark/research?company_id=${encodeURIComponent(companyId)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.getAuthHeader(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let message = "Agent benchmark research failed";
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

  async getBenchmarkResearchProgress(sessionId: string, companyId: number): Promise<any> {
    if (!sessionId) throw new Error('sessionId is required');
    if (!companyId) throw new Error('companyId is required');
    const url = `${API_BASE_URL}/agent/benchmark/research/${encodeURIComponent(sessionId)}/progress?company_id=${encodeURIComponent(companyId)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeader(),
        accept: "application/json",
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let message = "Agent benchmark research progress failed";
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

  async getBenchmarkResearchReport(sessionId: string): Promise<any> {
    if (!sessionId) throw new Error('sessionId is required');
    const url = `${API_BASE_URL}/agent/benchmark/research/${encodeURIComponent(sessionId)}/report`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeader(),
        accept: "application/json",
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let message = "Agent benchmark research report failed";
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

  async runDealNoteSession(userId: string, sessionId: string, payload: any): Promise<any> {
    if (!userId) throw new Error('userId is required');
    if (!sessionId) throw new Error('sessionId is required');
    const url = `${API_BASE_URL}/agent/dealnote/session-run?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(sessionId)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.getAuthHeader(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let message = "Agent dealnote session-run failed";
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
}

export const agentService = new AgentService();