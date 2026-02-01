class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.videoPlayer = document.getElementById('videoPlayer');
        this.channelList = document.getElementById('channelList');
        this.currentChannelElement = document.getElementById('currentChannel');
        this.statusElement = document.getElementById('status');
        this.loadingElement = null;
        
        // HLS.js for better stream support
        this.hls = null;
        this.initHLS();
        
        this.init();
    }
    
    initHLS() {
        // Check if browser supports HLS.js
        if (window.Hls && Hls.isSupported()) {
            console.log('HLS.js is supported');
        } else if (this.videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('Native HLS support detected');
        } else {
            console.log('No HLS support detected');
        }
    }
    
    init() {
        this.createLoadingElement();
        
        // Event listeners
        this.setupEventListeners();
        
        // Video player events
        this.setupVideoEvents();
        
        // Add context menu for debugging
        this.addDebugMenu();
    }
    
    createLoadingElement() {
        this.loadingElement = document.createElement('div');
        this.loadingElement.id = 'loading';
        this.loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading...</p>
            <div class="loading-details" id="loadingDetails"></div>
        `;
        document.body.appendChild(this.loadingElement);
    }
    
    setupEventListeners() {
        document.getElementById('loadM3U').addEventListener('click', () => {
            document.getElementById('m3uFile').click();
        });
        
        document.getElementById('loadURL').addEventListener('click', () => {
            this.loadFromUrl();
        });
        
        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.loadM3UFile(e.target.files[0]);
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterChannels(e.target.value);
        });
        
        document.getElementById('m3uUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadFromUrl();
            }
        });
        
        // Add direct URL play button
        document.getElementById('playDirect').addEventListener('click', () => {
            this.playDirectUrl();
        });
    }
    
    setupVideoEvents() {
        this.videoPlayer.addEventListener('error', (e) => {
            console.error('Video error details:', {
                code: this.videoPlayer.error?.code,
                message: this.videoPlayer.error?.message,
                src: this.videoPlayer.src
            });
            
            let errorMsg = 'Error playing stream';
            if (this.videoPlayer.error) {
                switch(this.videoPlayer.error.code) {
                    case 1: errorMsg = 'Stream aborted'; break;
                    case 2: errorMsg = 'Network error'; break;
                    case 3: errorMsg = 'Decode error'; break;
                    case 4: errorMsg = 'Format not supported'; break;
                }
            }
            
            this.updateStatus(`${errorMsg}. Trying alternative methods...`);
            
            // Try HLS.js if available
            if (this.currentChannel && window.Hls) {
                this.tryHlsPlayback(this.currentChannel.url);
            }
        });
        
        this.videoPlayer.addEventListener('playing', () => {
            this.updateStatus('Playing');
            this.hideError();
        });
        
        this.videoPlayer.addEventListener('waiting', () => {
            this.updateStatus('Buffering...');
        });
        
        this.videoPlayer.addEventListener('loadeddata', () => {
            this.updateStatus('Stream loaded');
        });
    }
    
    addDebugMenu() {
        // Right-click menu for debugging
        document.addEventListener('contextmenu', (e) => {
            if (e.target.id === 'videoPlayer' || e.target.classList.contains('channel-item')) {
                e.preventDefault();
                this.showDebugMenu(e);
            }
        });
    }
    
    async loadM3UFile(file) {
        this.showLoading('Reading M3U file...');
        try {
            const text = await file.text();
            await this.parseM3U(text);
            this.updateStatus(`Loaded ${this.channels.length} channels from file`);
            this.hideLoading();
        } catch (error) {
            this.updateStatus('Error loading file');
            this.showError(`Failed to load M3U file: ${error.message}`);
            console.error('File load error:', error);
            this.hideLoading();
        }
    }
    
    async loadFromUrl() {
        const urlInput = document.getElementById('m3uUrl');
        let url = urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }
        
        // Normalize URL
        url = this.normalizeUrl(url);
        urlInput.value = url;
        
        this.showLoading(`Fetching playlist from ${new URL(url).hostname}...`);
        
        try {
            // Try multiple methods
            const content = await this.fetchM3UContent(url);
            await this.parseM3U(content);
            this.updateStatus(`Successfully loaded ${this.channels.length} channels`);
            this.hideLoading();
            
            // Auto-play first channel if any
            if (this.channels.length > 0) {
                setTimeout(() => this.playChannel(this.channels[0], 0), 500);
            }
            
        } catch (error) {
            console.error('Load error:', error);
            this.showError(`Failed to load playlist: ${error.message}`);
            this.hideLoading();
        }
    }
    
    normalizeUrl(url) {
        // Add protocol if missing
        if (!url.match(/^https?:\/\//)) {
            if (url.includes('://')) {
                return url;
            }
            return 'http://' + url;
        }
        return url;
    }
    
    async fetchM3UContent(url) {
        const methods = [
            this.tryDirectFetch.bind(this),
            this.tryCorsProxy.bind(this),
            this.tryAllOrigins.bind(this)
        ];
        
        for (const method of methods) {
            try {
                const content = await method(url);
                if (content && content.includes('#EXTM3U')) {
                    console.log(`Success with method: ${method.name}`);
                    return content;
                }
            } catch (e) {
                console.log(`Method ${method.name} failed:`, e.message);
                continue;
            }
        }
        
        throw new Error('All fetch methods failed');
    }
    
    async tryDirectFetch(url) {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Origin': window.location.origin
            },
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.text();
    }
    
    async tryCorsProxy(url) {
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://proxy.cors.sh/${url}`
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
    
    async tryAllOrigins(url) {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        return data.contents;
    }
    
    async parseM3U(content) {
        this.channels = [];
        const lines = content.split('\n');
        
        let currentChannel = {};
        let group = 'Ungrouped';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const info = line.substring(8);
                const nameMatch = info.match(/,(.*)$/);
                
                if (nameMatch) {
                    currentChannel = {
                        id: i,
                        name: this.cleanChannelName(nameMatch[1]),
                        url: '',
                        tvgId: this.extractParam(info, 'tvg-id'),
                        tvgName: this.extractParam(info, 'tvg-name'),
                        tvgLogo: this.extractParam(info, 'tvg-logo'),
                        groupTitle: this.extractParam(info, 'group-title') || group
                    };
                }
                
            } else if (line.startsWith('#EXTGRP:')) {
                group = line.substring(8).trim();
                
            } else if (line && !line.startsWith('#') && currentChannel.name) {
                if (this.isValidStreamUrl(line)) {
                    currentChannel.url = line;
                    this.channels.push({...currentChannel});
                }
                currentChannel = {};
            }
        }
        
        console.log(`Parsed ${this.channels.length} channels`);
        this.displayChannels();
    }
    
    isValidStreamUrl(url) {
        const patterns = [
            /^https?:\/\/.+/i,
            /^rtmp:\/\/.+/i,
            /^rtsp:\/\/.+/i,
            /^mms:\/\/.+/i,
            /^\/\/.+/i, // Protocol-relative URL
            /^[a-zA-Z0-9]+:\/\/.+/i // Any protocol
        ];
        
        return patterns.some(pattern => pattern.test(url.trim()));
    }
    
    cleanChannelName(name) {
        return name
            .replace(/^[:\s|-]+/, '')
            .replace(/[:\s|-]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    extractParam(text, paramName) {
        const regex = new RegExp(`${paramName}="([^"]*)"|${paramName}=([^\\s]+)`);
        const match = text.match(regex);
        return match ? (match[1] || match[2] || '').trim() : '';
    }
    
    displayChannels() {
        this.channelList.innerHTML = '';
        
        if (this.channels.length === 0) {
            this.channelList.innerHTML = `
                <div class="no-channels">
                    <p>No channels found in playlist</p>
                    <p>The M3U file might be empty or in wrong format</p>
                </div>
            `;
            return;
        }
        
        // Group channels
        const groups = {};
        this.channels.forEach((channel, index) => {
            const group = channel.groupTitle;
            if (!groups[group]) groups[group] = [];
            groups[group].push({...channel, index});
        });
        
        // Display by groups
        Object.keys(groups).sort().forEach(groupName => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'channel-group';
            groupHeader.innerHTML = `
                <span>${groupName}</span>
                <span class="group-count">${groups[groupName].length}</span>
            `;
            this.channelList.appendChild(groupHeader);
            
            groups[groupName].forEach(channel => {
                const channelElement = this.createChannelElement(channel, channel.index);
                this.channelList.appendChild(channelElement);
            });
        });
    }
    
    createChannelElement(channel, index) {
        const element = document.createElement('div');
        element.className = 'channel-item';
        element.dataset.index = index;
        
        const logoHtml = channel.tvgLogo ? 
            `<img src="${channel.tvgLogo}" alt="" class="channel-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📺</text></svg>'">` :
            '<div class="channel-logo-placeholder">📺</div>';
        
        element.innerHTML = `
            <div class="channel-info">
                ${logoHtml}
                <div class="channel-details">
                    <div class="channel-name">${channel.name}</div>
                    <div class="channel-url">${this.shortenUrl(channel.url)}</div>
                </div>
                <button class="test-btn" title="Test Stream">▶️</button>
            </div>
        `;
        
        element.addEventListener('click', (e) => {
            if (!e.target.classList.contains('test-btn')) {
                this.playChannel(channel, index);
            }
        });
        
        element.querySelector('.test-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.testStream(channel.url);
        });
        
        return element;
    }
    
    shortenUrl(url) {
        if (url.length > 40) {
            return url.substring(0, 20) + '...' + url.substring(url.length - 20);
        }
        return url;
    }
    
    async playChannel(channel, index) {
        this.showLoading(`Loading ${channel.name}...`);
        
        // Update UI
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const element = document.querySelector(`.channel-item[data-index="${index}"]`);
        if (element) {
            element.classList.add('active');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        this.currentChannel = channel;
        this.currentChannelElement.innerHTML = `
            <strong>${channel.name}</strong>
            <small>${channel.groupTitle}</small>
        `;
        
        // Stop any existing HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        // Try different playback methods
        await this.tryPlaybackMethods(channel.url);
        
        this.hideLoading();
    }
    
    async tryPlaybackMethods(url) {
        const methods = [
            this.tryNativePlayback.bind(this),
            this.tryHlsJs.bind(this),
            this.tryMpegDash.bind(this)
        ];
        
        for (const method of methods) {
            try {
                const success = await method(url);
                if (success) {
                    console.log(`Playback success with ${method.name}`);
                    return;
                }
            } catch (error) {
                console.log(`${method.name} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All playback methods failed');
    }
    
    async tryNativePlayback(url) {
        return new Promise((resolve) => {
            this.videoPlayer.src = url;
            this.videoPlayer.load();
            
            const timeout = setTimeout(() => {
                this.videoPlayer.removeEventListener('canplay', canplayHandler);
                resolve(false);
            }, 10000);
            
            const canplayHandler = () => {
                clearTimeout(timeout);
                this.videoPlayer.play().then(() => {
                    resolve(true);
                }).catch(() => {
                    resolve(false);
                });
            };
            
            this.videoPlayer.addEventListener('canplay', canplayHandler, { once: true });
        });
    }
    
    async tryHlsJs(url) {
        if (!window.Hls || !Hls.isSupported()) {
            return false;
        }
        
        return new Promise((resolve) => {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferSize: 30 * 1000 * 1000,
                maxBufferLength: 30,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10
            });
            
            this.hls.loadSource(url);
            this.hls.attachMedia(this.videoPlayer);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.videoPlayer.play().then(() => {
                    resolve(true);
                }).catch(() => {
                    resolve(false);
                });
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    resolve(false);
                }
            });
            
            setTimeout(() => resolve(false), 10000);
        });
    }
    
    async tryMpegDash(url) {
        // Placeholder for DASH support
        return false;
    }
    
    async testStream(url) {
        this.showLoading('Testing stream...');
        
        try {
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            this.showError('Stream accessible (HEAD request succeeded)');
        } catch (error) {
            try {
                // Try with proxy
                const proxyUrl = `https://api.allorigins.win/head?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();
                
                if (data.status.http_code === 200) {
                    this.showError(`Stream accessible via proxy (HTTP ${data.status.http_code})`);
                } else {
                    this.showError(`Stream error: HTTP ${data.status.http_code}`);
                }
            } catch (proxyError) {
                this.showError('Cannot test stream (CORS blocked)');
            }
        }
        
        this.hideLoading();
    }
    
    playDirectUrl() {
        const url = prompt('Enter direct stream URL:');
        if (url) {
            this.showLoading('Playing direct URL...');
            this.playChannel({
                name: 'Direct Stream',
                groupTitle: 'Direct',
                url: url
            }, -1);
        }
    }
    
    showDebugMenu(e) {
        // Implementation for debug menu
        console.log('Debug info:', {
            currentChannel: this.currentChannel,
            channelsCount: this.channels.length,
            videoSrc: this.videoPlayer.src,
            videoError: this.videoPlayer.error
        });
    }
    
    showLoading(message = 'Loading...') {
        this.loadingElement.style.display = 'flex';
        const details = this.loadingElement.querySelector('#loadingDetails');
        if (details) details.textContent = message;
    }
    
    hideLoading() {
        this.loadingElement.style.display = 'none';
    }
    
    showError(message) {
        // Create or update error display
        let errorDiv = document.getElementById('errorDisplay');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorDisplay';
            errorDiv.className = 'error-display';
            document.querySelector('.player-section').appendChild(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
        `;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    hideError() {
        const errorDiv = document.getElementById('errorDisplay');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    updateStatus(message) {
        this.statusElement.textContent = message;
        console.log('Status:', message);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Load HLS.js library if needed
    if (!window.Hls) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = () => {
            window.player = new IPTVPlayer();
        };
        document.head.appendChild(script);
    } else {
        window.player = new IPTVPlayer();
    }
});
