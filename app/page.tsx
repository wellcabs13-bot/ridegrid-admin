import DashboardLayout from '../components/DashboardLayout';
import DashboardCard from '../components/DashboardCard';

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            RideGrid Admin Dashboard
          </h1>

          <p className="text-slate-500 mt-2">
            Welcome to the RideGrid Administration Panel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <DashboardCard
            title="Today's Bookings"
            value="128"
            icon="📅"
            change="+12%"
            color="bg-blue-500"
          />

          <DashboardCard
            title="Running Trips"
            value="46"
            icon="🚖"
            change="+5%"
            color="bg-green-500"
          />

          <DashboardCard
            title="Active Drivers"
            value="214"
            icon="👨‍✈️"
            change="+8%"
            color="bg-orange-500"
          />

          <DashboardCard
            title="Today's Revenue"
            value="₹1,84,500"
            icon="💰"
            change="+18%"
            color="bg-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Recent Activity
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between border-b pb-3">
                <span>New Booking Received</span>
                <span className="text-green-600 font-medium">Completed</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span>Vendor Registration</span>
                <span className="text-blue-600 font-medium">Pending</span>
              </div>

              <div className="flex justify-between border-b pb-3">
                <span>Driver Verification</span>
                <span className="text-orange-600 font-medium">In Review</span>
              </div>

              <div className="flex justify-between">
                <span>Customer Refund</span>
                <span className="text-red-600 font-medium">Processing</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              System Status
            </h2>

            <div className="space-y-5">
              <div className="flex justify-between">
                <span>Server Status</span>
                <span className="text-green-600 font-semibold">Online</span>
              </div>

              <div className="flex justify-between">
                <span>Database</span>
                <span className="text-green-600 font-semibold">Healthy</span>
              </div>

              <div className="flex justify-between">
                <span>Payment Gateway</span>
                <span className="text-green-600 font-semibold">Connected</span>
              </div>

              <div className="flex justify-between">
                <span>SMS Service</span>
                <span className="text-green-600 font-semibold">Active</span>
              </div>

              <div className="flex justify-between">
                <span>Email Service</span>
                <span className="text-green-600 font-semibold">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
