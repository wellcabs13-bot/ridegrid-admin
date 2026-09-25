export type User = { id: string; name: string; email: string; role: string; mobile?: string | null };
export type Session = { accessToken: string; refreshToken: string; expiresAt: string; user: User };
export type Decision = "ALLOWED" | "APPROVAL_REQUIRED" | "NOT_ALLOWED";
export type PolicyResult = { decision: Decision; reasons: string[] };
export type Fare = {
  vendorFare: string; platformFee: string; taxAmount: string; passThroughTotal: string; discount: string; finalPayable: string;
  taxComponents: { name: string; rate: string; amount: string }[];
  passThroughCharges: { name: string; amount: string; included: boolean }[];
  quoteExpiry: string | null; tripDateTime: string | null; days: string;
};
export type Service = "ONE_WAY" | "ROUNDTRIP" | "LOCAL";
export type Option = { service: Service; city: string; fromCity: string; toCity: string; packageName: string; vehicleCategory: string; pricingPackageId: string };
export type Search = {
  serviceType: "LOCAL" | "OUTSTATION"; tripType: "ONEWAY" | "ROUNDTRIP"; pickupCity: string; dropCity: string;
  date: string; time: string; days: string; category: string; packageName: string;
};
export type Listing = {
  id: string;
  vehicle: { make: string; model: string; variant: string | null; category: string; seatingCapacity: number; luggageCapacity: number | null; fuelType: string; transmission: string; registrationNumber: string };
  vendor: { companyName: string } | null;
  driver: { name: string; verified: boolean } | null;
  pricing: { pricingPackageId: string; packageName: string; tripDays: number; includedKm: number | null; includedHours: number | null; extraKmRate: number | null; extraHourRate: number | null; driverAllowance: number | null; fare: Fare | null };
  policy: PolicyResult;
};
export type SearchResult = { listings: Listing[]; pagination: { page: number; totalPages: number; total: number } };
export type Quote = { id: string; expiresAt: string; vehicleId: string; fare: Fare; policy: PolicyResult };
export type RouteDraft = Pick<Search, "serviceType" | "tripType" | "pickupCity" | "dropCity" | "category" | "packageName">;
export type Trip = {
  id: string; bookingNumber: string; status: string; tripType: string; tripDays: number; service: Service;
  pickupLocation: string; dropLocation: string; pickupDateTime: string; createdAt: string; finalFare: string; fare: Fare | null;
  packageName: string | null;
  vehicle: { make: string; model: string; category: string; registrationNumber: string; seatingCapacity: number };
  vendor: { companyName: string };
  driver: { name: string; mobile: string | null } | null;
  payment: { method: string; status: string } | null;
  tripStatus: string | null;
  approval: { id: string; status: string } | null;
  rebook: RouteDraft | null;
  timeline?: { currentStatus: string; remarks: string | null; changedAt: string }[];
};
export type Page<T> = { items: T[]; page: number; hasMore: boolean };
export type Approval = {
  id: string; status: string; rawStatus: string; amount: string | null; currentStage: string; submittedAt: string; completedAt: string | null;
  ride: {
    pricingPackageId: string; listingId: string; serviceType: "LOCAL" | "OUTSTATION"; tripType: "ONEWAY" | "ROUNDTRIP"; days: string;
    pickupDateTime: string; pickupAddress: string; dropAddress: string; route: { pickupCity: string; dropCity: string; packageName: string };
    vehicle: { make: string; model: string; category: string }; vendorName: string;
    fare: { vendorFare: string; platformFee: string; taxAmount: string; finalPayable: string }; policyReasons: string[]; note: string;
  } | null;
  steps: { level: number; stage: string; status: string; actedAt: string | null; remarks: string | null }[];
  decisionNote: string | null;
  booking: { id: string; bookingNumber: string; status: string } | null;
};
export type Profile = {
  id: string; name: string; employeeCode: string; email: string; mobile: string; designation: string; grade: string | null;
  managerName: string | null; isApprover: boolean; status: string; defaultPickupAddress: string | null;
  company: { name: string; approvalFlow: string; billingCycle: string };
  branch: { name: string; city: string | null } | null; department: string | null; costCenter: string | null;
};
export type BudgetPeriod = { limit: string; used: string; remaining: string; periodStart: string; periodEnd: string };
export type Budget = { visible: false } | { visible: true; monthly: BudgetPeriod | null; yearly: BudgetPeriod | null; basis: string };
export type TravelPolicy = {
  name: string; maxTripAmount: string | null; allowedCategories: string[]; advanceBookingHours: number | null;
  nightTravelAllowed: boolean; outstationAllowed: boolean; airportTravelAllowed: boolean; approvalRequired: boolean;
};
export type PolicySummary = {
  policy: TravelPolicy | null; approvalStages: { level: number; approver: string; maxAmount: number | null }[];
  approvalFlow: string; employeeLimits: { monthly: string | null; yearly: string | null };
};
export type Home = {
  profile: Profile; upcoming: Trip | null; activeTrips: number; pendingApprovals: number; approvedToBook: number; unread: number;
  policy: TravelPolicy | null; budget: Budget; asOf: string;
};
export type Notice = { id: string; title: string; message: string; readAt: string | null; createdAt: string };
export type Config = {
  support: { name: string; phoneHref: string; emailHref: string; whatsapp: string };
  paymentMethod: "CORPORATE_CREDIT" | "CASH"; services: Service[]; profileEdit: boolean; pushRegistration: boolean; rebook: boolean;
  termsPath: string; privacyPath: string; cancellationPath: string;
};
export type TripStatus = {
  status: string; trip: { status: string; driverAssignedAt: string | null; arrivedPickupAt: string | null; tripStartedAt: string | null; tripCompletedAt: string | null } | null;
  liveTracking: boolean; location: { latitude: number; longitude: number; accuracy: number | null; recordedAt: string } | null;
};
