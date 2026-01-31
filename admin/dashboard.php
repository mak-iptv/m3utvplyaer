<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M3U Player Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .stat-card h3 { color: #7f8c8d; font-size: 14px; margin-bottom: 10px; }
        .stat-card .number { font-size: 24px; font-weight: bold; color: #2c3e50; }
        
        .tabs { display: flex; margin-bottom: 20px; border-bottom: 2px solid #ddd; }
        .tab { padding: 10px 20px; cursor: pointer; background: #ecf0f1; margin-right: 5px; border-radius: 5px 5px 0 0; }
        .tab.active { background: #3498db; color: white; }
        
        .content { background: white; padding: 20px; border-radius: 0 5px 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .status-active { color: #27ae60; font-weight: bold; }
        .status-inactive { color: #e74c3c; font-weight: bold; }
        
        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-activate { background: #27ae60; color: white; }
        .btn-deactivate { background: #e74c3c; color: white; }
        .btn-delete { background: #95a5a6; color: white; }
        
        .activation-form { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-top: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📺 M3U Player Admin Dashboard</h1>
            <p>Manage devices and playlists</p>
        </header>
        
        <div class="stats">
            <div class="stat-card">
                <h3>Total Devices</h3>
                <div class="number" id="totalDevices">0</div>
            </div>
            <div class="stat-card">
                <h3>Active Devices</h3>
                <div class="number" id="activeDevices">0</div>
            </div>
            <div class="stat-card">
                <h3>Playlists</h3>
                <div class="number" id="totalPlaylists">0</div>
            </div>
            <div class="stat-card">
                <h3>Today's Activity</h3>
                <div class="number" id="todayActivity">0</div>
            </div>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('devices')">Devices</div>
            <div class="tab" onclick="showTab('playlists')">Playlists</div>
            <div class="tab" onclick="showTab('activation')">Activation Codes</div>
        </div>
        
        <div class="content">
            <!-- Devices Tab -->
            <div id="devicesTab">
                <h2>Devices Management</h2>
                <table id="devicesTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Platform</th>
                            <th>Status</th>
                            <th>Activated</th>
                            <th>Last Seen</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="devicesList">
                        <!-- Devices will be loaded here -->
                    </tbody>
                </table>
            </div>
            
            <!-- Playlists Tab -->
            <div id="playlistsTab" style="display: none;">
                <h2>Playlists Management</h2>
                <table id="playlistsTable">
                    <thead>
                        <tr>
                            <th>Device ID</th>
                            <th>Playlist Name</th>
                            <th>URL</th>
                            <th>Created</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="playlistsList">
                        <!-- Playlists will be loaded here -->
                    </tbody>
                </table>
            </div>
            
            <!-- Activation Tab -->
            <div id="activationTab" style="display: none;">
                <h2>Generate Activation Code</h2>
                <div class="activation-form">
                    <div class="form-group">
                        <label for="deviceId">Device ID (Optional)</label>
                        <input type="text" id="deviceId" placeholder="Leave empty for auto-generation">
                    </div>
                    
                    <div class="form-group">
                        <label for="platform">Platform</label>
                        <select id="platform">
                            <option value="Android">Android</option>
                            <option value="iOS">iOS</option>
                            <option value="Windows">Windows</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-activate" onclick="generateActivationCode()">Generate Activation Code</button>
                    
                    <div id="activationResult" style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 5px; display: none;">
                        <h3>Activation Code Generated</h3>
                        <p><strong>Code:</strong> <span id="generatedCode"></span></p>
                        <p><strong>Device ID:</strong> <span id="generatedDeviceId"></span></p>
                        <p>Give this code to the user for activation</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Tab Management
        function showTab(tabName) {
            // Hide all tabs
            document.getElementById('devicesTab').style.display = 'none';
            document.getElementById('playlistsTab').style.display = 'none';
            document.getElementById('activationTab').style.display = 'none';
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName + 'Tab').style.display = 'block';
            event.target.classList.add('active');
            
            // Load data for tab
            if(tabName === 'devices') loadDevices();
            if(tabName === 'playlists') loadPlaylists();
        }
        
        // Load Devices
        async function loadDevices() {
            try {
                const response = await fetch('get_devices.php');
                const devices = await response.json();
                
                let html = '';
                devices.forEach(device => {
                    html += `
                    <tr>
                        <td>${device.device_id.substring(0, 12)}...</td>
                        <td>${device.platform}</td>
                        <td class="status-${device.status}">${device.status}</td>
                        <td>${new Date(device.activated_at).toLocaleDateString()}</td>
                        <td>${device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</td>
                        <td>
                            ${device.status === 'active' ? 
                                '<button class="btn btn-deactivate" onclick="toggleDevice(\'' + device.device_id + '\', \'inactive\')">Deactivate</button>' :
                                '<button class="btn btn-activate" onclick="toggleDevice(\'' + device.device_id + '\', \'active\')">Activate</button>'
                            }
                            <button class="btn btn-delete" onclick="deleteDevice('${device.device_id}')">Delete</button>
                        </td>
                    </tr>
                    `;
                });
                
                document.getElementById('devicesList').innerHTML = html;
                document.getElementById('totalDevices').textContent = devices.length;
                document.getElementById('activeDevices').textContent = devices.filter(d => d.status === 'active').length;
            } catch (error) {
                console.error('Error loading devices:', error);
            }
        }
        
        // Toggle Device Status
        async function toggleDevice(deviceId, status) {
            try {
                const response = await fetch('update_device.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({device_id: deviceId, status: status})
                });
                
                loadDevices();
            } catch (error) {
                console.error('Error toggling device:', error);
            }
        }
        
        // Generate Activation Code
        function generateActivationCode() {
            const deviceId = document.getElementById('deviceId').value || 
                            'dev_' + Math.random().toString(36).substr(2, 9);
            const platform = document.getElementById('platform').value;
            
            const deviceData = {
                device_id: deviceId,
                platform: platform,
                app_version: '1.0',
                timestamp: Date.now()
            };
            
            const activationCode = btoa(JSON.stringify(deviceData));
            
            document.getElementById('generatedCode').textContent = activationCode;
            document.getElementById('generatedDeviceId').textContent = deviceId;
            document.getElementById('activationResult').style.display = 'block';
        }
        
        // Load initial data
        loadDevices();
        setInterval(loadDevices, 30000); // Refresh every 30 seconds
    </script>
</body>
</html>