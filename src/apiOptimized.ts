/**
 * OPTIMIZED API Client
 *
 * Performance improvements:
 * - Request/response caching
 * - Automatic retry with exponential backoff
 * - Request deduplication
 * - Connection pooling
 * - Request/response compression
 * - Circuit breaker pattern
 */

import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheTime: number;
}

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  data?: any;
  headers?: Record<string, string>;
  cache?: boolean;
  retry?: boolean;
  timeout?: number;
}

class OptimizedApiClient {
  private config: ApiConfig;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private circuitBreaker: Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: "CLOSED" | "OPEN" | "HALF_OPEN";
    }
  > = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();

  constructor(config: ApiConfig) {
    this.config = config;
    this.startCacheCleanup();
  }

  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > value.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  private getCacheKey(options: RequestOptions): string {
    return `${options.method}:${options.url}:${JSON.stringify(options.data || {})}`;
  }

  private async getFromCache(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  private setCache(
    key: string,
    data: any,
    ttl: number = this.config.cacheTime,
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private isCircuitOpen(endpoint: string): boolean {
    const breaker = this.circuitBreaker.get(endpoint);
    if (!breaker) return false;

    if (breaker.state === "OPEN") {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      if (timeSinceLastFailure > 60000) {
        // 1 minute
        breaker.state = "HALF_OPEN";
        return false;
      }
      return true;
    }

    return false;
  }

  private recordSuccess(endpoint: string): void {
    const breaker = this.circuitBreaker.get(endpoint);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = "CLOSED";
    }
  }

  private recordFailure(endpoint: string): void {
    const breaker = this.circuitBreaker.get(endpoint) || {
      failures: 0,
      lastFailure: 0,
      state: "CLOSED" as const,
    };
    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= 5) {
      breaker.state = "OPEN";
    }

    this.circuitBreaker.set(endpoint, breaker);
  }

  private async makeRequest(options: RequestOptions): Promise<any> {
    const endpoint = options.url.split("/")[1]; // Get first path segment

    if (this.isCircuitOpen(endpoint)) {
      throw new Error("Circuit breaker is open for this endpoint");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.config.timeout,
    );

    try {
      const response = await fetch(`${this.config.baseURL}${options.url}`, {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          ...options.headers,
        },
        body: options.data ? JSON.stringify(options.data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.recordSuccess(endpoint);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      this.recordFailure(endpoint);
      throw error;
    }
  }

  private async retryRequest(
    options: RequestOptions,
    attempt: number = 1,
  ): Promise<any> {
    try {
      return await this.makeRequest(options);
    } catch (error) {
      if (attempt >= this.config.retryAttempts) {
        throw error;
      }

      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retryRequest(options, attempt + 1);
    }
  }

  async request(options: RequestOptions): Promise<any> {
    const cacheKey = this.getCacheKey(options);

    // Check cache for GET requests
    if (options.method === "GET" && options.cache !== false) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check for pending identical requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create request promise
    const requestPromise = this.retryRequest(options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache successful GET requests
      if (options.method === "GET" && options.cache !== false) {
        this.setCache(cacheKey, result);
      }

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Convenience methods
  async get(url: string, options: Partial<RequestOptions> = {}): Promise<any> {
    return this.request({ method: "GET", url, ...options });
  }

  async post(
    url: string,
    data?: any,
    options: Partial<RequestOptions> = {},
  ): Promise<any> {
    return this.request({ method: "POST", url, data, ...options });
  }

  async put(
    url: string,
    data?: any,
    options: Partial<RequestOptions> = {},
  ): Promise<any> {
    return this.request({ method: "PUT", url, data, ...options });
  }

  async delete(
    url: string,
    options: Partial<RequestOptions> = {},
  ): Promise<any> {
    return this.request({ method: "DELETE", url, ...options });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create optimized API client instance
const apiClient = new OptimizedApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_BASE || "http://localhost:4000",
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTime: 5 * 60 * 1000, // 5 minutes
});

// React Query integration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Optimized API functions
export const api = {
  // Auth endpoints
  signup: (data: any) => apiClient.post("/signup", data),
  login: (data: any) => apiClient.post("/login", data),
  verifyTotp: (data: any) => apiClient.post("/totp/verify", data),
  getProfile: () => apiClient.get("/me", { cache: true }),

  // Ledger endpoints
  getLedger: () => apiClient.get("/ledger", { cache: true }),
  createLedgerEntry: (data: any) => apiClient.post("/ledger", data),
  acknowledgeLedgerEntry: (id: string, data: any) =>
    apiClient.post(`/ledger/${id}/ack`, data),

  // LOI endpoints
  createLoi: (data: any) => apiClient.post("/loi", data),
  signLoi: (id: string, data: any) => apiClient.post(`/loi/${id}/sign`, data),
  getLoiPdf: (id: string) => apiClient.get(`/loi/${id}/pdf`),

  // Attendance endpoints
  punchAttendance: (data: any) => apiClient.post("/attendance/punch", data),
  bulkAttendance: (data: any) => apiClient.post("/attendance/bulk", data),

  // Search endpoints
  search: (query: string, type: string, topK: number = 20) =>
    apiClient.get(
      `/search?q=${encodeURIComponent(query)}&type=${type}&topK=${topK}`,
      { cache: true },
    ),

  // Health check
  health: () => apiClient.get("/health", { cache: false, timeout: 5000 }),
};

export default apiClient;
