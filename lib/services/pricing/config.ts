import { Band, Charge, Discount, Fee, PricingError, Tax, Terms, decimal, nonnegative } from "./engine";
export const KINDS = ["MASTER", "BAND", "FEE", "TAX", "CHARGES", "DISCOUNT"] as const;
export type Kind = typeof KINDS[number];
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PricingError("INVALID_INPUT", "Expected an object", 400);
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string, required = true) {
  if (typeof value !== "string" || value.length > 500 || (required && !value.trim())) throw new PricingError("INVALID_INPUT", `Invalid ${label}`, 400);
  return value.trim();
}
export function date(value: unknown, label: string) {
  const result = new Date(text(value, label));
  if (!Number.isFinite(result.getTime())) throw new PricingError("INVALID_INPUT", `Invalid ${label}`, 400);
  return result;
}
export function terms(value: unknown): Terms {
  const v = object(value);
  if (!["FIXED", "PER_KM", "PER_HOUR"].includes(String(v.method))) throw new PricingError("INVALID_INPUT", "Invalid calculation method", 400);
  const result = { method: v.method, cancellationReference: text(v.cancellationReference, "cancellation reference") } as Terms;
  for (const k of ["includedKm", "includedHours", "minimumKmPerDay", "perKm", "perHour", "driverAllowance", "waitingPerHour", "nightCharge"] as const) result[k] = nonnegative(v[k], k);
  if (v.fallbackRateVersionId) {
    result.fallbackRateVersionId = text(v.fallbackRateVersionId,"approved fallback version");
    if (!Array.isArray(v.fallbackVendorIds) || !v.fallbackVendorIds.length || v.fallbackVendorIds.length > 100) throw new PricingError("INVALID_INPUT","Fallback needs an explicit vendor allowlist",400);
    result.fallbackVendorIds = v.fallbackVendorIds.map(id=>text(id,"fallback vendor"));
  }
  return result;
}
function percent(v: unknown, name: string) { const n = nonnegative(v, name); if (decimal(n).gt(100)) throw new PricingError("INVALID_INPUT", `${name} exceeds 100`, 400); return n; }
function boolean(v: unknown, name: string) { if (typeof v !== "boolean") throw new PricingError("INVALID_INPUT", `${name} must be true or false`, 400); return v; }
function list(v: unknown) { if (!Array.isArray(v) || v.length > 30) throw new PricingError("INVALID_INPUT", "Expected up to 30 entries", 400); return v; }
export function policyData(kind: Kind, value: unknown): Terms | Band | Fee | Tax[] | Charge[] | Discount {
  if (kind === "MASTER") return terms(value);
  if (kind === "TAX") return list(value).map(item => {
    const v = object(item), components = list(v.components);
    if (!components.length || components.some(c => !["VENDOR_FARE", "PLATFORM_FEE", "PASS_THROUGH"].includes(String(c))) || new Set(components).size !== components.length) throw new PricingError("INVALID_INPUT", "Invalid tax components", 400);
    return { name: text(v.name, "tax name"), rate: percent(v.rate, "tax rate"), components: components as Tax["components"], jurisdiction: text(v.jurisdiction, "jurisdiction"), deductVendorDiscount: boolean(v.deductVendorDiscount, "deduct vendor discount"), deductPlatformDiscount: boolean(v.deductPlatformDiscount, "deduct platform discount") };
  });
  if (kind === "CHARGES") return list(value).map(item => { const v = object(item); return { name: text(v.name, "charge name"), amount: nonnegative(v.amount, "charge amount"), vendorPayable: boolean(v.vendorPayable, "vendor payable"), included: boolean(v.included, "included") }; });
  const v = object(value);
  if (kind === "BAND") {
    const b: Band = { minimum: nonnegative(v.minimum, "minimum"), recommended: nonnegative(v.recommended, "recommended"), maximum: nonnegative(v.maximum, "maximum"), autoMinimum: nonnegative(v.autoMinimum, "auto minimum"), autoMaximum: nonnegative(v.autoMaximum, "auto maximum") };
    if (!(decimal(b.minimum).lte(b.recommended) && decimal(b.recommended).lte(b.maximum) && decimal(b.minimum).lte(b.autoMinimum) && decimal(b.autoMinimum).lte(b.autoMaximum) && decimal(b.autoMaximum).lte(b.maximum))) throw new PricingError("INVALID_INPUT", "Band bounds are inconsistent", 400);
    if (v.smartMinimum !== undefined || v.smartMaximum !== undefined) {
      b.smartMinimum = nonnegative(v.smartMinimum, "Smart Return minimum"); b.smartMaximum = nonnegative(v.smartMaximum, "Smart Return maximum");
      if (decimal(b.smartMinimum).gt(b.smartMaximum)) throw new PricingError("INVALID_INPUT", "Invalid Smart Return band", 400);
    }
    return b;
  }
  if (kind === "FEE") {
    const fee: Fee = { fixed: nonnegative(v.fixed, "fixed fee"), percent: percent(v.percent, "fee percent"), minimum: nonnegative(v.minimum, "minimum fee"), processingFixed: nonnegative(v.processingFixed, "processing cost"), processingPercent: percent(v.processingPercent, "processing percent"), waive: boolean(v.waive, "waive") };
    if (v.maximum !== undefined && v.maximum !== "") { fee.maximum = nonnegative(v.maximum, "maximum fee"); if (decimal(fee.maximum).lt(fee.minimum)) throw new PricingError("INVALID_INPUT", "Maximum fee is below minimum", 400); }
    return fee;
  }
  return { name: text(v.name, "discount name"), fixed: nonnegative(v.fixed, "discount"), percent: percent(v.percent, "discount percent"), cap: nonnegative(v.cap, "cap"), vendorPercent: percent(v.vendorPercent, "vendor funding percent"), budget: nonnegative(v.budget, "budget") };
}
