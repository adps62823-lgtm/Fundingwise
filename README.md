# Fundingwise

Fundingwise is the product name used throughout this repository.

## Backend quick start

The backend is a FastAPI app located in `backend/`.

### Prerequisites

- Python 3.10 or newer
- MongoDB accessible from `MONGO_URI`
- A `backend/.env` file based on `backend/.env.example`

### Windows launch

From PowerShell in the repository root:

```powershell
cd backend
Set-ExecutionPolicy -Scope Process Bypass
.\start-backend.ps1
```

The script will:

- create `.venv` if needed
- install Python dependencies
- stop with a clear message if `.env` is missing
- start the API on `http://127.0.0.1:8000`

If you prefer manual startup:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend Firebase setup

The frontend uses Firebase Authentication for email/password and Google sign-in.

### Prerequisites

- A Firebase project with Authentication enabled
- Email/Password provider enabled
- Google provider enabled

### Frontend env file

Create `frontend/.env` from `frontend/.env.example` and fill in the Firebase web app values:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
```

After that, the Firebase client will support:

- Email/password sign-in
- Google sign-in
- Persistent sessions in the browser

For the backend, keep the Firebase Admin service account values in `backend/.env` as already described in `backend/.env.example`.

## Logo placeholders

Add the logo assets in these places once the app is scaffolded:

- `frontend/src/components/Navbar.jsx` for the header logo mark and wordmark
- `frontend/src/pages/public/MapPortal.jsx` for the public landing/logo area
- `frontend/src/pages/org/Pricing.jsx` for the pricing page branding block
- `frontend/src/pages/auth/Login.jsx` and `frontend/src/pages/auth/Register.jsx` for the auth screens
- `frontend/public/` for the actual image files such as `logo.svg`, `logo-mark.svg`, and any social preview image

If you want a single source of truth later, create a shared brand asset module such as `frontend/src/config/brand.js` and import the logo path from there.

## Team Members

- Aditya Pratap Singh - Team Lead (Software and Technology Head)
- Aniket Singh - President (Work Coordination and Supervision)
- Shikhar Singh - VP and Marketing Head (under President and Marketing)
- Ayan Singh - Relationship Management Head (Customer Manager)
- Anik Anand - Assistant Relationship Manager

## Notes

- Keep the Fundingwise name consistent across the UI, metadata, and docs.
- Reserve the logo areas above as placeholders until the final brand assets are ready.
