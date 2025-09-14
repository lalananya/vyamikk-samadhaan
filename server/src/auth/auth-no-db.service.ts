import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  private users = new Map<string, any>();
  private otpStore = new Map<string, { code: string; expires: Date }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(phone: string) {
    // Normalize phone
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    if (normalizedPhone.length !== 10) {
      throw new BadRequestException("Invalid phone number");
    }

    // Generate OTP
    const code = "123456"; // Fixed OTP for development
    const otpToken = Math.random().toString(36).substring(2, 15);

    // Store OTP
    this.otpStore.set(otpToken, {
      code,
      expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    console.log(`🔐 OTP for ${phone}: ${code}`);

    return {
      otpToken,
      resendIn: 60,
    };
  }

  async verify(otpToken: string, code: string, device: any) {
    const stored = this.otpStore.get(otpToken);
    if (!stored || stored.expires < new Date()) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    if (stored.code !== code) {
      throw new UnauthorizedException("Invalid OTP code");
    }

    // Remove used OTP
    this.otpStore.delete(otpToken);

    // Create or get user
    const phone = "+919876543210"; // Mock phone
    let user = this.users.get(phone);
    if (!user) {
      user = {
        id: Math.random().toString(36).substring(2, 15),
        phone,
        role: "pro",
        createdAt: new Date(),
      };
      this.users.set(phone, user);
    }

    // Generate tokens
    const accessJwt = this.jwtService.sign(
      { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
      { expiresIn: "15m" },
    );

    const refreshJwt = this.jwtService.sign(
      { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
      { expiresIn: "30d" },
    );

    return {
      accessJwt,
      refreshJwt,
      user: {
        id: user.id,
        phone: user.phone,
      },
    };
  }

  async refresh(refreshJwt: string) {
    try {
      const payload = this.jwtService.verify(refreshJwt);
      const user = this.users.get(payload.phone);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Generate new tokens
      const newAccessJwt = this.jwtService.sign(
        { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
        { expiresIn: "15m" },
      );

      const newRefreshJwt = this.jwtService.sign(
        { sub: user.id, phone: user.phone, jti: Math.random().toString(36) },
        { expiresIn: "30d" },
      );

      return {
        accessJwt: newAccessJwt,
        refreshJwt: newRefreshJwt,
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(refreshJwt: string) {
    // In a real app, you'd blacklist the token
    // For now, just return success
    return;
  }

  async getMe(userId: string) {
    const user = Array.from(this.users.values()).find((u) => u.id === userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      orgs: [],
    };
  }
}
