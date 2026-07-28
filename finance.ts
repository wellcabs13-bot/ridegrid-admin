// RideGrid Admin
// data/finance.ts
export type TransactionType='Income'|'Expense'|'Vendor Payment'|'Driver Salary'|'Refund'|'Commission';
export type TransactionStatus='Completed'|'Pending'|'Failed';

export interface FinanceTransaction{
 id:string;
 date:string;
 bookingId?:string;
 title:string;
 category:string;
 type:TransactionType;
 paymentMethod:string;
 amount:number;
 status:TransactionStatus;
 customer?:string;
 vendor?:string;
 driver?:string;
 remarks?:string;
}

export interface FinanceSummary{
 totalRevenue:number;
 totalExpenses:number;
 netProfit:number;
 pendingPayments:number;
 completedTransactions:number;
 totalBookings:number;
 totalRefunds:number;
 walletBalance:number;
}

export const financeSummary:FinanceSummary={
 totalRevenue:4876500,
 totalExpenses:2985400,
 netProfit:1891100,
 pendingPayments:154300,
 completedTransactions:1248,
 totalBookings:942,
 totalRefunds:42100,
 walletBalance:382600,
};

export const revenueChartData=[
{name:'Jan',value:280000},
{name:'Feb',value:315000},
{name:'Mar',value:342000},
{name:'Apr',value:388000},
{name:'May',value:425000},
{name:'Jun',value:462000},
{name:'Jul',value:515000},
];

export const expenseChartData=[
{name:'Jan',value:182000},
{name:'Feb',value:196000},
{name:'Mar',value:214000},
{name:'Apr',value:245000},
{name:'May',value:271000},
{name:'Jun',value:289000},
{name:'Jul',value:304000},
];

export const financeTransactions:FinanceTransaction[]=[
{
id:'TXN-1001',
date:'2026-07-01',
bookingId:'BK-10231',
title:'Mumbai Airport Transfer',
category:'Booking',
type:'Income',
paymentMethod:'UPI',
amount:3200,
status:'Completed',
customer:'Rahul Sharma',
},
{
id:'TXN-1002',
date:'2026-07-01',
title:'Vendor Settlement',
category:'Vendor',
type:'Vendor Payment',
paymentMethod:'Bank Transfer',
amount:1800,
status:'Completed',
vendor:'Sai Travels',
},
{
id:'TXN-1003',
date:'2026-07-02',
title:'Driver Salary',
category:'Payroll',
type:'Driver Salary',
paymentMethod:'Bank Transfer',
amount:25000,
status:'Completed',
driver:'Mahesh Patil',
},
];

export default{
 financeSummary,
 revenueChartData,
 expenseChartData,
 financeTransactions,
};
