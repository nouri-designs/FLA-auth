# XAMPP Backend Connection Guide

## Step 1: Start XAMPP Services

1. Open XAMPP Control Panel (usually in `C:\xampp\xampp-control.exe`)
2. Click "Start" for Apache
3. Verify Apache is running (should show green "Running" status)
4. Optional: Start MySQL if your backend uses a database

## Step 2: Verify Backend Location

Ensure your backend is in the correct location:
- Path: `C:\xampp\htdocs\MRIMS-Backend\`
- Test URL: `http://localhost/MRIMS-Backend/`

## Step 3: Add CORS Support to Your PHP Backend

Copy the `cors-headers.php` file to your MRIMS-Backend folder and include it at the top of your API endpoints:

```php
<?php
require_once 'cors-headers.php';

// Your API code here...
?>
```

## Step 4: Test Connection

Run these PowerShell commands to test:

```powershell
# Test if Apache is running
Test-NetConnection -ComputerName localhost -Port 80

# Test backend root
Invoke-RestMethod -Uri http://localhost/MRIMS-Backend/

# Test API endpoints
Invoke-RestMethod -Uri http://localhost/MRIMS-Backend/api/auth/check-user -Method POST -Body (@{ emailOrPhone = 'test@example.com' } | ConvertTo-Json) -ContentType 'application/json'
```

## Step 5: Restart Frontend

After configuring CORS, restart your frontend:

```powershell
npm run dev
```

## Troubleshooting

- **Port 80 busy**: Check if other services (IIS, Skype) are using port 80
- **XAMPP not starting**: Run XAMPP as Administrator
- **Backend not found**: Verify folder structure in htdocs
- **CORS errors**: Ensure cors-headers.php is included in all API files