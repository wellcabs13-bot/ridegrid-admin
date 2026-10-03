export type CustomerStatus = "Active" | "Inactive";

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  status: CustomerStatus;
  totalBookings: number;
  totalSpent: string;
  preferredVehicle: string;
  preferredDriver: string;
  joinedOn: string;
}