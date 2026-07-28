export interface Driver {
  id: number;
  name: string;
  photo: string;
  mobile: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  aadhaar: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  joinDate: string;
  experience: string;
  vehicle: string;
  vehicleNumber: string;
  trips: number;
  rating: number;
  earnings: number;
  wallet: number;
  availability: 'Available' | 'On Trip' | 'Offline';
  status: 'Active' | 'Inactive' | 'Blocked';
}

export const drivers: Driver[] = [
  {
    id: 1,
    name: 'Rahul Sharma',
    photo: 'https://i.pravatar.cc/150?img=12',
    mobile: '+91 9876543210',
    email: 'rahul@ridegrid.com',
    licenseNumber: 'MH1420210001234',
    licenseExpiry: '18 Jun 2029',
    aadhaar: 'XXXX XXXX 4521',
    address: 'Baner Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411045',
    joinDate: '15 Jan 2024',
    experience: '6 Years',
    vehicle: 'Maruti Ertiga',
    vehicleNumber: 'MH12AB4587',
    trips: 482,
    rating: 4.9,
    earnings: 284560,
    wallet: 8450,
    availability: 'Available',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Amit Patil',
    photo: 'https://i.pravatar.cc/150?img=18',
    mobile: '+91 9822334455',
    email: 'amit@ridegrid.com',
    licenseNumber: 'MH1420200007452',
    licenseExpiry: '08 Dec 2028',
    aadhaar: 'XXXX XXXX 9832',
    address: 'Kothrud',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
    joinDate: '02 Jul 2023',
    experience: '8 Years',
    vehicle: 'Toyota Innova',
    vehicleNumber: 'MH14XY1122',
    trips: 725,
    rating: 4.8,
    earnings: 438220,
    wallet: 12300,
    availability: 'On Trip',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Suresh Pawar',
    photo: 'https://i.pravatar.cc/150?img=20',
    mobile: '+91 9765123456',
    email: 'suresh@ridegrid.com',
    licenseNumber: 'MH1420190009912',
    licenseExpiry: '22 Mar 2027',
    aadhaar: 'XXXX XXXX 2108',
    address: 'Hadapsar',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411028',
    joinDate: '18 Nov 2022',
    experience: '10 Years',
    vehicle: 'Swift Dzire',
    vehicleNumber: 'MH12KL9021',
    trips: 956,
    rating: 4.7,
    earnings: 521300,
    wallet: 6400,
    availability: 'Offline',
    status: 'Inactive',
  },
  {
    id: 4,
    name: 'Vikas Jadhav',
    photo: 'https://i.pravatar.cc/150?img=25',
    mobile: '+91 9881122334',
    email: 'vikas@ridegrid.com',
    licenseNumber: 'MH1420220003456',
    licenseExpiry: '10 Oct 2030',
    aadhaar: 'XXXX XXXX 7865',
    address: 'Wakad',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411057',
    joinDate: '01 Apr 2025',
    experience: '4 Years',
    vehicle: 'Hyundai Aura',
    vehicleNumber: 'MH14GH7788',
    trips: 168,
    rating: 4.6,
    earnings: 112450,
    wallet: 3200,
    availability: 'Available',
    status: 'Active',
  },
  {
    id: 5,
    name: 'Ramesh More',
    photo: 'https://i.pravatar.cc/150?img=33',
    mobile: '+91 9898989898',
    email: 'ramesh@ridegrid.com',
    licenseNumber: 'MH1420180006781',
    licenseExpiry: '30 Aug 2026',
    aadhaar: 'XXXX XXXX 1198',
    address: 'Nigdi',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411044',
    joinDate: '11 Sep 2021',
    experience: '12 Years',
    vehicle: 'Toyota Crysta',
    vehicleNumber: 'MH12PQ7788',
    trips: 1325,
    rating: 5.0,
    earnings: 812540,
    wallet: 18800,
    availability: 'On Trip',
    status: 'Active',
  },
];
