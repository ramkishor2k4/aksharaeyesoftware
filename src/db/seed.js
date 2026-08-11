const bcrypt = require('bcryptjs');
const path = require('path');
const { pool } = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');
    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM activity_logs');
    await client.query('DELETE FROM medicine_sales');
    await client.query('DELETE FROM bills');
    await client.query('DELETE FROM operations');
    await client.query('DELETE FROM consultations');
    await client.query('DELETE FROM appointments');
    await client.query('DELETE FROM medicines');
    await client.query('DELETE FROM doctors');
    await client.query('DELETE FROM patients');
    await client.query('DELETE FROM users');
    await client.query('ALTER SEQUENCE patient_seq RESTART WITH 1');

    // Create Users
    const adminHash = await bcrypt.hash('admin123', 10);
    const doctorHash = await bcrypt.hash('doctor123', 10);
    const receptionHash = await bcrypt.hash('reception123', 10);
    const pharmacyHash = await bcrypt.hash('pharmacy123', 10);

    const adminRes = await client.query(`
      INSERT INTO users (name, email, password_hash, role, phone) VALUES
      ('Dr. Arun Kumar', 'admin@akshara.com', $1, 'admin', '9876543210')
      RETURNING id
    `, [adminHash]);

    const doc1Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role, phone) VALUES
      ('Dr. Priya Sharma', 'doctor@akshara.com', $1, 'doctor', '9876543211')
      RETURNING id
    `, [doctorHash]);

    const doc2Res = await client.query(`
      INSERT INTO users (name, email, password_hash, role, phone) VALUES
      ('Dr. Rajesh Verma', 'doctor2@akshara.com', $1, 'doctor', '9876543215')
      RETURNING id
    `, [doctorHash]);

    const receptionRes = await client.query(`
      INSERT INTO users (name, email, password_hash, role, phone) VALUES
      ('Sunita Devi', 'reception@akshara.com', $1, 'receptionist', '9876543212')
      RETURNING id
    `, [receptionHash]);

    await client.query(`
      INSERT INTO users (name, email, password_hash, role, phone) VALUES
      ('Ramesh Kumar', 'pharmacy@akshara.com', $1, 'pharmacist', '9876543213')
      RETURNING id
    `, [pharmacyHash]);

    // Create Doctor profiles
    const doc1Id = doc1Res.rows[0].id;
    const doc2Id = doc2Res.rows[0].id;

    const doctor1Res = await client.query(`
      INSERT INTO doctors (user_id, specialization, qualification, registration_number, consultation_fee)
      VALUES ($1, 'Ophthalmologist', 'MS Ophthalmology, AIIMS Delhi', 'MCI-12345', 500.00)
      RETURNING id
    `, [doc1Id]);

    const doctor2Res = await client.query(`
      INSERT INTO doctors (user_id, specialization, qualification, registration_number, consultation_fee)
      VALUES ($1, 'Retina Specialist', 'DNB Ophthalmology, JIPMER', 'MCI-67890', 700.00)
      RETURNING id
    `, [doc2Id]);

    console.log('✅ Users and Doctors created');

    // Create Sample Patients
    const patRes1 = await client.query(`
      INSERT INTO patients (patient_id, name, age, gender, mobile, address, village_city, registered_by)
      VALUES ('', 'Mohan Lal Gupta', 58, 'Male', '9812345678', '12, Gandhi Nagar', 'Jaipur', $1)
      RETURNING id
    `, [receptionRes.rows[0].id]);

    const patRes2 = await client.query(`
      INSERT INTO patients (patient_id, name, age, gender, mobile, address, village_city, registered_by)
      VALUES ('', 'Sushma Devi', 45, 'Female', '9823456789', '45, Shyam Colony', 'Ajmer', $1)
      RETURNING id
    `, [receptionRes.rows[0].id]);

    await client.query(`
      INSERT INTO patients (patient_id, name, age, gender, mobile, address, village_city, registered_by)
      VALUES ('', 'Rakesh Singh', 32, 'Male', '9834567890', '78, Sector 5', 'Kota', $1)
    `, [receptionRes.rows[0].id]);

    console.log('✅ Sample patients created');

    // Create Medicines
    const medicines = [
      ['Ciprofloxacin Eye Drops 0.3%', 'Ciprofloxacin', 'Eye Drops', 'B2024001', 150, 'Bottle', 25.00, 60.00, '2026-12-31', 'Sun Pharma'],
      ['Moxifloxacin Eye Drops 0.5%', 'Moxifloxacin', 'Eye Drops', 'B2024002', 80, 'Bottle', 45.00, 110.00, '2026-10-31', 'Allergan'],
      ['Tobramycin Eye Drops', 'Tobramycin', 'Eye Drops', 'B2024003', 60, 'Bottle', 35.00, 90.00, '2026-08-31', 'Alcon'],
      ['Timolol 0.5% Eye Drops', 'Timolol', 'Anti-Glaucoma', 'B2024004', 100, 'Bottle', 30.00, 75.00, '2027-01-31', 'FDC'],
      ['Latanoprost 0.005% Eye Drops', 'Latanoprost', 'Anti-Glaucoma', 'B2024005', 45, 'Bottle', 120.00, 280.00, '2026-11-30', 'Pfizer'],
      ['Prednisolone Eye Drops 1%', 'Prednisolone', 'Steroid', 'B2024006', 90, 'Bottle', 20.00, 55.00, '2026-09-30', 'Mankind'],
      ['Dexamethasone Eye Drops 0.1%', 'Dexamethasone', 'Steroid', 'B2024007', 75, 'Bottle', 18.00, 50.00, '2026-12-31', 'Cipla'],
      ['Sodium Hyaluronate Eye Drops', 'Sodium Hyaluronate', 'Lubricant', 'B2024008', 200, 'Bottle', 50.00, 130.00, '2027-06-30', 'Alcon'],
      ['Carboxymethylcellulose 0.5%', 'CMC', 'Lubricant', 'B2024009', 180, 'Bottle', 30.00, 80.00, '2027-03-31', 'Allergan'],
      ['Vitamin A Eye Drops', 'Vitamin A', 'Supplement', 'B2024010', 120, 'Bottle', 15.00, 40.00, '2026-07-31', 'Elder'],
      ['Ibuprofen 400mg', 'Ibuprofen', 'Analgesic', 'B2024011', 500, 'Tablet', 2.00, 5.00, '2027-12-31', 'Abbott'],
      ['Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 'B2024012', 300, 'Capsule', 8.00, 18.00, '2026-06-30', 'GSK'],
      ['Acetazolamide 250mg', 'Acetazolamide', 'Anti-Glaucoma', 'B2024013', 200, 'Tablet', 6.00, 15.00, '2027-02-28', 'Cipla'],
      ['Atropine 1% Eye Drops', 'Atropine', 'Mydriatic', 'B2024014', 50, 'Bottle', 15.00, 40.00, '2026-12-31', 'Sun Pharma'],
      ['Tropicamide 1% Eye Drops', 'Tropicamide', 'Mydriatic', 'B2024015', 60, 'Bottle', 25.00, 65.00, '2026-10-31', 'Alcon'],
      ['Pilocarpine 2% Eye Drops', 'Pilocarpine', 'Miotic', 'B2024016', 40, 'Bottle', 20.00, 55.00, '2026-09-30', 'Cipla'],
      ['Phenylephrine 10% Eye Drops', 'Phenylephrine', 'Decongestant', 'B2024017', 35, 'Bottle', 30.00, 80.00, '2026-08-31', 'Sun Pharma'],
      ['Ofloxacin 0.3% Eye Drops', 'Ofloxacin', 'Antibiotic', 'B2024018', 110, 'Bottle', 20.00, 55.00, '2026-11-30', 'Cipla'],
      ['Betaxolol 0.5% Eye Drops', 'Betaxolol', 'Anti-Glaucoma', 'B2024019', 55, 'Bottle', 85.00, 200.00, '2027-01-31', 'Alcon'],
      ['Fluorometholone 0.1% Eye Drops', 'Fluorometholone', 'Steroid', 'B2024020', 65, 'Bottle', 40.00, 100.00, '2026-10-31', 'Allergan'],
    ];

    for (const med of medicines) {
      await client.query(`
        INSERT INTO medicines (name, generic_name, category, batch_number, stock_quantity, unit, purchase_price, selling_price, expiry_date, manufacturer)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, med);
    }
    console.log('✅ Medicines created');

    // Create sample appointment for today
    const apptRes = await client.query(`
      INSERT INTO appointments (patient_id, doctor_id, visit_type, visit_reason, consultation_fee, fee_paid, status, created_by)
      VALUES ($1, $2, 'General', 'Blurred vision and eye pain', 500.00, true, 'waiting', $3)
      RETURNING id
    `, [patRes1.rows[0].id, doctor1Res.rows[0].id, receptionRes.rows[0].id]);

    await client.query(`
      INSERT INTO appointments (patient_id, doctor_id, visit_type, visit_reason, consultation_fee, fee_paid, status, created_by)
      VALUES ($1, $2, 'Follow-up', 'Follow-up for dry eyes', 300.00, true, 'in_consultation', $3)
      RETURNING id
    `, [patRes2.rows[0].id, doctor1Res.rows[0].id, receptionRes.rows[0].id]);

    console.log('✅ Sample appointments created');

    await client.query('COMMIT');
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin:         admin@akshara.com / admin123');
    console.log('   Doctor:        doctor@akshara.com / doctor123');
    console.log('   Receptionist:  reception@akshara.com / reception123');
    console.log('   Pharmacist:    pharmacy@akshara.com / pharmacy123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
