-- ============================================================
-- Akshara Eye Hospital & Opticals - Database Migration
-- Version: 1.0.0
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist', 'pharmacist')),
  phone VARCHAR(15),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- DOCTORS TABLE (linked to users)
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization VARCHAR(100) DEFAULT 'Ophthalmologist',
  qualification VARCHAR(200),
  registration_number VARCHAR(50),
  consultation_fee DECIMAL(10,2) DEFAULT 300.00,
  available_days VARCHAR(100) DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
  available_from TIME DEFAULT '09:00',
  available_to TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);

-- ============================================================
-- PATIENTS TABLE
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS patient_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id VARCHAR(12) UNIQUE NOT NULL,  -- PAT000001
  name VARCHAR(100) NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  mobile VARCHAR(15) NOT NULL,
  alternate_mobile VARCHAR(15),
  email VARCHAR(150),
  address TEXT,
  village_city VARCHAR(100),
  aadhaar_number VARCHAR(12),
  blood_group VARCHAR(5),
  known_allergies TEXT,
  is_active BOOLEAN DEFAULT true,
  registered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- Function to generate patient ID
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.patient_id := 'PAT' || LPAD(nextval('patient_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate patient ID
DROP TRIGGER IF EXISTS set_patient_id ON patients;
CREATE TRIGGER set_patient_id
  BEFORE INSERT ON patients
  FOR EACH ROW
  WHEN (NEW.patient_id IS NULL OR NEW.patient_id = '')
  EXECUTE FUNCTION generate_patient_id();

-- ============================================================
-- APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  visit_type VARCHAR(50) DEFAULT 'General' CHECK (visit_type IN ('General', 'Follow-up', 'Emergency', 'Post-op', 'Optical')),
  visit_reason TEXT,
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  fee_paid BOOLEAN DEFAULT false,
  token_number INTEGER,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_consultation', 'completed', 'cancelled', 'sent_to_pharmacy', 'sent_to_ot')),
  appointment_date DATE DEFAULT CURRENT_DATE,
  appointment_time TIME DEFAULT CURRENT_TIME,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Auto-generate token number per day
CREATE OR REPLACE FUNCTION generate_token_number()
RETURNS TRIGGER AS $$
DECLARE
  max_token INTEGER;
BEGIN
  SELECT COALESCE(MAX(token_number), 0) INTO max_token
  FROM appointments
  WHERE appointment_date = NEW.appointment_date;
  NEW.token_number := max_token + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_token_number ON appointments;
CREATE TRIGGER set_token_number
  BEFORE INSERT ON appointments
  FOR EACH ROW
  WHEN (NEW.token_number IS NULL)
  EXECUTE FUNCTION generate_token_number();

-- ============================================================
-- CONSULTATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  -- Vision Details
  right_eye_vision VARCHAR(20),
  left_eye_vision VARCHAR(20),
  right_eye_power VARCHAR(20),
  left_eye_power VARCHAR(20),
  right_eye_pressure VARCHAR(20),
  left_eye_pressure VARCHAR(20),
  -- Clinical
  chief_complaint TEXT,
  diagnosis TEXT,
  clinical_notes TEXT,
  -- Treatment
  prescribed_medicines JSONB DEFAULT '[]',
  investigations TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  -- Actions
  send_to_pharmacy BOOLEAN DEFAULT false,
  send_to_ot BOOLEAN DEFAULT false,
  ot_recommendation TEXT,
  -- Metadata
  consulted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment_id ON consultations(appointment_id);

-- ============================================================
-- OPERATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id),
  doctor_id UUID REFERENCES doctors(id),
  operation_type VARCHAR(100) NOT NULL,
  eye VARCHAR(10) CHECK (eye IN ('Right', 'Left', 'Both')),
  assistant_staff TEXT,
  anesthetist VARCHAR(100),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  operation_cost DECIMAL(10,2) DEFAULT 0,
  advance_paid DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2) GENERATED ALWAYS AS (operation_cost - advance_paid) STORED,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  pre_op_notes TEXT,
  post_op_notes TEXT,
  complications TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operations_patient_id ON operations(patient_id);
