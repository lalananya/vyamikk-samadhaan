import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./decorators/public.decorator";
import {
  LoginDto,
  VerifyDto,
  RefreshDto,
  LogoutDto,
  LoginResponseDto,
  VerifyResponseDto,
  RefreshResponseDto,
  UserResponseDto,
  ErrorResponseDto,
} from "./dto/auth.dto";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request OTP for phone number" })
  @ApiResponse({
    status: 200,
    description: "OTP sent successfully",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid phone format",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "Rate limit exceeded",
    type: ErrorResponseDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto.phone);
  }

  @Public()
  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify OTP and get tokens" })
  @ApiResponse({
    status: 200,
    description: "OTP verified successfully",
    type: VerifyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid OTP",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 410,
    description: "OTP expired",
    type: ErrorResponseDto,
  })
  async verify(@Body() verifyDto: VerifyDto): Promise<VerifyResponseDto> {
    return this.authService.verify(
      verifyDto.otpToken,
      verifyDto.code,
      verifyDto.device,
    );
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({
    status: 200,
    description: "Tokens refreshed successfully",
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid refresh token",
    type: ErrorResponseDto,
  })
  async refresh(@Body() refreshDto: RefreshDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(refreshDto.refreshJwt);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  @ApiResponse({ status: 204, description: "Logged out successfully" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  async logout(@Body() logoutDto: LogoutDto): Promise<void> {
    return this.authService.logout(logoutDto.refreshJwt);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
    type: ErrorResponseDto,
  })
  async getProfile(@Req() req: any): Promise<UserResponseDto> {
    return this.authService.getProfile(req.user.userId);
  }
}
