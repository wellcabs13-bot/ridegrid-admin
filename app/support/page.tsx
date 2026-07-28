import DashboardLayout from '@/components/DashboardLayout';

import SupportHeader from '@/components/support/SupportHeader';
import SupportStats from '@/components/support/SupportStats';
import SupportTabs from '@/components/support/SupportTabs';

import TicketDashboard from '@/components/support/TicketDashboard';
import TicketTable from '@/components/support/TicketTable';
import TicketDetails from '@/components/support/TicketDetails';
import TicketTimeline from '@/components/support/TicketTimeline';

import CustomerSupport from '@/components/support/CustomerSupport';
import DriverSupport from '@/components/support/DriverSupport';
import VendorSupport from '@/components/support/VendorSupport';

import LiveChat from '@/components/support/LiveChat';

import WhatsAppSupport from '@/components/support/WhatsAppSupport';
import WhatsAppInbox from '@/components/support/WhatsAppInbox';
import WhatsAppTemplates from '@/components/support/WhatsAppTemplates';
import WhatsAppBot from '@/components/support/WhatsAppBot';

import KnowledgeBase from '@/components/support/KnowledgeBase';
import FAQManager from '@/components/support/FAQManager';

import FeedbackCenter from '@/components/support/FeedbackCenter';
import RatingsReview from '@/components/support/RatingsReview';

import EscalationQueue from '@/components/support/EscalationQueue';
import SLAStatus from '@/components/support/SLAStatus';

import AgentPerformance from '@/components/support/AgentPerformance';
import RecentSupportActivity from '@/components/support/RecentSupportActivity';
import SupportSettings from '@/components/support/SupportSettings';

export default function SupportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <SupportHeader />
        <SupportStats />
        <SupportTabs />

        <TicketDashboard />
        <TicketTable />

        <div className="grid gap-6 lg:grid-cols-2">
          <TicketDetails />
          <TicketTimeline />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <CustomerSupport />
          <DriverSupport />
          <VendorSupport />
        </div>

        <LiveChat />

        <WhatsAppSupport />
        <WhatsAppInbox />

        <div className="grid gap-6 lg:grid-cols-2">
          <WhatsAppTemplates />
          <WhatsAppBot />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <KnowledgeBase />
          <FAQManager />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <FeedbackCenter />
          <RatingsReview />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <EscalationQueue />
          <SLAStatus />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AgentPerformance />
          <RecentSupportActivity />
        </div>

        <SupportSettings />
      </div>
    </DashboardLayout>
  );
}
