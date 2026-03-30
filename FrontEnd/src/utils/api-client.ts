// app/utils/api-client.ts

import { apiConfig } from './api-config';

const AUTH_STORAGE_KEY = 'authStorage';
type StorageMode = 'local' | 'session';

interface FetchOptions extends RequestInit {
  skipInterceptor?: boolean;
  retryAlternateLocalhost?: boolean;
  /** Suppress console.error for expected 404s / optional endpoints */
  silent?: boolean;
}

class ApiClient {
  async request<T>(
    url: string,
    options: FetchOptions = {},
  ): Promise<T> {
    const {
      skipInterceptor = false,
      retryAlternateLocalhost = true,
      silent = false,
      ...fetchOptions
    } = options;

    try {
      const isFormData =
        typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...fetchOptions.headers,
          ...(this.getToken() && {
            Authorization: `Bearer ${this.getToken()}`,
          }),
        },
      });

      // Handle 401 - try to refresh token, then force logout if still failing
      if (response.status === 401 && !skipInterceptor) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          const refreshed = await this.refreshAccessToken(refreshToken);
          if (refreshed) {
            try {
              // Retry once with the new token
              return await this.request<T>(url, { ...options, skipInterceptor: true });
            } catch {
              // Retry also failed (e.g. user no longer exists in DB) — force logout
              this.logout();
              throw new Error('Session expired. Please login again.');
            }
          }
        }
        // No refresh token or refresh failed — force logout
        this.logout();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const errorData = contentType.includes('application/json')
          ? await response.json().catch(() => ({}))
          : {};
        const message: string = errorData.message || `API Error: ${response.statusText}`;

        // User's DB record is gone despite a valid token — clear session immediately
        if (
          response.status === 401 ||
          message === 'User not found in database'
        ) {
          this.logout();
          throw new Error('Session expired. Please login again.');
        }

        throw new Error(message);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Expected JSON response but received ${contentType || 'unknown content type'}. Check API base URL: ${apiConfig.baseUrl}`,
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (retryAlternateLocalhost && error instanceof TypeError) {
        const fallbackUrl = this.getAlternateLocalhostUrl(url);
        if (fallbackUrl && fallbackUrl !== url) {
          try {
            return await this.request<T>(fallbackUrl, {
              ...options,
              retryAlternateLocalhost: false,
            });
          } catch {
            // Ignore and throw original error below
          }
        }
      }

      if (!silent) console.error('API request failed:', error);
      throw error;
    }
  }

  private getAlternateLocalhostUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
        return null;
      }

      if (parsed.port === '3000') {
        parsed.port = '3001';
        return parsed.toString();
      }

      if (parsed.port === '3001' || parsed.port === '') {
        parsed.port = '3000';
        return parsed.toString();
      }

      return null;
    } catch {
      return null;
    }
  }

  async get<T>(url: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T>(
    url: string,
    body?: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body:
        typeof FormData !== 'undefined' && body instanceof FormData
          ? body
          : JSON.stringify(body),
    });
  }

  async put<T>(
    url: string,
    body?: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body:
        typeof FormData !== 'undefined' && body instanceof FormData
          ? body
          : JSON.stringify(body),
    });
  }

  async patch<T>(
    url: string,
    body?: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body:
        typeof FormData !== 'undefined' && body instanceof FormData
          ? body
          : JSON.stringify(body),
    });
  }

  async delete<T>(url: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  private async refreshAccessToken(refreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(apiConfig.endpoints.auth.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.session?.accessToken) {
        const storage = this.getActiveStorage();
        const nextRefreshToken =
          data.session.refreshToken ?? data.session.refresh_token;

        storage?.setItem('token', data.session.accessToken);
        if (nextRefreshToken) {
          storage?.setItem('refreshToken', nextRefreshToken);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private getToken(): string | null {
    return this.getActiveStorage()?.getItem('token') ?? null;
  }

  private getRefreshToken(): string | null {
    return this.getActiveStorage()?.getItem('refreshToken') ?? null;
  }

  private getActiveStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const preferredMode = localStorage.getItem(AUTH_STORAGE_KEY) as StorageMode | null;

    if (preferredMode === 'local') {
      return localStorage;
    }

    if (preferredMode === 'session') {
      return sessionStorage;
    }

    if (localStorage.getItem('token')) {
      return localStorage;
    }

    return sessionStorage;
  }

  private logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('databaseUser');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('databaseUser');
      window.location.href = '/auth/login';
    }
  }
}

export const apiClient = new ApiClient();

