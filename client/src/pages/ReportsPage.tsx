import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Download, TrendingUp, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { Card, LoadingSpinner, PageHeader, StatCard } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';

export function ReportsPage() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-report', reportDate],
    queryFn: () => api.get('/dashboard/reports/daily', { params: { date: reportDate } }).then(r => r.data),
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthly-report', reportMonth, reportYear],
    queryFn: () => api.get('/dashboard/reports/monthly', { params: { month: reportMonth, year: reportYear } }).then(r => r.data),
  });

  const daily = dailyData?.report;
  const monthly = monthlyData?.monthlyData || [];

  const monthlyChart = monthly.map((d: Record<string, unknown>) => ({
    date: formatDate(d.date as string, 'dd'),
    OP: Number(d.op_revenue || 0),
    Pharmacy: Number(d.pharmacy_revenue || 0),
    OT: Number(d.ot_revenue || 0),
  }));

  const monthlyTotal = monthly.reduce((s: number, d: Record<string, unknown>) => s + Number(d.total_revenue || 0), 0);
  const monthlyOPTotal = monthly.reduce((s: number, d: Record<string, unknown>) => s + Number(d.op_revenue || 0), 0);
  const monthlyPharmacyTotal = monthly.reduce((s: number, d: Record<string, unknown>) => s + Number(d.pharmacy_revenue || 0), 0);
  const monthlyOTTotal = monthly.reduce((s: number, d: Record<string, unknown>) => s + Number(d.ot_revenue || 0), 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Reports & Analytics" subtitle="Revenue and operational statistics">
        <button className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Download size={15} /> Export
        </button>
      </PageHeader>

      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['daily', 'monthly'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t} Report
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <>
          {/* Date picker */}
          <Card>
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-gray-400" />
              <label className="text-sm font-medium text-gray-600">Report Date:</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                className="form-input w-auto" />
            </div>
          </Card>

          {dailyLoading ? <LoadingSpinner className="py-16" /> : daily && (
            <>
              {/* Daily Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="New Patients" value={daily.new_patients || 0} icon={<span>👤</span>} color="blue" />
                <StatCard title="Appointments" value={daily.total_appointments || 0} icon={<span>📋</span>} color="green"
                  subtitle={`${daily.completed_appointments || 0} completed`} />
                <StatCard title="Operations" value={daily.total_operations || 0} icon={<span>✂️</span>} color="amber"
                  subtitle={`${daily.completed_operations || 0} completed`} />
                <StatCard title="Total Revenue" value={formatCurrency(daily.total_revenue || 0)} icon={<span>₹</span>} color="purple" />
              </div>

              {/* Revenue Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'OP Revenue', value: daily.op_revenue || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'OT Revenue', value: daily.ot_revenue || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Pharmacy Revenue', value: daily.pharmacy_revenue || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(item => (
                  <Card key={item.label} className={`${item.bg} border-0`}>
                    <div className="text-xs font-medium text-gray-600">{item.label}</div>
                    <div className={`text-2xl font-bold ${item.color} mt-1`}>{formatCurrency(item.value)}</div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'monthly' && (
        <>
          {/* Month/Year picker */}
          <Card>
            <div className="flex items-center gap-3 flex-wrap">
              <Calendar size={16} className="text-gray-400" />
              <label className="text-sm font-medium text-gray-600">Period:</label>
              <select className="form-select w-auto" value={reportMonth} onChange={e => setReportMonth(parseInt(e.target.value))}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="form-select w-auto" value={reportYear} onChange={e => setReportYear(parseInt(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </Card>

          {monthlyLoading ? <LoadingSpinner className="py-16" /> : (
            <>
              {/* Monthly Totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value={formatCurrency(monthlyTotal)} icon={<TrendingUp size={20} />} color="purple" />
                <StatCard title="OP Revenue" value={formatCurrency(monthlyOPTotal)} icon={<span>🏥</span>} color="blue" />
                <StatCard title="OT Revenue" value={formatCurrency(monthlyOTTotal)} icon={<span>✂️</span>} color="amber" />
                <StatCard title="Pharmacy Revenue" value={formatCurrency(monthlyPharmacyTotal)} icon={<span>💊</span>} color="green" />
              </div>

              {/* Monthly Chart */}
              <Card>
                <h3 className="font-semibold text-gray-700 mb-4">
                  Daily Revenue — {months[reportMonth - 1]} {reportYear}
                </h3>
                {monthlyChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyChart} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v/1000}k`} />
                      <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                      <Legend />
                      <Bar dataKey="OP" fill="#3b82f6" radius={[3,3,0,0]} />
                      <Bar dataKey="Pharmacy" fill="#8b5cf6" radius={[3,3,0,0]} />
                      <Bar dataKey="OT" fill="#f59e0b" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
                    No revenue data for this period
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
