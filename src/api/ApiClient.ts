import { AbortController } from 'react-native';

interface ApiRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  cached?: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class ApiClient {
  private static instance: ApiClient;
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<ApiResponse>>();
  private baseURL: string;
  private defaultTimeout = 10000; // 10 seconds
  private defaultRetries = 3;

  private constructor() {
    this.baseURL = this.getApiBase();
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private getApiBase(): string {
    try {
      const { API_BASE } = require('../api');
      return API_BASE;
    } catch (error) {
      console.error('Failed to get API base:', error);
      return 'http://192.168.29.242:4000/api/v1';
    }
  }

  private getCacheKey(url: string, method: string, body?: any): string {
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private getCachedResponse<T>(cacheKey: string): ApiResponse<T> | null {
    const entry = this.cache.get(cacheKey);
    if (entry && this.isCacheValid(entry)) {
      return {
        data: entry.data,
        status: 200,
        headers: {},
        cached: true,
      };
    }
    return null;
  }

  private setCachedResponse(cacheKey: string, data: any, ttl: number): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private async makeRequest<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const { url, method, headers = {}, body, timeout = this.defaultTimeout, retries = this.defaultRetries } = request;
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (retries > 0 && error.name !== 'AbortError') {
        console.warn(`Request failed, retrying... (${retries} retries left)`);
        await this.delay(1000 * (this.defaultRetries - retries + 1)); // Exponential backoff
        return this.makeRequest({ ...request, retries: retries - 1 });
      }
      
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const { url, method, body, cache = false, cacheTTL = 300000 } = request; // 5 minutes default TTL
    const cacheKey = this.getCacheKey(url, method, body);

    // Check cache first
    if (cache && method === 'GET') {
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit for ${method} ${url}`);
        return cached;
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Request already pending for ${method} ${url}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Make the request
    const requestPromise = this.makeRequest<T>(request);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Cache successful GET requests
      if (cache && method === 'GET' && response.status === 200) {
        this.setCachedResponse(cacheKey, response.data, cacheTTL);
        console.log(`💾 Cached response for ${method} ${url}`);
      }

      return response;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Convenience methods
  async get<T>(url: string, options: Partial<ApiRequest> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'GET', ...options });
  }

  async post<T>(url: string, body?: any, options: Partial<ApiRequest> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', body, ...options });
  }

  async put<T>(url: string, body?: any, options: Partial<ApiRequest> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', body, ...options });
  }

  async delete<T>(url: string, options: Partial<ApiRequest> = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE', ...options });
  }

  // Health check with optimized polling
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', { 
        timeout: 5000,
        cache: false,
        retries: 1
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Health check failed:', error);
      return false;
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ API cache cleared');
  }

  // Clear specific cache entry
  clearCacheEntry(url: string, method: string = 'GET', body?: any): void {
    const cacheKey = this.getCacheKey(url, method, body);
    this.cache.delete(cacheKey);
    console.log(`🗑️ Cache entry cleared for ${method} ${url}`);
  }

  // Get cache stats
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const apiClient = ApiClient.getInstance();
export default apiClient;
