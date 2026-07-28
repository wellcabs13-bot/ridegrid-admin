'use client';

import DashboardLayout from '@/components/DashboardLayout';

import NotificationsHeader from '@/components/notifications/NotificationsHeader';
import NotificationStats from '@/components/notifications/NotificationStats';
import NotificationTabs from '@/components/notifications/NotificationTabs';

import PushNotificationCard from '@/components/notifications/PushNotificationCard';
import EmailCampaignCard from '@/components/notifications/EmailCampaignCard';
import SMSCampaignCard from '@/components/notifications/SMSCampaignCard';
import WhatsAppCampaignCard from '@/components/notifications/WhatsAppCampaignCard';

import TemplateManager from '@/components/notifications/TemplateManager';
import ScheduledNotifications from '@/components/notifications/ScheduledNotifications';

import AnnouncementCenter from '@/components/notifications/AnnouncementCenter';
import NotificationHistory from '@/components/notifications/NotificationHistory';
import DeliveryStatus from '@/components/notifications/DeliveryStatus';

import FailedNotifications from '@/components/notifications/FailedNotifications';
import AudienceSelector from '@/components/notifications/AudienceSelector';
import QuickBroadcast from '@/components/notifications/QuickBroadcast';

import NotificationAnalytics from '@/components/notifications/NotificationAnalytics';
import RecentActivity from '@/components/notifications/RecentActivity';
import CommunicationLogs from '@/components/notifications/CommunicationLogs';

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <NotificationsHeader />

        <NotificationStats />

        <NotificationTabs />

        {/* Campaign Builder */}
        <div className="grid gap-6 xl:grid-cols-2">
          <PushNotificationCard />

          <EmailCampaignCard />

          <SMSCampaignCard />

          <WhatsAppCampaignCard />
        </div>

        {/* Audience */}
        <AudienceSelector />

        {/* Broadcast */}
        <QuickBroadcast />

        {/* Templates & Scheduler */}
        <div className="grid gap-6 xl:grid-cols-2">
          <TemplateManager />

          <ScheduledNotifications />
        </div>

        {/* Announcements */}
        <AnnouncementCenter />

        {/* Analytics */}
        <NotificationAnalytics />

        {/* Delivery & Failed */}
        <div className="grid gap-6 xl:grid-cols-2">
          <DeliveryStatus />

          <FailedNotifications />
        </div>

        {/* Activity */}
        <RecentActivity />

        {/* History */}
        <NotificationHistory />

        {/* Communication Logs */}
        <CommunicationLogs />
      </div>
    </DashboardLayout>
  );
}
