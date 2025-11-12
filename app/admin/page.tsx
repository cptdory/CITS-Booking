'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: number;
  title: string;
  date: string;
  time: string;
  branch: string;
  service: string;
  staff: string;
  room: string;
  customer: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Check if user is admin
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (!isLoggedIn || userRole !== 'admin') {
      router.push('/booking');
    }
  }, [router]);

  // Sample appointments data
  const appointments: Appointment[] = [
    {
      id: 1,
      title: 'Haircut Appointment',
      date: '2025-11-10',
      time: '09:00 AM',
      branch: 'Downtown Branch',
      service: 'Haircut',
      staff: 'John Doe',
      room: 'Room A',
      customer: 'Alice Johnson',
      status: 'confirmed'
    },
    {
      id: 2,
      title: 'Massage Session',
      date: '2025-11-10',
      time: '11:00 AM',
      branch: 'Uptown Branch',
      service: 'Massage',
      staff: 'Jane Smith',
      room: 'Room B',
      customer: 'Bob Williams',
      status: 'confirmed'
    },
    {
      id: 3,
      title: 'Consultation',
      date: '2025-11-12',
      time: '02:00 PM',
      branch: 'Downtown Branch',
      service: 'Consultation',
      staff: 'Mike Johnson',
      room: 'Room C',
      customer: 'Carol Davis',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Spa Treatment',
      date: '2025-11-15',
      time: '10:00 AM',
      branch: 'Westside Branch',
      service: 'Spa Treatment',
      staff: 'Jane Smith',
      room: 'Room A',
      customer: 'David Martinez',
      status: 'confirmed'
    },
    {
      id: 5,
      title: 'Haircut Appointment',
      date: '2025-11-15',
      time: '03:00 PM',
      branch: 'Downtown Branch',
      service: 'Haircut',
      staff: 'John Doe',
      room: 'Room B',
      customer: 'Emma Wilson',
      status: 'cancelled'
    },
    {
      id: 6,
      title: 'Massage Session',
      date: '2025-11-18',
      time: '01:00 PM',
      branch: 'Uptown Branch',
      service: 'Massage',
      staff: 'Mike Johnson',
      room: 'Room C',
      customer: 'Frank Brown',
      status: 'confirmed'
    }
  ];

  const handleLogout = (): void => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    router.push('/');
  };

  const handleBackToBooking = (): void => {
    router.push('/booking');
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    // Add previous month's days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push(prevDate);
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add next month's days to complete the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateString);
  };

  const previousMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">Admin Dashboard</h1>
              <p className="text-gray-600">Manage appointments and schedules</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBackToBooking}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-md"
              >
                Back to Booking
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{formatDate(currentDate)}</h2>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Next
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Week Day Headers */}
            {weekDays.map((day) => (
              <div key={day} className="text-center font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {days.map((day, index) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isCurrentMonthDay = isCurrentMonth(day);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`min-h-32 border rounded-lg p-2 ${
                    isTodayDay ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                  } ${isCurrentMonthDay ? '' : 'opacity-40'} hover:shadow-md transition cursor-pointer`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`text-sm font-semibold mb-1 ${isTodayDay ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(apt.status)} truncate`}
                      >
                        {apt.time} - {apt.service}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500 px-2">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upcoming Appointments</h2>
          <div className="space-y-3">
            {appointments
              .filter(apt => new Date(apt.date) >= new Date())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((apt) => (
                <div
                  key={apt.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-800">{apt.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>📅 {new Date(apt.date).toLocaleDateString()}</div>
                        <div>🕐 {apt.time}</div>
                        <div>👤 {apt.customer}</div>
                        <div>💼 {apt.staff}</div>
                        <div>🏢 {apt.branch}</div>
                        <div>🚪 {apt.room}</div>
                      </div>
                    </div>
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}