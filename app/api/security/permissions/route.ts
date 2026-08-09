import { NextRequest, NextResponse } from "next/server";

import {
  PermissionAction,
  SecurityRole,
} from "@/types/security";

import {
  getRolePermissions,
  hasPermission,
} from "@/lib/security/permissions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const role = searchParams.get("role");
    const permissionModule = searchParams.get("module");
    const action = searchParams.get("action");

    if (role) {
      if (
        !Object.values(SecurityRole).includes(
          role as SecurityRole
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid security role.",
          },
          { status: 400 }
        );
      }

      const securityRole = role as SecurityRole;

      if (permissionModule && action) {
        if (
          !Object.values(PermissionAction).includes(
            action as PermissionAction
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid permission action.",
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            role: securityRole,
            module: permissionModule,
            action,
            allowed: hasPermission(
              securityRole,
              permissionModule,
              action as PermissionAction
            ),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          role: securityRole,
          permissions: getRolePermissions(securityRole),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: Object.values(SecurityRole).map((securityRole) => ({
        role: securityRole,
        permissions: getRolePermissions(securityRole),
      })),
    });
  } catch (error) {
    console.error("GET /api/security/permissions", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch permissions.",
      },
      { status: 500 }
    );
  }
}
