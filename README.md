# SignSaathi — AI-Based Indian Sign Language to Text and Speech Translator

**Tagline:** Breaking Communication Barriers Using AI.

This repository is being developed in phases. The current delivery contains the Phase 1 React frontend and project architecture. The UI deliberately does not fabricate recognition output or model metrics.

## Current implementation status

- [x] React + Vite application structure
- [x] Tailwind CSS setup
- [x] Landing page and dashboard
- [x] Live camera preview using browser `getUserMedia`
- [x] Camera permission/error handling
- [x] Sentence builder (manual input for UI testing)
- [x] Browser Text-to-Speech
- [x] Login and registration forms connected to API service layer
- [x] Translator API service integration point
- [ ] FastAPI backend and SQLite3 (Phase 2)
- [ ] MediaPipe landmark extraction and trained models (Phase 3)
- [ ] Real-time model integration and end-to-end tests (Phase 4)

## Requirements

- Windows 10/11
- Node.js 20 LTS or newer
- npm
- VS Code or Cursor
- Chrome or Edge recommended for camera and Web Speech API

## Run the frontend

Open PowerShell in the `SignSaathi` folder:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Camera access is generally allowed on `localhost` and HTTPS. If permission is denied, allow camera access in browser site settings.

## API configuration

The frontend expects FastAPI at `http://127.0.0.1:8000` by default. Create `frontend/.env` when the backend is ready:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart Vite after changing environment variables.

## Important model integrity note

A camera preview is not gesture recognition. Actual predictions require MediaPipe landmark sequences and a trained model. The application must show an unavailable state until model weights and class labels are loaded. Model performance must come from an actual held-out evaluation set.

## Planned architecture

- `frontend/`: React user interface
- `backend/`: FastAPI, validation, authentication and direct SQLite3 queries
- `deep_learning/`: dataset preparation, landmarks, BiLSTM and Transformer
- `database/`: SQLite database file created at runtime
- `documentation/`: diagrams, methodology, testing and viva material

No SQLAlchemy or ORM is planned. The backend will use Python's built-in `sqlite3` module and parameterized SQL statements.
