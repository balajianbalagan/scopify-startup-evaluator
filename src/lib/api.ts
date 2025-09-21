export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fastapi-backend-634194827064.asia-south1.run.app';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  role: string;
}

class ApiService {
  private currentUser: User | null = null;
  private refreshTimerId: number | null = null;

  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Decode JWT to read exp (seconds since epoch)
  private decodeJwt(token: string): { exp?: number } | null {
    try {
      if (typeof window === 'undefined') return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private clearRefreshTimer() {
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  private scheduleAutoRefresh() {
    if (typeof window === 'undefined') return;
    this.clearRefreshTimer();

    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    if (!access || !refresh) return;

    const payload = this.decodeJwt(access);
    const skewMs = 30_000; // refresh 30s early
    // Fallback every 10 minutes if exp missing
    let delayMs = 10 * 60 * 1000;

    if (payload?.exp) {
      delayMs = Math.max(5_000, payload.exp * 1000 - Date.now() - skewMs);
    }

    this.refreshTimerId = window.setTimeout(async () => {
      try {
        await this.refreshToken();
        this.scheduleAutoRefresh(); // reschedule after successful refresh
      } catch (e) {
        console.error('Token auto-refresh failed:', e);
        this.logout();
      }
    }, delayMs);
  }

  // Public controls
  startTokenAutoRefresh() {
    if (this.isAuthenticated()) this.scheduleAutoRefresh();
  }
  stopTokenAutoRefresh() {
    this.clearRefreshTimer();
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    console.log('Attempting login with:', { email: credentials.email });

    try {
      const formData = new FormData();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        this.scheduleAutoRefresh();
      }

      await this.fetchCurrentUser();
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(error.detail || 'Registration failed');
    }

    const user = await response.json();
    this.currentUser = user;
    return user;
  }

  async fetchCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        try {
          await this.refreshToken();
          this.scheduleAutoRefresh();
          return this.fetchCurrentUser();
        } catch {
          this.logout();
          throw new Error('Session expired');
        }
      }
      throw new Error('Failed to get user info');
    }

    const user = await response.json();
    this.currentUser = user;
    return user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async ensureCurrentUser(): Promise<User | null> {
    if (this.currentUser) return this.currentUser;

    if (this.isAuthenticated()) {
      try {
        return await this.fetchCurrentUser();
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        return null;
      }
    }

    return null;
  }

  async refreshToken(): Promise<void> {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Session expired');
    }

    const data = await response.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      this.scheduleAutoRefresh();
    }
  }

  logout(): void {
    this.currentUser = null;
    this.clearRefreshTimer();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  isAuthenticated(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('access_token');
    // Optionally, check token expiry via decodeJwt for stricter validation.
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  getUserInitials(user: User): string {
    if (user.email) {
      const emailParts = user.email.split('@')[0];
      return emailParts.slice(0, 2).toUpperCase();
    }
    return 'U';
  }

  getDisplayName(user: User): string {
    if (user.email) {
      const emailParts = user.email.split('@')[0];
      return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
    }
    return 'User';
  }
}

export const apiService = new ApiService();