class XtreamPlayer {
    constructor() {
        this.user = null;
        this.serverInfo = null;
        this.categories = [];
        this.channels = [];
        this.filteredChannels = [];
        this.currentCategory = null;
        this.currentChannel = null;
        
        this.init();
    }
    
    init() {
        // Element references
        this.loginBtn = document.getElementById('loginBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.serverUrlInput = document.getElementById('serverUrl');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginCard = document.getElementById('loginCard');
        this.playerInterface = document.getElementById('playerInterface');
        this.categoriesList = document.getElementById('categoriesList');
        this.channelsGrid = document.getElementById('channelsGrid');
        this.searchChannelInput = document.getElementById('searchChannel');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.playerPlaceholder = document.getElementById('playerPlaceholder');
        this.currentChannelInfo = document.getElementById('currentChannelInfo');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.refreshStreamBtn = document.getElementById('refreshStreamBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusMessage = document.getElementById('statusMessage');
        
        // Event listeners
        this.loginBtn.addEventListener('click', () => this.login());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.searchChannelInput.addEventListener('input', () => this.searchChannels());
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.stopBtn.addEventListener('click', () => this.stopStream());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.refreshStreamBtn.addEventListener('click', () => this.refreshStream());
        
        // Video player events
        this.videoPlayer.addEventListener('play', () => this.updatePlayerStatus('playing'));
        this.videoPlayer.addEventListener('pause', () => this.updatePlayerStatus('paused'));
        this.videoPlayer.addEventListener('error', () => this.updatePlayerStatus('error'));
        this.videoPlayer.addEventListener('waiting', () => this.updatePlayerStatus('buffering'));
        this.videoPlayer.addEventListener('playing', () => this.updatePlayerStatus('playing'));
        
        // Check for saved credentials
        this.checkSavedCredentials();
    }
    
    showMessage(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = 'status-message show';
        
        switch(type) {
            case 'error':
                this.statusMessage.style.borderLeftColor = '#ef4444';
                break;
            case 'success':
                this.statusMessage.style.borderLeftColor = '#22c55e';
                break;
            case 'warning':
                this.statusMessage.style.borderLeftColor = '#f59e0b';
                break;
            default:
                this.statusMessage.style.borderLeftColor = '#3b82f6';
        }
        
        setTimeout(() => {
            this.statusMessage.classList.remove('show');
        }, 5000);
    }
    
    async login() {
        const serverUrl = this.serverUrlInput.value.trim();
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!serverUrl || !username || !password) {
            this.showMessage('Ju lutem plotësoni të gjitha fushat', 'error');
            return;
        }
        
        // Clean server URL
        let cleanServerUrl = serverUrl.replace(/\/$/, '');
        
        this.showMessage('Duke u lidhur me serverin...', 'info');
        this.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Duke u lidhur...';
        this.loginBtn.disabled = true;
        
        try {
            // Authenticate with Xtream Codes API
            const authUrl = `${cleanServerUrl}/player_api.php?username=${username}&password=${password}`;
            
            const response = await fetch(authUrl);
            
            if (!response.ok) {
                throw new Error('Gabim në lidhje me serverin');
            }
            
            const data = await response.json();
            
            if (data.user_info && data.user_info.auth === 1) {
                // Save credentials
                this.user = {
                    username,
                    password,
                    serverUrl: cleanServerUrl,
                    info: data.user_info
                };
                
                this.serverInfo = data.server_info;
                
                // Save to localStorage
                localStorage.setItem('iptv_credentials', JSON.stringify({
                    serverUrl: cleanServerUrl,
                    username,
                    password
                }));
                
                // Switch to player interface
                this.loginCard.style.display = 'none';
                this.playerInterface.style.display = 'block';
                
                // Update UI
                document.getElementById('loggedUser').textContent = username;
                document.getElementById('currentServer').textContent = cleanServerUrl;
                
                // Load categories
                await this.loadCategories();
                
                this.showMessage('U lidh me sukses!', 'success');
            } else {
                throw new Error('Kredencialet janë të gabuara');
            }
            
        } catch (error) {
            this.showMessage(`Gabim: ${error.message}`, 'error');
            console.error('Login error:', error);
        } finally {
            this.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Kyçu';
            this.loginBtn.disabled = false;
        }
    }
    
    async loadCategories() {
        try {
            const url = `${this.user.serverUrl}/player_api.php?username=${this.user.username}&password=${this.user.password}&action=get_live_categories`;
            
            const response = await fetch(url);
            const categories = await response.json();
            
            this.categories = categories;
            
            // Update UI
            this.displayCategories();
            this.updateStats();
            
            // Select first category by default
            if (this.categories.length > 0) {
                await this.selectCategory(this.categories[0].category_id);
            }
            
        } catch (error) {
            this.showMessage('Gabim në ngarkimin e kategorive', 'error');
            console.error('Load categories error:', error);
        }
    }
    
    displayCategories() {
        this.categoriesList.innerHTML = '';
        
        this.categories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category-item';
            categoryElement.dataset.categoryId = category.category_id;
            
            categoryElement.innerHTML = `
                <i class="fas fa-folder"></i>
                <span class="category-name">${category.category_name}</span>
                <span class="category-count">${category.category_count || '?'}</span>
            `;
            
            categoryElement.addEventListener('click', () => {
                this.selectCategory(category.category_id);
            });
            
            this.categoriesList.appendChild(categoryElement);
        });
    }
    
    async selectCategory(categoryId) {
        // Update active category
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.categoryId === categoryId.toString()) {
                item.classList.add('active');
            }
        });
        
        this.currentCategory = categoryId;
        
        // Update current category title
        const category = this.categories.find(c => c.category_id === categoryId);
        if (category) {
            document.getElementById('currentCategory').textContent = category.category_name;
        }
        
        // Load channels for this category
        await this.loadChannels(categoryId);
    }
    
    async loadChannels(categoryId) {
        try {
            this.channelsGrid.innerHTML = '<div class="loading-channels"><i class="fas fa-spinner fa-spin"></i> Duke ngarkuar kanalet...</div>';
            
            const url = `${this.user.serverUrl}/player_api.php?username=${this.user.username}&password=${this.user.password}&action=get_live_streams&category_id=${categoryId}`;
            
            const response = await fetch(url);
            const channels = await response.json();
            
            this.channels = channels;
            this.filteredChannels = [...channels];
            
            // Display channels
            this.displayChannels();
            
        } catch (error) {
            this.showMessage('Gabim në ngarkimin e kanaleve', 'error');
            console.error('Load channels error:', error);
            this.channelsGrid.innerHTML = '<div class="loading-channels">Gabim në ngarkimin e kanaleve</div>';
        }
    }
    
    displayChannels() {
        this.channelsGrid.innerHTML = '';
        
        if (this.filteredChannels.length === 0) {
            this.channelsGrid.innerHTML = '<div class="loading-channels">Nuk u gjetën kanale</div>';
            return;
        }
        
        this.filteredChannels.forEach((channel, index) => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel-card';
            channelElement.dataset.channelId = channel.stream_id;
            
            const logoUrl = channel.stream_icon 
                ? `${this.user.serverUrl}/${channel.stream_icon}`
                : null;
            
            channelElement.innerHTML = `
                <div class="channel-logo">
                    ${logoUrl 
                        ? `<img src="${logoUrl}" alt="${channel.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\"fas fa-tv\"></i>';">`
                        : '<i class="fas fa-tv"></i>'
                    }
                </div>
                <div class="channel-name">${channel.name}</div>
                <div class="channel-number">#${index + 1}</div>
            `;
            
            channelElement.addEventListener('click', () => {
                this.selectChannel(channel);
            });
            
            this.channelsGrid.appendChild(channelElement);
        });
    }
    
    selectChannel(channel) {
        // Update active channel
        document.querySelectorAll('.channel-card').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.channelId === channel.stream_id.toString()) {
                item.classList.add('active');
            }
        });
        
        this.currentChannel = channel;
        
        // Update channel info
        const logoUrl = channel.stream_icon 
            ? `${this.user.serverUrl}/${channel.stream_icon}`
            : null;
        
        this.currentChannelInfo.innerHTML = `
            <div class="channel-info-logo">
                ${logoUrl 
                    ? `<img src="${logoUrl}" alt="${channel.name}" onerror="this.onerror=null; this.innerHTML='<i class=\"fas fa-tv\"></i>';">`
                    : '<i class="fas fa-tv"></i>'
                }
            </div>
            <div class="channel-info-text">
                <h4>${channel.name}</h4>
                <p>${channel.epg_channel_id || 'N/A'} • ${channel.added || 'N/A'}</p>
            </div>
        `;
        
        // Show player placeholder
        this.playerPlaceholder.style.display = 'flex';
        this.videoPlayer.style.display = 'none';
        
        // Update play button
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Luaj';
        this.playPauseBtn.disabled = false;
        
        this.showMessage('Kanal i zgjedhur: ' + channel.name);
    }
    
    async playStream() {
        if (!this.currentChannel) {
            this.showMessage('Zgjidhni një kanal fillimisht', 'warning');
            return;
        }
        
        try {
            // Construct stream URL
            const streamUrl = `${this.user.serverUrl}/live/${this.user.username}/${this.user.password}/${this.currentChannel.stream_id}.m3u8`;
            
            this.showMessage('Duke ngarkuar transmetimin...', 'info');
            this.updatePlayerStatus('buffering');
            
            // Hide placeholder, show video player
            this.playerPlaceholder.style.display = 'none';
            this.videoPlayer.style.display = 'block';
            
            // Set video source
            this.videoPlayer.src = streamUrl;
            
            // Play video
            await this.videoPlayer.play();
            
            this.showMessage('Duke luajtur: ' + this.currentChannel.name, 'success');
            
        } catch (error) {
            this.showMessage('Gabim në luajtjen e transmetimit', 'error');
            console.error('Play stream error:', error);
            this.updatePlayerStatus('error');
            this.playerPlaceholder.style.display = 'flex';
            this.videoPlayer.style.display = 'none';
        }
    }
    
    togglePlayPause() {
        if (this.videoPlayer.paused || !this.videoPlayer.src) {
            this.playStream();
        } else {
            this.videoPlayer.pause();
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Luaj';
            this.updatePlayerStatus('paused');
        }
    }
    
    stopStream() {
        this.videoPlayer.pause();
        this.videoPlayer.src = '';
        this.playerPlaceholder.style.display = 'flex';
        this.videoPlayer.style.display = 'none';
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Luaj';
        this.updatePlayerStatus('ready');
        this.showMessage('Transmetimi u ndal');
    }
    
    refreshStream() {
        if (this.videoPlayer.src) {
            const currentTime = this.videoPlayer.currentTime;
            this.videoPlayer.src = this.videoPlayer.src;
            this.videoPlayer.currentTime = currentTime;
            this.showMessage('Transmetimi u rifreskua');
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.videoPlayer.requestFullscreen) {
                this.videoPlayer.requestFullscreen();
            } else if (this.videoPlayer.webkitRequestFullscreen) {
                this.videoPlayer.webkitRequestFullscreen();
            } else if (this.videoPlayer.msRequestFullscreen) {
                this.videoPlayer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }
    
    searchChannels() {
        const searchTerm = this.searchChannelInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            this.filteredChannels = [...this.channels];
        } else {
            this.filteredChannels = this.channels.filter(channel =>
                channel.name.toLowerCase().includes(searchTerm)
            );
        }
        
        this.displayChannels();
    }
    
    updatePlayerStatus(status) {
        const statusElement = document.getElementById('playerStatus');
        statusElement.innerHTML = '';
        
        let statusHtml = '';
        
        switch(status) {
            case 'ready':
                statusHtml = '<span class="status-ready"><i class="fas fa-check-circle"></i> Gati</span>';
                this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Luaj';
                break;
            case 'buffering':
                statusHtml = '<span class="status-ready"><i class="fas fa-spinner fa-spin"></i> Duke ngarkuar...</span>';
                this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pauzë';
                break;
            case 'playing':
                statusHtml = '<span class="status-playing"><i class="fas fa-play-circle"></i> Duke luajtur</span>';
                this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pauzë';
                break;
            case 'paused':
                statusHtml = '<span class="status-ready"><i class="fas fa-pause-circle"></i> Pauzuar</span>';
                this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Luaj';
                break;
            case 'error':
                statusHtml = '<span class="status-error"><i class="fas fa-exclamation-circle"></i> Gabim</span>';
                this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Luaj';
                break;
        }
        
        statusElement.innerHTML = statusHtml;
    }
    
    updateStats() {
        document.getElementById('totalCategories').textContent = this.categories.length;
        document.getElementById('totalChannels').textContent = this.channels.length;
    }
    
    checkSavedCredentials() {
        const saved = localStorage.getItem('iptv_credentials');
        if (saved) {
            try {
                const credentials = JSON.parse(saved);
                this.serverUrlInput.value = credentials.serverUrl;
                this.usernameInput.value = credentials.username;
                this.passwordInput.value = credentials.password;
                this.showMessage('U gjetën kredenciale të ruajtura. Klikoni "Kyçu" për t\'u lidhur.', 'info');
            } catch (error) {
                localStorage.removeItem('iptv_credentials');
            }
        }
    }
    
    logout() {
        this.user = null;
        this.serverInfo = null;
        this.categories = [];
        this.channels = [];
        this.currentChannel = null;
        this.currentCategory = null;
        
        // Clear localStorage
        localStorage.removeItem('iptv_credentials');
        
        // Reset video player
        this.videoPlayer.src = '';
        this.videoPlayer.pause();
        
        // Switch to login interface
        this.playerInterface.style.display = 'none';
        this.loginCard.style.display = 'block';
        
        // Clear inputs
        this.passwordInput.value = '';
        
        this.showMessage('Jeni shkyçur me sukses', 'success');
    }
}

// Initialize the player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.xtreamPlayer = new XtreamPlayer();
    
    // Auto-login if credentials are in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const server = urlParams.get('server');
    const user = urlParams.get('user');
    const pass = urlParams.get('pass');
    
    if (server && user && pass) {
        document.getElementById('serverUrl').value = server;
        document.getElementById('username').value = user;
        document.getElementById('password').value = pass;
        
        // Auto-login after a short delay
        setTimeout(() => {
            document.getElementById('loginBtn').click();
        }, 1000);
    }
});
