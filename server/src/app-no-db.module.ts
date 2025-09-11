import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { APP_GUARD } from "@nestjs/core";

import { configSchema } from "./config/config.schema";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { DebugModule } from "./debug/debug.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    JwtModule.register({
      secret: "default-secret", // Will be overridden by ConfigService
      signOptions: { expiresIn: "15m" },
    }),
    PassportModule,
    AuthModule,
    HealthModule,
    DebugModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
