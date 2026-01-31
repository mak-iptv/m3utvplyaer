const db = require('../lib/database');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Get playlists for device
    if (req.method === 'GET') {
      const deviceKey = req.query.device_key;

      if (!deviceKey) {
        return res.status(400).json({ error: 'Device key is required' });
      }

      const playlists = await db.query(
        `SELECT p.* FROM playlists p
         INNER JOIN devices d ON p.device_id = d.device_id
         WHERE d.device_key = ? AND p.is_active = 1
         ORDER BY p.created_at DESC`,
        [deviceKey]
      );

      res.status(200).json(playlists);
    }

    // POST - Add new playlist
    else if (req.method === 'POST') {
      const { device_key, name, m3u_url } = req.body;

      if (!device_key || !name || !m3u_url) {
        return res.status(400).json({ 
          success: false, 
          message: 'Device key, name and URL are required' 
        });
      }

      // Get device_id from device_key
      const devices = await db.query(
        'SELECT device_id FROM devices WHERE device_key = ?',
        [device_key]
      );

      if (devices.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid device key' 
        });
      }

      const deviceId = devices[0].device_id;

      // Insert playlist
      await db.execute(
        `INSERT INTO playlists 
         (device_id, name, m3u_url, is_active, created_at)
         VALUES (?, ?, ?, 1, NOW())`,
        [deviceId, name, m3u_url]
      );

      res.status(201).json({ 
        success: true, 
        message: 'Playlist added successfully' 
      });
    }

    // DELETE - Remove playlist
    else if (req.method === 'DELETE') {
      const { device_key, playlist_id } = req.body;

      if (!device_key || !playlist_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Device key and playlist ID are required' 
        });
      }

      await db.execute(
        `DELETE p FROM playlists p
         INNER JOIN devices d ON p.device_id = d.device_id
         WHERE p.id = ? AND d.device_key = ?`,
        [playlist_id, device_key]
      );

      res.status(200).json({ 
        success: true, 
        message: 'Playlist deleted successfully' 
      });
    }

  } catch (error) {
    console.error('Playlists error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};