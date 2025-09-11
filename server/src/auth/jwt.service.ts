import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService as NestJwtService } from "@nestjs/jwt";
import { Config } from "../config/config.schema";
import { PrismaService } from "../prisma/prisma.service";
import { randomBytes } from "crypto";

@Injectable()
export class JwtAuthService {
  constructor(
    private jwtService: NestJwtService,
    private configService: ConfigService<Config>,
    private prisma: PrismaService,
  ) {}

  async generateTokenPair(
    userId: string,
    phone: string,
    deviceInfo?: any,
  ): Promise<{
    accessJwt: string;
    refreshJwt: string;
  }> {
    const jti = randomBytes(16).toString("hex");
    const now = Math.floor(Date.now() / 1000);

    // Generate access token (15 minutes)
    const accessJwt = this.jwtService.sign(
      {
        sub: userId,
        phone,
        jti,
        iat: now,
      },
      {
        secret: this.configService.get("JWT_ACCESS_SECRET"),
        expiresIn: "15m",
      },
    );

    // Generate refresh token (30 days)
    const refreshJwt = this.jwtService.sign(
      {
        sub: userId,
        phone,
        jti,
        iat: now,
        type: "refresh",
      },
      {
        secret: this.configService.get("JWT_REFRESH_SECRET"),
        expiresIn: "30d",
      },
    );

    // Store refresh token in database
    const refreshHash = await this.hashToken(refreshJwt);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.session.create({
      data: {
        userId,
        refreshHash,
        expiresAt,
        deviceModel: deviceInfo?.model,
        devicePlatform: deviceInfo?.platform,
        appVersion: deviceInfo?.appVersion,
      },
    });

    return { accessJwt, refreshJwt };
  }

  async refreshTokens(refreshJwt: string): Promise<{
    accessJwt: string;
    refreshJwt: string;
  }> {
    // Verify refresh token
    const payload = this.jwtService.verify(refreshJwt, {
      secret: this.configService.get("JWT_REFRESH_SECRET"),
    });

    if (payload.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    // Find session in database
    const refreshHash = await this.hashToken(refreshJwt);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshHash,
        active: true,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new Error("Invalid or expired refresh token");
    }

    // Revoke old refresh token
    await this.prisma.session.update({
      where: { id: session.id },
      data: { active: false },
    });

    // Generate new token pair
    return this.generateTokenPair(session.userId, session.user.phone, {
      model: session.deviceModel,
      platform: session.devicePlatform,
      appVersion: session.appVersion,
    });
  }

  async revokeRefreshToken(refreshJwt: string): Promise<void> {
    const refreshHash = await this.hashToken(refreshJwt);

    await this.prisma.session.updateMany({
      where: {
        refreshHash,
        active: true,
      },
      data: { active: false },
    });
  }

  private async hashToken(token: string): Promise<string> {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
