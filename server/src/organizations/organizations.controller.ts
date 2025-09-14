import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  AcceptInviteDto,
  UpdateMemberRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
} from "./dto/organization.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  async create(@Request() req, @Body() createOrgDto: CreateOrganizationDto) {
    return this.organizationsService.create(req.user.id, createOrgDto);
  }

  @Get("my")
  async getMyOrganizations(@Request() req) {
    return this.organizationsService.findUserOrganizations(req.user.id);
  }

  @Get(":id")
  async findOne(@Request() req, @Param("id") id: string) {
    return this.organizationsService.findById(id, req.user.id);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles("organization:manage")
  async update(
    @Request() req,
    @Param("id") id: string,
    @Body() updateOrgDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, req.user.id, updateOrgDto);
  }

  @Post(":id/invite")
  @UseGuards(RolesGuard)
  @Roles("members:manage")
  async inviteMember(
    @Request() req,
    @Param("id") organizationId: string,
    @Body() inviteDto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(
      organizationId,
      req.user.id,
      inviteDto,
    );
  }

  @Post("invites/accept")
  async acceptInvite(@Request() req, @Body() acceptDto: AcceptInviteDto) {
    return this.organizationsService.acceptInvite(acceptDto.token, req.user.id);
  }

  @Get(":id/members")
  @UseGuards(RolesGuard)
  @Roles("members:read")
  async getMembers(@Request() req, @Param("id") organizationId: string) {
    return this.organizationsService.getMembers(organizationId, req.user.id);
  }

  @Put(":id/members/:memberId/role")
  @UseGuards(RolesGuard)
  @Roles("members:manage")
  async updateMemberRole(
    @Request() req,
    @Param("id") organizationId: string,
    @Param("memberId") memberId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(
      organizationId,
      memberId,
      req.user.id,
      updateRoleDto,
    );
  }

  @Delete(":id/members/:memberId")
  @UseGuards(RolesGuard)
  @Roles("members:manage")
  async removeMember(
    @Request() req,
    @Param("id") organizationId: string,
    @Param("memberId") memberId: string,
  ) {
    return this.organizationsService.removeMember(
      organizationId,
      memberId,
      req.user.id,
    );
  }

  @Get(":id/roles")
  @UseGuards(RolesGuard)
  @Roles("roles:read")
  async getRoles(@Request() req, @Param("id") organizationId: string) {
    return this.organizationsService.getRoles(organizationId, req.user.id);
  }

  @Post(":id/roles")
  @UseGuards(RolesGuard)
  @Roles("roles:manage")
  async createRole(
    @Request() req,
    @Param("id") organizationId: string,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.organizationsService.createRole(
      organizationId,
      req.user.id,
      createRoleDto,
    );
  }

  @Put(":id/roles/:roleId")
  @UseGuards(RolesGuard)
  @Roles("roles:manage")
  async updateRole(
    @Request() req,
    @Param("id") organizationId: string,
    @Param("roleId") roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.organizationsService.updateRole(
      organizationId,
      roleId,
      req.user.id,
      updateRoleDto,
    );
  }

  @Delete(":id/roles/:roleId")
  @UseGuards(RolesGuard)
  @Roles("roles:manage")
  async deleteRole(
    @Request() req,
    @Param("id") organizationId: string,
    @Param("roleId") roleId: string,
  ) {
    return this.organizationsService.deleteRole(
      organizationId,
      roleId,
      req.user.id,
    );
  }

  @Get(":id/permissions")
  @UseGuards(RolesGuard)
  @Roles("permissions:read")
  async getPermissions(@Request() req, @Param("id") organizationId: string) {
    return this.organizationsService.getPermissions(
      organizationId,
      req.user.id,
    );
  }
}
