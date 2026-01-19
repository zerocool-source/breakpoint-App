import api from './api';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    api.setAuthToken(token);
  },

  clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    api.clearAuthToken();
  },

  getUser(): AuthUser | null {
    const userData = localStorage.getItem(AUTH_USER_KEY);
    if (!userData) return null;
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  },

  setUser(user: AuthUser): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  clearUser(): void {
    localStorage.removeItem(AUTH_USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  logout(): void {
    this.clearToken();
    this.clearUser();
  },
};

export async function login(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const response = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password }, { skipAuth: true });
    authStorage.setToken(response.token);
    authStorage.setUser(response.user);
    return { success: true, user: response.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await api.get<AuthUser>('/api/me');
    authStorage.setUser(user);
    return user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout');
  } catch {
  } finally {
    authStorage.logout();
  }
}
