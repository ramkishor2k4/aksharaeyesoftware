# Akshara Eye Hospital & Opticals Management System

## Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=akshara_eye_hospital
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=8h
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Setup

### 1. Database
```bash
# Create the database in PostgreSQL
createdb akshara_eye_hospital
# OR via psql:
psql -U postgres -c "CREATE DATABASE akshara_eye_hospital;"

# Run migrations
npm run migrate

# Seed with initial data
npm run seed
```

### 2. Backend
```bash
npm install
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

## Default Credentials (change after first login)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@akshara.com | admin123 |
| Doctor | doctor@akshara.com | doctor123 |
| Receptionist | reception@akshara.com | reception123 |
| Pharmacist | pharmacy@akshara.com | pharmacy123 |
