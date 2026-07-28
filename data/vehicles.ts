export interface Vehicle {
  id: string;
  registrationNo: string;
  vehicleName: string;
  brand: string;
  model: string;
  year: number;
  vehicleType: string;
  category: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: number;
  vendorName: string;
  driverName: string;
  rcExpiry: string;
  insuranceExpiry: string;
  permitExpiry: string;
  fitnessExpiry: string;
  pollutionExpiry: string;
  status: 'Available' | 'On Trip' | 'Maintenance' | 'Inactive';
  availability: 'Available' | 'Booked' | 'Blocked';
  totalTrips: number;
  earnings: string;
  city: string;
  createdAt: string;
}

export const vehicles: Vehicle[] = [
  {
    id: 'VH001',
    registrationNo: 'MH12AB1234',
    vehicleName: 'Innova Crysta',
    brand: 'Toyota',
    model: 'ZX',
    year: 2023,
    vehicleType: 'SUV',
    category: 'Premium',
    fuelType: 'Diesel',
    transmission: 'Manual',
    seatingCapacity: 7,
    vendorName: 'Shree Travels',
    driverName: 'Rahul Patil',
    rcExpiry: '15 Mar 2028',
    insuranceExpiry: '20 Dec 2026',
    permitExpiry: '12 Aug 2027',
    fitnessExpiry: '05 Jan 2028',
    pollutionExpiry: '30 Sep 2026',
    status: 'Available',
    availability: 'Available',
    totalTrips: 245,
    earnings: '₹14,82,500',
    city: 'Pune',
    createdAt: '12 Jan 2024',
  },
  {
    id: 'VH002',
    registrationNo: 'MH14XY7890',
    vehicleName: 'Ertiga',
    brand: 'Maruti Suzuki',
    model: 'VXI',
    year: 2022,
    vehicleType: 'MPV',
    category: 'Economy',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seatingCapacity: 7,
    vendorName: 'Sai Cab Services',
    driverName: 'Amit Kale',
    rcExpiry: '18 Feb 2027',
    insuranceExpiry: '15 Oct 2026',
    permitExpiry: '10 Jul 2027',
    fitnessExpiry: '01 Dec 2027',
    pollutionExpiry: '22 Aug 2026',
    status: 'On Trip',
    availability: 'Booked',
    totalTrips: 398,
    earnings: '₹18,35,700',
    city: 'Mumbai',
    createdAt: '18 Apr 2023',
  },
  {
    id: 'VH003',
    registrationNo: 'MH13CD4567',
    vehicleName: 'Swift Dzire',
    brand: 'Maruti Suzuki',
    model: 'ZXI',
    year: 2021,
    vehicleType: 'Sedan',
    category: 'Economy',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seatingCapacity: 5,
    vendorName: 'Well Fleet',
    driverName: 'Sandeep More',
    rcExpiry: '08 Nov 2026',
    insuranceExpiry: '15 Sep 2026',
    permitExpiry: '18 Jan 2027',
    fitnessExpiry: '12 Oct 2027',
    pollutionExpiry: '14 Jul 2026',
    status: 'Maintenance',
    availability: 'Blocked',
    totalTrips: 312,
    earnings: '₹12,65,300',
    city: 'Nashik',
    createdAt: '08 Aug 2022',
  },
  {
    id: 'VH004',
    registrationNo: 'MH15EF1122',
    vehicleName: 'Fortuner',
    brand: 'Toyota',
    model: 'Legender',
    year: 2024,
    vehicleType: 'SUV',
    category: 'Luxury',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    seatingCapacity: 7,
    vendorName: 'Royal Mobility',
    driverName: 'Vikas Shinde',
    rcExpiry: '18 Jan 2029',
    insuranceExpiry: '05 Jan 2027',
    permitExpiry: '10 Feb 2028',
    fitnessExpiry: '18 Jan 2029',
    pollutionExpiry: '30 Nov 2026',
    status: 'Available',
    availability: 'Available',
    totalTrips: 68,
    earnings: '₹9,45,200',
    city: 'Pune',
    createdAt: '21 Jan 2025',
  },
  {
    id: 'VH005',
    registrationNo: 'MH43GH5544',
    vehicleName: 'Tempo Traveller',
    brand: 'Force',
    model: '3350',
    year: 2022,
    vehicleType: 'Traveller',
    category: 'Group',
    fuelType: 'Diesel',
    transmission: 'Manual',
    seatingCapacity: 17,
    vendorName: 'Prakash Tours',
    driverName: 'Mahesh Pawar',
    rcExpiry: '10 Jun 2028',
    insuranceExpiry: '25 Nov 2026',
    permitExpiry: '17 May 2027',
    fitnessExpiry: '18 Jun 2028',
    pollutionExpiry: '05 Oct 2026',
    status: 'Inactive',
    availability: 'Blocked',
    totalTrips: 178,
    earnings: '₹16,72,850',
    city: 'Aurangabad',
    createdAt: '05 Jun 2023',
  },
];
