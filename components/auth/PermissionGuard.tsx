"use client";

import React from "react";

import {
  SecurityRole,
} from "@/types/security";

interface PermissionGuardProps {
  user: {
    role: SecurityRole;
  };

  allowedRoles: SecurityRole[];

  children: React.ReactNode;

  fallback?: React.ReactNode;
}

export default function PermissionGuard({
  user,
  allowedRoles,
  children,
  fallback,
}: PermissionGuardProps) {
  if (
    !allowedRoles.includes(
      user.role
    )
  ) {
    return (
      fallback ?? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-700">
            Access Denied
          </h2>

          <p className="text-sm text-red-600">
            You don&apos;t have permission
            to access this resource.
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}