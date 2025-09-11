import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { ThrottlerGuard } from "@nestjs/throttler";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { Config } from "./config/config.schema";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const configService = app.get(ConfigService<Config>);

  // Security
  app.use(helmet());

  // CORS
  const corsOrigins = configService.get("CORS_ORIGINS");
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Vyaamikk Samadhaan API")
    .setDescription("Production-grade backend for Vyaamikk Samadhaan platform")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // Global prefix
  app.setGlobalPrefix("api/v1");

  const port = configService.get("PORT");
  await app.listen(port, "0.0.0.0");

  logger.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  logger.log(`📚 API Documentation: http://0.0.0.0:${port}/docs`);
}

bootstrap().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
