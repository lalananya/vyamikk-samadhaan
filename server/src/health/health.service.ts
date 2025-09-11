import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async liveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  async readiness() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ready", timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error("Database not ready");
    }
  }
}
