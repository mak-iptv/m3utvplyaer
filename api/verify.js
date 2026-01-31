const db = require('../lib/database');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { device_key } = req.body;

    if (!device_key) {
      return res.status(400).json({ success: false, message: 'Device key is required' });
    }

    const devices = await db.query(
      `SELECT device_id, platform, activated_at, status 
       FROM devices 
       WHERE device_key = ? AND status = 'active'`,
      [device_key]
    );

    if (devices.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive device' });
    }

    // Update last seen
    await db.execute(
      'UPDATE devices SET last_seen = NOW() WHERE device_key = ?',
      [device_key]
    );

    res.status(200).json({
      success: true,
      device: devices[0]
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};