import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
} from "./dto/organization.dto";
import {
  SYSTEM_ROLES,
  PERMISSION_SCOPES,
  RESOURCES,
  ACTIONS,
} from "../../../src/types/organization";

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateOrganizationDto) {
    // Check if user already has an organization
    const existingMember = await this.prisma.member.findFirst({
      where: { userId, status: "active" },
    });

    if (existingMember) {
      throw new ConflictException("User already belongs to an organization");
    }

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type || "msme",
        industry: data.industry,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
        email: data.email,
        website: data.website,
        settings: {
          timezone: data.timezone || "Asia/Kolkata",
          currency: data.currency || "INR",
          workingDays: data.workingDays || [1, 2, 3, 4, 5], // Monday-Friday
          workingHours: {
            start: data.workingHours?.start || "09:00",
            end: data.workingHours?.end || "18:00",
          },
          attendance: {
            allowSelfCheckIn: true,
            requireLocation: false,
            allowOvertime: true,
          },
          billing: {
            autoGenerateInvoices: false,
            invoicePrefix: "INV",
            paymentTerms: 30,
          },
        },
      },
    });

    // Create owner role
    const ownerRole = await this.createSystemRole(organization.id, "OWNER");

    // Add user as owner
    await this.prisma.member.create({
      data: {
        organizationId: organization.id,
        userId,
        roleId: ownerRole.id,
        status: "active",
        permissions: ["*"], // All permissions for owner
        metadata: {},
      },
    });

    // Create other system roles
    await this.createSystemRoles(organization.id);

    return organization;
  }

  async findUserOrganizations(userId: string) {
    return this.prisma.member.findMany({
      where: { userId, status: "active" },
      include: {
        organization: true,
        role: true,
      },
    });
  }

  async findById(id: string, userId: string) {
    // Check if user has access to this organization
    const member = await this.prisma.member.findFirst({
      where: { organizationId: id, userId, status: "active" },
    });

    if (!member) {
      throw new ForbiddenException("Access denied to organization");
    }

    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            role: true,
          },
        },
        roles: true,
      },
    });
  }

  async update(id: string, userId: string, data: UpdateOrganizationDto) {
    // Check if user is owner or has manage permissions
    const member = await this.prisma.member.findFirst({
      where: {
        organizationId: id,
        userId,
        status: "active",
        permissions: {
          array_contains: ["organization:manage"],
        },
      },
    });

    if (!member) {
      throw new ForbiddenException(
        "Insufficient permissions to update organization",
      );
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async inviteMember(
    organizationId: string,
    userId: string,
    data: InviteMemberDto,
  ) {
    // Check if user has invite permissions
    const member = await this.prisma.member.findFirst({
      where: {
        organizationId,
        userId,
        status: "active",
        permissions: {
          array_contains: ["members:manage"],
        },
      },
    });

    if (!member) {
      throw new ForbiddenException(
        "Insufficient permissions to invite members",
      );
    }

    // Check if user is already a member
    const existingMember = await this.prisma.member.findFirst({
      where: {
        organizationId,
        OR: [{ userId: data.userId }, { email: data.email }],
      },
    });

    if (existingMember) {
      throw new ConflictException(
        "User is already a member of this organization",
      );
    }

    // Generate invite token
    const token = this.generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.prisma.invite.create({
      data: {
        organizationId,
        email: data.email,
        phone: data.phone,
        roleId: data.roleId,
        invitedBy: userId,
        token,
        expiresAt,
        metadata: {
          message: data.message,
        },
      },
    });
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { organization: true, role: true },
    });

    if (!invite || invite.status !== "pending") {
      throw new NotFoundException("Invalid or expired invite");
    }

    if (invite.expiresAt < new Date()) {
      throw new NotFoundException("Invite has expired");
    }

    // Check if user is already a member
    const existingMember = await this.prisma.member.findFirst({
      where: { organizationId: invite.organizationId, userId },
    });

    if (existingMember) {
      throw new ConflictException(
        "User is already a member of this organization",
      );
    }

    // Create member
    const member = await this.prisma.member.create({
      data: {
        organizationId: invite.organizationId,
        userId,
        roleId: invite.roleId,
        status: "active",
        invitedBy: invite.invitedBy,
        permissions: invite.role.permissions || [],
        metadata: {},
      },
    });

    // Update invite status
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    return member;
  }

  private async createSystemRole(
    organizationId: string,
    roleType: keyof typeof SYSTEM_ROLES,
  ) {
    const roleData = SYSTEM_ROLES[roleType];

    return this.prisma.role.create({
      data: {
        organizationId,
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
        level: roleData.level,
        permissions: {
          create: roleData.permissions.map((permission) => ({
            permission: {
              connectOrCreate: {
                where: { name: permission },
                create: {
                  name: permission,
                  resource: this.extractResource(permission),
                  action: this.extractAction(permission),
                  scope: PERMISSION_SCOPES.ORGANIZATION,
                },
              },
            },
          })),
        },
      },
    });
  }

  private async createSystemRoles(organizationId: string) {
    const roles = ["MANAGER", "ACCOUNTANT", "OPERATOR"];

    for (const roleType of roles) {
      await this.createSystemRole(
        organizationId,
        roleType as keyof typeof SYSTEM_ROLES,
      );
    }
  }

  private generateInviteToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private extractResource(permission: string): string {
    if (permission === "*") return "*";
    return permission.split(":")[0];
  }

  private extractAction(permission: string): string {
    if (permission === "*") return "*";
    return permission.split(":")[1] || "read";
  }
}
