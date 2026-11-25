# SignSaathi Backend — Phase 2
FastAPI + Python built-in sqlite3. No SQLAlchemy and no ORM.

## Install (PowerShell)
```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```
If activation is blocked:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Start
From `backend`:
```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Swagger: http://127.0.0.1:8000/docs
Health: http://127.0.0.1:8000/health
Database auto-created at `database/signsaathi.db`.

Set a local signing secret before use:
```powershell
$env:SIGNSAATHI_SECRET_KEY = "replace-with-a-long-random-secret"
```

Promote an account to admin after registering:
```powershell
python -c "import sqlite3; c=sqlite3.connect('../database/signsaathi.db'); c.execute(\"UPDATE users SET role='admin' WHERE email=?\", ('your-email@example.com',)); c.commit(); c.close(); print('Admin role updated')"
```

Endpoints: POST /register, POST /login, POST /logout, GET /profile, POST /predict, GET /model-status, GET/POST /translation-history, DELETE /translation-history/{rid}, GET /learning, POST /learning/progress, GET /analytics, GET /model-performance, GET/PUT /settings, GET /admin/users, GET /admin/model-status.

Prediction intentionally remains unavailable until real trained model inference is integrated. Use HTTPS, secure cookies, CSRF protection, rate limiting and managed secrets before production deployment.
