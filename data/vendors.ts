export interface Vendor {
  id: string;
  companyName: string;
  ownerName: string;
  mobile: string;
  email: string;
  city: string;
  totalVehicles: number;
  activeVehicles: number;
  completedTrips: number;
  totalEarnings: string;
  pendingPayment: string;
  rating: number;
  status: 'Active' | 'Inactive' | 'Pending';
  joinedDate: string;
}

export const vendors: Vendor[] = [
  {
    id: 'VEN1001',
    companyName: 'Sharma Travels',
    ownerName: 'Rahul Sharma',
    mobile: '+91 9876543210',
    email: 'rahul@sharmatravels.com',
    city: 'Pune',
    totalVehicles: 12,
    activeVehicles: 10,
    completedTrips: 482,
    totalEarnings: '₹18,45,000',
    pendingPayment: '₹42,500',
    rating: 4.8,
    status: 'Active',
    joinedDate: '12 Jan 2025',
  },
  {
    id: 'VEN1002',
    companyName: 'Sai Tours',
    ownerName: 'Vishal Patil',
    mobile: '+91 9823001122',
    email: 'vishal@saitours.com',
    city: 'Mumbai',
    totalVehicles: 8,
    activeVehicles: 8,
    completedTrips: 295,
    totalEarnings: '₹11,92,000',
    pendingPayment: '₹18,000',
    rating: 4.6,
    status: 'Active',
    joinedDate: '22 Feb 2025',
  },
  {
    id: 'VEN1003',
    companyName: 'Royal Cabs',
    ownerName: 'Amit Verma',
    mobile: '+91 9988776655',
    email: 'amit@royalcabs.com',
    city: 'Nagpur',
    totalVehicles: 5,
    activeVehicles: 3,
    completedTrips: 165,
    totalEarnings: '₹6,78,500',
    pendingPayment: '₹9,000',
    rating: 4.4,
    status: 'Inactive',
    joinedDate: '18 Mar 2025',
  },
  {
    id: 'VEN1004',
    companyName: 'Express Mobility',
    ownerName: 'Sneha Kulkarni',
    mobile: '+91 9765432101',
    email: 'sneha@expressmobility.com',
    city: 'Nashik',
    totalVehicles: 18,
    activeVehicles: 16,
    completedTrips: 720,
    totalEarnings: '₹27,80,000',
    pendingPayment: '₹73,000',
    rating: 4.9,
    status: 'Active',
    joinedDate: '02 Apr 2025',
  },
  {
    id: 'VEN1005',
    companyName: 'Well Ride Services',
    ownerName: 'Sunil Patil',
    mobile: '+91 9898989898',
    email: 'sunil@wellride.com',
    city: 'Aurangabad',
    totalVehicles: 3,
    activeVehicles: 2,
    completedTrips: 78,
    totalEarnings: '₹2,95,000',
    pendingPayment: '₹6,500',
    rating: 4.2,
    status: 'Pending',
    joinedDate: '14 May 2025',
  },
];
