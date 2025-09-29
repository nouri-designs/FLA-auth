import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Smartphone, 
  Mail, 
  Fingerprint, 
  AlertCircle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';
// Import MFS100 MorFinEnroll API
import { 
  testMFS100Device, 
  captureMFS100FingerprintComplete,
  checkMFS100Device 
} from '../utils/mfs100-morfinenroll.js';

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
  const emailInputRef = useRef(null);

  // Check MFS100 device connection on component mount
  useEffect(() => {
    checkDeviceConnection();
  }, []);

  const checkDeviceConnection = async () => {
    try {
      setFingerprintStatus('🔍 Connecting to MFS100 via MorFinEnroll service...');
      
      // Use MorFinEnroll API to test MFS100 device (port 8032)
      const deviceTest = await testMFS100Device();
      
      if (deviceTest.success) {
        console.log('✅ MFS100 Device Test Results:', deviceTest);
        setDeviceConnected(true);
        setFingerprintStatus(`✅ MFS100 connected via MorFinEnroll service`);
        
        // Log device information
        if (deviceTest.connectedDevices) {
          console.log('📱 Connected Devices:', deviceTest.connectedDevices);
        }
        if (deviceTest.serviceInfo) {
          console.log('ℹ️ Service Info:', deviceTest.serviceInfo);
        }
        
        return { connected: true, deviceInfo: deviceTest };
      } else {
        console.log('❌ MFS100 Device Test Failed:', deviceTest);
        
        // Try simple device check as fallback
        const simpleCheck = await checkMFS100Device();
        if (simpleCheck.httpStatus) {
          setDeviceConnected(true);
          setFingerprintStatus('✅ MFS100 service available (limited info)');
          return { connected: true, limited: true };
        }
        
        setDeviceConnected(false);
        setFingerprintStatus(`❌ MFS100 not available: ${deviceTest.error || deviceTest.details}`);
        return { connected: false, error: deviceTest };
      }
      
    } catch (error) {
      console.error('🔴 MFS100 connection error:', error);
      setDeviceConnected(false);
      setFingerprintStatus('❌ MFS100 connection failed - MorFinEnroll service not running on port 8032');
      return { connected: false, error: error.message };
    }
  };

  // Helper: get backend base URL from environment (Vite exposes VITE_ prefixed vars)
  const getBackendBase = () => {
    // fallback to localhost if not set
    return import.meta.env.VITE_API_BASE_URL || '';
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
      // Check if user exists in members table of members-db database
      const response = await fetchWithTimeout(buildUrl('/check-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.emailOrPhone.includes('@') ? formData.emailOrPhone : null,
          emailOrPhone: formData.emailOrPhone 
        })
      }, 10000);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Server error: ${response.status} ${text}`);
      }

      const data = await response.json();
      console.log('Backend response:', data); // Debug log to see what your backend returns

      // Strictly determine whether the backend returned a found user.
      // Accept only a non-empty `data` or `user` object (or explicit flags paired with an actual user object).
      let userInfoCandidate = null;
      if (data && typeof data === 'object') {
        // If data.data is present but only contains the `exists` flag, don't treat it as user info here.
        if (data.data && typeof data.data === 'object' && data.data.exists !== true && Object.keys(data.data).length > 1) {
          // data.data has more than just the exists flag
          userInfoCandidate = data.data;
        } else if (data.user && typeof data.user === 'object' && (data.user.email || data.user.id || Object.keys(data.user).length > 0)) {
          userInfoCandidate = data.user;
        } else if (data.success === true && data.user && typeof data.user === 'object' && (data.user.email || data.user.id || Object.keys(data.user).length > 0)) {
          userInfoCandidate = data.user;
        } else if (data.found === true && data.user && typeof data.user === 'object' && (data.user.email || data.user.id || Object.keys(data.user).length > 0)) {
          userInfoCandidate = data.user;
        }
      }

      // New: Accept MRIMS shape where `data.data.exists === true` as a valid found user.
      if (!userInfoCandidate && data && data.data && typeof data.data === 'object' && data.data.exists === true) {
        // create a minimal user info object from the provided emailOrPhone
        userInfoCandidate = { email: formData.emailOrPhone, name: formData.emailOrPhone, id: null };
      }

      if (userInfoCandidate) {
        // Clear any previous error messages
        setError('');
        setUserInfo(userInfoCandidate);
        setCurrentStep(2);
        setSuccess(`✅ Email verified! Welcome ${userInfoCandidate.name || userInfoCandidate.email || formData.emailOrPhone}! Please scan your fingerprint to complete authentication.`);

        // Check device connection when moving to fingerprint step
        await checkDeviceConnection();
      } else {
        // Do not advance — require explicit user data. Clear and focus the input so user must re-enter.
        setSuccess('');
        setUserInfo(null);
        setCurrentStep(1);
        const errMsg = data && data.message ? data.message : 'User not found in our database. Please enter your registered email or phone.';
        setError(errMsg);

        // Clear the input and focus it so user must re-enter their email/phone
        setFormData({ emailOrPhone: '' });
        // focus after state update
        setTimeout(() => {
          if (emailInputRef && emailInputRef.current) {
            try { emailInputRef.current.focus(); } catch (e) { /* ignore focus errors */ }
          }
        }, 50);
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const captureFingerprintData = async () => {
    try {
      setFingerprintStatus('👆 Place your finger firmly on the MFS100 scanner...');
      
      // Use MorFinEnroll API for fingerprint capture
      const captureOptions = {
        timeout: 20000,        // 20 seconds timeout
        slap: false,          // Single finger capture
        fingerPosition: 0,     // Any finger position
        quality: 60           // NFIQ quality threshold (60%)
      };
      
      console.log('🔄 Starting MFS100 fingerprint capture via MorFinEnroll...');
      setFingerprintStatus('📡 Connecting to MFS100 scanner...');
      
      // Perform complete fingerprint capture workflow
      const captureResult = await captureMFS100FingerprintComplete(captureOptions);
      
      if (captureResult.success) {
        console.log('✅ MFS100 Fingerprint Capture Successful!');
        console.log('📊 Capture Data:', captureResult.captureData);
        
        const { captureData, imageData, deviceInfo } = captureResult;
        
        // Extract quality and template information
        let quality = 'Unknown';
        let template = null;
        
        if (captureData) {
          // Extract quality score and template from capture data
          quality = captureData.Quality || captureData.NFIQ_Quality || 'Unknown';
          template = captureData.Template || captureData.BiometricData || JSON.stringify(captureData);
          
          console.log('📊 Fingerprint Quality:', quality);
          console.log('🔢 Template Length:', template ? template.length : 'N/A');
        }
        
        setFingerprintStatus(`✅ Fingerprint captured successfully! Quality: ${quality}`);

        return {
          success: true,
          template: template,
          captureData: captureData,
          imageData: imageData,
          quality: quality,
          deviceInfo: deviceInfo?.deviceInfo || 'MFS100-MorFinEnroll',
          endpoint: 'MorFinEnroll:8032'
        };

      } else {
        console.error('❌ MFS100 Fingerprint Capture Failed:', captureResult);
        const errorMsg = captureResult.details || captureResult.error || 'Unknown capture error';
        setFingerprintStatus(`❌ Capture failed: ${errorMsg}`);
        
        // Check if it's a service connection issue
        if (errorMsg.includes('8032') || errorMsg.includes('service')) {
          throw new Error('❌ MorFinEnroll service not running. Please ensure:\n• MFS100 MorFinEnroll Client Service is installed\n• Service is running on port 8032\n• Device is connected and recognized');
        }
        
        throw new Error(`❌ Fingerprint capture failed: ${errorMsg}`);
      }

    } catch (error) {
      console.error('❌ Fingerprint capture error:', error);
      setFingerprintStatus(`❌ Capture error: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        template: null
      };
    }
  };

  const handleFingerprintScan = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    setFingerprintStatus('🔄 Initializing MFS100 scanner...');

    try {
      // Capture fingerprint from MFS100 device
      const fingerprintResult = await captureFingerprintData();
      
      // Check if capture was successful
      if (!fingerprintResult.success) {
        throw new Error(fingerprintResult.error || 'Fingerprint capture failed');
      }
      
      if (!fingerprintResult.template) {
        throw new Error('No fingerprint template received from scanner');
      }

      console.log('✅ Fingerprint captured, quality:', fingerprintResult.quality);
      setFingerprintStatus('🔍 Verifying with MRIMS database...');

      // Send fingerprint data to MRIMS backend for verification
      const response = await fetchWithTimeout(buildUrl('/verify-fingerprint'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userInfo.id || userInfo.user_id,
          email: userInfo.email,
          emailOrPhone: formData.emailOrPhone,
          fingerprintTemplate: fingerprintResult.template,
          pidData: fingerprintResult.pidData,
          deviceInfo: fingerprintResult.deviceInfo,
          quality: fingerprintResult.quality
        })
      }, 30000); // 30 second timeout for verification

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`MRIMS verification server error: ${response.status} ${text}`);
      }

      const verificationResult = await response.json();
      console.log('MRIMS verification response:', verificationResult);

      // Handle MRIMS backend response format
      if ((verificationResult.status === 'success' && verificationResult.match) || 
          (verificationResult.success && verificationResult.match)) {
        
        setSuccess(`🎉 Welcome back, ${userInfo.name || userInfo.email}! Fingerprint verified successfully.`);
        setFingerprintStatus('✅ Authentication completed successfully');
        
        // Store authentication data
        localStorage.setItem('authToken', verificationResult.token || 'authenticated');
        localStorage.setItem('userId', verificationResult.userId || userInfo.id);
        localStorage.setItem('authenticated_user', JSON.stringify(userInfo));
        
        console.log('✅ User authenticated successfully:', userInfo);
        
        // Auto-redirect to dashboard after successful authentication
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
        
      } else {
        const errorMsg = verificationResult.message || 'Fingerprint does not match our records. Please try again or contact administrator.';
        setError(errorMsg);
        setFingerprintStatus('❌ Verification failed - fingerprint mismatch');
      }

    } catch (error) {
      console.error('❌ Fingerprint verification error:', error);
      setError('Fingerprint verification failed: ' + error.message);
      setFingerprintStatus('❌ Verification failed');
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
              ? 'Enter your registered email or phone number' 
              : 'Verify your identity with fingerprint scan'
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
                  ref={emailInputRef}
                  value={formData.emailOrPhone}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailPhoneSubmit()}
                  placeholder="Enter your registered email or phone number"
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
                  Verifying user...
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
                disabled={isLoading}
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
            Secure fingerprint verification powered by MFS100 Mantra
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Compatible with MRIMS enrolled fingerprints
          </p>
        </div>
      </div>
    </div>
  );
};

export default FingerprintLogin;