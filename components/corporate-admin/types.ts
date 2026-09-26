export type EmployeeRef = { id: string; name: string; code: string; designation: string; isActive: boolean; branch: { id: string; name: string } | null; department: { id: string; name: string } | null };

export type Booking = {
  id: string; bookingNumber: string; status: string; tripType: string; tripDays: number; service: string;
  pickupLocation: string; dropLocation: string; pickupDateTime: string; createdAt: string; finalFare: string; packageName: string | null;
  vehicle: { make: string; model: string; category: string; registrationNumber: string; seatingCapacity: number };
  vendor: { id: string; companyName: string };
  driver: { name: string; mobile: string | null } | null;
  payment: { method: string; status: string } | null;
  tripStatus: string | null;
  approval: { id: string; status: string } | null;
  traveller: string; employee: EmployeeRef | null; assignment: string;
  fare: { vendorFare: string; platformFee: string; taxAmount: string; discount: string; finalPayable: string; passThroughTotal: string } | null;
};

export type ApprovalStep = { level: number; stage: string; status: string; actedAt: string | null; remarks: string | null; approver: string | null };

export type Approval = {
  id: string; status: string; rawStatus: string; amount: string | null; currentStage: string; submittedAt: string; completedAt: string | null;
  ride: {
    serviceType: string; tripType: string; days: string; pickupDateTime: string; pickupAddress: string; dropAddress: string;
    route: { pickupCity: string; dropCity: string; packageName: string }; vehicle: { make: string; model: string; category: string };
    vendorName: string; fare: { vendorFare: string; platformFee: string; taxAmount: string; finalPayable: string }; policyReasons: string[]; note: string;
  } | null;
  steps: ApprovalStep[]; decisionNote: string | null; booking: { id: string; bookingNumber: string; status: string } | null;
  employee: EmployeeRef & { email: string; monthlyTravelLimit: string | null; yearlyTravelLimit: string | null };
};

export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number };
