// app/utils/api-client.ts

import { apiConfig } from './api-config';

const AUTH_STORAGE_KEY = 'authStorage';
type StorageMode = 'local' | 'session';

interface FetchOptions extends RequestInit {
  skipInterceptor?: boolean;
}

class ApiClient {
  async request<T>(
    url: string,
    options: FetchOptions = {},
  ): Promise<T> {
    const { skipInterceptor = false, ...fetchOptions } = options;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
          ...(this.getToken() && {
            Authorization: `Bearer ${this.getToken()}`,
          }),
        },
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && !skipInterceptor) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          const refreshed = await this.refreshAccessToken(refreshToken);
          if (refreshed) {
            // Retry the original request with new token
            return this.request<T>(url, { ...options, skipInterceptor: true });
          } else {
            // Refresh failed, redirect to login
            this.logout();
            throw new Error('Session expired. Please login again.');
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `API Error: ${response.statusText}`,
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
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
      body: JSON.stringify(body),
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
      body: JSON.stringify(body),
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
      body: JSON.stringify(body),
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
