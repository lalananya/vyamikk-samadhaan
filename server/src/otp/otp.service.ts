import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { Config } from "../config/config.schema";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService<Config>,
  ) {}

  async generateOtp(
    phone: string,
  ): Promise<{ otpToken: string; resendIn: number }> {
    // Check rate limits
    await this.checkRateLimit(phone);

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await argon2.hash(code);

    // Create OTP record
    const otp = await this.prisma.otp.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(
          Date.now() + this.configService.get("OTP_EXPIRY_MINUTES") * 60 * 1000,
        ),
      },
    });

    // Generate opaque token
    const otpToken = randomBytes(32).toString("hex");

    // Store token mapping (in production, use Redis)
    // For now, we'll use the OTP ID as the token
    const token = otp.id;

    // Send OTP via SMS
    await this.sendOtp(phone, code);

    // Record rate limit event
    await this.recordRateLimit(phone);

    return {
      otpToken: token,
      resendIn: 60, // 1 minute cooldown
    };
  }

  async verifyOtp(
    otpToken: string,
    code: string,
  ): Promise<{ phone: string; isValid: boolean }> {
    // Find OTP record
    const otp = await this.prisma.otp.findUnique({
      where: { id: otpToken },
    });

    if (!otp) {
      throw new BadRequestException("Invalid OTP token");
    }

    // Check if expired
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException("OTP expired");
    }

    // Check max attempts
    if (otp.attempts >= this.configService.get("OTP_MAX_ATTEMPTS")) {
      throw new BadRequestException("Too many verification attempts");
    }

    // Verify code
    const isValid = await argon2.verify(otp.codeHash, code);

    // Increment attempts
    await this.prisma.otp.update({
      where: { id: otpToken },
      data: { attempts: { increment: 1 } },
    });

    if (!isValid) {
      throw new BadRequestException("Invalid OTP code");
    }

    // Delete used OTP
    await this.prisma.otp.delete({
      where: { id: otpToken },
    });

    return { phone: otp.phone, isValid: true };
  }

  private async checkRateLimit(phone: string): Promise<void> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check per-minute limit
    const recentCount = await this.prisma.rateEvent.count({
      where: {
        key: `otp:${phone}`,
        windowStart: { gte: oneMinuteAgo },
      },
    });

    if (recentCount >= this.configService.get("OTP_RATE_LIMIT_PER_MINUTE")) {
      throw new HttpException(
        "Rate limit exceeded. Please wait before requesting another OTP.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check per-day limit
    const dailyCount = await this.prisma.rateEvent.count({
      where: {
        key: `otp:${phone}`,
        windowStart: { gte: oneDayAgo },
      },
    });

    if (dailyCount >= this.configService.get("OTP_RATE_LIMIT_PER_DAY")) {
      throw new HttpException(
        "Daily OTP limit exceeded. Please try again tomorrow.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordRateLimit(phone: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (now.getTime() % 60000)); // Round down to minute

    await this.prisma.rateEvent.upsert({
      where: {
        key_windowStart: {
          key: `otp:${phone}`,
          windowStart,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        key: `otp:${phone}`,
        windowStart,
        count: 1,
      },
    });
  }

  private async sendOtp(phone: string, code: string): Promise<void> {
    const isDev = this.configService.get("NODE_ENV") === "development";
    const debugMode = this.configService.get("DEV_OTP_DEBUG");

    if (isDev && debugMode) {
      // Log to console
      console.log(`🔐 OTP for ${phone}: ${code}`);

      // Log to file
      const fs = require("fs");
      const path = require("path");
      const logFile = this.configService.get("DEV_OTP_LOG_FILE");
      const logDir = path.dirname(logFile);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(
        logFile,
        `${new Date().toISOString()} - ${phone}: ${code}\n`,
      );
    } else {
      // Send via MSG91
      await this.sendViaMsg91(phone, code);
    }
  }

  private async sendViaMsg91(phone: string, code: string): Promise<void> {
    const apiKey = this.configService.get("MSG91_API_KEY");
    const senderId = this.configService.get("MSG91_SENDER_ID");
    const templateId = this.configService.get("MSG91_TEMPLATE_ID_LOGIN");

    if (!apiKey || !templateId) {
      console.warn("MSG91 not configured, skipping SMS send");
      return;
    }

    try {
      const response = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: apiKey,
        },
        body: JSON.stringify({
          flow_id: templateId,
          sender: senderId,
          mobiles: phone,
          var: code,
        }),
      });

      if (!response.ok) {
        throw new Error(`MSG91 API error: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to send SMS:", error);
      throw new Error("Failed to send OTP");
    }
  }
}
