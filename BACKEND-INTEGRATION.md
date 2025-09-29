# Backend Integration Guide

## Quick Start for Backend Integration

This frontend is currently running in demo mode with placeholder responses. To connect to your real backend:

### Step 1: Configure Your API URL

Edit `.env.local`:
```bash
VITE_API_BASE_URL=https://your-backend-api.com
```

### Step 2: Update API Helper

In `src/components/FingerprintLogin.jsx`, uncomment and update the API configuration:

```javascript
// Replace this line:
// TODO: Configure your backend base URL here
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Update this function:
const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};
```

### Step 3: Enable Real API Calls

In `FingerprintLogin.jsx`, find these functions and uncomment the real API calls:

#### `handleEmailPhoneSubmit()`:
```javascript
// Uncomment this block:
const response = await fetch(buildApiUrl('/api/auth/check-user'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailOrPhone: formData.emailOrPhone })
});

// Remove the placeholder simulation code
```

#### `handleFingerprintScan()`:
```javascript
// Uncomment this block:
const response = await fetch(buildApiUrl('/api/verify-fingerprint'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userInfo.id,
    emailOrPhone: formData.emailOrPhone,
    fingerprintTemplate: template,
    pidData: fingerprintData.pidData,
    deviceInfo: fingerprintData.deviceInfo
  })
});

// Remove the placeholder simulation code
```

### Step 4: Enable Dashboard API (Optional)

In `src/components/Dashboard.jsx`, uncomment the user data fetch:

```javascript
// Uncomment this block in fetchUserData():
const response = await fetch(`/api/user/${userId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Step 5: Test Your Integration

1. Start your backend server
2. Run the frontend: `npm run dev`
3. Test the authentication flow
4. Check browser dev tools for any CORS or API errors

## API Contract

Your backend must implement these endpoints exactly as specified in the main README.md file.

## Troubleshooting

- **CORS errors**: Configure your backend to allow `http://localhost:3000`
- **404 errors**: Verify your API endpoints match the expected paths
- **Authentication errors**: Check token format and validation logic
- **MFS100 issues**: Ensure device service is running on ports 11100 or 8005

## Current State

The app is fully functional as a UI demo. All authentication logic is in place - you just need to connect it to your backend API by following the steps above.