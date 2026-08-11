import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UserPlus } from 'lucide-react';
import api from '@/lib/api';
import { Button, Input, Select, Textarea } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Patient } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
  initialData?: Partial<Patient>;
}

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const BLOOD_GROUP_OPTIONS = [
  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
];

export function NewPatientModal({ isOpen, onClose, onSuccess, initialData }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initialData?.name || '',
    age: initialData?.age?.toString() || '',
    gender: initialData?.gender || '',
    mobile: initialData?.mobile || '',
    alternate_mobile: initialData?.alternate_mobile || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    village_city: initialData?.village_city || '',
    aadhaar_number: initialData?.aadhaar_number || '',
    blood_group: initialData?.blood_group || '',
    known_allergies: initialData?.known_allergies || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/patients', data).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      toast.success(`Patient registered: ${data.patient.patient_id}`);
      onSuccess(data.patient);
      setForm({ name:'',age:'',gender:'',mobile:'',alternate_mobile:'',email:'',address:'',village_city:'',aadhaar_number:'',blood_group:'',known_allergies:'' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to register patient');
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.age || parseInt(form.age) <= 0) e.age = 'Valid age required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!form.mobile || form.mobile.length < 10) e.mobile = 'Valid mobile number required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) mutation.mutate(form);
  };

  const set = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Register New Patient</h2>
              <p className="text-xs text-gray-500">ID will be auto-generated</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Patient's full name" error={errors.name} />
              </div>
              <Input label="Age *" type="number" value={form.age} onChange={e => set('age', e.target.value)}
                placeholder="Age in years" min="1" max="120" error={errors.age} />
              <Select label="Gender *" value={form.gender} onChange={e => set('gender', e.target.value)}
                options={GENDER_OPTIONS} placeholder="Select gender" error={errors.gender} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Mobile Number *" type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)}
                placeholder="10-digit mobile" error={errors.mobile} />
              <Input label="Alternate Mobile" type="tel" value={form.alternate_mobile} onChange={e => set('alternate_mobile', e.target.value)}
                placeholder="Optional" />
              <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="Optional email" />
              <Input label="Village / City" value={form.village_city} onChange={e => set('village_city', e.target.value)}
                placeholder="City or village" />
              <div className="sm:col-span-2">
                <Textarea label="Address" value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Full address" rows={2} />
              </div>
            </div>
          </div>

          {/* Medical */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Medical Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Aadhaar Number" value={form.aadhaar_number} onChange={e => set('aadhaar_number', e.target.value)}
                placeholder="12-digit Aadhaar (optional)" maxLength={12} />
              <Select label="Blood Group" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}
                options={BLOOD_GROUP_OPTIONS} placeholder="Select blood group" />
              <div className="sm:col-span-2">
                <Textarea label="Known Allergies" value={form.known_allergies} onChange={e => set('known_allergies', e.target.value)}
                  placeholder="List any known allergies (optional)" rows={2} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              Register Patient
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
