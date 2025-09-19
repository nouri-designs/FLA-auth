# Fingerprint Login App

A modern React-based fingerprint authentication system that integrates with MFS100 biometric devices and a PHP backend for secure user verification.

## Features

- 🔐 Secure fingerprint authentication using MFS100 biometric scanner
- 📱 Responsive React frontend with Tailwind CSS
- 🖥️ Integration with PHP backend (XAMPP/Laravel)
- 🔄 Real-time device connection status
- ⚡ Built with Vite for fast development
- 🎨 Modern UI with step-by-step authentication flow

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Backend**: PHP (XAMPP/Laravel)
- **Biometric**: MFS100 fingerprint scanner
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/Nouri-designs/fingerprint-login-app.git
cd fingerprint-login-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure backend connection:
```bash
# Create .env.local file
echo "VITE_BACKEND_URL=http://localhost/MRIMS-Backend" > .env.local
```

4. Start development server:
```bash
npm run dev
```

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Backend configuration for fingerprint login

This project can talk to a backend running on another machine (for example, an API that stores and verifies fingerprint templates).

- Create a `.env` file in the project root and add the backend URL using the `VITE_` prefix so Vite exposes it to the frontend:

	VITE_BACKEND_URL=http://192.168.1.100:5000

	Replace the IP address and port with the machine and port where your backend is listening.

- The frontend will build request URLs using that base. Example endpoints used by the frontend:
	- `/api/auth/check-user` (POST) — checks that a user exists for the given email/phone
	- `/api/verify-fingerprint` (POST) — verifies a captured fingerprint template

- Make sure your backend allows CORS from your frontend origin (for development this is typically `http://localhost:5173`). Example CORS header on the backend:

	Access-Control-Allow-Origin: http://localhost:5173

	Or configure your backend's CORS middleware to allow the frontend origin.

If you don't have the backend available while developing, you can either mock the endpoints or disable proxying in `vite.config.js`.

## Running the backend locally (quick guide)

If you want to pull the backend to your PC and run everything locally, follow these high-level steps.

1) Clone or copy the backend repository to your machine (example using PowerShell):

```powershell
git clone https://github.com/your-org/your-backend-repo.git backend
cd backend
```

2) Inspect the backend README for how to install dependencies. Common examples:

- Node/Express:

```powershell
npm install
npm run dev
# or if package.json exposes a start script:
npm start
```

- Python/Flask (example):

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask run --host=0.0.0.0 --port=8000
```

3) Configure the frontend to use the local backend. Create a file named `.env.local` at the project root with:

```
VITE_BACKEND_URL=http://localhost:8000
```

4) Restart Vite (dev server) so the new env var is picked up:

```powershell
npm run dev
```

5) Verify endpoints are reachable from your browser or using PowerShell/curl:

```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/auth/check-user -Method POST -Body (@{ emailOrPhone = 'test@example.com' } | ConvertTo-Json) -ContentType 'application/json'
```

Notes:
- If your backend uses a database, you may need to also pull a dump or configure it to point to the remote DB.
- `vite.config.js` already has a dev proxy configured for `/api` -> `http://localhost/MRIMS-Backend`; you can either use the proxy (leave `VITE_BACKEND_URL` empty) or point the frontend directly with `VITE_BACKEND_URL`.

## Connecting to XAMPP Backend (MRIMS-Backend)

If you have your backend running in XAMPP's htdocs folder:

1) Ensure XAMPP Apache is running (start from XAMPP Control Panel)

2) Your backend should be accessible at: `http://localhost/MRIMS-Backend`

3) Create `.env.local` in your project root:

```
VITE_BACKEND_URL=http://localhost/MRIMS-Backend
```

4) Restart the frontend dev server:

```powershell
npm run dev
```

5) Test your backend endpoints:

```powershell
# Test user check endpoint
Invoke-RestMethod -Uri http://localhost/MRIMS-Backend/api/auth/check-user -Method POST -Body (@{ emailOrPhone = 'test@example.com' } | ConvertTo-Json) -ContentType 'application/json'

# Test if backend is running
Invoke-RestMethod -Uri http://localhost/MRIMS-Backend/
```

Note: Make sure your PHP backend has CORS headers enabled to allow requests from `http://localhost:3000`.

**Important**: See `XAMPP-Setup-Guide.md` and use the provided `cors-headers.php` file for complete setup instructions.
