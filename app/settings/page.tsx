'use client';

import { useState } from 'react';

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
  const [activeTab, setActiveTab] = useState('company');

  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanySettings />;

      case 'branding':
        return <BrandingSettings />;

      case 'users':
        return <UserManagement />;

      case 'roles':
        return <RolePermissions />;

      case 'notifications':
        return <NotificationSettings />;

      case 'email':
        return <EmailSettings />;

      case 'sms':
        return <SMSSettings />;

      case 'whatsapp':
        return <WhatsAppSettings />;

      case 'payment':
        return <PaymentGatewaySettings />;

      case 'tax':
        return <TaxGSTSettings />;

      case 'commission':
        return <CommissionSettings />;

      case 'vehicle-category':
        return <VehicleCategorySettings />;

      case 'city':
        return <CitySettings />;

      case 'fare':
        return <FareSettings />;

      case 'booking':
        return <BookingSettings />;

      case 'cancellation':
        return <CancellationPolicy />;

      case 'coupon':
        return <CouponSettings />;

      case 'security':
        return <SecuritySettings />;

      case 'api':
        return <APISettings />;

      case 'backup':
        return <BackupRestore />;

      case 'system-logs':
        return <SystemLogs />;

      case 'activity-logs':
        return <ActivityLogs />;

      case 'preferences':
        return <Preferences />;

      default:
        return <CompanySettings />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <SettingsHeader />

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <SettingsNavigation
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          <div className="space-y-6 lg:col-span-9">
            {renderContent()}

            <SaveSettingsCard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}