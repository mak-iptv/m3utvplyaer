const db = require('../lib/database');

module.exports = async (req, res) => {
  // Simple authentication for admin (you should implement proper auth)
  const adminToken = req.headers['x-admin-token'];
  const validToken = process.env.ADMIN_TOKEN || 'your-admin-token-here';

  if (adminToken !== validToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // GET all devices
    if (req.method === 'GET') {
      const devices = await db.query(
        `SELECT * FROM devices 
         ORDER BY last_seen DESC`
      );
      res.status(200).json(devices);
    }

    // UPDATE device status
    else if (req.method === 'PUT') {
      const { device_id, status } = req.body;

      if (!device_id || !status) {
        return res.status(400).json({ error: 'Device ID and status are required' });
      }

      await db.execute(
        'UPDATE devices SET status = ? WHERE device_id = ?',
        [status, device_id]
      );

      res.status(200).json({ 
        success: true, 
        message: 'Device updated successfully' 
      });
    }

    // DELETE device
    else if (req.method === 'DELETE') {
      const { device_id } = req.body;

      if (!device_id) {
        return res.status(400).json({ error: 'Device ID is required' });
      }

      await db.execute(
        'DELETE FROM devices WHERE device_id = ?',
        [device_id]
      );

      res.status(200).json({ 
        success: true, 
        message: 'Device deleted successfully' 
      });
    }

  } catch (error) {
    console.error('Devices admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};