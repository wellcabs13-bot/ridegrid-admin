import { describe, expect, it } from "vitest";
import { Band, CalculationInput, Rate, SERVICES, amount, calculateBreakdown, canonicalService, inBand, nonnegative, resolveRate } from "@/lib/services/pricing/engine";
import { policyData } from "@/lib/services/pricing/config";

const at=new Date("2030-01-02T10:00:00Z");
const scope={vendorId:"v1",vehicleCategory:"SEDAN",service:"OUTSTATION_ONE_WAY",city:"Pune",origin:"Pune",destination:"Mumbai",area:"Airport"};
const rate=(values:Partial<Rate>={}):Rate=>({...scope,city:"",origin:"",destination:"",area:"",id:"default",scopeKey:"scope",version:1,status:"APPROVED",effectiveFrom:new Date("2030-01-01"),effectiveTo:null,fare:"1000",smartReturnFare:null,terms:{},...values});
const band:Band={minimum:"800",recommended:"1000",maximum:"1400",autoMinimum:"900",autoMaximum:"1200"};
const input=():CalculationInput=>({fare:"1000",terms:{method:"FIXED",includedKm:"0",includedHours:"0",minimumKmPerDay:"0",perKm:"0",perHour:"0",driverAllowance:"0",waitingPerHour:"0",nightCharge:"0",cancellationReference:"configured-policy-v1"},fee:{fixed:"20",percent:"5",minimum:"0",processingFixed:"2",processingPercent:"1",waive:false},taxes:[{name:"Configured test tax",rate:"5",components:["VENDOR_FARE","PLATFORM_FEE"],deductVendorDiscount:true,deductPlatformDiscount:false,jurisdiction:"test"}],discounts:[],charges:[{name:"Permit",amount:"100",vendorPayable:true,included:false}]});
describe("deterministic pricing resolution",()=>{
  it("never resolves another vendor's rate",()=>expect(()=>resolveRate([rate({vendorId:"other"})],scope,at)).toThrow("PRICE_UNAVAILABLE"));
  it("prefers a route override over area, city and default",()=>expect(resolveRate([rate(),rate({id:"city",city:"Pune"}),rate({id:"area",area:"Airport"}),rate({id:"route",origin:"Pune",destination:"Mumbai"})],scope,at).id).toBe("route"));
  it("uses area then city then service default",()=>{expect(resolveRate([rate(),rate({id:"city",city:"Pune"}),rate({id:"area",area:"Airport"})],scope,at).id).toBe("area");expect(resolveRate([rate(),rate({id:"city",city:"Pune"})],scope,at).id).toBe("city");});
  it("uses half-open effective intervals",()=>{expect(resolveRate([rate({id:"old",effectiveTo:at}),rate({id:"new",version:2,effectiveFrom:at})],scope,at).id).toBe("new");});
  it("does not use stale or unapproved rates",()=>expect(()=>resolveRate([rate({status:"PENDING"}),rate({effectiveTo:at}),rate({effectiveFrom:new Date("2031-01-01")})],scope,at)).toThrow("PRICE_UNAVAILABLE"));
  it("rejects equally specific conflicting rates",()=>expect(()=>resolveRate([rate(),rate({id:"duplicate"})],scope,at)).toThrow("CONFLICTING_RATES"));
  it("cannot use a package rate for a different package",()=>expect(()=>resolveRate([rate({pricingPackageId:"other"})],{...scope,pricingPackageId:"selected"},at)).toThrow("PRICE_UNAVAILABLE"));
  it("has all twelve stable services without changing legacy enums",()=>{expect(SERVICES).toHaveLength(12);expect(canonicalService("OUTSTATION","ONEWAY")).toBe("OUTSTATION_ONE_WAY");expect(canonicalService("AIRPORT","ONEWAY","DROP")).toBe("AIRPORT_DROP");});
});
describe("Decimal financial breakdown",()=>{
  it("calculates platform fees without deducting from vendor payout",()=>{const s=calculateBreakdown(input());expect(s.platformFee).toBe("70.00");expect(s.vendorPayout).toBe("1100.00");expect(s.taxAmount).toBe("53.50");expect(s.finalPayable).toBe("1223.50");expect(s.rideGridRevenue).toBe("55.76");});
  it("honors fee caps, floors and explicit waivers",()=>{const i=input();i.fee.minimum="80";expect(calculateBreakdown(i).platformFee).toBe("80.00");i.fee.minimum="0";i.fee.maximum="50";expect(calculateBreakdown(i).platformFee).toBe("50.00");i.fee.waive=true;expect(calculateBreakdown(i).platformFee).toBe("0.00");});
  it("uses configured taxable components and jurisdiction",()=>{const i=input();i.taxes[0].components=["PLATFORM_FEE"];expect(calculateBreakdown(i).taxAmount).toBe("3.50");i.taxes=[];expect(calculateBreakdown(i).taxAmount).toBe("0.00");});
  it("vendor-funded discounts reduce payout and eligible tax base",()=>{const i=input();i.discounts=[{name:"vendor",fixed:"100",percent:"0",cap:"100",vendorPercent:"100",budget:"1000"}];const s=calculateBreakdown(i);expect(s.vendorPayout).toBe("1000.00");expect(s.vendorFundedDiscount).toBe("100.00");expect(s.taxAmount).toBe("48.50");expect(s.finalPayable).toBe("1118.50");});
  it("RideGrid discounts leave vendor payout unchanged",()=>{const i=input();i.discounts=[{name:"platform",fixed:"25",percent:"0",cap:"25",vendorPercent:"0",budget:"1000"}];const s=calculateBreakdown(i);expect(s.vendorPayout).toBe("1100.00");expect(s.rideGridFundedDiscount).toBe("25.00");expect(s.rideGridRevenue).toBe("31.01");});
  it("joint funding reconciles to the discount exactly",()=>{const i=input();i.discounts=[{name:"joint",fixed:"0.05",percent:"0",cap:"1",vendorPercent:"50",budget:"1"}];const s=calculateBreakdown(i);expect(s.vendorFundedDiscount).toBe("0.03");expect(s.rideGridFundedDiscount).toBe("0.02");});
  it("excludes included charges from both payable and payout",()=>{const i=input();i.charges[0].included=true;const s=calculateBreakdown(i);expect(s.passThroughTotal).toBe("0.00");expect(s.vendorPayout).toBe("1000.00");});
  it("rounds half-up at paisa boundaries without binary multiplication",()=>{expect(amount("1.005")).toBe("1.01");const i=input();i.fare="0.10";i.fee.fixed="0";i.fee.percent="5";expect(calculateBreakdown(i).platformFee).toBe("0.01");});
  it("calculates minimum kilometres per day and included allowances",()=>{const i=input();i.terms={...i.terms,method:"PER_KM",minimumKmPerDay:"250",includedKm:"100",perKm:"12"};i.days="2";i.distanceKm="200";expect(calculateBreakdown(i).vendorFare).toBe("5800.00");});
  it("calculates hourly, waiting, night duty and driver allowance",()=>{const i=input();i.terms={...i.terms,method:"PER_HOUR",includedHours:"2",perHour:"100",waitingPerHour:"20",nightCharge:"50",driverAllowance:"200"};i.durationHours="4";i.waitingHours="0.5";i.night=true;expect(calculateBreakdown(i).vendorFare).toBe("1460.00");});
  it("blocks excessive discounts instead of silently reducing a payout",()=>{const i=input();i.discounts=[{name:"invalid",fixed:"2000",percent:"0",cap:"2000",vendorPercent:"100",budget:"2000"}];expect(()=>calculateBreakdown(i)).toThrow("DISCOUNT_EXCEEDS_PRICE");});
});
describe("policy validation",()=>{
  it("distinguishes allowed and auto approval bands",()=>{expect(inBand("850",band)).toBe(true);expect(inBand("850",band,true)).toBe(false);expect(inBand("1000",band,true)).toBe(true);expect(inBand("1500",band)).toBe(false);});
  it("rejects inconsistent bands",()=>expect(()=>policyData("BAND",{...band,autoMaximum:"1500"})).toThrow("Band bounds"));
  it("requires explicit tax bases",()=>expect(()=>policyData("TAX",[{name:"GST",rate:"5",components:[],jurisdiction:"test",deductVendorDiscount:true,deductPlatformDiscount:false}])).toThrow("Invalid tax components"));
  it("rejects malformed money and rates",()=>{for(const v of [NaN,Infinity,-1,"-1","1e4",{},"","0x10"])expect(()=>nonnegative(v,"fare")).toThrow();expect(()=>policyData("FEE",{...input().fee,percent:"101"})).toThrow();});
});
