// Debug API client for development and testing
import { HttpClient, ApiResponse } from './http';

export interface DebugInfo {
  timestamp: string;
  version: string;
  environment: string;
  database: {
    connected: boolean;
    tables: string[];
  };
  services: {
    name: string;
    status: 'running' | 'stopped' | 'error';
    lastCheck: string;
  }[];
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
}

export class DebugApiClient {
  private http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  async getSystemInfo(): Promise<ApiResponse<DebugInfo>> {
    return this.http.get<DebugInfo>('/debug/system');
  }

  async getHealthStatus(): Promise<ApiResponse<any>> {
    return this.http.get('/debug/health');
  }

  async getDatabaseStatus(): Promise<ApiResponse<any>> {
    return this.http.get('/debug/database');
  }

  async getServiceStatus(): Promise<ApiResponse<any>> {
    return this.http.get('/debug/services');
  }

  async clearCache(): Promise<ApiResponse<any>> {
    return this.http.post('/debug/clear-cache');
  }

  async resetDatabase(): Promise<ApiResponse<any>> {
    return this.http.post('/debug/reset-db');
  }

  async generateTestData(): Promise<ApiResponse<any>> {
    return this.http.post('/debug/generate-test-data');
  }
}

export const debugApiClient = new DebugApiClient(process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4001/api/v1');
