class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.hls = null;
        this.isHlsSupported = false;
        this.debugMode = false;
        this.auth = { username: '', password: '' };
        
        this.init();
    }
    
    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupHLS();
        this.loadUserSettings();
        
        // Show welcome message
        this.showMessage('Welcome to IPTV Player! Load your M3U playlist to start.', 'info');
        
        console.log('IPTV Player initialized');
    }
    
    setupElements() {
        // Get all DOM elements
        this.elements = {
            videoPlayer: document.getElementById('videoPlayer'),
            channelList: document.getElementById('channelList'),
            currentChannel: document.getElementById('currentChannel'),
            status: document.getElementById('status'),
            playerState: document.getElementById('playerState'),
            channelsLoaded: document.getElementById('channelsLoaded'),
            channelCount: document.getElementById('channelCount'),
            searchInput: document.getElementById('searchInput'),
            groupFilter: document.getElementById('groupFilter'),
            debugOutput: document.getElementById('debugOutput'),
            streamStatus: document.getElementById('streamStatus'),
            bufferIndicator: document.getElementById('bufferIndicator'),
            currentGroup: document.getElementById('currentGroup'),
            currentUrl: document.getElementById('currentUrl'),
            playerOverlay: document.getElementById('playerOverlay'),
            overlayText: document.getElementById('overlayText'),
            overlayIcon: document.getElementById('overlayIcon')
        };
        
        // Create loading overlay
        this.createLoadingOverlay();
        this.createErrorOverlay();
    }
    
    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loading';
        this.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text" id="loadingText">Loading...</div>
                <div class="loading-details" id="loadingDetails"></div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-text" id="progressText">0%</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.loadingOverlay);
    }
    
    createErrorOverlay() {
        this.errorOverlay = document.createElement('div');
        this.errorOverlay.className = 'error-message';
        this.errorOverlay.innerHTML = `
            <div class="error-header">
                <div class="error-title">Error</div>
                <button class="error-close">&times;</button>
            </div>
            <div class="error-body" id="errorBody"></div>
        `;
        document.body.appendChild(this.errorOverlay);
        
        this.errorOverlay.querySelector('.error-close').addEventListener('click', () => {
            this.errorOverlay.style.display = 'none';
        });
    }
    
    setupHLS() {
        if (window.Hls) {
            this.isHlsSupported = Hls.isSupported();
            console.log('HLS.js supported:', this.isHlsSupported);
        }
    }
    
    setupEventListeners() {
        // File loading
        document.getElementById('loadM3U').addEventListener('click', () => {
            document.getElementById('m3uFile').click();
        });
        
        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });
        
        document.getElementById('loadURL').addEventListener('click', () => {
            this.loadFromURL();
        });
        
        document.getElementById('m3uUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadFromURL();
        });
        
        // Sample data
        document.getElementById('loadSample').addEventListener('click', () => {
            this.loadSampleData();
        });
        
        // Direct play
        document.getElementById('playDirect').addEventListener('click', () => {
            this.playDirectStream();
        });
        
        // Player controls
        document.getElementById('fullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        document.getElementById('mute').addEventListener('click', () => {
            this.toggleMute();
        });
        
        document.getElementById('reloadStream').addEventListener('click', () => {
            this.reloadCurrentStream();
        });
        
        // Search and filter
        this.elements.searchInput.addEventListener('input', (e) => {
            this.filterChannels(e.target.value);
        });
        
        document.getElementById('refreshList').addEventListener('click', () => {
            this.refreshChannelList();
        });
        
        // Debug
        document.getElementById('toggleDebug').addEventListener('click', () => {
            this.toggleDebugMode();
        });
        
        // Video events
        this.setupVideoEvents();
        
        // Advanced options
        this.setupAdvancedOptions();
    }
    
    setupVideoEvents() {
        const video = this.elements.videoPlayer;
        
        video.addEventListener('playing', () => {
            this.elements.playerState.textContent = 'Playing';
            this.elements.streamStatus.textContent = 'Playing';
            this.elements.bufferIndicator.style.display = 'none';
            this.updatePlayerOverlay('Playing', '▶️');
        });
        
        video.addEventListener('pause', () => {
            this.elements.playerState.textContent = 'Paused';
            this.elements.streamStatus.textContent = 'Paused';
        });
        
        video.addEventListener('waiting', () => {
            this.elements.playerState.textContent = 'Buffering';
            this.elements.streamStatus.textContent = 'Buffering...';
            this.elements.bufferIndicator.style.display = 'block';
        });
        
        video.addEventListener('error', (e) => {
            console.error('Video error:', e);
            this.elements.playerState.textContent = 'Error';
            this.elements.streamStatus.textContent = 'Playback Error';
            this.handlePlaybackError();
        });
        
        video.addEventListener('loadeddata', () => {
            this.elements.playerState.textContent = 'Loaded';
        });
        
        // Click overlay to play
        this.elements.playerOverlay.addEventListener('click', () => {
            if (this.currentChannel) {
                this.playCurrentChannel();
            }
        });
    }
    
    setupAdvancedOptions() {
        // Toggle advanced options
        document.querySelector('.advanced-options h3').addEventListener('click', (e) => {
            const options = document.getElementById('advancedOptions');
            options.style.display = options.style.display === 'none' ? 'block' : 'none';
            e.target.querySelector('span').textContent = 
                options.style.display === 'none' ? '⚙️' : '⬇️';
        });
        
        // Apply authentication
        document.getElementById('applyAuth').addEventListener('click', () => {
            this.auth.username = document.getElementById('authUsername').value;
            this.auth.password = document.getElementById('authPassword').value;
            this.showMessage('Authentication credentials applied', 'success');
        });
    }
    
    async handleFileUpload(file) {
        if (!file) return;
        
        this.showLoading('Reading M3U file...');
        document.getElementById('fileInfo').textContent = `File: ${file.name} (${this.formatFileSize(file.size)})`;
        
        try {
            const text = await this.readFile(file);
            await this.parseM3UContent(text, 'file');
            this.showMessage(`Successfully loaded ${this.channels.length} channels from file`, 'success');
        } catch (error) {
            this.showError(`Failed to load file: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('File read error'));
            reader.readAsText(file);
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async loadFromURL() {
        const urlInput = document.getElementById('m3uUrl');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }
        
        this.showLoading(`Fetching playlist from ${url}...`);
        
        try {
            const content = await this.fetchM3UContent(url);
            await this.parseM3UContent(content, 'url');
            this.showMessage(`Successfully loaded ${this.channels.length} channels from URL`, 'success');
        } catch (error) {
            this.showError(`Failed to load playlist: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    async fetchM3UContent(url) {
        const methods = [
            this.tryDirectFetch.bind(this),
            this.tryCorsProxy.bind(this),
            this.tryFetchWithCredentials.bind(this)
        ];
        
        for (let i = 0; i < methods.length; i++) {
            try {
                this.updateLoadingDetails(`Trying method ${i + 1}/${methods.length}...`);
                const content = await methods[i](url);
                if (content && content.includes('#EXTM3U')) {
                    this.updateLoadingDetails(`Success with method ${i + 1}`);
                    return content;
                }
            } catch (error) {
                console.log(`Method ${i + 1} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All fetch methods failed. Try loading from file instead.');
    }
    
    async tryDirectFetch(url) {
        const userAgent = this.getUserAgent();
        const headers = {
            'User-Agent': userAgent,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': window.location.origin
        };
        
        // Add auth if provided
        if (this.auth.username && this.auth.password) {
            const auth = btoa(`${this.auth.username}:${this.auth.password}`);
            headers['Authorization'] = `Basic ${auth}`;
        }
        
        const response = await fetch(url, {
            headers,
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.text();
    }
    
    async tryCorsProxy(url) {
        // Try multiple public CORS proxies
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`,
            `https://thingproxy.freeboard.io/fetch/${url}`,
            `https://api.codetabs.com/v1/proxy?quest=${url}`
        ];
        
        for (const proxyUrl of proxies) {
            try {
                const response = await fetch(proxyUrl, { timeout: 10000 });
                if (response.ok) {
                    return await response.text();
                }
            } catch (e) {
                continue;
            }
        }
        
        throw new Error('All proxies failed');
    }
    
    async tryFetchWithCredentials(url) {
        // Try with different credentials modes
        const modes = ['omit', 'same-origin', 'include'];
        
        for (const mode of modes) {
            try {
                const response = await fetch(url, {
                    mode: 'no-cors',
                    credentials: mode
                });
                // Note: no-cors mode has limitations
                if (response.type === 'opaque') {
                    // We can't read the response, but we can try to use the URL directly
                    return `#EXTM3U\n#EXTINF:-1,Test Channel\n${url}`;
                }
            } catch (e) {
                continue;
            }
        }
        
        throw new Error('Credential modes failed');
    }
    
    getUserAgent() {
        const agents = {
            chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            vlc: 'VLC/3.0.18 LibVLC/3.0.18',
            mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
        };
        
        const selected = document.getElementById('userAgent').value;
        return agents[selected] || agents.chrome;
    }
    
    async parseM3UContent(content, source) {
        this.channels = [];
        const lines = content.split('\n');
        
        let currentChannel = null;
        let currentGroup = 'Ungrouped';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                currentChannel = this.parseExtInf(line, currentGroup);
                
            } else if (line.startsWith('#EXTGRP:')) {
                currentGroup = line.substring(8).trim();
                
            } else if (line && !line.startsWith('#') && currentChannel) {
                if (this.isValidStreamUrl(line)) {
                    currentChannel.url = line;
                    this.channels.push({...currentChannel});
                    currentChannel = null;
                }
            }
        }
        
        console.log(`Parsed ${this.channels.length} channels from ${source}`);
        this.updateChannelList();
        
        // Auto-play first channel if enabled
        if (this.channels.length > 0 && document.getElementById('autoPlay').checked) {
            setTimeout(() => this.playChannel(this.channels[0], 0), 1000);
        }
    }
    
    parseExtInf(line, defaultGroup) {
        const info = line.substring(8);
        const nameMatch = info.match(/,(.*)$/);
        const name = nameMatch ? this.cleanChannelName(nameMatch[1]) : 'Unknown Channel';
        
        return {
            name: name,
            url: '',
            tvgId: this.extractParam(info, 'tvg-id'),
            tvgName: this.extractParam(info, 'tvg-name'),
            tvgLogo: this.extractParam(info, 'tvg-logo'),
            groupTitle: this.extractParam(info, 'group-title') || defaultGroup,
            duration: this.extractParam(info.split(',')[0], ':')
        };
    }
    
    extractParam(text, paramName) {
        const regex = new RegExp(`${paramName}="([^"]*)"|${paramName}=([^\\s]+)`);
        const match = text.match(regex);
        return match ? (match[1] || match[2] || '').trim() : '';
    }
    
    cleanChannelName(name) {
        return name
            .replace(/^[:\s|-]+/, '')
            .replace(/[:\s|-]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    isValidStreamUrl(url) {
        return url.match(/^(https?|rtmp|rtsp|mms|udp):\/\/.+/i) || 
               url.startsWith('//') || // Protocol-relative
               url.includes('.m3u8') ||
               url.includes('.mpd') ||
               url.includes('.ts');
    }
    
    updateChannelList() {
        this.elements.channelList.innerHTML = '';
        this.elements.channelsLoaded.textContent = this.channels.length;
        this.elements.channelCount.textContent = this.channels.length;
        
        if (this.channels.length === 0) {
            this.elements.channelList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📺</div>
                    <h3>No Channels Loaded</h3>
                    <p>Load an M3U file or enter a URL to get started</p>
                    <p class="empty-hint">Tip: If it works in VLC, it should work here too!</p>
                </div>
            `;
            return;
        }
        
        // Group channels
        const groups = this.groupChannels();
        
        // Update group filter
        this.updateGroupFilter(Object.keys(groups));
        
        // Display channels
        for (const [groupName, groupChannels] of Object.entries(groups)) {
            // Group header
            const groupHeader = document.createElement('div');
            groupHeader.className = 'channel-group';
            groupHeader.innerHTML = `
                <span>${groupName}</span>
                <span class="group-count">${groupChannels.length}</span>
            `;
            this.elements.channelList.appendChild(groupHeader);
            
            // Channel items
            groupChannels.forEach((channel, index) => {
                const channelElement = this.createChannelElement(channel, index);
                this.elements.channelList.appendChild(channelElement);
            });
        }
    }
    
    groupChannels() {
        const groups = {};
        
        this.channels.forEach((channel, index) => {
            const group = channel.groupTitle || 'Ungrouped';
            if (!groups[group]) groups[group] = [];
            groups[group].push({...channel, originalIndex: index});
        });
        
        // Sort groups alphabetically
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});
    }
    
    updateGroupFilter(groups) {
        const select = this.elements.groupFilter;
        select.innerHTML = '<option value="">All Groups</option>';
        
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            this.filterByGroup(e.target.value);
        });
    }
    
    createChannelElement(channel, index) {
        const element = document.createElement('div');
        element.className = 'channel-item';
        element.dataset.index = channel.originalIndex;
        
        const logoHtml = channel.tvgLogo ? 
            `<img src="${channel.tvgLogo}" alt="${channel.name}" class="channel-logo" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📺</text></svg>';">` :
            '<div class="channel-logo-placeholder">📺</div>';
        
        element.innerHTML = `
            <div class="channel-content">
                ${logoHtml}
                <div class="channel-details">
                    <div class="channel-name">${channel.name}</div>
                    <div class="channel-meta">
                        <span class="channel-group">${channel.groupTitle}</span>
                        <span class="channel-duration">${channel.duration || 'Live'}</span>
                    </div>
                </div>
            </div>
        `;
        
        element.addEventListener('click', () => {
            this.playChannel(channel, channel.originalIndex);
        });
        
        return element;
    }
    
    async playChannel(channel, index) {
        this.showLoading(`Loading ${channel.name}...`);
        
        // Update UI
        this.setActiveChannel(index);
        this.updateChannelInfo(channel);
        
        try {
            await this.playStream(channel.url);
            this.showMessage(`Playing: ${channel.name}`, 'success');
        } catch (error) {
            this.showError(`Failed to play: ${error.message}`);
            this.handlePlaybackError();
        } finally {
            this.hideLoading();
        }
    }
    
    setActiveChannel(index) {
        // Remove active class from all channels
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to selected channel
        const selected = document.querySelector(`.channel-item[data-index="${index}"]`);
        if (selected) {
            selected.classList.add('active');
            selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    updateChannelInfo(channel) {
        this.currentChannel = channel;
        this.elements.currentChannel.textContent = channel.name;
        this.elements.currentGroup.textContent = channel.groupTitle;
        this.elements.currentUrl.textContent = this.shortenUrl(channel.url);
        
        this.updatePlayerOverlay(`Loading ${channel.name}...`, '⏳');
    }
    
    shortenUrl(url) {
        if (url.length > 50) {
            return url.substring(0, 25) + '...' + url.substring(url.length - 25);
        }
        return url;
    }
    
    async playStream(url) {
        // Destroy existing HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        const video = this.elements.videoPlayer;
        
        // Reset video
        video.src = '';
        video.load();
        
        // Try different playback methods
        if (url.includes('.m3u8') && this.isHlsSupported) {
            await this.playWithHLS(url);
        } else {
            await this.playNative(url);
        }
    }
    
    async playWithHLS(url) {
        return new Promise((resolve, reject) => {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 3,
                levelLoadingTimeOut: 10000,
                levelLoadingMaxRetry: 3,
                fragLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 3
            });
            
            this.hls.loadSource(url);
            this.hls.attachMedia(this.elements.videoPlayer);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.elements.videoPlayer.play().then(resolve).catch(reject);
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            reject(new Error('Network error - trying native playback'));
                            this.hls.destroy();
                            this.playNative(url).catch(reject);
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            this.hls.recoverMediaError();
                            break;
                        default:
                            reject(new Error('HLS fatal error'));
                            this.hls.destroy();
                            break;
                    }
                }
            });
        });
    }
    
    async playNative(url) {
        return new Promise((resolve, reject) => {
            const video = this.elements.videoPlayer;
            video.src = url;
            video.load();
            
            const canPlayHandler = () => {
                video.removeEventListener('canplay', canPlayHandler);
                video.play().then(resolve).catch(reject);
            };
            
            const errorHandler = () => {
                video.removeEventListener('error', errorHandler);
                reject(new Error('Native playback failed'));
            };
            
            video.addEventListener('canplay', canPlayHandler);
            video.addEventListener('error', errorHandler);
            
            // Timeout
            setTimeout(() => {
                video.removeEventListener('canplay', canPlayHandler);
                video.removeEventListener('error', errorHandler);
                reject(new Error('Playback timeout'));
            }, 15000);
        });
    }
    
    handlePlaybackError() {
        if (this.currentChannel) {
            this.updatePlayerOverlay('Playback Error', '❌');
            
            // Try alternative methods
            setTimeout(() => {
                this.showMessage('Trying alternative playback method...', 'info');
                this.reloadCurrentStream();
            }, 2000);
        }
    }
    
    updatePlayerOverlay(text, icon) {
        this.elements.overlayText.textContent = text;
        this.elements.overlayIcon.textContent = icon;
        this.elements.playerOverlay.style.display = 'flex';
    }
    
    hidePlayerOverlay() {
        this.elements.playerOverlay.style.display = 'none';
    }
    
    playCurrentChannel() {
        if (this.currentChannel) {
            this.elements.videoPlayer.play().catch(e => {
                console.warn('Autoplay prevented:', e);
                this.updatePlayerOverlay('Click to play', '▶️');
            });
            this.hidePlayerOverlay();
        }
    }
    
    filterChannels(searchTerm) {
        const items = this.elements.channelList.querySelectorAll('.channel-item');
        const searchLower = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const channelName = item.querySelector('.channel-name').textContent.toLowerCase();
            item.style.display = channelName.includes(searchLower) ? 'block' : 'none';
        });
        
        // Hide/show group headers
        this.updateGroupHeaders();
    }
    
    filterByGroup(group) {
        const items = this.elements.channelList.querySelectorAll('.channel-item');
        
        items.forEach(item => {
            const channelGroup = item.querySelector('.channel-group').textContent;
            item.style.display = (!group || channelGroup === group) ? 'block' : 'none';
        });
        
        this.updateGroupHeaders();
    }
    
    updateGroupHeaders() {
        const groups = this.elements.channelList.querySelectorAll('.channel-group');
        
        groups.forEach(group => {
            const groupName = group.querySelector('span:first-child').textContent;
            const items = Array.from(this.elements.channelList.querySelectorAll('.channel-item'))
                .filter(item => item.style.display !== 'none' && 
                       item.querySelector('.channel-group').textContent === groupName);
            
            group.style.display = items.length > 0 ? 'flex' : 'none';
        });
    }
    
    refreshChannelList() {
        if (this.channels.length > 0) {
            this.updateChannelList();
            this.showMessage('Channel list refreshed', 'success');
        }
    }
    
    playDirectStream() {
        const url = prompt('Enter direct stream URL:');
        if (url && this.isValidStreamUrl(url)) {
            const channel = {
                name: 'Direct Stream',
                groupTitle: 'Direct',
                url: url
            };
            this.playChannel(channel, -1);
        } else if (url) {
            this.showError('Invalid stream URL format');
        }
    }
    
    loadSampleData() {
        const sampleM3U = `#EXTM3U
#EXTINF:-1 tvg-id="demo1" tvg-name="Demo 1" tvg-logo="https://via.placeholder.com/100x50/4361ee/ffffff?text=Demo1" group-title="Demo",Demo Channel 1
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="demo2" tvg-name="Demo 2" tvg-logo="https://via.placeholder.com/100x50/f72585/ffffff?text=Demo2" group-title="Demo",Demo Channel 2
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-id="news1" tvg-name="News Channel" tvg-logo="https://via.placeholder.com/100x50/4cc9f0/ffffff?text=News" group-title="News",24/7 News Channel
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`;
        
        this.parseM3UContent(sampleM3U, 'sample');
        this.showMessage('Loaded sample channels for testing', 'info');
    }
    
    toggleFullscreen() {
        const videoContainer = document.querySelector('.video-container');
        
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    toggleMute() {
        const video = this.elements.videoPlayer;
        video.muted = !video.muted;
        document.getElementById('mute').textContent = video.muted ? '🔊 Unmute' : '🔇 Mute';
    }
    
    reloadCurrentStream() {
        if (this.currentChannel) {
            this.playChannel(this.currentChannel, 
                Array.from(document.querySelectorAll('.channel-item'))
                    .findIndex(item => item.classList.contains('active')));
        }
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        document.getElementById('streamDebug').style.display = 
            this.debugMode ? 'block' : 'none';
        
        if (this.debugMode) {
            this.updateDebugInfo();
        }
    }
    
    updateDebugInfo() {
        const info = {
            timestamp: new Date().toISOString(),
            channels: this.channels.length,
            currentChannel: this.currentChannel ? {
                name: this.currentChannel.name,
                url: this.currentChannel.url,
                group: this.currentChannel.groupTitle
            } : null,
            videoState: {
                src: this.elements.videoPlayer.src,
                currentTime: this.elements.videoPlayer.currentTime,
                duration: this.elements.videoPlayer.duration,
                paused: this.elements.videoPlayer.paused,
                muted: this.elements.videoPlayer.muted,
                volume: this.elements.videoPlayer.volume,
                readyState: this.elements.videoPlayer.readyState,
                networkState: this.elements.videoPlayer.networkState,
                error: this.elements.videoPlayer.error
            },
            hls: this.hls ? {
                version: Hls.version,
                currentLevel: this.hls.currentLevel,
                levels: this.hls.levels ? this.hls.levels.length : 0
            } : null,
            userAgent: navigator.userAgent,
            screen: `${window.screen.width}x${window.screen.height}`,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
        
        this.elements.debugOutput.textContent = JSON.stringify(info, null, 2);
    }
    
    showLoading(text = 'Loading...', details = '') {
        this.loadingOverlay.style.display = 'flex';
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingDetails').textContent = details;
    }
    
    updateLoadingDetails(details) {
        document.getElementById('loadingDetails').textContent = details;
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    showError(message) {
        this.elements.status.textContent = 'Error';
        this.errorOverlay.querySelector('#errorBody').textContent = message;
        this.errorOverlay.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.errorOverlay.style.display = 'none';
        }, 10000);
        
        console.error('Error:', message);
    }
    
    showMessage(message, type = 'info') {
        const colors = {
            info: '#4361ee',
            success: '#4ade80',
            warning: '#fbbf24',
            error: '#f87171'
        };
        
        const msg = document.createElement('div');
        msg.className = 'success-message';
        msg.innerHTML = `
            <div style="color: ${colors[type]}; font-weight: bold; margin-bottom: 5px;">
                ${type.toUpperCase()}
            </div>
            <div>${message}</div>
        `;
        
        document.body.appendChild(msg);
        msg.style.display = 'block';
        
        setTimeout(() => {
            msg.style.display = 'none';
            setTimeout(() => msg.remove(), 300);
        }, 3000);
    }
    
    loadUserSettings() {
        const savedUrl = localStorage.getItem('iptv_last_url');
        if (savedUrl) {
            document.getElementById('m3uUrl').value = savedUrl;
        }
    }
    
    saveUserSettings() {
        const url = document.getElementById('m3uUrl').value;
        if (url) {
            localStorage.setItem('iptv_last_url', url);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.iptvPlayer = new IPTVPlayer();
    
    // Auto-save URL on change
    document.getElementById('m3uUrl').addEventListener('change', function() {
        if (this.value) {
            localStorage.setItem('iptv_last_url', this.value);
        }
    });
    
    // Load last URL on Ctrl+L
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            const lastUrl = localStorage.getItem('iptv_last_url');
            if (lastUrl) {
                document.getElementById('m3uUrl').value = lastUrl;
                document.getElementById('m3uUrl').focus();
            }
        }
    });
});
