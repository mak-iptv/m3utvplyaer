class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.videoPlayer = document.getElementById('videoPlayer');
        this.channelList = document.getElementById('channelList');
        this.currentChannelElement = document.getElementById('currentChannel');
        this.statusElement = document.getElementById('status');
        this.loadingElement = null;
        
        this.init();
    }
    
    init() {
        // Create loading element
        this.loadingElement = document.createElement('div');
        this.loadingElement.id = 'loading';
        this.loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading...</p>
        `;
        document.body.appendChild(this.loadingElement);
        
        // Event listeners
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
        
        // Video player events
        this.videoPlayer.addEventListener('error', (e) => {
            console.error('Video error:', e);
            this.updateStatus(`Error playing stream. Code: ${this.videoPlayer.error?.code}`);
            this.showError('Cannot play this stream. Try another channel.');
        });
        
        this.videoPlayer.addEventListener('playing', () => {
            this.updateStatus('Playing');
            this.hideError();
        });
        
        this.videoPlayer.addEventListener('waiting', () => {
            this.updateStatus('Buffering...');
        });
        
        // Sample M3U for testing (remove in production)
        this.addSampleChannels();
    }
    
    showLoading() {
        this.loadingElement.style.display = 'flex';
    }
    
    hideLoading() {
        this.loadingElement.style.display = 'none';
    }
    
    showError(message) {
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.className = 'error-message';
            document.querySelector('.player-section').appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    async loadM3UFile(file) {
        this.showLoading();
        try {
            const text = await file.text();
            this.parseM3U(text);
            this.updateStatus(`Loaded ${this.channels.length} channels from file`);
            this.hideLoading();
        } catch (error) {
            this.updateStatus('Error loading file');
            this.showError('Failed to load M3U file');
            console.error('File load error:', error);
            this.hideLoading();
        }
    }
    
    async loadFromUrl() {
        const urlInput = document.getElementById('m3uUrl');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }
        
        // Add protocol if missing
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            finalUrl = 'https://' + url;
            urlInput.value = finalUrl;
        }
        
        this.showLoading();
        this.updateStatus('Loading from URL...');
        
        try {
            // Try different methods to bypass CORS
            const response = await this.fetchWithCors(finalUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const text = await response.text();
            
            if (!text.includes('#EXTM3U')) {
                throw new Error('Not a valid M3U file');
            }
            
            this.parseM3U(text);
            this.updateStatus(`Loaded ${this.channels.length} channels from URL`);
            this.hideLoading();
            
        } catch (error) {
            console.error('URL load error:', error);
            
            // Fallback: Try using CORS proxy
            this.updateStatus('Trying CORS proxy...');
            try {
                await this.loadWithCorsProxy(finalUrl);
                this.hideLoading();
            } catch (proxyError) {
                this.updateStatus('Failed to load M3U');
                this.showError(`Failed to load playlist: ${error.message}. Try uploading a file instead.`);
                this.hideLoading();
            }
        }
    }
    
    async fetchWithCors(url) {
        // Try different methods
        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            mode: 'cors',
            cache: 'no-cache'
        };
        
        // Try direct fetch first
        try {
            return await fetch(url, options);
        } catch (error) {
            console.log('Direct fetch failed, trying no-cors...');
            
            // Try no-cors mode
            const noCorsResponse = await fetch(url, { ...options, mode: 'no-cors' });
            if (noCorsResponse.type === 'opaque') {
                // For no-cors, we need to use a proxy
                throw new Error('CORS blocked, using proxy');
            }
            return noCorsResponse;
        }
    }
    
    async loadWithCorsProxy(url) {
        // Use public CORS proxy (be aware of privacy concerns)
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Proxy error: ${response.status}`);
        }
        
        const text = await response.text();
        this.parseM3U(text);
        this.updateStatus(`Loaded ${this.channels.length} channels via proxy`);
    }
    
    parseM3U(m3uContent) {
        this.channels = [];
        const lines = m3uContent.split('\n');
        
        let currentChannel = {};
        let lineCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            lineCount++;
            
            if (line.startsWith('#EXTINF:')) {
                const info = line.substring(8);
                const commaIndex = info.indexOf(',');
                
                if (commaIndex === -1) continue;
                
                const params = info.substring(0, commaIndex);
                const name = info.substring(commaIndex + 1);
                
                currentChannel = {
                    id: lineCount,
                    name: this.cleanChannelName(name),
                    url: '',
                    tvgId: this.extractParam(info, 'tvg-id'),
                    tvgName: this.extractParam(info, 'tvg-name'),
                    tvgLogo: this.extractParam(info, 'tvg-logo'),
                    groupTitle: this.extractParam(info, 'group-title') || 'Ungrouped',
                    duration: this.extractParam(params, ':')
                };
                
            } else if (line && !line.startsWith('#') && currentChannel.name) {
                if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://') || line.startsWith('rtsp://')) {
                    currentChannel.url = line;
                    this.channels.push({...currentChannel});
                } else if (line.startsWith('/') || line.includes('://')) {
                    // Relative path or other protocol
                    currentChannel.url = line;
                    this.channels.push({...currentChannel});
                }
                currentChannel = {};
            }
        }
        
        // Sort channels by group and name
        this.channels.sort((a, b) => {
            if (a.groupTitle === b.groupTitle) {
                return a.name.localeCompare(b.name);
            }
            return a.groupTitle.localeCompare(b.groupTitle);
        });
        
        this.displayChannels();
    }
    
    cleanChannelName(name) {
        // Remove common unwanted characters
        return name
            .replace(/^[\s:|]+/, '')
            .replace(/[\s:|]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    extractParam(text, paramName) {
        if (paramName === ':') {
            const match = text.match(/^(\d+)/);
            return match ? match[1] : '';
        }
        
        const regex = new RegExp(`${paramName}=("[^"]*"|[^\\s]*)`);
        const match = text.match(regex);
        if (match) {
            let value = match[1];
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            return value.trim();
        }
        return '';
    }
    
    displayChannels() {
        this.channelList.innerHTML = '';
        
        if (this.channels.length === 0) {
            this.channelList.innerHTML = `
                <div class="no-channels">
                    <p>No channels loaded</p>
                    <p>Upload an M3U file or enter a URL</p>
                </div>
            `;
            return;
        }
        
        let currentGroup = '';
        
        this.channels.forEach((channel, index) => {
            // Add group header if group changes
            if (channel.groupTitle !== currentGroup) {
                currentGroup = channel.groupTitle;
                const groupHeader = document.createElement('div');
                groupHeader.className = 'channel-group';
                groupHeader.textContent = currentGroup;
                this.channelList.appendChild(groupHeader);
            }
            
            // Create channel item
            const channelElement = document.createElement('div');
            channelElement.className = 'channel-item';
            channelElement.dataset.index = index;
            
            const logo = channel.tvgLogo ? 
                `<img src="${channel.tvgLogo}" alt="${channel.name}" class="channel-logo" onerror="this.style.display='none'">` : 
                '<div class="channel-logo-placeholder">📺</div>';
            
            channelElement.innerHTML = `
                <div class="channel-info">
                    ${logo}
                    <div class="channel-text">
                        <strong class="channel-name">${channel.name}</strong>
                        ${channel.tvgId ? `<small class="channel-id">${channel.tvgId}</small>` : ''}
                    </div>
                </div>
            `;
            
            channelElement.addEventListener('click', () => {
                this.playChannel(channel, index);
            });
            
            this.channelList.appendChild(channelElement);
        });
    }
    
    filterChannels(searchTerm) {
        const items = this.channelList.querySelectorAll('.channel-item, .channel-group');
        const searchLower = searchTerm.toLowerCase();
        
        if (!searchTerm) {
            items.forEach(item => item.style.display = 'block');
            return;
        }
        
        items.forEach(item => {
            if (item.classList.contains('channel-group')) {
                item.style.display = 'none';
            } else {
                const channelName = item.querySelector('.channel-name').textContent.toLowerCase();
                const channelId = item.querySelector('.channel-id')?.textContent.toLowerCase() || '';
                
                if (channelName.includes(searchLower) || channelId.includes(searchLower)) {
                    item.style.display = 'block';
                    
                    // Show parent group
                    let prev = item.previousElementSibling;
                    while (prev && prev.classList.contains('channel-item')) {
                        prev = prev.previousElementSibling;
                    }
                    if (prev && prev.classList.contains('channel-group')) {
                        prev.style.display = 'block';
                    }
                } else {
                    item.style.display = 'none';
                }
            }
        });
    }
    
    playChannel(channel, index) {
        // Update active channel
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const channelElement = document.querySelector(`.channel-item[data-index="${index}"]`);
        if (channelElement) {
            channelElement.classList.add('active');
            channelElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Update current channel info
        this.currentChannel = channel;
        this.currentChannelElement.textContent = channel.name;
        
        // Clear previous source
        this.videoPlayer.src = '';
        this.videoPlayer.load();
        
        // Set new source with timeout
        this.updateStatus(`Loading: ${channel.name}`);
        
        setTimeout(() => {
            try {
                // Check if URL is valid
                if (!channel.url || !channel.url.match(/^https?:\/\//)) {
                    throw new Error('Invalid URL format');
                }
                
                this.videoPlayer.src = channel.url;
                this.videoPlayer.load();
                
                // Try to play
                const playPromise = this.videoPlayer.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log('Auto-play prevented:', error);
                        this.updateStatus('Click play button to start');
                    });
                }
            } catch (error) {
                this.showError(`Cannot play: ${error.message}`);
                this.updateStatus('Playback error');
            }
        }, 100);
    }
    
    updateStatus(message) {
        this.statusElement.textContent = message;
        console.log('Status:', message);
    }
    
    addSampleChannels() {
        // Add some sample channels for testing
        const sampleM3U = `#EXTM3U
#EXTINF:-1 tvg-id="bbc1.uk" tvg-name="BBC One" tvg-logo="https://example.com/bbc1.png" group-title="UK",BBC One
https://example.com/stream1.m3u8
#EXTINF:-1 tvg-id="bbc2.uk" tvg-name="BBC Two" tvg-logo="https://example.com/bbc2.png" group-title="UK",BBC Two
https://example.com/stream2.m3u8
#EXTINF:-1 tvg-id="skynews.uk" tvg-name="Sky News" tvg-logo="https://example.com/sky.png" group-title="News",Sky News
https://example.com/stream3.m3u8`;
        
        // Uncomment to enable sample on startup
        // this.parseM3U(sampleM3U);
    }
}

// Initialize the player
document.addEventListener('DOMContentLoaded', () => {
    window.player = new IPTVPlayer();
});
