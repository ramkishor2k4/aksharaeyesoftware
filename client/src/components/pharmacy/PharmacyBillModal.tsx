import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pill, Search, Plus, Trash2, Printer } from 'lucide-react';
import api from '@/lib/api';
import { Button, Input, Select, Textarea } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Patient, Medicine, BillItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Props { isOpen: boolean; onClose: () => void; onSuccess: (billId: string) => void; }

export function PharmacyBillModal({ isOpen, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<Medicine[]>([]);
  const [showMedDrop, setShowMedDrop] = useState(false);
  const [items, setItems] = useState<(BillItem & { medicine: Medicine })[]>([]);

  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [createdBill, setCreatedBill] = useState<Record<string, unknown> | null>(null);

  // Patient search
  useEffect(() => {
    if (patientSearch.length >= 2) {
      api.get('/patients/search/quick', { params: { q: patientSearch } })
        .then(r => { setPatientResults(r.data.patients); setShowPatientDrop(true); });
    }
  }, [patientSearch]);

  // Medicine smart search (3-char debounce)
  useEffect(() => {
    if (medSearch.length >= 3) {
      const t = setTimeout(() => {
        api.get('/medicines/search', { params: { q: medSearch } })
          .then(r => { setMedResults(r.data.medicines); setShowMedDrop(true); });
      }, 300);
      return () => clearTimeout(t);
    } else {
      setMedResults([]);
      setShowMedDrop(false);
    }
  }, [medSearch]);

  const addMedicine = (med: Medicine) => {
    const unitPrice = parseFloat(med.selling_price as any) || 0;
    const existing = items.find(i => i.medicine_id === med.id);
    if (existing) {
      setItems(items.map(i => i.medicine_id === med.id ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price * (1 - (i.discount_percent || 0) / 100) } : i));
    } else {
      setItems([...items, {
        medicine_id: med.id, medicine_name: med.name, batch_number: med.batch_number,
        quantity: 1, unit_price: unitPrice, total_price: unitPrice,
        discount_percent: 0, medicine: med,
      }]);
    }
    setMedSearch('');
    setShowMedDrop(false);
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    const max = items[idx].medicine.stock_quantity;
    if (qty > max) { toast.error(`Only ${max} in stock`); return; }
    setItems(items.map((i, j) => j === idx ? { ...i, quantity: qty, total_price: qty * i.unit_price * (1 - (i.discount_percent || 0) / 100) } : i));
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (Number(i.total_price) || 0), 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/bills', data).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success(`Bill created: ${data.bill.bill_number}`);
      setCreatedBill(data.bill);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create bill'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { toast.error('Select a patient'); return; }
    if (items.length === 0) { toast.error('Add at least one medicine'); return; }
    mutation.mutate({
      patient_id: selectedPatient.id,
      bill_type: 'pharmacy',
      items: items.map(({ medicine: _, ...i }) => i),
      discount_amount: discountAmt,
      paid_amount: total,
      payment_method: paymentMethod,
      payment_status: 'paid',
      notes,
    });
  };

  const handlePrint = () => window.print();

  if (!isOpen) return null;

  if (createdBill) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Bill Created!</h2>
          <p className="text-gray-500 mt-1">{createdBill.bill_number as string}</p>
          <div className="text-3xl font-bold text-green-600 my-4">{formatCurrency(createdBill.total_amount as number)}</div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" icon={<Printer size={16} />} onClick={handlePrint}>Print</Button>
            <Button onClick={() => { setCreatedBill(null); onSuccess(createdBill.id as string); onClose(); }}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Pill size={16} className="text-purple-600" />
            </div>
            <h2 className="font-semibold">New Pharmacy Bill</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Patient */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Patient</h3>
            {selectedPatient ? (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{selectedPatient.name.charAt(0)}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{selectedPatient.name}</div>
                  <div className="text-xs text-gray-500">{selectedPatient.patient_id} · {selectedPatient.mobile}</div>
                </div>
                <button type="button" onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Search patient by name, ID, or mobile..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} icon={<Search size={15} />} />
                {showPatientDrop && patientResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                    {patientResults.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setSelectedPatient(p); setPatientSearch(''); setShowPatientDrop(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b last:border-0">
                        {p.name} <span className="text-gray-400 text-xs">· {p.patient_id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medicine Search */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Add Medicines</h3>
            <div className="relative">
              <Input placeholder="Type 3+ letters to search medicines..." value={medSearch} onChange={e => setMedSearch(e.target.value)} icon={<Search size={15} />} />
              {showMedDrop && medResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-xl z-20 max-h-52 overflow-y-auto">
                  {medResults.map(med => (
                    <button key={med.id} type="button" onClick={() => addMedicine(med)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b last:border-0 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{med.name}</div>
                        <div className="text-xs text-gray-400">{med.generic_name} · {med.batch_number}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-purple-700">₹{med.selling_price}</div>
                        <div className={`text-xs ${med.stock_quantity <= 10 ? 'text-red-500' : 'text-gray-400'}`}>
                          Stock: {med.stock_quantity}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showMedDrop && medResults.length === 0 && medSearch.length >= 3 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-lg z-20 p-3 text-center text-sm text-gray-500">
                  No medicines found for "{medSearch}"
                </div>
              )}
            </div>
          </div>

          {/* Bill Items */}
          {items.length > 0 && (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium">Medicine</th>
                    <th className="text-center py-2 text-gray-500 font-medium w-24">Qty</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Price</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2">
                        <div className="font-medium text-gray-800">{item.medicine_name}</div>
                        <div className="text-xs text-gray-400">{item.batch_number}</div>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => updateQty(idx, item.quantity - 1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold">−</button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(idx, item.quantity + 1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold">+</button>
                        </div>
                      </td>
                      <td className="py-2 text-right text-gray-600">₹{(Number(item.unit_price) || 0).toFixed(2)}</td>
                      <td className="py-2 text-right font-semibold">₹{(Number(item.total_price) || 0).toFixed(2)}</td>
                      <td className="py-2 pl-2">
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 flex-shrink-0">Discount (₹)</span>
                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} min="0" max={subtotal}
                  className="form-input py-1 ml-auto w-24 text-right" />
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span className="text-purple-700">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              options={[{value:'cash',label:'Cash'},{value:'card',label:'Card'},{value:'upi',label:'UPI'}]} />
            <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={1} placeholder="Optional notes" />
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit as unknown as React.MouseEventHandler} loading={mutation.isPending} className="flex-1" disabled={items.length === 0}>
            Create Bill — {formatCurrency(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
