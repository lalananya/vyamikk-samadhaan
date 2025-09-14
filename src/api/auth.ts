import { apiClient, User, AuthResponse } from './ApiClient';

export interface LoginCredentials {
  phone: string;
  otp: string;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private accessToken: string | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async simpleLogin(credentials: LoginCredentials): Promise<{ ok: boolean; user?: User; accessJwt?: string; error?: string }> {
    try {
      console.log('🔍 AuthService.simpleLogin called with:', credentials);
      
      const response = await apiClient.simpleLogin(credentials.phone, credentials.otp);
      
      if (response.ok && response.data) {
        this.accessToken = response.data.accessJwt;
        this.currentUser = response.data.user;
        apiClient.setAccessToken(this.accessToken);
        
        console.log('✅ Simple login successful for user:', this.currentUser.id);
        return { ok: true, user: this.currentUser, accessJwt: this.accessToken };
      } else {
        console.error('❌ Login failed:', response.error);
        return { ok: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    if (this.accessToken) {
      try {
        const response = await apiClient.getMe();
        if (response.ok && response.data) {
          this.currentUser = response.data;
          return this.currentUser;
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    }

    return null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.currentUser;
  }

  logout(): void {
    this.accessToken = null;
    this.currentUser = null;
    apiClient.setAccessToken(null);
  }
}

export const authService = AuthService.getInstance();
