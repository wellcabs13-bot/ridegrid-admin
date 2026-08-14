import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  corporateService,
} from "@/lib/services/corporate/CorporateService";

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");
    const email = searchParams.get("email");
    const gstNumber =
      searchParams.get("gstNumber");

    const resource =
      searchParams.get("resource");

    if (id) {
      if (resource === "branches") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getBranches(id),
        });
      }

      if (resource === "employees") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getEmployees(id),
        });
      }

      if (resource === "departments") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getDepartments(id),
        });
      }

      if (resource === "cost-centers") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getCostCenters(id),
        });
      }

      if (resource === "travel-policies") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getTravelPolicies(id),
        });
      }

      if (resource === "wallet") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getWallet(id),
        });
      }

      if (resource === "approval-rules") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getApprovalRules(id),
        });
      }

      if (resource === "contracts") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getContracts(id),
        });
      }

      if (resource === "invoice-settings") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getInvoiceSetting(id),
        });
      }

      if (resource === "discounts") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getDiscounts(id),
        });
      }

      if (resource === "reports") {
        return NextResponse.json({
          success: true,
          data:
            await corporateService.getReports(id),
        });
      }

      const corporate =
        await corporateService.getById(id);

      if (!corporate) {
        return NextResponse.json(
          {
            success: false,
            message: "Corporate not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: corporate,
      });
    }

    if (email) {
      const corporate =
        await corporateService.getByEmail(email);

      return NextResponse.json({
        success: true,
        data: corporate,
      });
    }

    if (gstNumber) {
      const corporate =
        await corporateService.getByGST(
          gstNumber
        );

      return NextResponse.json({
        success: true,
        data: corporate,
      });
    }

    const corporates =
      await corporateService.getAll();

    return NextResponse.json({
      success: true,
      data: corporates,
    });
  } catch (error) {
    console.error(
      "GET /api/corporate:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch corporate data.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const {
      companyName,
      email,
      mobile,
      address,
      city,
      state,
      pincode,
    } = body;

    if (
      !companyName ||
      !email ||
      !mobile ||
      !address ||
      !city ||
      !state ||
      !pincode
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Required corporate fields are missing.",
        },
        { status: 400 }
      );
    }

    const data: any = {
      companyName,
      legalName: body.legalName ?? null,
      gstNumber: body.gstNumber ?? null,
      panNumber: body.panNumber ?? null,
      email,
      mobile,
      website: body.website ?? null,
      address,
      city,
      state,
      country: body.country ?? "India",
      pincode,
      status: body.status,
      billingCycle: body.billingCycle,
      approvalFlow: body.approvalFlow,
      creditLimit:
        body.creditLimit ?? null,
      paymentTermsDays:
        body.paymentTermsDays ?? 30,
      accountManagerName:
        body.accountManagerName ?? null,
      accountManagerEmail:
        body.accountManagerEmail ?? null,
      accountManagerMobile:
        body.accountManagerMobile ?? null,
    };

    const corporate =
      await corporateService.create(data);

    return NextResponse.json(
      {
        success: true,
        message:
          "Corporate created successfully.",
        data: corporate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/corporate:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create corporate.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Corporate id is required.",
        },
        { status: 400 }
      );
    }

    const { id, ...updates } = body;

    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.deletedAt;

    const corporate =
      await corporateService.update(
        id,
        updates as any
      );

    return NextResponse.json({
      success: true,
      message:
        "Corporate updated successfully.",
      data: corporate,
    });
  } catch (error) {
    console.error(
      "PATCH /api/corporate:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update corporate.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Corporate id is required.",
        },
        { status: 400 }
      );
    }

    await corporateService.delete(id);

    return NextResponse.json({
      success: true,
      message:
        "Corporate archived successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/corporate:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to archive corporate.",
      },
      { status: 500 }
    );
  }
}