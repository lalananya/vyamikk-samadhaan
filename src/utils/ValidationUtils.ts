/**
 * Centralized form validation utilities to eliminate duplicate validation logic
 */

import { VALIDATION_CONSTANTS } from "../constants/AppConstants";

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => ValidationResult;
}

export class ValidationUtils {
    /**
     * Validate phone number
     */
    static validatePhone(phone: string): ValidationResult {
        if (!phone) {
            return { isValid: false, error: "Phone number is required" };
        }

        const cleanPhone = phone.replace(/\D/g, "");

        if (cleanPhone.length < VALIDATION_CONSTANTS.PHONE_MIN_LENGTH) {
            return {
                isValid: false,
                error: `Phone number must be at least ${VALIDATION_CONSTANTS.PHONE_MIN_LENGTH} digits`
            };
        }

        if (cleanPhone.length > VALIDATION_CONSTANTS.PHONE_MAX_LENGTH) {
            return {
                isValid: false,
                error: `Phone number must be no more than ${VALIDATION_CONSTANTS.PHONE_MAX_LENGTH} digits`
            };
        }

        // Indian phone number pattern
        const phonePattern = /^[6-9]\d{9}$/;
        if (!phonePattern.test(cleanPhone)) {
            return {
                isValid: false,
                error: "Please enter a valid Indian phone number"
            };
        }

        return { isValid: true };
    }

    /**
     * Validate OTP
     */
    static validateOTP(otp: string): ValidationResult {
        if (!otp) {
            return { isValid: false, error: "OTP is required" };
        }

        if (otp.length !== VALIDATION_CONSTANTS.OTP_LENGTH) {
            return {
                isValid: false,
                error: `OTP must be ${VALIDATION_CONSTANTS.OTP_LENGTH} digits`
            };
        }

        if (!/^\d+$/.test(otp)) {
            return { isValid: false, error: "OTP must contain only numbers" };
        }

        return { isValid: true };
    }

    /**
     * Validate name
     */
    static validateName(name: string, fieldName: string = "Name"): ValidationResult {
        if (!name) {
            return { isValid: false, error: `${fieldName} is required` };
        }

        if (name.length < VALIDATION_CONSTANTS.NAME_MIN_LENGTH) {
            return {
                isValid: false,
                error: `${fieldName} must be at least ${VALIDATION_CONSTANTS.NAME_MIN_LENGTH} characters`
            };
        }

        if (name.length > VALIDATION_CONSTANTS.NAME_MAX_LENGTH) {
            return {
                isValid: false,
                error: `${fieldName} must be no more than ${VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters`
            };
        }

        if (!/^[a-zA-Z\s]+$/.test(name)) {
            return {
                isValid: false,
                error: `${fieldName} can only contain letters and spaces`
            };
        }

        return { isValid: true };
    }

    /**
     * Validate reason text
     */
    static validateReason(reason: string): ValidationResult {
        if (!reason) {
            return { isValid: false, error: "Reason is required" };
        }

        if (reason.length < VALIDATION_CONSTANTS.REASON_MIN_LENGTH) {
            return {
                isValid: false,
                error: `Reason must be at least ${VALIDATION_CONSTANTS.REASON_MIN_LENGTH} characters`
            };
        }

        if (reason.length > VALIDATION_CONSTANTS.REASON_MAX_LENGTH) {
            return {
                isValid: false,
                error: `Reason must be no more than ${VALIDATION_CONSTANTS.REASON_MAX_LENGTH} characters`
            };
        }

        return { isValid: true };
    }

    /**
     * Validate email
     */
    static validateEmail(email: string): ValidationResult {
        if (!email) {
            return { isValid: false, error: "Email is required" };
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return { isValid: false, error: "Please enter a valid email address" };
        }

        return { isValid: true };
    }

    /**
     * Validate password
     */
    static validatePassword(password: string): ValidationResult {
        if (!password) {
            return { isValid: false, error: "Password is required" };
        }

        if (password.length < VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH) {
            return {
                isValid: false,
                error: `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters`
            };
        }

        // At least one uppercase, one lowercase, one number
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
        if (!passwordPattern.test(password)) {
            return {
                isValid: false,
                error: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
            };
        }

        return { isValid: true };
    }

    /**
     * Validate date
     */
    static validateDate(date: string, fieldName: string = "Date"): ValidationResult {
        if (!date) {
            return { isValid: false, error: `${fieldName} is required` };
        }

        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
        }

        return { isValid: true };
    }

    /**
     * Validate salary amount
     */
    static validateSalary(salary: string): ValidationResult {
        if (!salary) {
            return { isValid: false, error: "Salary is required" };
        }

        const amount = parseFloat(salary);
        if (isNaN(amount) || amount < 0) {
            return { isValid: false, error: "Please enter a valid salary amount" };
        }

        if (amount > 1000000) {
            return { isValid: false, error: "Salary amount seems too high" };
        }

        return { isValid: true };
    }

    /**
     * Generic field validation
     */
    static validateField(value: any, rules: ValidationRule): ValidationResult {
        // Required check
        if (rules.required && (!value || value.toString().trim() === "")) {
            return { isValid: false, error: "This field is required" };
        }

        // Skip other validations if value is empty and not required
        if (!value || value.toString().trim() === "") {
            return { isValid: true };
        }

        const stringValue = value.toString();

        // Min length check
        if (rules.minLength && stringValue.length < rules.minLength) {
            return {
                isValid: false,
                error: `Must be at least ${rules.minLength} characters`
            };
        }

        // Max length check
        if (rules.maxLength && stringValue.length > rules.maxLength) {
            return {
                isValid: false,
                error: `Must be no more than ${rules.maxLength} characters`
            };
        }

        // Pattern check
        if (rules.pattern && !rules.pattern.test(stringValue)) {
            return { isValid: false, error: "Invalid format" };
        }

        // Custom validation
        if (rules.custom) {
            return rules.custom(value);
        }

        return { isValid: true };
    }

    /**
     * Validate form data
     */
    static validateForm<T extends Record<string, any>>(
        data: T,
        validationRules: Record<keyof T, ValidationRule>
    ): { isValid: boolean; errors: Record<keyof T, string> } {
        const errors: Record<keyof T, string> = {} as any;
        let isValid = true;

        for (const [field, rules] of Object.entries(validationRules)) {
            const result = this.validateField(data[field], rules);
            if (!result.isValid) {
                errors[field as keyof T] = result.error!;
                isValid = false;
            }
        }

        return { isValid, errors };
    }
}

