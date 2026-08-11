import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Clock, User, Stethoscope, RefreshCw, Filter } from 'lucide-react';
import api from '@/lib/api';
import { Card, Button, Input, Select, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui';
import { formatWaitingTime, getStatusColor, getStatusLabel, formatCurrency } from '@/lib/utils';
import type { Appointment } from '@/types';
import { NewAppointmentModal } from '@/components/op/NewAppointmentModal';
import { ConsultationModal } from '@/components/op/ConsultationModal';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_consultation', label: 'In Consultation' },
  { value: 'completed', label: 'Completed' },
  { value: 'sent_to_pharmacy', label: 'Sent to Pharmacy' },
  { value: 'sent_to_ot', label: 'Sent to OT' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OPQueuePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appointments', dateFilter, statusFilter],
    queryFn: () => api.get('/appointments', {
      params: { date: dateFilter, status: statusFilter || undefined }
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); },
  });

  const appointments: Appointment[] = data?.appointments || [];
  const total = data?.total || 0;

  const waitingCount = appointments.filter(a => a.status === 'waiting').length;
  const inConsultCount = appointments.filter(a => a.status === 'in_consultation').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="OP Queue" subtitle={`${total} appointments · ${waitingCount} waiting · ${inConsultCount} in consultation`}>
        <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-all">
          <RefreshCw size={16} />
        </button>
        {(user?.role === 'admin' || user?.role === 'receptionist') && (
          <Button icon={<Plus size={16} />} onClick={() => setShowNewAppt(true)}>
            New Appointment
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="form-input w-auto"
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="w-auto min-w-[160px]"
            placeholder=""
          />
        </div>
      </Card>

      {/* Queue Table */}
      <Card padding={false}>
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : appointments.length === 0 ? (
          <EmptyState
            title="No appointments"
            description="No appointments found for the selected date/status"
            action={
              (user?.role === 'admin' || user?.role === 'receptionist') &&
              <Button icon={<Plus size={16} />} onClick={() => setShowNewAppt(true)}>
                New Appointment
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Age/Gender</th>
                  <th>Visit Type</th>
                  <th>Doctor</th>
                  <th>Fee</th>
                  <th>Wait Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id}>
                    <td>
                      <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {appt.token_number}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-gray-800">{appt.patient_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{appt.patient_code}</div>
                    </td>
                    <td className="text-gray-500 text-sm">{appt.age}y / {appt.gender}</td>
                    <td>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {appt.visit_type}
                      </span>
                    </td>
                    <td className="text-gray-600 text-sm">{appt.doctor_name || '—'}</td>
                    <td>
                      <div className="text-sm font-medium text-gray-700">{formatCurrency(appt.consultation_fee)}</div>
                      <div className={`text-xs ${appt.fee_paid ? 'text-green-600' : 'text-red-500'}`}>
                        {appt.fee_paid ? '✓ Paid' : '✗ Unpaid'}
                      </div>
                    </td>
                    <td>
                      <span className={`text-sm font-medium ${(appt.waiting_minutes || 0) > 30 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatWaitingTime(appt.waiting_minutes || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusColor(appt.status)}>
                        {getStatusLabel(appt.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {/* Doctor: open consultation */}
                        {(user?.role === 'doctor' || user?.role === 'admin') && (
                          <button
                            onClick={() => setSelectedAppt(appt)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium"
                            title="Open Consultation"
                          >
                            <Stethoscope size={14} />
                          </button>
                        )}
                        {/* Receptionist: update status */}
                        {(user?.role === 'receptionist' || user?.role === 'admin') && appt.status === 'waiting' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: appt.id, status: 'in_consultation' })}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Start Consultation"
                          >
                            <User size={14} />
                          </button>
                        )}
                        {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (confirm('Cancel this appointment?'))
                                statusMutation.mutate({ id: appt.id, status: 'cancelled' });
                            }}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg text-xs"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showNewAppt && (
        <NewAppointmentModal
          isOpen={showNewAppt}
          onClose={() => setShowNewAppt(false)}
          onSuccess={() => { setShowNewAppt(false); refetch(); }}
        />
      )}

      {selectedAppt && (
        <ConsultationModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onSuccess={() => { setSelectedAppt(null); refetch(); }}
        />
      )}
    </div>
  );
}
