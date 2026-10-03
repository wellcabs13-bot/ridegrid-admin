export type User = { id: string; name: string; email: string; role: string; mobile?: string };
export type Session = { accessToken: string; refreshToken: string; expiresAt: string; user: User };
export type Page<T> = { items: T[]; page: number; hasMore: boolean };
export type DriverName = { id: string; firstName: string; lastName: string };
export type Document = { id: string; documentType: string; status: string; expiryDate: string | null; verifiedAt?: string | null };
export type Vehicle = { id: string; make: string; model: string; registrationNumber: string; category: string; fuelType: string; transmission: string; vendor: { companyName: string } };
export type Booking = {
  id: string; bookingNumber: string; status: string; pickupLocation: string; dropLocation: string; pickupDateTime: string; tripType: string;
  vehicle: Vehicle; vendor: { companyName: string }; customer: { firstName: string; lastName: string }; customerPhone?: string | null;
  pricingPackage: { packageName: string; packageType: string } | null;
  trip: { id: string; status: string; driverAssignedAt: string | null; arrivedPickupAt: string | null; tripStartedAt: string | null; tripCompletedAt: string | null } | null;
  statusHistory?: { id: string; currentStatus: string; remarks: string | null; changedAt: string }[];
};
export type Notice = { id: string; title: string; message: string; readAt: string | null; createdAt: string };
export type Profile = DriverName & { status: string; city: string | null; licenseNumber: string; user: User & { isVerified: boolean }; vehicles: Vehicle[]; documents: Document[] };
export type Home = { today: Booking[]; next: Booking | null; active: Booking[]; unread: number; expiringDocuments: number; asOf: string };
export type Config = { support: { phoneHref: string; emailHref: string; whatsapp: string }; emergencyPhone: string | null; documentUpload: boolean; profileEdit: boolean; backgroundLocation: boolean; pushRegistration: boolean; payoutHistory: boolean };
