'use client';

import { useMemo, useState } from 'react';

import DashboardLayout from '../../components/DashboardLayout';

import BookingHeader from '../../components/bookings/BookingHeader';
import BookingStats from '../../components/bookings/BookingStats';
import BookingFilters from '../../components/bookings/BookingFilters';
import BookingTable from '../../components/bookings/BookingTable';

import AddBookingModal from '../../components/bookings/AddBookingModal';
import BookingForm, {
  BookingFormData,
} from '../../components/bookings/BookingForm';

import BookingDetailsDrawer from '../../components/bookings/BookingDetailsDrawer';

import { bookings as bookingData } from '../../data/bookings';

export default function BookingsPage() {
  const [bookingList, setBookingList] = useState(bookingData);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');

  const [openAddModal, setOpenAddModal] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredBookings = useMemo(() => {
    return bookingList.filter((booking) => {
      const matchSearch =
        booking.id.toLowerCase().includes(search.toLowerCase()) ||
        booking.customer.toLowerCase().includes(search.toLowerCase());

      const matchStatus = status === '' || booking.status === status;

      const matchPayment = payment === '' || booking.payment === payment;

      return matchSearch && matchStatus && matchPayment;
    });
  }, [bookingList, search, status, payment]);

  const totalBookings = filteredBookings.length;

  const runningBookings = filteredBookings.filter(
    (booking) => booking.status === 'Running'
  ).length;

  const completedBookings = filteredBookings.filter(
    (booking) => booking.status === 'Completed'
  ).length;

  const totalRevenue = filteredBookings.reduce((total, booking) => {
    const amount = Number(String(booking.amount).replace(/[₹,]/g, ''));

    return total + amount;
  }, 0);

  function resetFilters() {
    setSearch('');
    setStatus('');
    setPayment('');
  }

  function handleSaveBooking(booking: BookingFormData) {
    const newBooking = {
      id: `BK${Date.now()}`,

      customer: booking.customer,

      vehicle: booking.vehicle,

      pickup: booking.pickup,

      drop: booking.drop,

      date: booking.journeyDate,

      amount: `₹${Number(booking.fare).toLocaleString('en-IN')}`,

      status: 'Pending',

      payment: booking.paymentMethod,
    };

    setBookingList((prev) => [newBooking, ...prev]);

    setOpenAddModal(false);
  }

  function handleViewBooking(booking: any) {
    setSelectedBooking(booking);
    setDrawerOpen(true);
  }

  return (
    <DashboardLayout>
      <BookingHeader
        totalBookings={totalBookings}
        onAddBooking={() => setOpenAddModal(true)}
      />

      <BookingStats
        total={totalBookings}
        running={runningBookings}
        completed={completedBookings}
        revenue={totalRevenue}
      />

      <BookingFilters
        search={search}
        status={status}
        payment={payment}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onPaymentChange={setPayment}
        onReset={resetFilters}
      />

      <BookingTable bookings={filteredBookings} onView={handleViewBooking} />

      <BookingDetailsDrawer
        open={drawerOpen}
        booking={selectedBooking}
        onClose={() => setDrawerOpen(false)}
      />

      <AddBookingModal
        isOpen={openAddModal}
        title="Create New Booking"
        onClose={() => setOpenAddModal(false)}
      >
        <BookingForm
          onSave={handleSaveBooking}
          onCancel={() => setOpenAddModal(false)}
        />
      </AddBookingModal>
    </DashboardLayout>
  );
}
