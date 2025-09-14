/**
 * Centralized alert and notification utilities to eliminate duplicate alert logic
 */

import { Alert } from "react-native";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/AppConstants";

export interface AlertOptions {
    title?: string;
    message: string;
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: "default" | "cancel" | "destructive";
    }>;
}

export class AlertUtils {
    /**
     * Show success alert
     */
    static showSuccess(
        message: string,
        title: string = "Success",
        onPress?: () => void
    ): void {
        Alert.alert(title, message, [
            {
                text: "OK",
                onPress,
                style: "default",
            },
        ]);
    }

    /**
     * Show error alert
     */
    static showError(
        message: string,
        title: string = "Error",
        onPress?: () => void
    ): void {
        Alert.alert(title, message, [
            {
                text: "OK",
                onPress,
                style: "default",
            },
        ]);
    }

    /**
     * Show confirmation alert
     */
    static showConfirmation(
        message: string,
        title: string = "Confirm",
        onConfirm: () => void,
        onCancel?: () => void
    ): void {
        Alert.alert(title, message, [
            {
                text: "Cancel",
                onPress: onCancel,
                style: "cancel",
            },
            {
                text: "Confirm",
                onPress: onConfirm,
                style: "destructive",
            },
        ]);
    }

    /**
     * Show network error alert
     */
    static showNetworkError(onRetry?: () => void): void {
        Alert.alert(
            "Connection Error",
            ERROR_MESSAGES.NETWORK_ERROR,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                ...(onRetry ? [{
                    text: "Retry",
                    onPress: onRetry,
                    style: "default",
                }] : []),
            ]
        );
    }

    /**
     * Show authentication error alert
     */
    static showAuthError(onLogin?: () => void): void {
        Alert.alert(
            "Authentication Error",
            ERROR_MESSAGES.AUTHENTICATION_ERROR,
            [
                {
                    text: "OK",
                    style: "default",
                },
                ...(onLogin ? [{
                    text: "Login",
                    onPress: onLogin,
                    style: "default",
                }] : []),
            ]
        );
    }

    /**
     * Show validation error alert
     */
    static showValidationError(message: string): void {
        Alert.alert("Validation Error", message, [
            {
                text: "OK",
                style: "default",
            },
        ]);
    }

    /**
     * Show generic error alert
     */
    static showGenericError(error?: any, onRetry?: () => void): void {
        let message = ERROR_MESSAGES.GENERIC_ERROR;

        if (error?.message) {
            message = error.message;
        } else if (typeof error === "string") {
            message = error;
        }

        Alert.alert(
            "Error",
            message,
            [
                {
                    text: "OK",
                    style: "default",
                },
                ...(onRetry ? [{
                    text: "Retry",
                    onPress: onRetry,
                    style: "default",
                }] : []),
            ]
        );
    }

    /**
     * Show loading alert (for operations that need user confirmation)
     */
    static showLoading(
        message: string = "Please wait...",
        title: string = "Loading"
    ): void {
        Alert.alert(title, message, [], { cancelable: false });
    }

    /**
     * Show custom alert with multiple options
     */
    static showCustom(options: AlertOptions): void {
        Alert.alert(
            options.title || "Alert",
            options.message,
            options.buttons || [{ text: "OK" }]
        );
    }

    /**
     * Show API error with details
     */
    static showApiError(error: any, context?: string): void {
        let message = ERROR_MESSAGES.SERVER_ERROR;
        let title = "Server Error";

        if (error?.status) {
            switch (error.status) {
                case 400:
                    title = "Bad Request";
                    message = error.message || "Invalid request data";
                    break;
                case 401:
                    title = "Unauthorized";
                    message = ERROR_MESSAGES.AUTHENTICATION_ERROR;
                    break;
                case 403:
                    title = "Forbidden";
                    message = ERROR_MESSAGES.PERMISSION_ERROR;
                    break;
                case 404:
                    title = "Not Found";
                    message = "The requested resource was not found";
                    break;
                case 429:
                    title = "Too Many Requests";
                    message = "Please wait before trying again";
                    break;
                case 500:
                    title = "Server Error";
                    message = ERROR_MESSAGES.SERVER_ERROR;
                    break;
                case 503:
                    title = "Service Unavailable";
                    message = "Service is temporarily unavailable";
                    break;
                default:
                    message = error.message || ERROR_MESSAGES.SERVER_ERROR;
            }
        } else if (error?.message) {
            message = error.message;
        }

        if (context) {
            message = `${context}: ${message}`;
        }

        Alert.alert(title, message, [
            {
                text: "OK",
                style: "default",
            },
        ]);
    }

    /**
     * Show success message for common actions
     */
    static showActionSuccess(action: string): void {
        const messages: Record<string, string> = {
            login: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            logout: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
            save: SUCCESS_MESSAGES.DATA_SAVED,
            submit: SUCCESS_MESSAGES.REQUEST_SUBMITTED,
            complete: SUCCESS_MESSAGES.ACTION_COMPLETED,
        };

        this.showSuccess(messages[action] || SUCCESS_MESSAGES.ACTION_COMPLETED);
    }
}

