import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { Roles } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.params.id || request.body.organizationId;

    if (!organizationId) {
      throw new ForbiddenException(
        "Organization ID required for role validation",
      );
    }

    // Get user's role and permissions in this organization
    const member = await this.prisma.member.findFirst({
      where: {
        organizationId,
        userId: user.id,
        status: "active",
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new ForbiddenException("User is not a member of this organization");
    }

    // Check if user has required permissions
    const userPermissions = this.getUserPermissions(member);

    for (const requiredRole of requiredRoles) {
      if (!this.hasPermission(userPermissions, requiredRole)) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredRole}`,
        );
      }
    }

    // Add member info to request for use in controllers
    request.member = member;
    request.userPermissions = userPermissions;

    return true;
  }

  private getUserPermissions(member: any): string[] {
    const permissions: string[] = [];

    // Add permissions from role
    if (member.role?.permissions) {
      for (const rolePermission of member.role.permissions) {
        const permission = rolePermission.permission;
        const permissionString = `${permission.resource}:${permission.action}`;
        permissions.push(permissionString);
      }
    }

    // Add direct permissions from member
    if (member.permissions && Array.isArray(member.permissions)) {
      permissions.push(...member.permissions);
    }

    // If user has wildcard permission, they have all permissions
    if (permissions.includes("*")) {
      return ["*"];
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  private hasPermission(
    userPermissions: string[],
    requiredPermission: string,
  ): boolean {
    // Wildcard permission grants everything
    if (userPermissions.includes("*")) {
      return true;
    }

    // Check for exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard matches (e.g., 'employees:*' matches 'employees:create')
    const [resource, action] = requiredPermission.split(":");
    if (userPermissions.includes(`${resource}:*`)) {
      return true;
    }

    // Check for manage permission (e.g., 'employees:manage' grants all employee permissions)
    if (userPermissions.includes(`${resource}:manage`)) {
      return true;
    }

    return false;
  }
}
