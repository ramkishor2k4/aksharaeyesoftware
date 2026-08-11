import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, User, Phone, MapPin, Calendar, Stethoscope,
  Scissors, Pill, FileText, Clock, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { Card, LoadingSpinner, Badge, PageHeader, Button } from '@/components/ui';
import { formatDate, formatDateTime, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import type { PatientHistory } from '@/types';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'operations' | 'bills'>('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data as PatientHistory),
  });

  if (isLoading) return <LoadingSpinner size="lg" className="h-64" />;
  if (!data) return <div className="text-gray-500 text-center py-16">Patient not found</div>;

  const { patient, appointments, consultations, operations, bills } = data;

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'consultations', label: 'Consultations', count: consultations.length },
    { id: 'operations', label: 'Operations', count: operations.length },
    { id: 'bills', label: 'Bills', count: bills.length },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Patient History" subtitle={`${patient.patient_id} — ${patient.name}`}>
        <Link to="/patients">
          <Button variant="outline" icon={<ArrowLeft size={16} />} size="sm">Back</Button>
        </Link>
        <Link to={`/op?patient=${patient.id}`}>
          <Button size="sm" icon={<Stethoscope size={16} />}>New Appointment</Button>
        </Link>
      </PageHeader>

      {/* Patient Card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 text-2xl font-bold flex-shrink-0">
            {patient.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
              <span className="font-mono text-blue-700 font-semibold text-xs bg-blue-50 px-2 py-0.5 rounded">
                {patient.patient_id}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1"><User size={13}/> {patient.age} years, {patient.gender}</span>
              <span className="flex items-center gap-1"><Phone size={13}/> {patient.mobile}</span>
              {patient.village_city && <span className="flex items-center gap-1"><MapPin size={13}/> {patient.village_city}</span>}
              <span className="flex items-center gap-1"><Calendar size={13}/> Registered {formatDate(patient.created_at)}</span>
              {patient.blood_group && <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Blood: {patient.blood_group}</span>}
            </div>
            {patient.known_allergies && (
              <div className="mt-2 flex items-start gap-1 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span><strong>Allergies:</strong> {patient.known_allergies}</span>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="flex gap-4 text-center">
            {[
              { label: 'Visits', value: appointments.length, color: 'text-blue-600' },
              { label: 'OT', value: operations.length, color: 'text-amber-600' },
              { label: 'Bills', value: bills.length, color: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3 min-w-[64px]">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-200'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Appointments */}
          <Card>
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Stethoscope size={16} className="text-blue-500" /> Recent Visits
            </h3>
            {appointments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No visits yet</p>
            ) : (
              <div className="space-y-2">
                {appointments.slice(0, 5).map(appt => (
                  <div key={appt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-700">{appt.visit_type} Consultation</div>
                      <div className="text-xs text-gray-400">{formatDate(appt.appointment_date)} · Dr. {appt.doctor_name || '—'}</div>
                    </div>
                    <span className={getStatusColor(appt.status)}>{getStatusLabel(appt.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Patient Info */}
          <Card>
            <h3 className="font-semibold text-gray-700 mb-3">Contact & Address</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Mobile', value: patient.mobile },
                { label: 'Alt. Mobile', value: patient.alternate_mobile },
                { label: 'Email', value: patient.email },
                { label: 'Address', value: patient.address },
                { label: 'Village/City', value: patient.village_city },
                { label: 'Aadhaar', value: patient.aadhaar_number ? `XXXX-XXXX-${patient.aadhaar_number.slice(-4)}` : null },
              ].filter(i => i.value).map(item => (
                <div key={item.label} className="flex gap-3">
                  <span className="text-gray-400 w-24 flex-shrink-0">{item.label}</span>
                  <span className="text-gray-700">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'consultations' && (
        <div className="space-y-3">
          {consultations.length === 0 ? (
            <Card><p className="text-gray-400 text-center py-8">No consultation records</p></Card>
          ) : consultations.map(c => (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-800">Consultation</div>
                  <div className="text-xs text-gray-400">{formatDateTime(c.created_at)} · Dr. {c.doctor_name || '—'}</div>
                </div>
                <div className="flex gap-2">
                  {c.send_to_pharmacy && <span className="badge badge-sent_to_pharmacy">→ Pharmacy</span>}
                  {c.send_to_ot && <span className="badge badge-sent_to_ot">→ OT</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {[
                  { label: 'Diagnosis', value: c.diagnosis },
                  { label: 'Chief Complaint', value: c.chief_complaint },
                  { label: 'Right Eye Vision', value: c.right_eye_vision },
                  { label: 'Left Eye Vision', value: c.left_eye_vision },
                  { label: 'Right Eye Power', value: c.right_eye_power },
                  { label: 'Left Eye Power', value: c.left_eye_power },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">{f.label}</div>
                    <div className="text-sm font-medium text-gray-700">{f.value}</div>
                  </div>
                ))}
              </div>
              {c.prescribed_medicines?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Prescribed Medicines:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.prescribed_medicines.map((m, i) => (
                      <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                        {m.name} — {m.dosage}, {m.frequency}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {c.follow_up_date && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <Clock size={11} /> Follow-up: {formatDate(c.follow_up_date)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="space-y-3">
          {operations.length === 0 ? (
            <Card><p className="text-gray-400 text-center py-8">No operation records</p></Card>
          ) : operations.map(op => (
            <Card key={op.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-800">{op.operation_type}</div>
                  <div className="text-xs text-gray-400">
                    {formatDate(op.scheduled_date)} · Dr. {op.doctor_name || '—'}
                    {op.eye && ` · ${op.eye} Eye`}
                  </div>
                </div>
                <span className={getStatusColor(op.status)}>{getStatusLabel(op.status)}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <div><span className="text-gray-400">Cost:</span> <strong>{formatCurrency(op.operation_cost)}</strong></div>
                <div><span className="text-gray-400">Advance:</span> <strong>{formatCurrency(op.advance_paid)}</strong></div>
                <div><span className="text-gray-400">Balance:</span> <strong className="text-red-600">{formatCurrency(op.remaining_balance)}</strong></div>
              </div>
              {op.post_op_notes && <div className="mt-2 text-xs text-gray-500">📝 {op.post_op_notes}</div>}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="space-y-3">
          {bills.length === 0 ? (
            <Card><p className="text-gray-400 text-center py-8">No billing records</p></Card>
          ) : bills.map(bill => (
            <Card key={bill.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-800">{bill.bill_number}</div>
                  <div className="text-xs text-gray-400">{formatDateTime(bill.created_at)} · {bill.bill_type.toUpperCase()}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(bill.total_amount)}</div>
                  <span className={`text-xs ${bill.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                    {bill.payment_status.toUpperCase()}
                  </span>
                </div>
              </div>
              {bill.items && bill.items.length > 0 && (
                <div className="text-xs text-gray-500">
                  {bill.items.map((item, i) => (
                    <span key={i}>{item.medicine_name} ×{item.quantity}{i < bill.items!.length - 1 ? ', ' : ''}</span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
