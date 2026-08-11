import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pill, Package, AlertTriangle, Edit, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Card, Button, Input, Select, LoadingSpinner, EmptyState, PageHeader, Badge } from '@/components/ui';
import { formatDate, getExpiryStatus } from '@/lib/utils';
import type { Medicine } from '@/types';
import { MedicineFormModal } from '@/components/pharmacy/MedicineFormModal';
import { PharmacyBillModal } from '@/components/pharmacy/PharmacyBillModal';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Eye Drops', label: 'Eye Drops' },
  { value: 'Anti-Glaucoma', label: 'Anti-Glaucoma' },
  { value: 'Steroid', label: 'Steroid' },
  { value: 'Lubricant', label: 'Lubricant' },
  { value: 'Antibiotic', label: 'Antibiotic' },
  { value: 'Mydriatic', label: 'Mydriatic' },
  { value: 'Analgesic', label: 'Analgesic' },
  { value: 'Supplement', label: 'Supplement' },
  { value: 'General', label: 'General' },
];

export function PharmacyPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showMedModal, setShowMedModal] = useState(false);
  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [tab, setTab] = useState<'inventory' | 'low_stock' | 'expiring'>('inventory');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['medicines', debouncedSearch, category, page],
    queryFn: () => api.get('/medicines', { params: { search: debouncedSearch, category, page, limit: 20 } }).then(r => r.data),
  });

  const medicines: Medicine[] = data?.medicines || [];
  const total = data?.total || 0;

  const lowStock = medicines.filter(m => m.stock_quantity <= m.low_stock_threshold);
  const expiring = medicines.filter(m => {
    if (!m.expiry_date) return false;
    const d = new Date(m.expiry_date);
    return d <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  });

  const displayMeds = tab === 'low_stock' ? lowStock : tab === 'expiring' ? expiring : medicines;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Pharmacy" subtitle={`${total} medicines in inventory`}>
        <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
          <RefreshCw size={16} />
        </button>
        <Button variant="secondary" icon={<Pill size={16} />} onClick={() => setShowBillModal(true)}>
          New Bill
        </Button>
        <Button icon={<Plus size={16} />} onClick={() => { setEditMed(null); setShowMedModal(true); }}>
          Add Medicine
        </Button>
      </PageHeader>

      {/* Alert Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={24} className="text-amber-500 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-amber-700">{lowStock.length}</div>
            <div className="text-xs text-amber-600">Low Stock Items</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Package size={24} className="text-red-500 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-red-700">{expiring.length}</div>
            <div className="text-xs text-red-600">Expiring in 90 Days</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Pill size={24} className="text-blue-500 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-blue-700">{total}</div>
            <div className="text-xs text-blue-600">Total Medicines</div>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'inventory', label: 'All Inventory' },
            { id: 'low_stock', label: `Low Stock (${lowStock.length})` },
            { id: 'expiring', label: `Expiring (${expiring.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search medicines..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} icon={<Search size={15} />} className="w-56" />
          <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} options={CATEGORY_OPTIONS} className="w-40" placeholder="" />
        </div>
      </div>

      {/* Medicines Table */}
      <Card padding={false}>
        {isLoading ? <LoadingSpinner className="py-16" /> :
         displayMeds.length === 0 ? (
           <EmptyState title="No medicines found" description="Add medicines to your inventory"
             action={<Button icon={<Plus size={16} />} onClick={() => setShowMedModal(true)}>Add Medicine</Button>} />
         ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Batch</th>
                  <th>Stock</th>
                  <th>Unit Price</th>
                  <th>Expiry</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayMeds.map(med => {
                  const expiry = getExpiryStatus(med.expiry_date || '');
                  const isLow = med.stock_quantity <= med.low_stock_threshold;
                  return (
                    <tr key={med.id}>
                      <td>
                        <div className="font-medium text-gray-800">{med.name}</div>
                        {med.generic_name && <div className="text-xs text-gray-400">{med.generic_name}</div>}
                        {med.manufacturer && <div className="text-xs text-gray-400">{med.manufacturer}</div>}
                      </td>
                      <td>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{med.category}</span>
                      </td>
                      <td className="text-gray-500 text-xs font-mono">{med.batch_number || '—'}</td>
                      <td>
                        <div className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                          {med.stock_quantity} {med.unit}
                        </div>
                        {isLow && <div className="text-xs text-red-400">Low stock!</div>}
                      </td>
                      <td>
                        <div className="font-medium text-gray-700">₹{med.selling_price}</div>
                        <div className="text-xs text-gray-400">Cost: ₹{med.purchase_price}</div>
                      </td>
                      <td className={`text-sm ${expiry.className}`}>{expiry.label}</td>
                      <td>
                        <button onClick={() => { setEditMed(med); setShowMedModal(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
         )}
      </Card>

      {showMedModal && (
        <MedicineFormModal
          medicine={editMed}
          isOpen={showMedModal}
          onClose={() => setShowMedModal(false)}
          onSuccess={() => { setShowMedModal(false); refetch(); }}
        />
      )}

      {showBillModal && (
        <PharmacyBillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          onSuccess={() => { setShowBillModal(false); }}
        />
      )}
    </div>
  );
}
