import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Scissors, Calendar, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Card, Button, Select, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui';
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import type { Operation } from '@/types';
import { OTFormModal } from '@/components/ot/OTFormModal';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OTManagementPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editOp, setEditOp] = useState<Operation | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['operations', dateFilter, statusFilter],
    queryFn: () => api.get('/operations', {
      params: { date: dateFilter || undefined, status: statusFilter || undefined }
    }).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/operations/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['operations'] }); toast.success('Status updated'); },
  });

  const operations: Operation[] = data?.operations || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="OT Management" subtitle={`${total} operations`}>
        <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
          <RefreshCw size={16} />
        </button>
        <Button icon={<Plus size={16} />} onClick={() => { setEditOp(null); setShowModal(true); }}>
          Schedule Operation
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="form-input w-auto" />
          <button onClick={() => setDateFilter('')} className="text-xs text-blue-600 hover:underline">All dates</button>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={STATUS_OPTIONS} className="w-auto min-w-[140px]" placeholder="" />
        </div>
      </Card>

      {/* Operations Table */}
      <Card padding={false}>
        {isLoading ? <LoadingSpinner className="py-16" /> :
         operations.length === 0 ? (
           <EmptyState title="No operations found" description="Schedule an operation to get started"
             action={<Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Schedule Operation</Button>} />
         ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Operation</th>
                  <th>Eye</th>
                  <th>Doctor</th>
                  <th>Scheduled</th>
                  <th>Cost</th>
                  <th>Advance</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={op.id} onClick={() => { setEditOp(op); setShowModal(true); }}>
                    <td>
                      <div className="font-medium text-gray-800">{op.patient_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{op.patient_code}</div>
                    </td>
                    <td className="font-medium text-gray-700">{op.operation_type}</td>
                    <td className="text-gray-500 text-sm">{op.eye || '—'}</td>
                    <td className="text-gray-600 text-sm">{op.doctor_name ? `Dr. ${op.doctor_name}` : '—'}</td>
                    <td>
                      <div className="text-sm text-gray-700">{formatDate(op.scheduled_date)}</div>
                      {op.scheduled_time && <div className="text-xs text-gray-400">{op.scheduled_time}</div>}
                    </td>
                    <td className="font-medium text-gray-700">{formatCurrency(op.operation_cost)}</td>
                    <td className="text-green-600">{formatCurrency(op.advance_paid)}</td>
                    <td className={`font-semibold ${op.remaining_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(op.remaining_balance)}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <span className={getStatusColor(op.status)}>{getStatusLabel(op.status)}</span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {op.status === 'scheduled' && (
                          <button onClick={() => statusMutation.mutate({ id: op.id, status: 'in_progress' })}
                            className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200">
                            Start
                          </button>
                        )}
                        {op.status === 'in_progress' && (
                          <button onClick={() => statusMutation.mutate({ id: op.id, status: 'completed' })}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                            Complete
                          </button>
                        )}
                        {(op.status === 'scheduled' || op.status === 'in_progress') && (
                          <button onClick={() => { if (confirm('Cancel?')) statusMutation.mutate({ id: op.id, status: 'cancelled' }); }}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                            Cancel
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

      {showModal && (
        <OTFormModal
          operation={editOp}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); refetch(); }}
        />
      )}
    </div>
  );
}
