export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  totalBookings: number;
  totalSpent: string;
  preferredVehicle: string;
  preferredDriver: string;
  status: 'Active' | 'Inactive';
  joinedDate: string;
}

export const customers: Customer[] = [
  {
    id: 'CUS1001',
    name: 'Rahul Sharma',
    mobile: '+91 9876543210',
    email: 'rahul.sharma@gmail.com',
    city: 'Mumbai',
    totalBookings: 14,
    totalSpent: '₹86,500',
    preferredVehicle: 'Innova Crysta',
    preferredDriver: 'Ramesh Patil',
    status: 'Active',
    joinedDate: '12 Jan 2025',
  },
  {
    id: 'CUS1002',
    name: 'Priya Mehta',
    mobile: '+91 9823456789',
    email: 'priya.mehta@gmail.com',
    city: 'Pune',
    totalBookings: 8,
    totalSpent: '₹42,700',
    preferredVehicle: 'Ertiga',
    preferredDriver: 'Suresh Pawar',
    status: 'Active',
    joinedDate: '20 Feb 2025',
  },
  {
    id: 'CUS1003',
    name: 'Amit Verma',
    mobile: '+91 9988776655',
    email: 'amit.verma@gmail.com',
    city: 'Nagpur',
    totalBookings: 3,
    totalSpent: '₹12,300',
    preferredVehicle: 'Dzire',
    preferredDriver: 'Ganesh More',
    status: 'Inactive',
    joinedDate: '18 Mar 2025',
  },
  {
    id: 'CUS1004',
    name: 'Sneha Kulkarni',
    mobile: '+91 9765432101',
    email: 'sneha.k@gmail.com',
    city: 'Nashik',
    totalBookings: 18,
    totalSpent: '₹1,18,000',
    preferredVehicle: 'Innova Hycross',
    preferredDriver: 'Mahesh Jadhav',
    status: 'Active',
    joinedDate: '09 Apr 2025',
  },
  {
    id: 'CUS1005',
    name: 'Vikram Singh',
    mobile: '+91 9898989898',
    email: 'vikram.s@gmail.com',
    city: 'Aurangabad',
    totalBookings: 6,
    totalSpent: '₹33,400',
    preferredVehicle: 'Swift Dzire',
    preferredDriver: 'Sunil Patil',
    status: 'Active',
    joinedDate: '02 May 2025',
  },
];
