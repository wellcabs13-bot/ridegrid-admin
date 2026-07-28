import DashboardLayout from '@/components/DashboardLayout';

import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsNavigation from '@/components/settings/SettingsNavigation';
import CompanySettings from '@/components/settings/CompanySettings';
import BrandingSettings from '@/components/settings/BrandingSettings';
import UserManagement from '@/components/settings/UserManagement';
import RolePermissions from '@/components/settings/RolePermissions';
import NotificationSettings from '@/components/settings/NotificationSettings';
import EmailSettings from '@/components/settings/EmailSettings';
import SMSSettings from '@/components/settings/SMSSettings';
import WhatsAppSettings from '@/components/settings/WhatsAppSettings';
import PaymentGatewaySettings from '@/components/settings/PaymentGatewaySettings';
import TaxGSTSettings from '@/components/settings/TaxGSTSettings';
import CommissionSettings from '@/components/settings/CommissionSettings';
import VehicleCategorySettings from '@/components/settings/VehicleCategorySettings';
import CitySettings from '@/components/settings/CitySettings';
import FareSettings from '@/components/settings/FareSettings';
import BookingSettings from '@/components/settings/BookingSettings';
import CancellationPolicy from '@/components/settings/CancellationPolicy';
import CouponSettings from '@/components/settings/CouponSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import APISettings from '@/components/settings/APISettings';
import BackupRestore from '@/components/settings/BackupRestore';
import SystemLogs from '@/components/settings/SystemLogs';
import ActivityLogs from '@/components/settings/ActivityLogs';
import Preferences from '@/components/settings/Preferences';
import SaveSettingsCard from '@/components/settings/SaveSettingsCard';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <SettingsHeader />

        <SettingsNavigation />

        <CompanySettings />

        <BrandingSettings />

        <UserManagement />

        <RolePermissions />

        <NotificationSettings />

        <EmailSettings />

        <SMSSettings />

        <WhatsAppSettings />

        <PaymentGatewaySettings />

        <TaxGSTSettings />

        <CommissionSettings />

        <VehicleCategorySettings />

        <CitySettings />

        <FareSettings />

        <BookingSettings />

        <CancellationPolicy />

        <CouponSettings />

        <SecuritySettings />

        <APISettings />

        <BackupRestore />

        <SystemLogs />

        <ActivityLogs />

        <Preferences />

        <SaveSettingsCard />
      </div>
    </DashboardLayout>
  );
}
