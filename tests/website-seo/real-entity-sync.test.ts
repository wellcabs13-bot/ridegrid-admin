// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { realEntityCandidates, syncRealEntities } from "../../lib/website-seo/entities/real-sync";
import type { PricingOption } from "../../lib/website-public/marketplace";
import { prisma } from "../../lib/prisma";
const { options } = vi.hoisted(() => ({ options: vi.fn() }));
vi.mock("../../app/api/marketplace/options/route", () => ({ GET: options }));
vi.mock("../../lib/prisma", () => ({ prisma: { $transaction: vi.fn(), vehicle: { findMany: vi.fn() }, websiteSeoEntity: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, systemSetting: { create: vi.fn() } } }));
const route: PricingOption = { id:"package-a", pricingType:"OUTSTATION", tripType:"ONEWAY", fromCity:"  Pune  ", toCity:"Mumbai", vehicleCategory:"SEDAN", packageName:"Pune to Mumbai", city:null, airportName:null, transferDirection:null, includedKm:null };
beforeEach(() => {
  vi.clearAllMocks();
  options.mockImplementation(async () => Response.json({success:true,data:[route]}));
  vi.mocked(prisma.vehicle.findMany).mockResolvedValue([{category:"SEDAN"}] as never);
  vi.mocked(prisma.websiteSeoEntity.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.$transaction).mockImplementation(async (operation: any) => operation(prisma));
});
describe("real entity import", () => {
  it("normalizes and deduplicates routes without invented areas or unavailable vehicles", () => {
    const result = realEntityCandidates([route,{...route,id:"package-b",fromCity:"Pune"}],[]);
    expect(result.candidates.map(c => c.type).sort()).toEqual(["CITY","CITY","ROUTE","SERVICE"]);
    expect(result.candidates.find(c => c.type === "ROUTE")).toMatchObject({slug:"pune-to-mumbai",name:"Pune to Mumbai",metadata:{realSource:{sourceCount:2}}});
    expect(realEntityCandidates([{...route,toCity:"Pune"}],[]).candidates).toEqual([]);
  });
  it("dry runs without writes, then creates drafts with an audit", async () => {
    expect((await syncRealEntities()).created).toBe(5);
    expect(prisma.websiteSeoEntity.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect((await syncRealEntities({dryRun:false,actor:"reviewer"})).created).toBe(5);
    expect(prisma.websiteSeoEntity.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"DRAFT"})}));
    expect(prisma.systemSetting.create).toHaveBeenCalledOnce();
  });
  it("is idempotent despite database JSON key ordering and preserves editorial records", async () => {
    const rows = realEntityCandidates([route],["SEDAN"]).candidates;
    vi.mocked(prisma.websiteSeoEntity.findUnique).mockImplementation(async (args: any) => {
      const c = rows.find(c => c.slug === args.where.type_slug.slug)!;
      const source = c.metadata.realSource as Record<string, unknown>;
      return {...c,metadata:{...c.metadata,realSource:Object.fromEntries(Object.entries(source).reverse())},status:"ACTIVE"} as never;
    });
    expect((await syncRealEntities({dryRun:false})).unchanged).toBe(5);
    expect(prisma.websiteSeoEntity.update).not.toHaveBeenCalled();
    vi.mocked(prisma.websiteSeoEntity.findUnique).mockResolvedValue({sourceId:"editorial"} as never);
    expect((await syncRealEntities({dryRun:false})).skipped).toBe(5);
  });
  it("fails closed on unavailable sources", async () => {
    options.mockResolvedValue(Response.json({success:false},{status:503}));
    await expect(syncRealEntities({dryRun:false})).rejects.toThrow("unavailable");
    expect(prisma.websiteSeoEntity.create).not.toHaveBeenCalled();
  });
});
