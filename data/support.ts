/* ============================================================================
   RideGrid Admin
   Support & CRM Module
   Shared Demo Data
============================================================================ */

export interface SupportStat {
  id: number;
  title: string;
  value: string;
  change: string;
  color: 'blue' | 'green' | 'orange' | 'red';
}

export interface SupportTab {
  id: string;
  label: string;
  count: number;
}

export interface SupportSummary {
  title: string;
  description: string;
}

export interface SupportTicket {
  id: string;
  customer: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed';
  channel: 'App' | 'WhatsApp' | 'Email' | 'Phone';
  assignedTo: string;
  createdAt: string;
}

export interface ChatConversation {
  id: number;
  customer: string;
  lastMessage: string;
  unread: number;
  online: boolean;
  channel: 'WhatsApp' | 'Live Chat';
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  category: string;
  views: number;
}

export interface FeedbackItem {
  id: number;
  customer: string;
  rating: number;
  comment: string;
}

export interface AgentPerformance {
  id: number;
  agent: string;
  resolved: number;
  pending: number;
  sla: string;
}

export const supportSummary: SupportSummary = {
  title: 'CRM & Support Center',
  description:
    'Manage customer support, vendor assistance, driver helpdesk, live chat, WhatsApp support, knowledge base and SLA monitoring from one centralized workspace.',
};

export const supportStats: SupportStat[] = [
  {
    id: 1,
    title: 'Open Tickets',
    value: '148',
    change: '+12%',
    color: 'red',
  },
  {
    id: 2,
    title: 'Resolved Today',
    value: '94',
    change: '+18%',
    color: 'green',
  },
  {
    id: 3,
    title: 'Active Chats',
    value: '31',
    change: '+7%',
    color: 'blue',
  },
  {
    id: 4,
    title: 'SLA Compliance',
    value: '98.4%',
    change: '+1.4%',
    color: 'orange',
  },
];

export const supportTabs: SupportTab[] = [
  {
    id: 'tickets',
    label: 'Support Tickets',
    count: 148,
  },
  {
    id: 'customers',
    label: 'Customer Support',
    count: 76,
  },
  {
    id: 'drivers',
    label: 'Driver Support',
    count: 24,
  },
  {
    id: 'vendors',
    label: 'Vendor Support',
    count: 18,
  },
  {
    id: 'chat',
    label: 'Live Chat',
    count: 31,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    count: 56,
  },
];

export const supportTickets: SupportTicket[] = [
  {
    id: 'TKT-1001',
    customer: 'Rahul Sharma',
    category: 'Booking Issue',
    priority: 'High',
    status: 'Open',
    channel: 'WhatsApp',
    assignedTo: 'Akash',
    createdAt: '27 Jul 2026 09:20',
  },
  {
    id: 'TKT-1002',
    customer: 'Priya Patel',
    category: 'Refund',
    priority: 'Medium',
    status: 'Pending',
    channel: 'Email',
    assignedTo: 'Neha',
    createdAt: '27 Jul 2026 10:05',
  },
  {
    id: 'TKT-1003',
    customer: 'Amit Verma',
    category: 'Driver Complaint',
    priority: 'Critical',
    status: 'Open',
    channel: 'App',
    assignedTo: 'Rohit',
    createdAt: '27 Jul 2026 11:15',
  },
  {
    id: 'TKT-1004',
    customer: 'Sneha Joshi',
    category: 'Payment Failed',
    priority: 'Low',
    status: 'Resolved',
    channel: 'Phone',
    assignedTo: 'Kiran',
    createdAt: '26 Jul 2026 18:42',
  },
];

export const chatConversations: ChatConversation[] = [
  {
    id: 1,
    customer: 'Rahul Sharma',
    lastMessage: 'Driver has not arrived yet.',
    unread: 2,
    online: true,
    channel: 'WhatsApp',
    updatedAt: '2 min ago',
  },
  {
    id: 2,
    customer: 'Priya Patel',
    lastMessage: 'Refund status please.',
    unread: 1,
    online: false,
    channel: 'Live Chat',
    updatedAt: '12 min ago',
  },
  {
    id: 3,
    customer: 'Amit Verma',
    lastMessage: 'Thank you for your support.',
    unread: 0,
    online: false,
    channel: 'WhatsApp',
    updatedAt: '45 min ago',
  },
];

export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: 1,
    title: 'How to Cancel a Booking',
    category: 'Customer',
    views: 2415,
  },
  {
    id: 2,
    title: 'Vendor Registration Guide',
    category: 'Vendor',
    views: 1210,
  },
  {
    id: 3,
    title: 'Driver Onboarding Process',
    category: 'Driver',
    views: 945,
  },
];

export const feedbackItems: FeedbackItem[] = [
  {
    id: 1,
    customer: 'Rahul Sharma',
    rating: 5,
    comment: 'Excellent support experience.',
  },
  {
    id: 2,
    customer: 'Priya Patel',
    rating: 4,
    comment: 'Refund was handled quickly.',
  },
  {
    id: 3,
    customer: 'Amit Verma',
    rating: 2,
    comment: 'Driver arrived very late.',
  },
];

export const agentPerformance: AgentPerformance[] = [
  {
    id: 1,
    agent: 'Akash',
    resolved: 118,
    pending: 9,
    sla: '99%',
  },
  {
    id: 2,
    agent: 'Neha',
    resolved: 96,
    pending: 7,
    sla: '98%',
  },
  {
    id: 3,
    agent: 'Rohit',
    resolved: 110,
    pending: 5,
    sla: '97%',
  },
];
