/**
 * Centralized API service to eliminate duplicate API calls and improve maintainability
 */

import { API_BASE } from "../api";
import { API_CONSTANTS, HTTP_STATUS, ERROR_MESSAGES } from "../constants/AppConstants";

export interface ApiResponse<T = any> {
    ok: boolean;
    data?: T;
    error?: string;
    status?: number;
}

export interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retries?: number;
}

export class ApiService {
    private static instance: ApiService;
    private baseURL: string;

    private constructor() {
        this.baseURL = API_BASE;
    }

    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    /**
     * Generic request method with retry logic and error handling
     */
    private async makeRequest<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const {
            method = "GET",
            headers = {},
            body,
            timeout = API_CONSTANTS.TIMEOUT,
            retries = API_CONSTANTS.RETRY_ATTEMPTS,
        } = options;

        const url = `${this.baseURL}${endpoint}`;
        const requestOptions: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        };

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(
                        responseData.error?.message ||
                        `HTTP ${response.status}: ${response.statusText}`
                    );
                }

                return {
                    ok: true,
                    data: responseData,
                    status: response.status,
                };
            } catch (error: any) {
                lastError = error;

                // Don't retry on certain errors
                if (error.name === "AbortError" ||
                    error.message?.includes("HTTP 4")) {
                    break;
                }

                // Wait before retrying
                if (attempt < retries) {
                    await new Promise(resolve =>
                        setTimeout(resolve, API_CONSTANTS.RETRY_DELAY * (attempt + 1))
                    );
                }
            }
        }

        return {
            ok: false,
            error: lastError?.message || ERROR_MESSAGES.NETWORK_ERROR,
            status: 0,
        };
    }

    /**
     * Authentication endpoints
     */
    async login(phone: string): Promise<ApiResponse<{ otpToken: string }>> {
        return this.makeRequest("/auth/login", {
            method: "POST",
            body: { phone },
        });
    }

    async verifyOTP(otpToken: string, code: string): Promise<ApiResponse<{ accessJwt: string; user: any }>> {
        return this.makeRequest("/auth/verify", {
            method: "POST",
            body: { otpToken, code },
        });
    }

    async getMe(): Promise<ApiResponse<{ authenticated: boolean; profile: any; memberships: any[] }>> {
        return this.makeRequest("/auth/me");
    }

    async logout(): Promise<ApiResponse> {
        return this.makeRequest("/auth/logout", { method: "POST" });
    }

    /**
     * Admin endpoints
     */
    async getRoleChangeRequests(offset: number = 0, limit: number = API_CONSTANTS.PAGINATION_LIMIT): Promise<ApiResponse<any[]>> {
        return this.makeRequest(`/admin/role-change?offset=${offset}&limit=${limit}`);
    }

    async approveRoleChangeRequest(requestId: string, adminToken: string): Promise<ApiResponse> {
        return this.makeRequest(`/admin/role-change/${requestId}/approve`, {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
        });
    }

    async rejectRoleChangeRequest(requestId: string, adminToken: string, reason?: string): Promise<ApiResponse> {
        return this.makeRequest(`/admin/role-change/${requestId}/reject`, {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: { reason },
        });
    }

    /**
     * LOI endpoints
     */
    async generateLOI(loiData: any): Promise<ApiResponse<{ otp: string }>> {
        return this.makeRequest("/loi/generate", {
            method: "POST",
            body: loiData,
        });
    }

    async sendLOI(loiId: string, otp: string): Promise<ApiResponse> {
        return this.makeRequest("/loi/send", {
            method: "POST",
            body: { loiId, otp },
        });
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: number }>> {
        return this.makeRequest("/health");
    }

    /**
     * Generic GET request
     */
    async get<T>(endpoint: string, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(endpoint, { ...options, method: "GET" });
    }

    /**
     * Generic POST request
     */
    async post<T>(endpoint: string, body: any, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(endpoint, { ...options, method: "POST", body });
    }

    /**
     * Generic PUT request
     */
    async put<T>(endpoint: string, body: any, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(endpoint, { ...options, method: "PUT", body });
    }

    /**
     * Generic DELETE request
     */
    async delete<T>(endpoint: string, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(endpoint, { ...options, method: "DELETE" });
    }
}

// Export singleton instance
export const apiService = ApiService.getInstance();

