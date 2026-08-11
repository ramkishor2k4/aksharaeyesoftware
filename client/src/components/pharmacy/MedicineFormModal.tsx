import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pill } from 'lucide-react';
import api from '@/lib/api';
import { Button, Input, Select, Textarea } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Medicine } from '@/types';

interface Props { medicine: Medicine | null; isOpen: boolean; onClose: () => void; onSuccess: () => void; }

const CATEGORIES = ['Eye Drops', 'Anti-Glaucoma', 'Steroid', 'Lubricant', 'Antibiotic', 'Mydriatic', 'Miotic', 'Analgesic', 'Supplement', 'Decongestant', 'General'];
const UNITS = ['Bottle', 'Tablet', 'Capsule', 'Tube', 'Vial', 'Sachet', 'Strip'];

export function MedicineFormModal({ medicine, isOpen, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const isEdit = !!medicine;
  const [form, setForm] = useState({
    name: medicine?.name || '',
    generic_name: medicine?.generic_name || '',
    category: medicine?.category || 'General',
    batch_number: medicine?.batch_number || '',
    stock_quantity: medicine?.stock_quantity?.toString() || '0',
    unit: medicine?.unit || 'Bottle',
    purchase_price: medicine?.purchase_price?.toString() || '0',
    selling_price: medicine?.selling_price?.toString() || '0',
    mrp: medicine?.mrp?.toString() || '',
    expiry_date: medicine?.expiry_date ? medicine.expiry_date.split('T')[0] : '',
    manufacturer: medicine?.manufacturer || '',
    description: medicine?.description || '',
    low_stock_threshold: medicine?.low_stock_threshold?.toString() || '10',
    requires_prescription: medicine?.requires_prescription || false,
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit
        ? api.put(`/medicines/${medicine!.id}`, data).then(r => r.data)
        : api.post('/medicines', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      toast.success(isEdit ? 'Medicine updated' : 'Medicine added');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save medicine'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.selling_price) { toast.error('Name and selling price are required'); return; }
    mutation.mutate({
      ...form,
      stock_quantity: parseInt(form.stock_quantity),
      purchase_price: parseFloat(form.purchase_price),
      selling_price: parseFloat(form.selling_price),
      mrp: form.mrp ? parseFloat(form.mrp) : undefined,
      low_stock_threshold: parseInt(form.low_stock_threshold),
      expiry_date: form.expiry_date || undefined,
    });
  };

  const f = (field: string, value: string | boolean) => setForm(p => ({ ...p, [field]: value }));
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Pill size={16} className="text-green-600" />
            </div>
            <h2 className="font-semibold">{isEdit ? 'Edit Medicine' : 'Add New Medicine'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Medicine Name *" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Full medicine name" required />
            </div>
            <Input label="Generic Name" value={form.generic_name} onChange={e => f('generic_name', e.target.value)} placeholder="Active ingredient" />
            <div className="space-y-1">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => f('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={e => f('unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <Input label="Batch Number" value={form.batch_number} onChange={e => f('batch_number', e.target.value)} placeholder="e.g. B2024001" />
            <Input label="Stock Quantity" type="number" value={form.stock_quantity} onChange={e => f('stock_quantity', e.target.value)} min="0" />
            <Input label="Low Stock Alert At" type="number" value={form.low_stock_threshold} onChange={e => f('low_stock_threshold', e.target.value)} min="0" />
            <Input label="Expiry Date" type="date" value={form.expiry_date} onChange={e => f('expiry_date', e.target.value)} />
            <Input label="Purchase Price (₹)" type="number" value={form.purchase_price} onChange={e => f('purchase_price', e.target.value)} min="0" step="0.01" />
            <Input label="Selling Price (₹) *" type="number" value={form.selling_price} onChange={e => f('selling_price', e.target.value)} min="0" step="0.01" required />
            <Input label="MRP (₹)" type="number" value={form.mrp} onChange={e => f('mrp', e.target.value)} min="0" step="0.01" />
            <Input label="Manufacturer" value={form.manufacturer} onChange={e => f('manufacturer', e.target.value)} placeholder="Company name" />
            <div className="sm:col-span-2">
              <Textarea label="Description" value={form.description} onChange={e => f('description', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requires_prescription} onChange={e => f('requires_prescription', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Requires Prescription (Rx)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">{isEdit ? 'Update' : 'Add Medicine'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
