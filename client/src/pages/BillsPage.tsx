import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Eye } from 'lucide-react';
import api from '@/lib/api';
import { Card, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Bill } from '@/types';

export function BillsPage() {
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['bills', page, dateFilter],
    queryFn: () => api.get('/bills', { params: { page, limit: 20, date: dateFilter || undefined } }).then(r => r.data),
  });

  const bills: Bill[] = data?.bills || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Billing Records" subtitle={`${total} total bills`} />

      <Card>
        <div className="flex gap-3">
          <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}
            className="form-input w-auto" />
          {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-blue-600 hover:underline">Clear</button>}
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? <LoadingSpinner className="py-16" /> :
         bills.length === 0 ? (
           <EmptyState title="No bills found" description="Bills will appear here after creating them" />
         ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td>
                      <span className="font-mono text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                        {bill.bill_number}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-800">{bill.patient_name}</div>
                      <div className="text-xs text-gray-400">{bill.patient_code}</div>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        bill.bill_type === 'pharmacy' ? 'bg-purple-100 text-purple-700' :
                        bill.bill_type === 'op' ? 'bg-blue-100 text-blue-700' :
                        bill.bill_type === 'ot' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {bill.bill_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{bill.items?.length || 0} items</td>
                    <td className="font-semibold text-gray-800">{formatCurrency(bill.total_amount)}</td>
                    <td className="capitalize text-gray-600 text-sm">{bill.payment_method}</td>
                    <td>
                      <span className={`text-xs font-medium ${
                        bill.payment_status === 'paid' ? 'text-green-600' :
                        bill.payment_status === 'partial' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {bill.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{formatDateTime(bill.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
         )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
