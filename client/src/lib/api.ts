const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  private buildUrl(endpoint: string): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return this.baseUrl ? `${this.baseUrl}${path}` : path;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      skipAuth?: boolean;
    } = {}
  ): Promise<T> {
    const { body, headers = {}, skipAuth = false } = options;
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const token = this.getAuthToken();
    if (token && !skipAuth) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const url = this.buildUrl(endpoint);
    
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = `${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  }

  async get<T>(endpoint: string, options?: { headers?: Record<string, string>; skipAuth?: boolean }): Promise<T> {
    return this.request<T>('GET', endpoint, options);
  }

  async post<T>(endpoint: string, body?: unknown, options?: { headers?: Record<string, string>; skipAuth?: boolean }): Promise<T> {
    return this.request<T>('POST', endpoint, { body, ...options });
  }

  async put<T>(endpoint: string, body?: unknown, options?: { headers?: Record<string, string>; skipAuth?: boolean }): Promise<T> {
    return this.request<T>('PUT', endpoint, { body, ...options });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: { headers?: Record<string, string>; skipAuth?: boolean }): Promise<T> {
    return this.request<T>('PATCH', endpoint, { body, ...options });
  }

  async delete<T>(endpoint: string, options?: { headers?: Record<string, string>; skipAuth?: boolean }): Promise<T> {
    return this.request<T>('DELETE', endpoint, options);
  }

  async smokeTest(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const data = await this.get('/api/me');
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const api = new ApiClient();

export default api;
