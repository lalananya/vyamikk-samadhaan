import { Module } from "@nestjs/common";
import { DebugController } from "./debug.controller";
import { DebugService } from "./debug.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [DebugController],
  providers: [DebugService, PrismaService],
})
export class DebugModule {}