CREATE INDEX IF NOT EXISTS idx_operations_doctor_id ON operations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations(scheduled_date);

-- ============================================================
-- MEDICINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  category VARCHAR(100) DEFAULT 'General',
  batch_number VARCHAR(50),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  unit VARCHAR(20) DEFAULT 'Tablet',
  purchase_price DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,
  mrp DECIMAL(10,2),
  expiry_date DATE,
  manufacturer VARCHAR(200),
  description TEXT,
  requires_prescription BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 10,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);

-- ============================================================
-- BILLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number VARCHAR(20) UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  bill_type VARCHAR(20) DEFAULT 'pharmacy' CHECK (bill_type IN ('op', 'ot', 'pharmacy', 'mixed')),
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'upi', 'insurance', 'mixed')),
  payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS bill_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bill_number := 'BILL' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(nextval('bill_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bill_number ON bills;
CREATE TRIGGER set_bill_number
  BEFORE INSERT ON bills
  FOR EACH ROW
  WHEN (NEW.bill_number IS NULL OR NEW.bill_number = '')
  EXECUTE FUNCTION generate_bill_number();

CREATE INDEX IF NOT EXISTS idx_bills_patient_id ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(created_at);

-- ============================================================
-- MEDICINE SALES TABLE (bill line items)
-- ============================================================
CREATE TABLE IF NOT EXISTS medicine_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  medicine_name VARCHAR(200) NOT NULL,
  batch_number VARCHAR(50),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicine_sales_bill_id ON medicine_sales(bill_id);
CREATE INDEX IF NOT EXISTS idx_medicine_sales_medicine_id ON medicine_sales(medicine_id);

-- ============================================================
-- ACTIVITY LOGS TABLE (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(100),
  user_role VARCHAR(20),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_name VARCHAR(200),
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- ============================================================
-- REPORTS TABLE (aggregated snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL,
  report_type VARCHAR(20) DEFAULT 'daily' CHECK (report_type IN ('daily', 'monthly')),
  total_patients INTEGER DEFAULT 0,
  new_patients INTEGER DEFAULT 0,
  total_op_consultations INTEGER DEFAULT 0,
  total_operations INTEGER DEFAULT 0,
  op_revenue DECIMAL(10,2) DEFAULT 0,
  ot_revenue DECIMAL(10,2) DEFAULT 0,
  pharmacy_revenue DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_date_type ON reports(report_date, report_type);

-- ============================================================
-- UPDATE TIMESTAMP FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','doctors','patients','appointments','consultations','operations','medicines','bills']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- FUTURE MODULES STUBS (extensibility)
-- ============================================================

-- Opticals Inventory (Phase 3+)
CREATE TABLE IF NOT EXISTS opticals_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type VARCHAR(50) CHECK (item_type IN ('frame', 'lens', 'contact_lens', 'accessory')),
  brand VARCHAR(100),
  model VARCHAR(100),
  sku VARCHAR(50),
  stock_quantity INTEGER DEFAULT 0,
  purchase_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spectacle Orders (Phase 3+)
CREATE TABLE IF NOT EXISTS spectacle_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  consultation_id UUID REFERENCES consultations(id),
  right_eye_sph DECIMAL(5,2),
  right_eye_cyl DECIMAL(5,2),
  right_eye_axis INTEGER,
  left_eye_sph DECIMAL(5,2),
  left_eye_cyl DECIMAL(5,2),
  left_eye_axis INTEGER,
  pd DECIMAL(5,2),
  frame_id UUID REFERENCES opticals_inventory(id),
  lens_id UUID REFERENCES opticals_inventory(id),
  order_date DATE DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  advance_paid DECIMAL(10,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- END OF MIGRATION
-- ============================================================
