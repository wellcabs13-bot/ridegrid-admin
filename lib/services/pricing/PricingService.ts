import { PricingType, TripType, VehicleCategory } from "@prisma/client";
import { quoteService } from "./QuoteService";
import { canonicalService, decimal, PricingError } from "./engine";

export interface PricingRequest {
  vendorId:string; vehicleId:string; vehicleCategory:VehicleCategory; pricingType:PricingType; tripType:TripType;
  distanceKm?:number; durationHours?:number; pickupDateTime?:Date; couponId?:string; customerId?:string;
  pricingPackageId?:string; origin?:string; destination?:string; city?:string;
}
export class PricingService {
  async calculate(request:PricingRequest) {
    if(request.couponId) throw new PricingError("COUPON_FUNDING_REQUIRED", "Use an approved discount policy with explicit funding ownership.");
    const quote=await quoteService.quote({vendorId:request.vendorId,vehicleId:request.vehicleId,vehicleCategory:request.vehicleCategory,service:canonicalService(request.pricingType,request.tripType),at:request.pickupDateTime || new Date(),ownerId:`customer:${request.customerId || "unassigned"}`,pricingPackageId:request.pricingPackageId,origin:request.origin,destination:request.destination,city:request.city,...(request.distanceKm!==undefined ? {distanceKm:String(request.distanceKm)}:{}),...(request.durationHours!==undefined ? {durationHours:String(request.durationHours)}:{})});
    const s=quote.snapshot;
    return {baseFare:Number(s.vendorFare),distanceCharge:Number(s.distanceCharge),timeCharge:Number(s.timeCharge),nightCharge:0,discountAmount:decimal(s.vendorFundedDiscount).plus(s.rideGridFundedDiscount).toNumber(),extraCharges:Number(s.passThroughTotal),taxableAmount:s.taxComponents.reduce((sum,t)=>sum.plus(t.taxableAmount),decimal(0)).toNumber(),taxAmount:Number(s.taxAmount),finalFare:Number(s.finalPayable),vendorEarning:Number(s.vendorPayout),platformCommission:0,driverPayout:0,quoteId:quote.id,priceSnapshot:s};
  }
}
export const pricingService=new PricingService();
