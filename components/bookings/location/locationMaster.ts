export interface LocationItem {
  id: string;
  name: string;
  type: 'city' | 'airport' | 'railway' | 'tourist';
  state: string;
  country: string;
  popular: boolean;
}

export const LOCATION_MASTER: LocationItem[] = [
  // ===========================
  // Maharashtra
  // ===========================

  {
    id: 'PUN',
    name: 'Pune',
    type: 'city',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'MUM',
    name: 'Mumbai',
    type: 'city',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'NSK',
    name: 'Nashik',
    type: 'city',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'NGP',
    name: 'Nagpur',
    type: 'city',
    state: 'Maharashtra',
    country: 'India',
    popular: false,
  },
  {
    id: 'KOL',
    name: 'Kolhapur',
    type: 'city',
    state: 'Maharashtra',
    country: 'India',
    popular: false,
  },
  {
    id: 'SAT',
    name: 'Satara',
    type: 'city',
    state: 'Maharashtra',
    country: 'India',
    popular: false,
  },
  {
    id: 'SHD',
    name: 'Shirdi',
    type: 'tourist',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'LON',
    name: 'Lonavala',
    type: 'tourist',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'MHB',
    name: 'Mahabaleshwar',
    type: 'tourist',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },

  // ===========================
  // Airports
  // ===========================

  {
    id: 'PNQ',
    name: 'Pune Airport',
    type: 'airport',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'BOM',
    name: 'Mumbai Airport',
    type: 'airport',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'GOX',
    name: 'Goa Airport',
    type: 'airport',
    state: 'Goa',
    country: 'India',
    popular: true,
  },

  // ===========================
  // Railway
  // ===========================

  {
    id: 'PRS',
    name: 'Pune Railway Station',
    type: 'railway',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },
  {
    id: 'CSMT',
    name: 'Mumbai CSMT',
    type: 'railway',
    state: 'Maharashtra',
    country: 'India',
    popular: true,
  },

  // ===========================
  // Other States
  // ===========================

  {
    id: 'GOA',
    name: 'Goa',
    type: 'city',
    state: 'Goa',
    country: 'India',
    popular: true,
  },
  {
    id: 'HYD',
    name: 'Hyderabad',
    type: 'city',
    state: 'Telangana',
    country: 'India',
    popular: true,
  },
  {
    id: 'BLR',
    name: 'Bengaluru',
    type: 'city',
    state: 'Karnataka',
    country: 'India',
    popular: true,
  },
  {
    id: 'DEL',
    name: 'Delhi',
    type: 'city',
    state: 'Delhi',
    country: 'India',
    popular: true,
  },
  {
    id: 'JAI',
    name: 'Jaipur',
    type: 'city',
    state: 'Rajasthan',
    country: 'India',
    popular: true,
  },
];