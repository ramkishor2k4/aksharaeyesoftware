import React from 'react';
import { X, Printer, Eye, Activity, Pill, Calendar, User, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import type { Patient, Consultation, PrescribedMedicine } from '@/types';
import { AksharaLogo } from '@/components/common/AksharaLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  consultation: Consultation;
  doctorName?: string;
}

export function PrescriptionSlipModal({ isOpen, onClose, patient, consultation, doctorName }: Props) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const medicines: PrescribedMedicine[] = consultation.prescribed_medicines || [];

  return (
    <div className="prescription-slip-modal-wrapper fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:static">
      <div className="prescription-slip-modal-card relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in my-8 print:shadow-none print:w-full print:max-w-none print:m-0 print:rounded-none">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Printer size={16} />
            </div>
            <h2 className="font-semibold text-gray-800">Prescription Slip Preview</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" icon={<Printer size={16} />} onClick={handlePrint}>
              Print Prescription
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE PRESCRIPTION SLIP CONTENT */}
        <div className="p-8 space-y-6 print:p-6 print:space-y-4 text-gray-800 font-sans" id="printable-prescription-slip">
          
          {/* Hospital Header with Official Logo */}
          <div className="border-b-2 border-[#0E2A47] pb-4 flex justify-between items-center">
            <AksharaLogo size="md" />
            <div className="text-right text-xs text-gray-600 space-y-0.5 font-sans">
              <div className="font-bold text-[#0E2A47]">Reg. No: AEH/2026/089</div>
              <div>123 Hospital Road, Main Branch</div>
              <div>Ph: +91 98765 43210 · Emergency: +91 98765 43211</div>
            </div>
          </div>

          {/* Patient & Doctor Metadata Grid */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500 block">Patient Name</span>
              <span className="font-bold text-gray-900 text-sm">{patient.name}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Patient ID / Age / Sex</span>
              <span className="font-semibold text-gray-800">{patient.patient_id} · {patient.age}Y / {patient.gender}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Date & Time</span>
              <span className="font-semibold text-gray-800">{formatDate(consultation.created_at || new Date().toISOString())}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Consulting Doctor</span>
              <span className="font-bold text-blue-900">Dr. {doctorName || consultation.doctor_name || 'Ophthalmologist'}</span>
            </div>
          </div>

          {/* Clinical Findings & Diagnosis */}
          {(consultation.chief_complaint || consultation.diagnosis) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-3 rounded-lg border border-gray-200/60 text-xs">
              {consultation.chief_complaint && (
                <div>
                  <span className="font-semibold text-gray-600 uppercase text-[10px] tracking-wide block mb-0.5">Chief Complaint</span>
                  <p className="text-gray-800 font-medium">{consultation.chief_complaint}</p>
                </div>
              )}
              {consultation.diagnosis && (
                <div>
                  <span className="font-semibold text-blue-700 uppercase text-[10px] tracking-wide block mb-0.5">Diagnosis</span>
                  <p className="text-blue-950 font-bold">{consultation.diagnosis}</p>
                </div>
              )}
            </div>
          )}

          {/* Ophthalmic Examination Matrix (Vision, Refraction & IOP) */}
          <div>
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye size={14} className="text-blue-600" /> Visual Acuity & Refraction (OD / OS)
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-blue-600 text-white font-semibold">
                  <tr>
                    <th className="py-2 px-3 text-left w-24">Eye</th>
                    <th className="py-2 px-3">Distant Vision</th>
                    <th className="py-2 px-3">Refractive Power</th>
                    <th className="py-2 px-3">IOP (mmHg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white font-medium">
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-blue-800 bg-blue-50/40">
                      Right Eye (OD)
                    </td>
                    <td className="py-2 px-3">{consultation.right_eye_vision || '6/6'}</td>
                    <td className="py-2 px-3">{consultation.right_eye_power || 'Plano'}</td>
                    <td className="py-2 px-3">{consultation.right_eye_pressure ? `${consultation.right_eye_pressure} mmHg` : 'Normal'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-left font-bold text-purple-800 bg-purple-50/40">
                      Left Eye (OS)
                    </td>
                    <td className="py-2 px-3">{consultation.left_eye_vision || '6/6'}</td>
                    <td className="py-2 px-3">{consultation.left_eye_power || 'Plano'}</td>
                    <td className="py-2 px-3">{consultation.left_eye_pressure ? `${consultation.left_eye_pressure} mmHg` : 'Normal'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Prescribed Eye Drops & Medicines Table */}
          <div>
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Pill size={14} className="text-purple-600" /> Prescribed Eye Drops & Oral Medications (Rx)
            </h3>
            {medicines.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No specific medicines prescribed. Continue routine eye hygiene.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3 text-left">#</th>
                      <th className="py-2 px-3 text-left">Medicine Name</th>
                      <th className="py-2 px-3 text-left">Dosage</th>
                      <th className="py-2 px-3 text-left">Frequency</th>
                      <th className="py-2 px-3 text-left">Duration</th>
                      <th className="py-2 px-3 text-left">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {medicines.map((m, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-semibold text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-gray-900">{m.name}</td>
                        <td className="py-2 px-3 font-medium text-gray-700">{m.dosage || '1 drop'}</td>
                        <td className="py-2 px-3 font-semibold text-blue-700">{m.frequency}</td>
                        <td className="py-2 px-3 font-medium text-gray-700">{m.duration}</td>
                        <td className="py-2 px-3 text-gray-600 italic">{m.instructions || 'As directed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Special Advice / Follow-up & Footer */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs">
            <div className="space-y-1 max-w-md">
              {consultation.follow_up_date && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-bold">
                  <Calendar size={13} className="text-amber-600" />
                  Follow-up Date: {formatDate(consultation.follow_up_date)}
                </div>
              )}
              {consultation.follow_up_notes && (
                <p className="text-gray-600 italic text-[11px]">Note: {consultation.follow_up_notes}</p>
              )}
              <p className="text-gray-400 text-[10px]">Please present this prescription slip at the pharmacy to collect your medicines.</p>
            </div>

            {/* Doctor Signature Block */}
            <div className="text-right sm:self-end pt-4 sm:pt-0">
              <div className="h-10 border-b border-gray-400 w-40 ml-auto mb-1 flex items-end justify-center">
                <span className="text-[10px] text-gray-400 italic">Signature / Stamp</span>
              </div>
              <div className="font-bold text-blue-900 text-xs">Dr. {doctorName || consultation.doctor_name || 'Ophthalmologist'}</div>
              <div className="text-[10px] text-gray-500">M.S. (Ophthalmology), Fellow Cornea</div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer (Hidden on Print) */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 no-print">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          <Button variant="primary" icon={<Printer size={16} />} onClick={handlePrint}>
            Print Prescription
          </Button>
        </div>

      </div>
    </div>
  );
}
