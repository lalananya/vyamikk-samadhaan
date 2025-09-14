/**
 * Centralized error handling utilities to eliminate duplicate error handling logic
 */

import { ERROR_MESSAGES } from "../constants/AppConstants";

export interface AppError extends Error {
    code?: string;
    status?: number;
    context?: string;
    userMessage?: string;
    isRetryable?: boolean;
}

export class ErrorUtils {
    /**
     * Create a standardized app error
     */
    static createError(
        message: string,
        options: {
            code?: string;
            status?: number;
            context?: string;
            userMessage?: string;
            isRetryable?: boolean;
        } = {}
    ): AppError {
        const error = new Error(message) as AppError;
        error.code = options.code;
        error.status = options.status;
        error.context = options.context;
        error.userMessage = options.userMessage;
        error.isRetryable = options.isRetryable ?? false;
        return error;
    }

    /**
     * Handle API errors
     */
    static handleApiError(error: any, context?: string): AppError {
        if (error.status) {
            // HTTP error
            const status = error.status;
            let message = error.message || ERROR_MESSAGES.SERVER_ERROR;
            let userMessage = message;
            let isRetryable = false;

            switch (status) {
                case 400:
                    message = "Bad Request";
                    userMessage = "Invalid request data";
                    break;
                case 401:
                    message = "Unauthorized";
                    userMessage = ERROR_MESSAGES.AUTHENTICATION_ERROR;
                    break;
                case 403:
                    message = "Forbidden";
                    userMessage = ERROR_MESSAGES.PERMISSION_ERROR;
                    break;
                case 404:
                    message = "Not Found";
                    userMessage = "The requested resource was not found";
                    break;
                case 409:
                    message = "Conflict";
                    userMessage = "The request conflicts with current state";
                    break;
                case 429:
                    message = "Too Many Requests";
                    userMessage = "Please wait before trying again";
                    isRetryable = true;
                    break;
                case 500:
                    message = "Internal Server Error";
                    userMessage = ERROR_MESSAGES.SERVER_ERROR;
                    isRetryable = true;
                    break;
                case 503:
                    message = "Service Unavailable";
                    userMessage = "Service is temporarily unavailable";
                    isRetryable = true;
                    break;
                default:
                    if (status >= 500) {
                        isRetryable = true;
                    }
            }

            return this.createError(message, {
                code: `HTTP_${status}`,
                status,
                context,
                userMessage,
                isRetryable,
            });
        }

        if (error.name === "AbortError") {
            return this.createError("Request timeout", {
                code: "TIMEOUT",
                context,
                userMessage: ERROR_MESSAGES.TIMEOUT_ERROR,
                isRetryable: true,
            });
        }

        if (error.name === "TypeError" && error.message.includes("fetch")) {
            return this.createError("Network error", {
                code: "NETWORK_ERROR",
                context,
                userMessage: ERROR_MESSAGES.NETWORK_ERROR,
                isRetryable: true,
            });
        }

        // Generic error
        return this.createError(error.message || ERROR_MESSAGES.GENERIC_ERROR, {
            context,
            userMessage: error.userMessage || ERROR_MESSAGES.GENERIC_ERROR,
            isRetryable: false,
        });
    }

    /**
     * Handle validation errors
     */
    static handleValidationError(field: string, message: string): AppError {
        return this.createError(`Validation error for ${field}: ${message}`, {
            code: "VALIDATION_ERROR",
            userMessage: message,
            isRetryable: false,
        });
    }

    /**
     * Handle authentication errors
     */
    static handleAuthError(message: string = "Authentication failed"): AppError {
        return this.createError(message, {
            code: "AUTH_ERROR",
            userMessage: ERROR_MESSAGES.AUTHENTICATION_ERROR,
            isRetryable: false,
        });
    }

    /**
     * Handle permission errors
     */
    static handlePermissionError(message: string = "Permission denied"): AppError {
        return this.createError(message, {
            code: "PERMISSION_ERROR",
            userMessage: ERROR_MESSAGES.PERMISSION_ERROR,
            isRetryable: false,
        });
    }

    /**
     * Handle network errors
     */
    static handleNetworkError(error: any): AppError {
        return this.createError("Network error", {
            code: "NETWORK_ERROR",
            userMessage: ERROR_MESSAGES.NETWORK_ERROR,
            isRetryable: true,
        });
    }

    /**
     * Handle timeout errors
     */
    static handleTimeoutError(): AppError {
        return this.createError("Request timeout", {
            code: "TIMEOUT_ERROR",
            userMessage: ERROR_MESSAGES.TIMEOUT_ERROR,
            isRetryable: true,
        });
    }

    /**
     * Check if error is retryable
     */
    static isRetryable(error: AppError): boolean {
        return error.isRetryable ?? false;
    }

    /**
     * Get user-friendly error message
     */
    static getUserMessage(error: AppError): string {
        return error.userMessage || error.message || ERROR_MESSAGES.GENERIC_ERROR;
    }

    /**
     * Log error with context
     */
    static logError(error: AppError, additionalContext?: any): void {
        const logData = {
            message: error.message,
            code: error.code,
            status: error.status,
            context: error.context,
            stack: error.stack,
            additionalContext,
            timestamp: new Date().toISOString(),
        };

        if (__DEV__) {
            console.error("🚨 App Error:", logData);
        } else {
            // In production, send to error tracking service
            // Example: Sentry.captureException(error, { extra: logData });
        }
    }

    /**
     * Wrap async function with error handling
     */
    static async withErrorHandling<T>(
        fn: () => Promise<T>,
        context?: string
    ): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            const appError = this.handleApiError(error, context);
            this.logError(appError);
            throw appError;
        }
    }

    /**
     * Wrap sync function with error handling
     */
    static withSyncErrorHandling<T>(
        fn: () => T,
        context?: string
    ): T {
        try {
            return fn();
        } catch (error) {
            const appError = this.createError(
                error instanceof Error ? error.message : String(error),
                { context }
            );
            this.logError(appError);
            throw appError;
        }
    }

    /**
     * Create error from unknown type
     */
    static fromUnknown(error: unknown, context?: string): AppError {
        if (error instanceof Error) {
            return this.createError(error.message, { context });
        }

        if (typeof error === "string") {
            return this.createError(error, { context });
        }

        return this.createError("Unknown error occurred", { context });
    }

    /**
     * Check if error is of specific type
     */
    static isErrorOfType(error: any, code: string): boolean {
        return error?.code === code;
    }

    /**
     * Extract error details for debugging
     */
    static getErrorDetails(error: any): {
        message: string;
        code?: string;
        status?: number;
        stack?: string;
        context?: string;
    } {
        return {
            message: error?.message || "Unknown error",
            code: error?.code,
            status: error?.status,
            stack: error?.stack,
            context: error?.context,
        };
    }
}

