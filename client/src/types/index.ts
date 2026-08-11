// Core entity types for Akshara Eye Hospital

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'pharmacist';
  phone?: string;
  is_active: boolean;
  doctorProfile?: Doctor;
}

export interface Doctor {
  id: string;
  user_id: string;
  specialization: string;
  qualification?: string;
  registration_number?: string;
  consultation_fee: number;
  available_days?: string;
  available_from?: string;
  available_to?: string;
  // Joined fields
  name?: string;
}

export interface Patient {
  id: string;
  patient_id: string; // PAT000001
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  address?: string;
  village_city?: string;
  aadhaar_number?: string;
  blood_group?: string;
  known_allergies?: string;
  is_active: boolean;
  registered_by?: string;
  registered_by_name?: string;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | 'waiting'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'sent_to_pharmacy'
  | 'sent_to_ot';

export type VisitType = 'General' | 'Follow-up' | 'Emergency' | 'Post-op' | 'Optical';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  visit_type: VisitType;
  visit_reason?: string;
  consultation_fee: number;
  fee_paid: boolean;
  token_number: number;
  status: AppointmentStatus;
  appointment_date: string;
  appointment_time?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  patient_name?: string;
  patient_code?: string;
  age?: number;
  gender?: string;
  mobile?: string;
  doctor_name?: string;
  specialization?: string;
  waiting_minutes?: number;
}

export interface PrescribedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Consultation {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id?: string;
  right_eye_vision?: string;
  left_eye_vision?: string;
  right_eye_power?: string;
  left_eye_power?: string;
  right_eye_pressure?: string;
  left_eye_pressure?: string;
  chief_complaint?: string;
  diagnosis?: string;
  clinical_notes?: string;
  prescribed_medicines: PrescribedMedicine[];
  investigations?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
  send_to_pharmacy: boolean;
  send_to_ot: boolean;
  ot_recommendation?: string;
  consulted_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  doctor_name?: string;
  patient_name?: string;
  patient_code?: string;
}

export type OperationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Operation {
  id: string;
  patient_id: string;
  consultation_id?: string;
  doctor_id?: string;
  operation_type: string;
  eye?: 'Right' | 'Left' | 'Both';
  assistant_staff?: string;
  anesthetist?: string;
  scheduled_date: string;
  scheduled_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  operation_cost: number;
  advance_paid: number;
  remaining_balance: number;
  status: OperationStatus;
  pre_op_notes?: string;
  post_op_notes?: string;
  complications?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  patient_name?: string;
  patient_code?: string;
  age?: number;
  gender?: string;
  doctor_name?: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  category: string;
  batch_number?: string;
  stock_quantity: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  mrp?: number;
  expiry_date?: string;
  manufacturer?: string;
  description?: string;
  requires_prescription: boolean;
  is_active: boolean;
  low_stock_threshold: number;
  created_at: string;
}

export interface BillItem {
  id?: string;
  medicine_id: string;
  medicine_name: string;
  batch_number?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total_price: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  patient_id: string;
  appointment_id?: string;
  bill_type: 'op' | 'ot' | 'pharmacy' | 'mixed';
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'insurance' | 'mixed';
  payment_status: 'pending' | 'partial' | 'paid';
  notes?: string;
  created_at: string;
  items?: BillItem[];
  // Joined
  patient_name?: string;
  patient_code?: string;
  mobile?: string;
}

export interface DashboardStats {
  newPatients: number;
  opConsultations: number;
  otScheduled: number;
  otCompleted: number;
  revenue: {
    op: number;
    ot: number;
    pharmacy: number;
    total: number;
  };
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface PatientHistory {
  patient: Patient;
  appointments: Appointment[];
  consultations: Consultation[];
  operations: Operation[];
  bills: Bill[];
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  details?: string;
}
