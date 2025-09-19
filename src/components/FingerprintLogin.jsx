import React, { useState, useEffect } from 'react';
import { 
  User, 
  Smartphone, 
  Mail, 
  Fingerprint, 
  AlertCircle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';

const FingerprintLogin = () => {
  const [formData, setFormData] = useState({
    emailOrPhone: ''
  });
  const [currentStep, setCurrentStep] = useState(1); // 1: Email/Phone, 2: Fingerprint
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fingerprintStatus, setFingerprintStatus] = useState('');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Check MFS100 device connection on component mount
  useEffect(() => {
    checkDeviceConnection();
  }, []);

  const checkDeviceConnection = async () => {
    try {
      // MFS100 device check - replace with actual device detection logic
      const response = await fetch('http://127.0.0.1:11100/DeviceOpen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        setDeviceConnected(true);
        setFingerprintStatus('Device connected and ready');
      } else {
        setDeviceConnected(false);
        setFingerprintStatus('Please connect MFS100 device');
      }
    } catch (error) {
      setDeviceConnected(false);
      setFingerprintStatus('MFS100 device not detected. Please ensure device is connected.');
    }
  };

  // Helper: get backend base URL from environment (Vite exposes VITE_ prefixed vars)
  const getBackendBase = () => {
    // fallback to localhost if not set
    return import.meta.env.VITE_BACKEND_URL || '';
  };

  // Helper: build absolute URL for backend endpoints
  const buildUrl = (path) => {
    const base = getBackendBase();
    // if base is empty or path already absolute, return path
    if (!base) return path;
    // ensure no double slashes
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  };

  // Helper: fetch with timeout
  const fetchWithTimeout = (url, options = {}, timeout = 15000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
    ]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateEmailOrPhone = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
    return emailRegex.test(input) || phoneRegex.test(input);
  };

  const handleEmailPhoneSubmit = async () => {
    
    if (!formData.emailOrPhone.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    if (!validateEmailOrPhone(formData.emailOrPhone)) {
      setError('Please enter a valid email or phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if user exists in database
      const url = buildUrl('/api/auth/check-user');
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrPhone: formData.emailOrPhone
        })
      }, 10000);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Server error: ${response.status} ${text}`);
      }

      const data = await response.json();

      if (data.userExists) {
        setUserInfo(data.user);
        setCurrentStep(2);
        setSuccess('User found! Please scan your fingerprint to continue.');
      } else {
        setError('User not found. Please check your email/phone number or register first.');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const captureFingerprintData = async () => {
    try {
      setFingerprintStatus('Please place your finger on the scanner...');
      
      // MFS100 fingerprint capture
      const captureResponse = await fetch('http://127.0.0.1:11100/CaptureFingerPrint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Timeout: 10000,
          Quality: 60
        })
      });

      const captureResult = await captureResponse.json();

      if (captureResult.ErrorCode === 0) {
        // Normalize BitmapData to a base64 string when possible
        let template = captureResult.BitmapData;
        try {
          if (template && typeof template !== 'string') {
            // If it's an array-like of bytes
            if (Array.isArray(template) || template instanceof Uint8Array) {
              template = btoa(String.fromCharCode(...template));
            } else if (template.data && Array.isArray(template.data)) {
              // some libs return { data: [...] }
              template = btoa(String.fromCharCode(...template.data));
            }
          }
        } catch (e) {
          // conversion failed, leave template as-is
        }

        return {
          template,
          quality: captureResult.Quality
        };
      } else {
        throw new Error(captureResult.ErrorDescription || 'Fingerprint capture failed');
      }
    } catch (error) {
      throw new Error('Failed to capture fingerprint: ' + error.message);
    }
  };

  const handleFingerprintScan = async () => {
    if (!deviceConnected) {
      setError('MFS100 device not connected. Please check your device connection.');
      return;
    }

    setIsLoading(true);
    setError('');
    setFingerprintStatus('Initializing fingerprint scanner...');

    try {
      // Capture fingerprint from MFS100 device
  const fingerprintData = await captureFingerprintData();
      
      if (!fingerprintData.template) {
        throw new Error('No fingerprint data captured');
      }

      setFingerprintStatus('Verifying fingerprint...');

      // Prepare payload: ensure template is base64 string (if binary passed)
      let template = fingerprintData.template;
      if (template && template instanceof Uint8Array) {
        // convert to base64
        template = btoa(String.fromCharCode(...template));
      }

      // Send fingerprint data to backend for verification (remote backend on other PC)
      const verifyUrl = buildUrl('/api/verify-fingerprint');
      const verificationResponse = await fetchWithTimeout(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrPhone: formData.emailOrPhone,
          fingerprintTemplate: template,
          quality: fingerprintData.quality
        })
      }, 20000);

      if (!verificationResponse.ok) {
        const text = await verificationResponse.text().catch(() => '');
        throw new Error(`Verification server error: ${verificationResponse.status} ${text}`);
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.match) {
        setSuccess('Fingerprint verified successfully! Redirecting to dashboard...');
        setFingerprintStatus('Authentication successful');
        
        // Store authentication token
        localStorage.setItem('authToken', verificationResult.token);
        localStorage.setItem('userId', verificationResult.userId);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setError(verificationResult.message || 'Fingerprint verification failed. Please try again.');
        setFingerprintStatus('Verification failed');
      }
    } catch (error) {
      setError('Fingerprint scanning error: ' + error.message);
      setFingerprintStatus('Scan failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({ emailOrPhone: '' });
    setError('');
    setSuccess('');
    setFingerprintStatus('');
    setUserInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            {currentStep === 1 ? (
              <User className="w-8 h-8 text-indigo-600" />
            ) : (
              <Fingerprint className="w-8 h-8 text-indigo-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStep === 1 ? 'Welcome Back' : 'Fingerprint Verification'}
          </h1>
          <p className="text-gray-600">
            {currentStep === 1 
              ? 'Enter your credentials to continue' 
              : 'Place your finger on the scanner to login'
            }
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Step 1: Email/Phone Input */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Email or Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="emailOrPhone"
                  name="emailOrPhone"
                  value={formData.emailOrPhone}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailPhoneSubmit()}
                  placeholder="Enter your email or phone number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {formData.emailOrPhone.includes('@') ? (
                    <Mail className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleEmailPhoneSubmit}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Checking...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        )}

        {/* Step 2: Fingerprint Scanner */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* User Info */}
            {userInfo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Logging in as:</p>
                <p className="font-medium text-gray-900">{userInfo.name}</p>
                <p className="text-sm text-gray-600">{formData.emailOrPhone}</p>
              </div>
            )}

            {/* Device Status */}
            <div className={`p-4 rounded-lg ${deviceConnected ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center">
                {deviceConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <p className={`text-sm ${deviceConnected ? 'text-green-700' : 'text-red-700'}`}>
                  {fingerprintStatus || 'Checking device connection...'}
                </p>
              </div>
            </div>

            {/* Fingerprint Scanner Animation */}
            <div className="text-center">
              <div className={`mx-auto w-32 h-32 rounded-full border-4 ${
                isLoading ? 'border-indigo-200 animate-pulse' : 'border-gray-200'
              } flex items-center justify-center mb-4 ${
                deviceConnected ? 'bg-green-50' : 'bg-gray-50'
              }`}>
                <Fingerprint className={`w-16 h-16 ${
                  isLoading ? 'text-indigo-600 animate-pulse' : 
                  deviceConnected ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <p className="text-gray-600 mb-6">
                {isLoading ? 'Processing...' : 'Click below to scan your fingerprint'}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleFingerprintScan}
                disabled={!deviceConnected || isLoading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-5 w-5 mr-2" />
                    Scan Fingerprint
                  </>
                )}
              </button>

              <button
                onClick={resetForm}
                className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                disabled={isLoading}
              >
                Back to Email/Phone
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Secure fingerprint authentication powered by MFS100
          </p>
        </div>
      </div>
    </div>
  );
};

export default FingerprintLogin;