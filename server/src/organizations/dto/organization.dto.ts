import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsEnum(["msme", "enterprise", "ngo"])
  type?: "msme" | "enterprise" | "ngo";

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: number[];

  @IsOptional()
  @IsObject()
  workingHours?: {
    start: string;
    end: string;
  };
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class AcceptInviteDto {
  @IsString()
  token: string;
}

export class UpdateMemberRoleDto {
  @IsString()
  roleId: string;
}

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
