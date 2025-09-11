import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthService } from "./jwt.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { OtpService } from "../otp/otp.service";
import { PrismaService } from "../prisma/prisma.service";
import { Config } from "../config/config.schema";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<Config>) => ({
        secret: configService.get("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthService,
    JwtStrategy,
    OtpService,
    PrismaService,
  ],
  exports: [AuthService, JwtAuthService],
})
export class AuthModule {}
