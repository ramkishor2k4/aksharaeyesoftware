import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Eye, Stethoscope, Pill, Scissors, Plus, Trash2, Printer } from 'lucide-react';
import api from '@/lib/api';
import { Button, Input, Textarea, Card, LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Appointment, Consultation, PrescribedMedicine } from '@/types';
import { PrescriptionSlipModal } from '@/components/op/PrescriptionSlipModal';

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed', 'At bedtime'];
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '3 months', 'Ongoing'];

export function ConsultationModal({ appointment, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<'vision' | 'clinical' | 'medicines' | 'actions'>('vision');
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  const [form, setForm] = useState({
    right_eye_vision: '', left_eye_vision: '',
    right_eye_power: '', left_eye_power: '',
    right_eye_pressure: '', left_eye_pressure: '',
    chief_complaint: appointment.visit_reason || '',
    diagnosis: '', clinical_notes: '',
    investigations: '',
    follow_up_date: '', follow_up_notes: '',
    send_to_pharmacy: false,
    send_to_ot: false,
    ot_recommendation: '',
  });
  const [medicines, setMedicines] = useState<PrescribedMedicine[]>([]);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '' });

  // Load existing consultation if any
  const { data: existingData, isLoading } = useQuery({
    queryKey: ['consultation', appointment.id],
    queryFn: () => api.get(`/consultations/by-appointment/${appointment.id}`).then(r => r.data),
  });

  useEffect(() => {
    if (existingData?.consultation) {
      const c: Consultation = existingData.consultation;
      setForm({
        right_eye_vision: c.right_eye_vision || '', left_eye_vision: c.left_eye_vision || '',
        right_eye_power: c.right_eye_power || '', left_eye_power: c.left_eye_power || '',
        right_eye_pressure: c.right_eye_pressure || '', left_eye_pressure: c.left_eye_pressure || '',
        chief_complaint: c.chief_complaint || '', diagnosis: c.diagnosis || '',
        clinical_notes: c.clinical_notes || '', investigations: c.investigations || '',
        follow_up_date: c.follow_up_date ? c.follow_up_date.split('T')[0] : '',
        follow_up_notes: c.follow_up_notes || '',
        send_to_pharmacy: c.send_to_pharmacy, send_to_ot: c.send_to_ot,
        ot_recommendation: c.ot_recommendation || '',
      });
      setMedicines(c.prescribed_medicines || []);
    }
  }, [existingData]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post('/consultations', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['consultation', appointment.id] });
      toast.success('Consultation saved');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save consultation'),
  });

  const addMedicine = () => {
    if (!newMed.name.trim()) { toast.error('Medicine name is required'); return; }
    setMedicines(m => [...m, { ...newMed }]);
    setNewMed({ name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', instructions: '' });
  };

  const removeMedicine = (idx: number) => setMedicines(m => m.filter((_, i) => i !== idx));

  const handleSave = (sendToPharmacy?: boolean, sendToOT?: boolean) => {
    mutation.mutate({
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      ...form,
      send_to_pharmacy: sendToPharmacy ?? form.send_to_pharmacy,
      send_to_ot: sendToOT ?? form.send_to_ot,
      prescribed_medicines: medicines,
      follow_up_date: form.follow_up_date || undefined,
    });
  };

  const sections = [
    { id: 'vision', label: 'Vision', icon: <Eye size={14} /> },
    { id: 'clinical', label: 'Clinical', icon: <Stethoscope size={14} /> },
    { id: 'medicines', label: `Medicines (${medicines.length})`, icon: <Pill size={14} /> },
    { id: 'actions', label: 'Actions', icon: <Scissors size={14} /> },
  ];

  const f = (field: string, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800">Consultation — Token #{appointment.token_number}</h2>
            <p className="text-xs text-gray-500">
              {appointment.patient_name} ({appointment.patient_code}) · {appointment.age}y / {appointment.gender}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto flex-shrink-0">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id as typeof activeSection)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeSection === s.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? <LoadingSpinner className="flex-1" /> : (
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'vision' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">Visual Acuity & Eye Examination</h3>
                {/* Vision grid */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Right Eye */}
                  <div className="space-y-3 p-4 bg-blue-50 rounded-xl">
                    <div className="text-sm font-semibold text-blue-800 text-center">👁 Right Eye (OD)</div>
                    <Input label="Vision" value={form.right_eye_vision} onChange={e => f('right_eye_vision', e.target.value)} placeholder="e.g. 6/6" />
                    <Input label="Power (SPH/CYL/Axis)" value={form.right_eye_power} onChange={e => f('right_eye_power', e.target.value)} placeholder="e.g. -1.50 / -0.50 / 90°" />
                    <Input label="IOP (Pressure)" value={form.right_eye_pressure} onChange={e => f('right_eye_pressure', e.target.value)} placeholder="e.g. 14 mmHg" />
                  </div>
                  {/* Left Eye */}
                  <div className="space-y-3 p-4 bg-indigo-50 rounded-xl">
                    <div className="text-sm font-semibold text-indigo-800 text-center">👁 Left Eye (OS)</div>
                    <Input label="Vision" value={form.left_eye_vision} onChange={e => f('left_eye_vision', e.target.value)} placeholder="e.g. 6/6" />
                    <Input label="Power (SPH/CYL/Axis)" value={form.left_eye_power} onChange={e => f('left_eye_power', e.target.value)} placeholder="e.g. -2.00 / -0.75 / 180°" />
                    <Input label="IOP (Pressure)" value={form.left_eye_pressure} onChange={e => f('left_eye_pressure', e.target.value)} placeholder="e.g. 16 mmHg" />
                  </div>
                </div>
                <Input label="Follow-up Date" type="date" value={form.follow_up_date} onChange={e => f('follow_up_date', e.target.value)} />
              </div>
            )}

            {activeSection === 'clinical' && (
              <div className="space-y-4">
                <Textarea label="Chief Complaint" value={form.chief_complaint} onChange={e => f('chief_complaint', e.target.value)} placeholder="Patient's main complaint..." rows={2} />
                <Textarea label="Diagnosis *" value={form.diagnosis} onChange={e => f('diagnosis', e.target.value)} placeholder="Clinical diagnosis..." rows={3} />
                <Textarea label="Clinical Notes" value={form.clinical_notes} onChange={e => f('clinical_notes', e.target.value)} placeholder="Examination findings, additional notes..." rows={3} />
                <Textarea label="Investigations Required" value={form.investigations} onChange={e => f('investigations', e.target.value)} placeholder="Lab tests, imaging, etc." rows={2} />
                <Textarea label="Follow-up Instructions" value={form.follow_up_notes} onChange={e => f('follow_up_notes', e.target.value)} placeholder="Instructions for follow-up..." rows={2} />
              </div>
            )}

            {activeSection === 'medicines' && (
              <div className="space-y-4">
                {/* Add Medicine Form */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-600">Add Medicine</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Medicine Name" value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))} placeholder="e.g. Ciprofloxacin Eye Drops" />
                    <Input label="Dosage" value={newMed.dosage} onChange={e => setNewMed(m => ({ ...m, dosage: e.target.value }))} placeholder="e.g. 1 drop" />
                    <div className="space-y-1">
                      <label className="form-label">Frequency</label>
                      <select className="form-select" value={newMed.frequency} onChange={e => setNewMed(m => ({ ...m, frequency: e.target.value }))}>
                        {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="form-label">Duration</label>
                      <select className="form-select" value={newMed.duration} onChange={e => setNewMed(m => ({ ...m, duration: e.target.value }))}>
                        {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Input label="Instructions (optional)" value={newMed.instructions} onChange={e => setNewMed(m => ({ ...m, instructions: e.target.value }))} placeholder="Special instructions..." />
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="secondary" icon={<Plus size={14} />} onClick={addMedicine}>
                    Add Medicine
                  </Button>
                </div>

                {/* Medicine List */}
                {medicines.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">No medicines added yet</div>
                ) : (
                  <div className="space-y-2">
                    {medicines.map((med, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{med.name}</div>
                          <div className="text-xs text-gray-500">{med.dosage} · {med.frequency} · {med.duration}</div>
                          {med.instructions && <div className="text-xs text-blue-600">{med.instructions}</div>}
                        </div>
                        <button onClick={() => removeMedicine(idx)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'actions' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${form.send_to_pharmacy ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.send_to_pharmacy} onChange={e => f('send_to_pharmacy', e.target.checked)} className="w-4 h-4" />
                    <div>
                      <div className="font-semibold text-gray-700 flex items-center gap-1"><Pill size={14} className="text-purple-600" /> Send to Pharmacy</div>
                      <div className="text-xs text-gray-500">Patient will collect medicines</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${form.send_to_ot ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.send_to_ot} onChange={e => f('send_to_ot', e.target.checked)} className="w-4 h-4" />
                    <div>
                      <div className="font-semibold text-gray-700 flex items-center gap-1"><Scissors size={14} className="text-amber-600" /> Send to OT</div>
                      <div className="text-xs text-gray-500">Schedule operation</div>
                    </div>
                  </label>
                </div>
                {form.send_to_ot && (
                  <Textarea label="OT Recommendation" value={form.ot_recommendation} onChange={e => f('ot_recommendation', e.target.value)} placeholder="Describe the recommended operation..." rows={3} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white flex-wrap sm:flex-nowrap">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" icon={<Printer size={14} />} onClick={() => setShowPrintSlip(true)}>
            Print Slip
          </Button>
          <Button variant="secondary" loading={mutation.isPending} onClick={() => handleSave()}>
            Save Only
          </Button>
          {form.send_to_pharmacy && (
            <Button loading={mutation.isPending} onClick={() => handleSave(true, false)}
              className="bg-purple-600 hover:bg-purple-700">
              <Pill size={14} /> Save & Send to Pharmacy
            </Button>
          )}
          {form.send_to_ot && (
            <Button loading={mutation.isPending} onClick={() => handleSave(false, true)}
              className="bg-amber-600 hover:bg-amber-700">
              <Scissors size={14} /> Save & Send to OT
            </Button>
          )}
          {!form.send_to_pharmacy && !form.send_to_ot && (
            <Button loading={mutation.isPending} onClick={() => handleSave()}>
              Complete Consultation
            </Button>
          )}
        </div>
      </div>

      {showPrintSlip && (
        <PrescriptionSlipModal
          isOpen={showPrintSlip}
          onClose={() => setShowPrintSlip(false)}
          patient={{
            id: appointment.patient_id,
            patient_id: appointment.patient_code || 'PATIENT',
            name: appointment.patient_name || 'Patient',
            age: appointment.age || 0,
            gender: (appointment.gender as 'Male' | 'Female' | 'Other') || 'Male',
            mobile: appointment.mobile || '',
            address: (appointment as any).address || '',
            village_city: (appointment as any).village_city || '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          consultation={{
            id: existingData?.consultation?.id || 'new',
            appointment_id: appointment.id,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id || '',
            right_eye_vision: form.right_eye_vision,
            left_eye_vision: form.left_eye_vision,
            right_eye_power: form.right_eye_power,
            left_eye_power: form.left_eye_power,
            right_eye_pressure: form.right_eye_pressure,
            left_eye_pressure: form.left_eye_pressure,
            chief_complaint: form.chief_complaint,
            diagnosis: form.diagnosis,
            clinical_notes: form.clinical_notes,
            investigations: form.investigations,
            prescribed_medicines: medicines,
            follow_up_date: form.follow_up_date,
            follow_up_notes: form.follow_up_notes,
            send_to_pharmacy: form.send_to_pharmacy,
            send_to_ot: form.send_to_ot,
            ot_recommendation: form.ot_recommendation,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          doctorName={appointment.doctor_name}
        />
      )}
    </div>
  );
}
