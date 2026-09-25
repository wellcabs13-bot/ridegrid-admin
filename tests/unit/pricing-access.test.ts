// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const mocks=vi.hoisted(()=>({ permission:vi.fn(), vendor:vi.fn() }));
vi.mock("@/lib/request-access",()=>({requestPermission:mocks.permission}));
vi.mock("@/lib/prisma",()=>({prisma:{vendor:{findFirst:mocks.vendor}}}));
import { pricingAccess } from "@/lib/services/pricing/access";
beforeEach(()=>{vi.resetAllMocks();mocks.permission.mockResolvedValue({user:{id:"user",role:"VENDOR"},denied:null});mocks.vendor.mockResolvedValue({id:"own-vendor"});});
describe("pricing request ownership",()=>{
  it("derives the vendor identifier from the authenticated account",async()=>{const a=await pricingAccess(new NextRequest("https://ridegrid.test/api/pricing/manage"));expect(a.vendorId).toBe("own-vendor");});
  it("rejects a forged vendor identifier",async()=>{await expect(pricingAccess(new NextRequest("https://ridegrid.test/api/pricing/manage"),"other-vendor")).rejects.toThrow("own fares");});
  it("rejects unauthenticated requests",async()=>{mocks.permission.mockResolvedValue({user:null,denied:NextResponse.json({}, {status:401})});await expect(pricingAccess(new NextRequest("https://ridegrid.test/api/pricing/manage"))).rejects.toMatchObject({status:401});});
  it("does not turn operations dashboard access into pricing permission",async()=>{mocks.permission.mockResolvedValue({user:{id:"operations",role:"OPERATIONS"},denied:null});await expect(pricingAccess(new NextRequest("https://ridegrid.test/api/pricing/manage"))).rejects.toMatchObject({status:403});});
  it("maps finance policy permissions without granting rate approval",async()=>{mocks.permission.mockResolvedValue({user:{id:"finance",role:"FINANCE"},denied:null});const a=await pricingAccess(new NextRequest("https://ridegrid.test/api/pricing/manage"));expect(a.finance).toBe(true);expect(a.admin).toBe(false);});
});
