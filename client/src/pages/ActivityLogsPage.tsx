import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import api from '@/lib/api';
import { Card, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import type { ActivityLog } from '@/types';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  CREATE_PATIENT: 'bg-blue-100 text-blue-700',
  UPDATE_PATIENT: 'bg-sky-100 text-sky-700',
  CREATE_APPOINTMENT: 'bg-indigo-100 text-indigo-700',
  SAVE_CONSULTATION: 'bg-teal-100 text-teal-700',
  CREATE_OPERATION: 'bg-amber-100 text-amber-700',
  CREATE_BILL: 'bg-purple-100 text-purple-700',
  CREATE_MEDICINE: 'bg-emerald-100 text-emerald-700',
  CREATE_USER: 'bg-rose-100 text-rose-700',
};

export function ActivityLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', page],
    queryFn: () => api.get('/dashboard/activity-logs', { params: { page, limit: 50 } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const logs: ActivityLog[] = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Activity Logs" subtitle={`${total} total actions recorded`}>
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
          <Activity size={12} className="animate-pulse" /> Live
        </div>
      </PageHeader>

      <Card padding={false}>
        {isLoading ? <LoadingSpinner className="py-16" /> :
         logs.length === 0 ? (
           <EmptyState title="No activity logs" description="User actions will be recorded here" />
         ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Entity</th>
                  <th>Description</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="font-medium text-gray-700">{log.user_name || '—'}</td>
                    <td>
                      <span className="text-xs capitalize text-gray-500">{log.user_role || '—'}</span>
                    </td>
                    <td className="text-gray-500 text-xs">{log.entity_type ? `${log.entity_type}: ${log.entity_name || log.entity_id?.slice(0,8)}` : '—'}</td>
                    <td className="text-gray-600 text-xs max-w-xs truncate">{log.description || '—'}</td>
                    <td className="text-gray-400 text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
         )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
