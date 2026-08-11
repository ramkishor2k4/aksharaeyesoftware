@echo off
echo.
echo ========================================
echo   Akshara Eye Hospital HMS - Setup
echo ========================================
echo.

echo [1/3] Installing backend dependencies...
call npm install
if %errorlevel% neq 0 goto error

echo.
echo [2/3] Installing frontend dependencies...
cd client
call npm install
cd ..
if %errorlevel% neq 0 goto error

echo.
echo [3/3] Done! Now configure your database:
echo.
echo   1. Open .env and set your PostgreSQL password
echo   2. Create DB:  psql -U postgres -c "CREATE DATABASE akshara_eye_hospital;"
echo   3. Migrate:    npm run migrate
echo   4. Seed:       npm run seed
echo   5. Start API:  npm run dev
echo   6. Start UI:   cd client ^&^& npm run dev
echo.
echo Default login: admin@akshara.com / admin123
echo.
goto end

:error
echo Setup failed! Check the error above.
exit /b 1

:end
