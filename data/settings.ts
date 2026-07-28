export const settingsNavigation = [
  { id: 'company', label: 'Company', icon: '🏢' },
  { id: 'branding', label: 'Branding', icon: '🎨' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'roles', label: 'Roles', icon: '🛡️' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'sms', label: 'SMS', icon: '💬' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '🟢' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'tax', label: 'Tax & GST', icon: '📄' },
  { id: 'commission', label: 'Commission', icon: '💰' },
  { id: 'vehicle', label: 'Vehicle Categories', icon: '🚗' },
  { id: 'city', label: 'Cities', icon: '🌍' },
  { id: 'fare', label: 'Fare', icon: '📈' },
  { id: 'booking', label: 'Booking', icon: '📅' },
  { id: 'cancellation', label: 'Cancellation', icon: '❌' },
  { id: 'coupon', label: 'Coupons', icon: '🎟️' },
  { id: 'security', label: 'Security', icon: '🔐' },
  { id: 'api', label: 'API', icon: '⚙️' },
  { id: 'backup', label: 'Backup', icon: '💾' },
  { id: 'systemlogs', label: 'System Logs', icon: '📋' },
  { id: 'activitylogs', label: 'Activity Logs', icon: '📜' },
  { id: 'preferences', label: 'Preferences', icon: '⚡' },
];

export const companyInfo = {
  companyName: 'RideGrid Technologies Pvt. Ltd.',
  website: 'https://ridegrid.com',
  email: 'support@ridegrid.com',
  phone: '+91 9876543210',
  address: 'Pune, Maharashtra',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
};

export const brandingSettings = {
  appName: 'RideGrid',
  primaryColor: '#4F46E5',
  secondaryColor: '#06B6D4',
  logo: '/logo.png',
  favicon: '/favicon.ico',
};

export const userStatistics = {
  totalAdmins: 5,
  totalManagers: 12,
  totalSupport: 26,
  totalUsers: 43,
};

export const roleStatistics = [
  'Super Admin',
  'Admin',
  'Finance',
  'Operations',
  'Support',
  'Vendor Manager',
];

export const notificationSettings = {
  email: true,
  sms: true,
  whatsapp: true,
  push: true,
};

export const paymentGateway = {
  razorpay: true,
  cash: true,
  wallet: false,
  upi: true,
};

export const taxSettings = {
  gst: '18%',
  tds: '1%',
};

export const commissionSettings = {
  platformCommission: '12%',
  vendorCommission: '88%',
};

export const vehicleCategories = [
  'Hatchback',
  'Sedan',
  'SUV',
  'Luxury',
  'Tempo Traveller',
  'Bus',
];

export const cities = ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Aurangabad'];

export const fareSettings = {
  baseFare: 150,
  perKm: 18,
  waiting: 3,
};

export const bookingSettings = {
  advanceBookingHours: 2,
  cancellationHours: 4,
  autoAssignDriver: true,
};

export const coupons = ['WELCOME10', 'RIDE100', 'FIRSTTRIP'];

export const securitySettings = {
  twoFactor: true,
  sessionTimeout: 30,
};

export const apiKeys = {
  publicKey: "",
  secretKey: "",
};

export const preferences = {
  language: 'English',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR',
  theme: 'Light',
};
