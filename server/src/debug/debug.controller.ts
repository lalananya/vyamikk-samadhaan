import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Config } from "../config/config.schema";
import { DebugService } from "./debug.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Debug")
@Controller("__debug")
@UseGuards(JwtAuthGuard)
export class DebugController {
  constructor(
    private debugService: DebugService,
    private configService: ConfigService<Config>,
  ) {}

  @Get("otp/:phone")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get last OTP for phone (DEV only)" })
  @ApiResponse({ status: 200, description: "Last OTP retrieved" })
  @ApiResponse({ status: 404, description: "No OTP found" })
  async getLastOtp(@Param("phone") phone: string) {
    if (this.configService.get("NODE_ENV") !== "development") {
      throw new Error("Debug endpoint only available in development");
    }

    return this.debugService.getLastOtp(phone);
  }
}
