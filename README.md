# Fingerprint Login App - Frontend

A modern React-based fingerprint authentication frontend that can integrate with any backend API. Features MFS100 biometric device support and a complete authentication UI flow.

## Features

- 🔐 Complete fingerprint authentication UI flow
- 📱 Responsive React frontend with Tailwind CSS  
- 🖥️ Backend-agnostic - ready to connect to any API
- 🔄 Real-time MFS100 device connection status
- ⚡ Built with Vite for fast development
- 🎨 Modern UI with step-by-step authentication flow

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Biometric**: MFS100 fingerprint scanner integration
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Backend**: Ready for integration (see Backend Integration section)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/nouri-designs/FLA-auth.git
cd FLA-auth
```

2. Install dependencies:
```bash
npm install
```

3. Configure backend connection (optional):
```bash
# Create .env.local file for your backend URL
echo "VITE_API_BASE_URL=https://your-api-server.com" > .env.local
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


## Backend Integration

This frontend is ready to connect to any backend that implements the required authentication endpoints.

### Required API Endpoints

Your backend should implement these endpoints:

1. **POST** `/api/auth/check-user`
   - **Purpose**: Verify if a user exists for the given email/phone
   - **Request Body**:
     ```json
     {
       "emailOrPhone": "user@example.com"
     }
     ```
   - **Success Response**:
     ```json
     {
       "success": true,
       "userExists": true,
       "user": {
         "id": "123",
         "name": "John Doe",
         "email": "user@example.com",
         "phone": "+1234567890"
       }
     }
     ```

2. **POST** `/api/verify-fingerprint`
   - **Purpose**: Verify captured fingerprint against stored templates
   - **Request Body**:
     ```json
     {
       "userId": "123",
       "emailOrPhone": "user@example.com", 
       "fingerprintTemplate": "base64_encoded_template",
       "pidData": "xml_pid_data_from_mfs100",
       "deviceInfo": "MFS100-RD-Service"
     }
     ```
   - **Success Response**:
     ```json
     {
       "success": true,
       "match": true,
       "token": "jwt_auth_token",
       "userId": "123"
     }
     ```

### Configuration

1. Set your backend URL in `.env.local`:
   ```bash
   VITE_API_BASE_URL=https://your-api-server.com
   ```

2. Update the `buildApiUrl` function in `FingerprintLogin.jsx`:
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
   
   const buildApiUrl = (endpoint) => {
     return `${API_BASE_URL}${endpoint}`;
   };
   ```

3. Uncomment the actual API calls in:
   - `handleEmailPhoneSubmit()` function
   - `handleFingerprintScan()` function
   - `fetchUserData()` function in Dashboard.jsx

### CORS Configuration

Make sure your backend allows CORS from your frontend origin:
- Development: `http://localhost:3000`
- Production: Your deployed frontend URL

Example CORS headers:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS  
Access-Control-Allow-Headers: Content-Type, Authorization
```
