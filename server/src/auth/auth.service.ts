import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OtpService } from "../otp/otp.service";
import { JwtAuthService } from "./jwt.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private jwtService: JwtAuthService,
  ) {}

  async login(phone: string): Promise<{ otpToken: string; resendIn: number }> {
    return this.otpService.generateOtp(phone);
  }

  async verify(
    otpToken: string,
    code: string,
    deviceInfo?: any,
  ): Promise<{
    accessJwt: string;
    refreshJwt: string;
    user: { id: string; phone: string };
  }> {
    // Verify OTP
    const { phone, isValid } = await this.otpService.verifyOtp(otpToken, code);

    if (!isValid) {
      throw new BadRequestException("Invalid OTP code");
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          countryCode: "+91",
        },
      });
    }

    // Generate tokens
    const { accessJwt, refreshJwt } = await this.jwtService.generateTokenPair(
      user.id,
      user.phone,
      deviceInfo,
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

  async refresh(
    refreshJwt: string,
  ): Promise<{ accessJwt: string; refreshJwt: string }> {
    return this.jwtService.refreshTokens(refreshJwt);
  }

  async logout(refreshJwt: string): Promise<void> {
    await this.jwtService.revokeRefreshToken(refreshJwt);
  }

  async getProfile(userId: string): Promise<{
    id: string;
    phone: string;
    orgs: any[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOrgRoles: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      phone: user.phone,
      orgs: user.userOrgRoles.map((role) => ({
        id: role.org.id,
        name: role.org.name,
        role: role.role,
      })),
    };
  }
}
