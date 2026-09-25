export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  mobile?: string;
};
export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
};
export type Page<T> = { items: T[]; page: number; hasMore: boolean };
export type Document = {
  id: string;
  documentType: string;
  status: string;
  expiryDate: string | null;
  fileUrl: string;
};
export type DriverName = { id: string; firstName: string; lastName: string };
export type Vehicle = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  category: string;
  seatingCapacity: number;
  fuelType: string;
  transmission: string;
  homeCity: string;
  status: string;
  isVerified: boolean;
  driverId: string | null;
  driver: DriverName | null;
  documents: Document[];
};
export type Booking = {
  id: string;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDateTime: string;
  reservedFrom: string | null;
  reservedUntil: string | null;
  tripDays: number;
  tripType: string;
  status: string;
  vendorEarning: string | null;
  vehicleId: string;
  driverId: string | null;
  vehicle: Pick<
    Vehicle,
    "id" | "registrationNumber" | "make" | "model" | "driverId"
  >;
  driver: DriverName | null;
  customer: { firstName: string; lastName: string };
  pricingPackage: { packageName: string; packageType: string } | null;
  trip: {
    status: string;
    tripStartedAt: string | null;
    tripCompletedAt: string | null;
  } | null;
  statusHistory?: {
    id: string;
    currentStatus: string;
    action: string;
    changedAt: string;
  }[];
  transactions?: { paymentStatus: string; paymentMethod: string }[];
};
export type Driver = DriverName & {
  licenseNumber: string;
  status: string;
  city: string | null;
  user: { mobile: string | null };
  documents: Document[];
  vehicles: { id: string; registrationNumber: string }[];
  bookings: Booking[];
};
export type Notice = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt?: string;
};
export type Home = {
  todayBookings: number;
  upcoming: number;
  active: number;
  pending: number;
  availableVehicles: number;
  bookedVehicles: number;
  availableDrivers: number;
  assignedDrivers: number;
  attentionVehicles: number;
  expiringDocuments: number;
  nextTrips: Booking[];
  notifications: Notice[];
  asOf: string;
};
export type Profile = {
  id: string;
  companyName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  homeCity: string | null;
  isApproved: boolean;
  bankName: string | null;
  accountLast4: string | null;
  user: User & { isVerified: boolean };
  documents: Document[];
};
export type Config = {
  support: { phoneHref: string; emailHref: string; whatsapp: string };
  categories: string[];
  fuels: string[];
  transmissions: string[];
};
export type Rate = {
  id: string;
  scopeKey: string;
  version: number;
  status: string;
  service: string;
  city: string;
  origin: string;
  destination: string;
  fare: string;
  effectiveFrom: string;
  terms: Record<string, unknown>;
  pricingPackage?: {
    packageName: string;
    vehicle: { registrationNumber: string };
  } | null;
};
export type Pricing = {
  vendorId: string;
  cities: string[];
  pairs: (Pick<Vehicle, "id" | "registrationNumber" | "make" | "model"> & {
    driverId: string;
    driver: DriverName;
  })[];
  rates: Rate[];
};
