export type User = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
};
export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
};
export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  user: User & { isVerified: boolean };
};
export type Service = "ONE_WAY" | "ROUNDTRIP" | "LOCAL";
export type Option = {
  service: Service;
  city: string;
  fromCity: string;
  toCity: string;
  packageName: string;
  vehicleCategory: string;
  pricingPackageId: string;
};
export type Search = {
  serviceType: "LOCAL" | "OUTSTATION";
  tripType: "ONEWAY" | "ROUNDTRIP";
  pickupCity: string;
  dropCity: string;
  date: string;
  time: string;
  days: string;
  category: string;
  packageName: string;
};
export type Fare = {
  vendorFare: string;
  platformFee: string;
  taxAmount: string;
  passThroughTotal: string;
  vendorFundedDiscount: string;
  rideGridFundedDiscount: string;
  finalPayable: string;
  quoteExpiry: string;
  tripDateTime: string;
  taxComponents: { name: string; amount: string }[];
  passThroughCharges: { name: string; amount: string; included: boolean }[];
  tripMetrics?: { days: string };
};
export type Quote = { id: string; snapshot: Fare };
export type Listing = {
  media?: { vehiclePhotos: string[] };
  ratings?: { vehicle?: { average: number | null; count: number } };
  marketplace?: { verified: boolean; available: boolean };
  location?: { city: string };
  driver?: { name: string; verified?: boolean } | null;
  id: string;
  vehicle: {
    registrationNumber?: string;
    make: string;
    model: string;
    category: string;
    seatingCapacity: number;
    fuelType: string;
    transmission: string;
  };
  vendor?: { companyName: string; approved?: boolean } | null;
  pricing: {
    pricingPackageId: string;
    packageName: string;
    includedKm: number;
    includedHours: number;
    extraKmRate: number | null;
    extraHourRate: number | null;
    driverAllowance: number | null;
    finalPayable: number;
    quote: Fare;
  };
};
export type SearchResult = {
  listings: Listing[];
  pagination: { page: number; totalPages: number; total: number };
};
export type Booking = {
  rebook?: RouteDraft | null;
  id: string;
  bookingNumber: string;
  status: string;
  tripType: string;
  tripDays: number;
  pickupLocation: string;
  dropLocation: string;
  pickupDateTime: string;
  finalFare: string | null;
  estimatedFare: string;
  priceSnapshot: Fare | null;
  vehicle: {
    make: string;
    model: string;
    category: string;
    registrationNumber: string;
  };
  vendor: { companyName: string };
  driver?: {
    firstName: string;
    lastName: string;
    user: { mobile: string | null };
  } | null;
  transactions: {
    id: string;
    paymentMethod: string;
    paymentStatus: string;
    amount: string;
  }[];
  statusHistory: { currentStatus: string; createdAt: string }[];
};
export type BookingPage = {
  bookings: Booking[];
  page: number;
  hasMore: boolean;
};
export type Notice = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};
export type NoticePage = {
  items: Notice[];
  unread: number;
  page: number;
  hasMore: boolean;
};
export type Config = {
  wallet: boolean;
  pushRegistration: boolean;
  cancellation: boolean;
  onlineCheckout: boolean;
  paymentMethods: string[];
  support: {
    name: string;
    phoneHref: string;
    emailHref: string;
    whatsapp: string;
  };
  termsPath: string;
  privacyPath: string;
  cancellationPath: string;
};

export type RouteDraft = Pick<
  Search,
  | "serviceType"
  | "tripType"
  | "pickupCity"
  | "dropCity"
  | "category"
  | "packageName"
>;
export type SavedRoute = RouteDraft & {
  id: string;
  fareWatch: boolean;
  createdAt: string;
};
