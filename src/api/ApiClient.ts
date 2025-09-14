import { HttpClient, ApiResponse } from './http';

export interface User {
  id: string;
  phone: string;
  role: string;
  category: string;
  onboardingCompleted: boolean;
  organizations: any[];
  createdAt: string;
}

export interface AuthResponse {
  accessJwt: string;
  refreshJwt: string;
  user: User;
}

export class ApiClient {
  private http: HttpClient;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  // Auth endpoints
  async simpleLogin(phone: string, otp: string): Promise<ApiResponse<AuthResponse>> {
    console.log('🔍 ApiClient.simpleLogin called with:', { phone, otp });
    return this.http.post<AuthResponse>('/auth/simple-login', { phone, otp });
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.http.get<User>('/auth/me', this.getHeaders());
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.http.get('/health');
  }
}

export const apiClient = new ApiClient(process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4001/api/v1');
