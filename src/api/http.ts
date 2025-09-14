// HTTP client for API requests
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      return {
        ok: response.ok,
        data: data.data || data,
        error: data.error,
        status: response.status,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    console.log('🔍 HTTP POST:', endpoint, 'Body:', body);
    console.log('🔍 Body type:', typeof body, 'Stringified:', JSON.stringify(body));
    
    const serializedBody = body ? JSON.stringify(body) : undefined;
    console.log('🔍 Serialized body:', serializedBody, 'Length:', serializedBody?.length);
    
    // Ensure proper JSON headers
    const jsonHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };
    
    console.log('🔍 Headers:', jsonHeaders);
    
    return this.request<T>(endpoint, {
      method: 'POST',
      body: serializedBody,
      headers: jsonHeaders,
    });
  }

  async put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    const serializedBody = body ? JSON.stringify(body) : undefined;
    const jsonHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };
    
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: serializedBody,
      headers: jsonHeaders,
    });
  }

  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}
