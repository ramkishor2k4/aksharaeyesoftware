import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Search, UserPlus, Stethoscope } from 'lucide-react';
import api from '@/lib/api';
import { Button, Input, Select, Textarea } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Patient, Doctor } from '@/types';
import { NewPatientModal } from '@/components/patients/NewPatientModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPatient?: Patient;
}

const VISIT_TYPES = [
  { value: 'General', label: 'General Consultation' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Post-op', label: 'Post-operative' },
  { value: 'Optical', label: 'Optical' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

export function NewAppointmentModal({ isOpen, onClose, onSuccess, preselectedPatient }: Props) {
  const qc = useQueryClient();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preselectedPatient || null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [form, setForm] = useState({
    doctor_id: '',
    visit_type: 'General',
    visit_reason: '',
    consultation_fee: '',
    fee_paid: false,
    payment_method: 'cash',
    notes: '',
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/appointments/doctors/list').then(r => r.data),
  });

  const doctors: Doctor[] = doctorsData?.doctors || [];

  // Auto-fill fee when doctor changes
  useEffect(() => {
    if (form.doctor_id && doctorsData?.doctors) {
      const doc = (doctorsData.doctors as Doctor[]).find(d => d.id === form.doctor_id);
      if (doc) setForm(f => ({ ...f, consultation_fee: doc.consultation_fee.toString() }));
    }
  }, [form.doctor_id, doctorsData]);

  // Patient quick search
  useEffect(() => {
    if (patientSearch.length >= 2) {
      api.get('/patients/search/quick', { params: { q: patientSearch } })
        .then(r => { setSearchResults(r.data.patients); setShowSearchDropdown(true); });
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [patientSearch]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post('/appointments', data).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`Appointment created — Token #${data.appointment.token_number}`);
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create appointment'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { toast.error('Please select a patient'); return; }
    mutation.mutate({
      patient_id: selectedPatient.id,
      doctor_id: form.doctor_id || undefined,
      visit_type: form.visit_type,
      visit_reason: form.visit_reason,
      consultation_fee: parseFloat(form.consultation_fee) || 0,
      fee_paid: form.fee_paid,
      notes: form.notes,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Stethoscope size={16} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">New Appointment</h2>
                <p className="text-xs text-gray-500">Token will be auto-assigned</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Patient Selection */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Patient</h3>
              {selectedPatient ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{selectedPatient.name}</div>
                    <div className="text-xs text-gray-500">{selectedPatient.patient_id} · {selectedPatient.age}y / {selectedPatient.gender} · {selectedPatient.mobile}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search patient by name, ID, or mobile..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    icon={<Search size={15} />}
                  />
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                      {searchResults.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => { setSelectedPatient(p); setPatientSearch(''); setShowSearchDropdown(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                        >
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{p.name}</div>
                            <div className="text-xs text-gray-400">{p.patient_id} · {p.mobile}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showSearchDropdown && searchResults.length === 0 && patientSearch.length >= 2 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">No patients found</p>
                      <Button type="button" size="sm" icon={<UserPlus size={14} />}
                        onClick={() => { setShowSearchDropdown(false); setShowNewPatient(true); }}>
                        Register New Patient
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Appointment Details */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Appointment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Doctor"
                  value={form.doctor_id}
                  onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
                  options={doctors.map(d => ({ value: d.id, label: `Dr. ${d.name} — ${d.specialization}` }))}
                  placeholder="Select doctor"
                />
                <Select
                  label="Visit Type"
                  value={form.visit_type}
                  onChange={e => setForm(f => ({ ...f, visit_type: e.target.value }))}
                  options={VISIT_TYPES}
                />
                <Input
                  label="Consultation Fee (₹)"
                  type="number"
                  value={form.consultation_fee}
                  onChange={e => setForm(f => ({ ...f, consultation_fee: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                />
                <Select
                  label="Payment Method"
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  options={PAYMENT_METHODS}
                />
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.fee_paid}
                      onChange={e => setForm(f => ({ ...f, fee_paid: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 font-medium">Fee Collected</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Visit Reason / Chief Complaint"
                    value={form.visit_reason}
                    onChange={e => setForm(f => ({ ...f, visit_reason: e.target.value }))}
                    placeholder="Describe the reason for visit..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" loading={mutation.isPending} className="flex-1">Create Appointment</Button>
            </div>
          </form>
        </div>
      </div>

      {showNewPatient && (
        <NewPatientModal
          isOpen={showNewPatient}
          onClose={() => setShowNewPatient(false)}
          onSuccess={(p) => { setSelectedPatient(p); setShowNewPatient(false); }}
        />
      )}
    </>
  );
}
