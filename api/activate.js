const db = require('../lib/database');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { activation_code, email } = req.body;

    if (!activation_code) {
      return res.status(400).json({ success: false, message: 'Activation code is required' });
    }

    // Decode activation code
    const decoded = Buffer.from(activation_code, 'base64').toString();
    const deviceInfo = JSON.parse(decoded);

    if (!deviceInfo || !deviceInfo.device_id) {
      return res.status(400).json({ success: false, message: 'Invalid activation code' });
    }

    const deviceId = deviceInfo.device_id;
    const platform = deviceInfo.platform || 'Unknown';
    const appVersion = deviceInfo.app_version || '1.0';

    // Generate device key
    const deviceKey = crypto
      .createHash('sha256')
      .update(deviceId + Date.now() + Math.random().toString())
      .digest('hex');

    // Check if device exists
    const existingDevice = await db.query(
      'SELECT * FROM devices WHERE device_id = ?',
      [deviceId]
    );

    if (existingDevice.length > 0) {
      // Update existing device
      await db.execute(
        `UPDATE devices SET 
         device_key = ?,
         last_seen = NOW(),
         status = 'active'
         WHERE device_id = ?`,
        [deviceKey, deviceId]
      );
    } else {
      // Insert new device
      await db.execute(
        `INSERT INTO devices 
         (device_id, device_key, platform, app_version, status, activated_at, last_seen, email)
         VALUES (?, ?, ?, ?, 'active', NOW(), NOW(), ?)`,
        [deviceId, deviceKey, platform, appVersion, email || null]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Device activated successfully',
      device_key: deviceKey,
      device_id: deviceId
    });

  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};