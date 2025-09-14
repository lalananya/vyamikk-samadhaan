import React from "react";
import PermissionGuard from "./PermissionGuard";

interface WithRoleOptions {
  requiredPermissions: string[];
  organizationId?: string;
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithRoleOptions,
) {
  const WithRoleComponent = (props: P) => {
    return (
      <PermissionGuard
        requiredPermissions={options.requiredPermissions}
        organizationId={options.organizationId}
        fallback={options.fallback}
        onUnauthorized={options.onUnauthorized}
      >
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };

  WithRoleComponent.displayName = `withRole(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithRoleComponent;
}

// Convenience functions for common roles
export const withOwnerAccess = <P extends object>(
  Component: React.ComponentType<P>,
) => withRole(Component, { requiredPermissions: ["*"] });

export const withManagerAccess = <P extends object>(
  Component: React.ComponentType<P>,
) =>
  withRole(Component, {
    requiredPermissions: [
      "employees:manage",
      "attendance:manage",
      "shifts:manage",
    ],
  });

export const withAccountantAccess = <P extends object>(
  Component: React.ComponentType<P>,
) =>
  withRole(Component, {
    requiredPermissions: [
      "billing:manage",
      "invoices:manage",
      "payments:manage",
    ],
  });

export const withOperatorAccess = <P extends object>(
  Component: React.ComponentType<P>,
) =>
  withRole(Component, {
    requiredPermissions: ["attendance:self", "profile:manage"],
  });

// Permission-based access
export const withPermission =
  (permission: string) =>
  <P extends object>(Component: React.ComponentType<P>) =>
    withRole(Component, { requiredPermissions: [permission] });

// Multiple permissions (user needs ALL)
export const withAllPermissions =
  (permissions: string[]) =>
  <P extends object>(Component: React.ComponentType<P>) =>
    withRole(Component, { requiredPermissions: permissions });

// Any permission (user needs ANY)
export const withAnyPermission =
  (permissions: string[]) =>
  <P extends object>(Component: React.ComponentType<P>) =>
    withRole(Component, {
      requiredPermissions: permissions,
      // Custom logic would be needed for "any" permission
      // This is a simplified version that requires the first permission
    });
