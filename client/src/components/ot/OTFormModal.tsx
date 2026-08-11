import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Scissors } from 'lucide-react';
import api from '@/lib/api';
import { Button, Input, Select, Textarea, LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Operation, Patient, Doctor } from '@/types';

interface Props {
  operation: Operation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OPERATION_TYPES = [
  'Cataract Surgery (PHACO)', 'Cataract Surgery (SICS)', 'LASIK', 'PRK',
  'Glaucoma Surgery', 'Retinal Detachment Surgery', 'Vitrectomy',
  'Pterygium Excision', 'Chalazion Removal', 'Entropion/Ectropion Correction',
  'DCR (Dacryocystorhinostomy)', 'Squint Correction', 'Corneal Transplant',
  'Intravitreal Injection', 'Laser Photocoagulation', 'Other'
];

export function OTFormModal({ operation, isOpen, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const isEdit = !!operation;
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({
    doctor_id: '', operation_type: '',
    eye: '', assistant_staff: '', anesthetist: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00',
    operation_cost: '', advance_paid: '0',
    pre_op_notes: '', post_op_notes: '', complications: '',
    status: 'scheduled',
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/appointments/doctors/list').then(r => r.data),
  });
  const doctors: Doctor[] = doctorsData?.doctors || [];

  useEffect(() => {
    if (isEdit && operation) {
      setForm({
        doctor_id: operation.doctor_id || '',
        operation_type: operation.operation_type,
        eye: operation.eye || '',
        assistant_staff: operation.assistant_staff || '',
        anesthetist: operation.anesthetist || '',
        scheduled_date: operation.scheduled_date,
        scheduled_time: operation.scheduled_time || '09:00',
        operation_cost: operation.operation_cost.toString(),
        advance_paid: operation.advance_paid.toString(),
        pre_op_notes: operation.pre_op_notes || '',
        post_op_notes: operation.post_op_notes || '',
        complications: operation.complications || '',
        status: operation.status,
      });
    }
  }, [operation]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      api.get('/patients/search/quick', { params: { q: patientSearch } })
        .then(r => { setSearchResults(r.data.patients); setShowDropdown(true); });
    } else { setSearchResults([]); setShowDropdown(false); }
  }, [patientSearch]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? api.put(`/operations/${operation!.id}`, data).then(r => r.data)
        : api.post('/operations', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      toast.success(isEdit ? 'Operation updated' : 'Operation scheduled');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save operation'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !selectedPatient) { toast.error('Please select a patient'); return; }
    if (!form.operation_type) { toast.error('Operation type is required'); return; }
    mutation.mutate({
      patient_id: isEdit ? operation!.patient_id : selectedPatient!.id,
      ...form,
      operation_cost: parseFloat(form.operation_cost) || 0,
      advance_paid: parseFloat(form.advance_paid) || 0,
      doctor_id: form.doctor_id || undefined,
      eye: form.eye || undefined,
    });
  };

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Scissors size={16} className="text-amber-600" />
            </div>
            <h2 className="font-semibold text-gray-800">{isEdit ? 'Edit Operation' : 'Schedule Operation'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Patient */}
          {!isEdit && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Patient</h3>
              {selectedPatient ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{selectedPatient.name}</div>
                    <div className="text-xs text-gray-500">{selectedPatient.patient_id} · {selectedPatient.mobile}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
              ) : (
                <div className="relative">
                  <Input placeholder="Search patient..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                      {searchResults.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => { setSelectedPatient(p); setPatientSearch(''); setShowDropdown(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b last:border-0">
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400 ml-auto">{p.patient_id}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Operation Details */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Operation Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="form-label">Operation Type *</label>
                <select className="form-select" value={form.operation_type} onChange={e => f('operation_type', e.target.value)} required>
                  <option value="">Select operation type</option>
                  {OPERATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Select label="Doctor" value={form.doctor_id} onChange={e => f('doctor_id', e.target.value)}
                options={doctors.map(d => ({ value: d.id, label: `Dr. ${d.name}` }))} placeholder="Select doctor" />
              <Select label="Eye" value={form.eye} onChange={e => f('eye', e.target.value)}
                options={[{ value: 'Right', label: 'Right Eye' }, { value: 'Left', label: 'Left Eye' }, { value: 'Both', label: 'Both Eyes' }]}
                placeholder="Select eye" />
              <Input label="Scheduled Date *" type="date" value={form.scheduled_date} onChange={e => f('scheduled_date', e.target.value)} required />
              <Input label="Scheduled Time" type="time" value={form.scheduled_time} onChange={e => f('scheduled_time', e.target.value)} />
              <Input label="Assistant Staff" value={form.assistant_staff} onChange={e => f('assistant_staff', e.target.value)} placeholder="Staff name(s)" />
              <Input label="Anesthetist" value={form.anesthetist} onChange={e => f('anesthetist', e.target.value)} placeholder="Anesthetist name" />
            </div>
          </div>

          {/* Cost */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cost & Payment</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Operation Cost (₹) *" type="number" value={form.operation_cost} onChange={e => f('operation_cost', e.target.value)} placeholder="0.00" min="0" required />
              <Input label="Advance Paid (₹)" type="number" value={form.advance_paid} onChange={e => f('advance_paid', e.target.value)} placeholder="0.00" min="0" />
            </div>
            {form.operation_cost && form.advance_paid && (
              <div className="mt-2 text-sm">
                <span className="text-gray-500">Balance: </span>
                <span className={`font-semibold ${parseFloat(form.operation_cost) - parseFloat(form.advance_paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{(parseFloat(form.operation_cost) - parseFloat(form.advance_paid)).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 gap-4">
            <Textarea label="Pre-op Notes" value={form.pre_op_notes} onChange={e => f('pre_op_notes', e.target.value)} rows={2} />
            {isEdit && (
              <>
                <Textarea label="Post-op Notes" value={form.post_op_notes} onChange={e => f('post_op_notes', e.target.value)} rows={2} />
                <Textarea label="Complications" value={form.complications} onChange={e => f('complications', e.target.value)} rows={2} />
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              {isEdit ? 'Update Operation' : 'Schedule Operation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
