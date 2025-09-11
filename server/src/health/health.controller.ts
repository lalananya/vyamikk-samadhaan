import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller()
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get("healthz")
  @ApiOperation({ summary: "Liveness probe" })
  @ApiResponse({ status: 200, description: "Service is alive" })
  async liveness() {
    return this.healthService.liveness();
  }

  @Get("readyz")
  @ApiOperation({ summary: "Readiness probe" })
  @ApiResponse({ status: 200, description: "Service is ready" })
  @ApiResponse({ status: 503, description: "Service is not ready" })
  async readiness() {
    return this.healthService.readiness();
  }
}
