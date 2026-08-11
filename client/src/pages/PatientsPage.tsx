import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, User, Phone, MapPin, Calendar, Edit } from 'lucide-react';
import api from '@/lib/api';
import { Card, Button, Input, LoadingSpinner, EmptyState, PageHeader, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import type { Patient } from '@/types';
import { NewPatientModal } from '@/components/patients/NewPatientModal';

export function PatientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['patients', debouncedSearch, page],
    queryFn: () => api.get('/patients', { params: { search: debouncedSearch, page, limit: 20 } }).then(r => r.data),
  });

  const patients: Patient[] = data?.patients || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Patient Registry" subtitle={`${total} total patients`}>
        <Button
          icon={<Plus size={16} />}
          onClick={() => setShowNewModal(true)}
        >
          New Patient
        </Button>
      </PageHeader>

      {/* Search */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, patient ID, or mobile..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={<Search size={15} />}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : patients.length === 0 ? (
          <EmptyState
            title="No patients found"
            description={search ? "Try a different search term" : "Register your first patient to get started"}
            action={
              <Button icon={<Plus size={16} />} onClick={() => setShowNewModal(true)}>
                Register Patient
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Age / Gender</th>
                    <th>Mobile</th>
                    <th>Location</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <span className="font-mono text-blue-700 font-semibold text-xs bg-blue-50 px-2 py-0.5 rounded">
                          {patient.patient_id}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{patient.name}</div>
                            {patient.known_allergies && (
                              <div className="text-xs text-red-500">⚠ Allergies noted</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-gray-700">{patient.age}y</span>
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                          patient.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 
                          patient.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {patient.gender}
                        </span>
                      </td>
                      <td>
                        <a href={`tel:${patient.mobile}`} className="text-gray-600 hover:text-blue-600 flex items-center gap-1">
                          <Phone size={12} /> {patient.mobile}
                        </a>
                      </td>
                      <td>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <MapPin size={11} /> {patient.village_city || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar size={11} /> {formatDate(patient.created_at)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View history"
                          >
                            <User size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = page <= 3 ? i + 1 : page - 2 + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-sm border rounded-lg ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <NewPatientModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => { setShowNewModal(false); refetch(); }}
      />
    </div>
  );
}
