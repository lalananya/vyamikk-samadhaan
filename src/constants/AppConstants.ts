/**
 * Application-wide constants to eliminate magic numbers and hardcoded strings
 */

export const API_CONSTANTS = {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    PAGINATION_LIMIT: 50,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
} as const;

export const VALIDATION_CONSTANTS = {
    PHONE_MIN_LENGTH: 10,
    PHONE_MAX_LENGTH: 15,
    OTP_LENGTH: 6,
    PASSWORD_MIN_LENGTH: 8,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    REASON_MIN_LENGTH: 10,
    REASON_MAX_LENGTH: 500,
} as const;

export const UI_CONSTANTS = {
    DEBOUNCE_DELAY: 300, // 300ms
    ANIMATION_DURATION: 200, // 200ms
    TOAST_DURATION: 3000, // 3 seconds
    MODAL_ANIMATION_DURATION: 300, // 300ms
} as const;

export const ERROR_MESSAGES = {
    NETWORK_ERROR: "Network error. Please check your connection.",
    GENERIC_ERROR: "Something went wrong. Please try again.",
    VALIDATION_ERROR: "Please check your input and try again.",
    AUTHENTICATION_ERROR: "Authentication failed. Please login again.",
    PERMISSION_ERROR: "You don't have permission to perform this action.",
    SERVER_ERROR: "Server error. Please try again later.",
    TIMEOUT_ERROR: "Request timed out. Please try again.",
} as const;

export const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logged out successfully",
    DATA_SAVED: "Data saved successfully",
    REQUEST_SUBMITTED: "Request submitted successfully",
    ACTION_COMPLETED: "Action completed successfully",
} as const;

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
} as const;

export const ROLE_CONSTANTS = {
    ORGANISATION: "organisation",
    PROFESSIONAL: "professional",
    ADMIN: "admin",
} as const;

export const REQUEST_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

export const LOI_STATUS = {
    DRAFT: "draft",
    SIGNED_A: "signedA",
    ACTIVE: "active",
    EXPIRED: "expired",
} as const;

export const ATTENDANCE_TYPE = {
    IN: "in",
    OUT: "out",
} as const;

export const ATTENDANCE_METHOD = {
    GEO: "geo",
    MANUAL: "manual",
} as const;

export const LEDGER_STATUS = {
    PENDING: "pending",
    ACKNOWLEDGED: "acknowledged",
    REJECTED: "rejected",
} as const;

export const FEATURE_FLAGS = {
    DEV_SKIP_ME_VALIDATION: "DEV_SKIP_ME_VALIDATION",
    DEV_AUTH_ANY: "DEV_AUTH_ANY",
    POST_LOGIN_ONBOARDING: "post_login_onboarding",
    CATEGORY_ROLES: "category_roles",
    CASH_OTP: "cash_otp",
    FUND_DISBURSEMENT: "fund_disbursement",
    MACHINE_ISSUE: "machine_issue",
} as const;

export const ANALYTICS_EVENTS = {
    LOGIN_SUCCESS: "login_success",
    LOGIN_FAILED: "login_failed",
    LOGOUT: "logout",
    ROLE_CHANGE_REQUESTED: "role_change_requested",
    ROLE_CHANGE_APPROVED: "role_change_approved",
    ROLE_CHANGE_REJECTED: "role_change_rejected",
    LOI_GENERATED: "loi_generated",
    LOI_SENT: "loi_sent",
    ATTENDANCE_MARKED: "attendance_marked",
    PAYMENT_ACKNOWLEDGED: "payment_acknowledged",
} as const;

export const STORAGE_KEYS = {
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh_token",
    USER_DATA: "user_data",
    ONBOARDING_COMPLETED: "onboarding_completed",
    FEATURE_FLAGS: "feature_flags",
    LAST_SYNC_TIME: "last_sync_time",
} as const;

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: "/auth/login",
        VERIFY: "/auth/verify",
        REFRESH: "/auth/refresh",
        LOGOUT: "/auth/logout",
        ME: "/auth/me",
    },
    ADMIN: {
        ROLE_CHANGE_REQUESTS: "/admin/role-change",
        APPROVE_REQUEST: (id: string) => `/admin/role-change/${id}/approve`,
        REJECT_REQUEST: (id: string) => `/admin/role-change/${id}/reject`,
    },
    LOI: {
        GENERATE: "/loi/generate",
        SEND: "/loi/send",
        VERIFY: "/loi/verify",
    },
    ATTENDANCE: {
        MARK: "/attendance/mark",
        HISTORY: "/attendance/history",
    },
    PAYMENT: {
        ACKNOWLEDGE: "/payment/acknowledge",
        HISTORY: "/payment/history",
    },
    HEALTH: {
        CHECK: "/health",
        HEALTHZ: "/healthz",
    },
} as const;

