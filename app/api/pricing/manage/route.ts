import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pricingAccess, pricingResponse } from "@/lib/services/pricing/access";
import { Actor, createRate, savePolicy, transitionRate, lock, evidence } from "@/lib/services/pricing/RateService";
import { PricingError, SERVICES, money, nonnegative, normalize } from "@/lib/services/pricing/engine";
import { object, text } from "@/lib/services/pricing/config";
import { VehicleCategory } from "@prisma/client";
import { saveSimplePolicy, saveSimpleRates, simplePricingData } from "@/lib/services/pricing/SimplePricingService";

export async function GET(request: NextRequest) {
  try {
    const access = await pricingAccess(request, request.nextUrl.searchParams.get("vendorId"));
    if (request.nextUrl.searchParams.get("view") === "simple") return NextResponse.json({ success: true, data: await simplePricingData({ id: access.user.id, admin: access.admin, finance: access.finance, vendorId: access.vendorId }, access.user.role) });
    const vendorId = access.vendorId, now = new Date();
    const [rates, rules, packages, policies, vendors, audit, vehicles] = await Promise.all([
      prisma.pricingRateVersion.findMany({ where: { ...(vendorId ? { vendorId } : {}) }, orderBy: { createdAt:"desc" }, take:500 }),
      prisma.pricingRule.findMany({ where: { ...(vendorId ? { vendorId } : {}) }, take:500 }),
      prisma.pricingPackage.findMany({ where: { vehicle:{ ...(vendorId ? { vendorId } : {}), deletedAt:null } }, orderBy:{ city:"asc" }, take:1000 }),
      prisma.pricingPolicy.findMany({ orderBy:{ createdAt:"desc" }, take:1000 }),
      access.admin || access.finance ? prisma.vendor.findMany({ where:{ deletedAt:null }, select:{ id:true, companyName:true }, take:1000 }) : prisma.vendor.findMany({ where:{ id:vendorId }, select:{ id:true, companyName:true } }),
      prisma.auditLog.findMany({ where:{ entityName:"Pricing", ...(vendorId ? { OR:[{ newValue:{ path:["vendorId"], equals:vendorId } }, { userId:access.user.id }] } : {}) }, orderBy:{ createdAt:"desc" }, take:100 }),
      prisma.vehicle.findMany({ where:{ ...(vendorId ? { vendorId } : {}), deletedAt:null }, select:{ id:true, vendorId:true, category:true, registrationNumber:true, homeCity:true }, take:1000 }),
    ]);
    // Counts intentionally queried independently of the bounded detail lists.
    const scoped = vendorId ? { vendorId } : {};
    const [active, pending, rejected, expiring, smartReturn, missingPackages] = await Promise.all([
      prisma.pricingRateVersion.count({ where:{ ...scoped, status:"APPROVED", effectiveFrom:{ lte:now }, OR:[{ effectiveTo:null }, { effectiveTo:{ gt:now } }] } }),
      prisma.pricingRateVersion.count({ where:{ ...scoped, status:"PENDING" } }),
      prisma.pricingRateVersion.count({ where:{ ...scoped, status:"REJECTED" } }),
      prisma.pricingRateVersion.count({ where:{ ...scoped, status:"APPROVED", effectiveTo:{ gt:now, lte:new Date(now.getTime()+30*86400000) } } }),
      prisma.pricingRateVersion.count({ where:{ ...scoped, status:"APPROVED", smartReturnFare:{ not:null }, effectiveFrom:{ lte:now }, OR:[{ effectiveTo:null }, { effectiveTo:{ gt:now } }] } }),
      prisma.pricingPackage.count({ where:{ isActive:true, vehicle:{ ...scoped, deletedAt:null }, versions:{ none:{ status:"APPROVED", effectiveFrom:{ lte:now }, OR:[{ effectiveTo:null }, { effectiveTo:{ gt:now } }] } } } }),
    ]);
    const visiblePolicies = vendorId ? policies.filter(p => !p.vendorId || p.vendorId === vendorId) : policies;
    return NextResponse.json({ success:true, data:{ role:access.user.role, vendorId, vendors, vehicles, rates, rules, packages, policies:visiblePolicies, audit, services:SERVICES, categories:Object.values(VehicleCategory), overview:{ active, pending, rejected, expiring, smartReturn, packagesWithoutDedicatedRate:missingPackages, feeConfigured:policies.some(p => p.kind === "FEE" && p.active && p.effectiveFrom <= now && (!p.effectiveTo || p.effectiveTo > now)), taxConfigured:policies.some(p => p.kind === "TAX" && p.active && p.effectiveFrom <= now && (!p.effectiveTo || p.effectiveTo > now)) }, limits:{ rates:500, packages:1000, policies:1000, audit:100 } } });
  } catch (error) { return pricingResponse(error); }
}
export async function POST(request: NextRequest) {
  try {
    const b = object(await request.json());
    const access = await pricingAccess(request, typeof b.vendorId === "string" ? b.vendorId : undefined);
    const actor: Actor = { id:access.user.id, admin:access.admin, finance:access.finance, vendorId:access.vendorId };
    const action = text(b.action, "action");
    let data: unknown;
    if (action === "simple-rates") data = await saveSimpleRates(actor, b);
    else if (action === "simple-policy") data = await saveSimplePolicy(actor, b);
    else if (action === "policy") data = await savePolicy(actor, b);
    else if (action === "draft") data = await createRate(actor, b);
    else if (["submit", "approve", "reject", "deactivate"].includes(action)) {
      if (!Number.isInteger(b.expectedVersion)) throw new PricingError("INVALID_INPUT", "Version is required", 400);
      data = await transitionRate(actor, text(b.id,"rate"), action, typeof b.reason === "string" ? b.reason : "", b.expectedVersion as number);
    } else if (action === "bulk") {
      if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 50) throw new PricingError("INVALID_INPUT", "Select 1–50 rates", 400);
      const operation = text(b.operation,"bulk operation");
      if (!["submit", "approve", "reject", "deactivate"].includes(operation)) throw new PricingError("INVALID_INPUT", "Invalid bulk operation", 400);
      // Each item is independently atomic; return explicit partial successes rather than hide them.
      data = [] as unknown[];
      for (const item of b.items) { const v = object(item); try { (data as unknown[]).push({ id:v.id, success:true, rate:await transitionRate(actor,text(v.id,"rate"),operation,String(b.reason || ""),Number(v.version)) }); } catch(error) { (data as unknown[]).push({ id:v.id, success:false, message:error instanceof Error ? error.message : "Failed" }); } }
    } else if (action === "package") {
      const service = text(b.service,"service");
      if (!(SERVICES as readonly string[]).includes(service)) throw new PricingError("INVALID_INPUT","Unknown service",400);
      const ruleId=text(b.pricingRuleId,"rate card"), vehicleId=text(b.vehicleId,"vehicle"), name=text(b.name,"package name"), city=text(b.city,"city");
      const origin=typeof b.origin === "string" ? b.origin.trim() : "", destination=typeof b.destination === "string" ? b.destination.trim() : "";
      if (!!origin !== !!destination || (service.startsWith("OUTSTATION") && !origin)) throw new PricingError("INVALID_INPUT","Both route endpoints are required",400);
      data=await prisma.$transaction(async tx=>{
        const card=await tx.pricingRule.findUniqueOrThrow({where:{id:ruleId}});
        if (!actor.admin && actor.vendorId!==card.vendorId) throw new PricingError("FORBIDDEN","You may manage only your own fares",403);
        const vehicle=await tx.vehicle.findFirst({where:{id:vehicleId,vendorId:card.vendorId,category:card.vehicleCategory,deletedAt:null}});
        if(!vehicle) throw new PricingError("INVALID_INPUT","Vehicle does not belong to the card's vendor/category",400);
        await lock(tx,`package:${vehicleId}:${ruleId}:${normalize(city)}:${normalize(name)}`);
        const previous=await tx.pricingPackage.findFirst({where:{vehicleId,pricingRuleId:ruleId,city:{equals:city,mode:"insensitive"},packageName:{equals:name,mode:"insensitive"}}});
        if(previous) throw new PricingError("DUPLICATE_PACKAGE","This package already exists. Select it and create a rate version.");
        const saved=await tx.pricingPackage.create({data:{vehicleId,pricingRuleId:ruleId,packageType:service,packageName:name,city,fromCity:origin || null,toCity:destination || null,airportName:typeof b.area === "string" && b.area.trim() ? b.area.trim() : null,transferDirection:service==="AIRPORT_DROP" ? "DROP" : service==="AIRPORT_PICKUP" ? "PICKUP" : null,baseFare:money(nonnegative(b.fare,"Your Fare")),isActive:true}});
        await evidence(tx,actor,saved.id,null,{...saved,vendorId:card.vendorId});return saved;
      });
    } else if (action === "card") {
      if (!actor.admin && !actor.vendorId) throw new PricingError("FORBIDDEN", "Vendor permission required", 403);
      const vendorId = actor.vendorId || text(b.vendorId,"vendor"), category = text(b.vehicleCategory,"vehicle category");
      if (!Object.values(VehicleCategory).includes(category as VehicleCategory)) throw new PricingError("INVALID_INPUT", "Invalid category", 400);
      data = await prisma.$transaction(async tx => {
        const rule = await tx.pricingRule.upsert({ where:{ vendorId_vehicleCategory_pricingType_tripType:{ vendorId, vehicleCategory:category as VehicleCategory, pricingType:"LOCAL", tripType:"ONEWAY" } }, update:{}, create:{ vendorId, vehicleCategory:category as VehicleCategory, pricingType:"LOCAL", tripType:"ONEWAY", chargeType:"FIXED", baseFare:0 } });
        await evidence(tx,actor,rule.id,null,{ vendorId, action:"CREATE_CARD", ruleId:rule.id }); return rule;
      });
    } else throw new PricingError("INVALID_INPUT", "Unknown action", 400);
    return NextResponse.json({ success:true, data });
  } catch (error) { return pricingResponse(error); }
}
