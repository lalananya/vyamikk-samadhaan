import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidateNested,
  IsPhoneNumber,
  Length,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    example: "+919876543210",
    description: "Phone number with country code",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+91\d{10}$/, { message: "Phone must be in format +91XXXXXXXXXX" })
  phone: string;
}

export class DeviceInfoDto {
  @ApiProperty({ example: "OnePlus 12R", description: "Device model" })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ example: "android", description: "Platform (android/ios)" })
  @IsString()
  @IsOptional()
  platform?: string;

  @ApiProperty({ example: "1.0.0", description: "App version" })
  @IsString()
  @IsOptional()
  appVersion?: string;
}

export class VerifyDto {
  @ApiProperty({
    example: "opaque-otp-token",
    description: "OTP token from login response",
  })
  @IsString()
  @IsNotEmpty()
  otpToken: string;

  @ApiProperty({ example: "123456", description: "6-digit OTP code" })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: "Code must be 6 digits" })
  code: string;

  @ApiProperty({ type: DeviceInfoDto, description: "Device information" })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

export class RefreshDto {
  @ApiProperty({
    example: "refresh-jwt-token",
    description: "Refresh JWT token",
  })
  @IsString()
  @IsNotEmpty()
  refreshJwt: string;
}

export class LogoutDto {
  @ApiProperty({
    example: "refresh-jwt-token",
    description: "Refresh JWT token to revoke",
  })
  @IsString()
  @IsNotEmpty()
  refreshJwt: string;
}

// Response DTOs
export class LoginResponseDto {
  @ApiProperty({
    example: "opaque-otp-token",
    description: "OTP token for verification",
  })
  otpToken: string;

  @ApiProperty({ example: 60, description: "Resend cooldown in seconds" })
  resendIn: number;
}

export class VerifyResponseDto {
  @ApiProperty({ example: "access-jwt-token", description: "Access JWT token" })
  accessJwt: string;

  @ApiProperty({
    example: "refresh-jwt-token",
    description: "Refresh JWT token",
  })
  refreshJwt: string;

  @ApiProperty({
    type: "object",
    description: "User information",
    additionalProperties: false,
    properties: {
      id: { type: "string", example: "uuid" },
      phone: { type: "string", example: "+919876543210" },
    },
  })
  user: {
    id: string;
    phone: string;
  };
}

export class RefreshResponseDto {
  @ApiProperty({
    example: "access-jwt-token",
    description: "New access JWT token",
  })
  accessJwt: string;

  @ApiProperty({
    example: "refresh-jwt-token",
    description: "New refresh JWT token",
  })
  refreshJwt: string;
}

export class UserResponseDto {
  @ApiProperty({ example: "uuid", description: "User ID" })
  id: string;

  @ApiProperty({ example: "+919876543210", description: "Phone number" })
  phone: string;

  @ApiProperty({ example: [], description: "Organizations" })
  orgs: any[];
}

export class ErrorResponseDto {
  @ApiProperty({ example: "INVALID_OTP", description: "Error code" })
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
