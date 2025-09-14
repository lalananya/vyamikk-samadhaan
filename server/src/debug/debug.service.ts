import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DebugService {
  constructor(private prisma: PrismaService) {}

  async getLastOtp(phone: string) {
    const otp = await this.prisma.otp.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      throw new NotFoundException("No OTP found for this phone");
    }

    return {
      phone: otp.phone,
      attempts: otp.attempts,
      expiresAt: otp.expiresAt,
      createdAt: otp.createdAt,
      isExpired: otp.expiresAt < new Date(),
    };
  }
}
