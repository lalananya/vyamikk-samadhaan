import * as Joi from "joi";

export const configSchema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

  // OTP
  OTP_EXPIRY_MINUTES: Joi.number().min(1).max(60).default(5),
  OTP_MAX_ATTEMPTS: Joi.number().min(1).max(10).default(5),
  OTP_RATE_LIMIT_PER_MINUTE: Joi.number().min(1).default(1),
  OTP_RATE_LIMIT_PER_DAY: Joi.number().min(1).default(5),

  // MSG91
  MSG91_API_KEY: Joi.string().optional(),
  MSG91_SENDER_ID: Joi.string().default("VYAAMK"),
  MSG91_TEMPLATE_ID_LOGIN: Joi.string().optional(),

  // Server
  PORT: Joi.number().min(1).max(65535).default(4000),
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug")
    .default("info"),

  // CORS
  CORS_ORIGINS: Joi.string().default("http://localhost:8081"),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().min(1000).default(60000),
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),

  // Redis
  REDIS_URL: Joi.string().uri().optional(),

  // Development
  DEV_OTP_DEBUG: Joi.boolean().default(false),
  DEV_OTP_LOG_FILE: Joi.string().default("./var/dev-otps.log"),
});

export interface Config {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  OTP_EXPIRY_MINUTES: number;
  OTP_MAX_ATTEMPTS: number;
  OTP_RATE_LIMIT_PER_MINUTE: number;
  OTP_RATE_LIMIT_PER_DAY: number;
  MSG91_API_KEY?: string;
  MSG91_SENDER_ID: string;
  MSG91_TEMPLATE_ID_LOGIN?: string;
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  LOG_LEVEL: "error" | "warn" | "info" | "debug";
  CORS_ORIGINS: string;
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_MAX: number;
  REDIS_URL?: string;
  DEV_OTP_DEBUG: boolean;
  DEV_OTP_LOG_FILE: string;
}
