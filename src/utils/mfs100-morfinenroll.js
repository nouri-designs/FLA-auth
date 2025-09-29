// MorFinEnroll wrapper for MFS100 (simplified)
// Exports: testMFS100Device, captureMFS100FingerprintComplete, checkMFS100Device

const BASE = 'https://localhost:8032/morfinenroll';

// Helper to perform fetch with timeout
const fetchWithTimeout = (url, options = {}, timeout = 15000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
  ]);
};

export async function testMFS100Device() {
  try {
    // Query service info
    const resp = await fetchWithTimeout(`${BASE}/service-info`, { method: 'GET' }, 5000);
    if (!resp.ok) {
      return { success: false, httpStatus: resp.status, error: 'Service not available' };
    }
    const info = await resp.json();
    // Attempt to list devices
    const devResp = await fetchWithTimeout(`${BASE}/devices`, { method: 'GET' }, 5000);
    const devices = devResp.ok ? await devResp.json() : null;
    return { success: true, serviceInfo: info, connectedDevices: devices };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function checkMFS100Device() {
  try {
    const resp = await fetchWithTimeout(`${BASE}/status`, { method: 'GET' }, 4000);
    return { httpStatus: resp.status, ok: resp.ok };
  } catch (err) {
    return { httpStatus: 0, error: err.message };
  }
}

export async function captureMFS100FingerprintComplete(options = {}) {
  try {
    // Prepare request body similar to morfinenroll sample
    const body = {
      captureType: 'single',
      fingerCount: options.slap ? 4 : 1,
      timeout: options.timeout || 20000,
      quality: options.quality || 60
    };

    const resp = await fetchWithTimeout(`${BASE}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, body.timeout + 5000);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { success: false, error: `Service responded ${resp.status} ${text}` };
    }

    const result = await resp.json();

    // MorFinEnroll returns structured JSON; normalize expected fields
    const captureData = result.capture || result.data || result;
    const imageData = captureData.image || captureData.imageData || null;

    // Template/pidData extraction (try common keys)
    const template = captureData.template || captureData.BiometricData || captureData.Template || null;
    const pidData = captureData.pidData || captureData.PID || null;

    return {
      success: true,
      captureData: captureData,
      imageData: imageData,
      pidData: pidData,
      template: template,
      deviceInfo: { deviceInfo: result.device || result.deviceInfo || null }
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  testMFS100Device,
  checkMFS100Device,
  captureMFS100FingerprintComplete
};
