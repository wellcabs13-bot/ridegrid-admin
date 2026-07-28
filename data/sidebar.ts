import { SidebarMenu } from '@/types/sidebar';

export const sidebarMenu: SidebarMenu[] = [
  {
    title: 'Dashboard',
    icon: '🏠',
    href: '/',
    children: [
      { title: 'Overview', href: '/' },
      { title: 'Live Dashboard', href: '/dashboard/live' },
      { title: 'Activity Feed', href: '/dashboard/activity' },
    ],
  },

  {
    title: 'Bookings',
    icon: '📅',
    href: '/bookings',
    children: [
      { title: 'Booking Dashboard', href: '/bookings' },
      { title: 'All Bookings', href: '/bookings/all' },
      { title: 'New Booking', href: '/bookings/new' },
      { title: 'Running Trips', href: '/bookings/running' },
      { title: 'Scheduled Trips', href: '/bookings/scheduled' },
      { title: 'Completed Trips', href: '/bookings/completed' },
      { title: 'Cancelled Trips', href: '/bookings/cancelled' },
      { title: 'Payments', href: '/bookings/payments' },
      { title: 'Reports', href: '/bookings/reports' },
    ],
  },

  {
    title: 'Customers',
    icon: '👤',
    href: '/customers',
    children: [
      { title: 'Customer Dashboard', href: '/customers' },
      { title: 'All Customers', href: '/customers/all' },
      { title: 'Add Customer', href: '/customers/new' },
      { title: 'Corporate Customers', href: '/customers/corporate' },
      { title: 'Wallet', href: '/customers/wallet' },
      { title: 'Customer Reports', href: '/customers/reports' },
    ],
  },

  {
    title: 'Drivers',
    icon: '🚖',
    href: '/drivers',
    children: [
      { title: 'Driver Dashboard', href: '/drivers' },
      { title: 'All Drivers', href: '/drivers/all' },
      { title: 'Add Driver', href: '/drivers/new' },
      { title: 'Documents', href: '/drivers/documents' },
      { title: 'Attendance', href: '/drivers/attendance' },
      { title: 'Ratings', href: '/drivers/ratings' },
      { title: 'Driver Reports', href: '/drivers/reports' },
    ],
  },

  {
    title: 'Vehicles',
    icon: '🚗',
    href: '/vehicles',
    children: [
      { title: 'Vehicle Dashboard', href: '/vehicles' },
      { title: 'All Vehicles', href: '/vehicles/all' },
      { title: 'Add Vehicle', href: '/vehicles/new' },
      { title: 'Categories', href: '/vehicles/categories' },
      { title: 'Documents', href: '/vehicles/documents' },
      { title: 'Insurance', href: '/vehicles/insurance' },
      { title: 'Maintenance', href: '/vehicles/maintenance' },
      { title: 'Fuel Logs', href: '/vehicles/fuel' },
      { title: 'GPS Tracking', href: '/vehicles/gps' },
      { title: 'Vehicle Reports', href: '/vehicles/reports' },
    ],
  },

  {
    title: 'Vendors',
    icon: '🏢',
    href: '/vendors',
    children: [
      { title: 'Vendor Dashboard', href: '/vendors' },
      { title: 'All Vendors', href: '/vendors/all' },
      { title: 'Add Vendor', href: '/vendors/new' },
      { title: 'Vendor Vehicles', href: '/vendors/vehicles' },
      { title: 'Vendor Drivers', href: '/vendors/drivers' },
      { title: 'Commission', href: '/vendors/commission' },
      { title: 'Vendor Reports', href: '/vendors/reports' },
    ],
  },

  {
    title: 'Finance',
    icon: '💰',
    href: '/finance',
    children: [
      { title: 'Finance Dashboard', href: '/finance' },
      { title: 'Revenue', href: '/finance/revenue' },
      { title: 'Expenses', href: '/finance/expenses' },
      { title: 'Vendor Payments', href: '/finance/vendor-payments' },
      { title: 'Driver Payments', href: '/finance/driver-payments' },
      { title: 'Refunds', href: '/finance/refunds' },
      { title: 'Invoices', href: '/finance/invoices' },
      { title: 'GST', href: '/finance/gst' },
      { title: 'Reports', href: '/finance/reports' },
    ],
  },

  {
    title: 'Analytics',
    icon: '📊',
    href: '/analytics',
    children: [
      { title: 'Analytics Dashboard', href: '/analytics' },
      { title: 'Revenue Analytics', href: '/analytics/revenue' },
      { title: 'Booking Analytics', href: '/analytics/bookings' },
      { title: 'Customer Analytics', href: '/analytics/customers' },
      { title: 'Driver Analytics', href: '/analytics/drivers' },
      { title: 'Vehicle Analytics', href: '/analytics/vehicles' },
    ],
  },

  {
    title: 'Reports',
    icon: '📈',
    href: '/reports',
    children: [
      { title: 'Reports Dashboard', href: '/reports' },
      { title: 'Revenue Reports', href: '/reports/revenue' },
      { title: 'Booking Reports', href: '/reports/bookings' },
      { title: 'Finance Reports', href: '/reports/finance' },
      { title: 'Driver Reports', href: '/reports/drivers' },
      { title: 'Vendor Reports', href: '/reports/vendors' },
    ],
  },

  {
    title: 'Notifications',
    icon: '🔔',
    href: '/notifications',
    children: [
      { title: 'Dashboard', href: '/notifications' },
      { title: 'Push Notifications', href: '/notifications/push' },
      { title: 'Email Campaigns', href: '/notifications/email' },
      { title: 'SMS', href: '/notifications/sms' },
      { title: 'WhatsApp', href: '/notifications/whatsapp' },
      { title: 'Templates', href: '/notifications/templates' },
      { title: 'History', href: '/notifications/history' },
    ],
  },

  {
    title: 'CRM & Support',
    icon: '🎧',
    href: '/support',
    children: [
      { title: 'Dashboard', href: '/support' },
      { title: 'Tickets', href: '/support/tickets' },
      { title: 'Live Chat', href: '/support/live-chat' },
      { title: 'WhatsApp Inbox', href: '/support/whatsapp' },
      { title: 'Knowledge Base', href: '/support/kb' },
      { title: 'FAQ', href: '/support/faq' },
      { title: 'Reviews', href: '/support/reviews' },
    ],
  },

  {
    title: 'Settings',
    icon: '⚙️',
    href: '/settings',
    children: [
      { title: 'Company', href: '/settings/company' },
      { title: 'Users', href: '/settings/users' },
      { title: 'Roles', href: '/settings/roles' },
      { title: 'Payments', href: '/settings/payments' },
      { title: 'GST', href: '/settings/gst' },
      { title: 'Fare Rules', href: '/settings/fares' },
      { title: 'Security', href: '/settings/security' },
      { title: 'API', href: '/settings/api' },
      { title: 'Backup', href: '/settings/backup' },
      { title: 'Preferences', href: '/settings/preferences' },
    ],
  },
];
