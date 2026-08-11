import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Stethoscope, Scissors, DollarSign,
  Clock, TrendingUp, Activity, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '@/lib/api';
import { StatCard, Card, LoadingSpinner, Badge, PageHeader } from '@/components/ui';
import { formatCurrency, getStatusColor, getStatusLabel, formatWaitingTime, formatDate } from '@/lib/utils';
import type { DashboardStats, Appointment } from '@/types';

const PIE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6'];

export function DashboardPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: weeklyData } = useQuery({
    queryKey: ['weekly-revenue'],
    queryFn: () => api.get('/dashboard/weekly-revenue').then(r => r.data),
    refetchInterval: 60000,
  });

  const stats: DashboardStats | undefined = data?.stats;
  const queue: Appointment[] = data?.waitingQueue || [];
  const weeklyRevenue = weeklyData?.weeklyRevenue || [];

  const pieData = stats ? [
    { name: 'OP', value: stats.revenue.op },
    { name: 'Pharmacy', value: stats.revenue.pharmacy },
    { name: 'OT', value: stats.revenue.ot },
  ] : [];

  const chartData = weeklyRevenue.map((d: Record<string, unknown>) => ({
    date: formatDate(d.date as string, 'dd MMM'),
    OP: Number(d.op_revenue || 0),
    Pharmacy: Number(d.pharmacy_revenue || 0),
    OT: Number(d.ot_revenue || 0),
  }));

  if (isLoading) return <LoadingSpinner size="lg" className="h-64" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`Today — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      >
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
            autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}
        >
          <Activity size={12} className={autoRefresh ? 'animate-pulse' : ''} />
          {autoRefresh ? 'Live' : 'Paused'}
        </button>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="New Patients Today"
          value={stats?.newPatients || 0}
          icon={<Users size={20} />}
          color="blue"
          subtitle="Registered today"
        />
        <StatCard
          title="OP Consultations"
          value={stats?.opConsultations || 0}
          icon={<Stethoscope size={20} />}
          color="green"
          subtitle="Total appointments"
        />
        <StatCard
          title="Operations Scheduled"
          value={stats?.otScheduled || 0}
          icon={<Scissors size={20} />}
          color="amber"
          subtitle={`${stats?.otCompleted || 0} completed`}
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.revenue.total || 0)}
          icon={<DollarSign size={20} />}
          color="purple"
          subtitle="All sources"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'OP Revenue', value: stats?.revenue.op || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'OT Revenue', value: stats?.revenue.ot || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pharmacy Revenue', value: stats?.revenue.pharmacy || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item) => (
          <Card key={item.label} className={`${item.bg} border-0`}>
            <div className="text-xs text-gray-600 font-medium">{item.label}</div>
            <div className={`text-2xl font-bold ${item.color} mt-1`}>{formatCurrency(item.value)}</div>
          </Card>
        ))}
      </div>

      {/* Charts & Queue */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">7-Day Revenue Trend</h3>
            <TrendingUp size={16} className="text-gray-400" />
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Bar dataKey="OP" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Pharmacy" fill="#8b5cf6" radius={[4,4,0,0]} />
                <Bar dataKey="OT" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
              No revenue data for this week yet
            </div>
          )}
        </Card>

        {/* Revenue Pie */}
        <Card>
          <h3 className="font-semibold text-gray-700 mb-4">Revenue Split</h3>
          {stats && stats.revenue.total > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
              No revenue today
            </div>
          )}
        </Card>
      </div>

      {/* Live Waiting Queue */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft" />
            <h3 className="font-semibold text-gray-700">Live Waiting Queue</h3>
          </div>
          <Link
            to="/op"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            No patients in queue right now
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Age/Gender</th>
                  <th>Doctor</th>
                  <th>Waiting Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((appt) => (
                  <tr key={appt.id}>
                    <td>
                      <span className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                        {appt.token_number}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-800">{appt.patient_name}</div>
                      <div className="text-xs text-gray-400">{appt.patient_code}</div>
                    </td>
                    <td className="text-gray-500">{appt.age}y / {appt.gender}</td>
                    <td className="text-gray-600">{appt.doctor_name || '—'}</td>
                    <td>
                      <span className={`text-sm font-medium ${
                        (appt.waiting_minutes || 0) > 30 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {formatWaitingTime(appt.waiting_minutes || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusColor(appt.status)}>
                        {getStatusLabel(appt.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
