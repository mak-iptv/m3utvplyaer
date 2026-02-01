class IptvPlayerPro {
    constructor() {
        this.channels = [];
        this.categories = [];
        this.currentChannel = null;
        this.favorites = new Set();
        this.settings = {
            playerEngine: 'hls',
            defaultQuality: '720',
            autoPlay: true,
            autoNext: false,
            rememberVolume: true
        };
        
        this.hls = null;
        this.isPlaying = false;
        this.startTime = Date.now();
        this.epgData = {};
        this.currentCategory = 'all';
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSettings();
        this.loadFavorites();
        this.updateClock();
        
        // Start clock update
        setInterval(() => this.updateClock(), 1000);
        setInterval(() => this.updateUptime(), 1000);
        
        // Try to load from URL parameters
        this.loadFromUrlParams();
    }
    
    cacheElements() {
        // Video elements
        this.video = document.getElementById('mainVideo');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        
        // Channel info elements
        this.channelNameOverlay = document.getElementById('channelNameOverlay');
        this.programInfoOverlay = document.getElementById('programInfoOverlay');
        this.channelLogoOverlay = document.getElementById('channelLogoOverlay');
        this.channelLogoNow = document.getElementById('channelLogoNow');
        this.nowPlayingChannel = document.getElementById('nowPlayingChannel');
        this.nowPlayingProgram = document.getElementById('nowPlayingProgram');
        
        // Control elements
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevChannelBtn = document.getElementById('prevChannelBtn');
        this.nextChannelBtn = document.getElementById('nextChannelBtn');
        this.rewindBtn = document.getElementById('rewindBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.muteBtn = document.getElementById('muteBtn');
        this.retryStreamBtn = document.getElementById('retryStreamBtn');
        
        // Volume elements
        this.volumeSliderOverlay = document.getElementById('volumeSliderOverlay');
        this.volumeIconOverlay = document.getElementById('volumeIconOverlay');
        
        // Progress elements
        this.seekBar = document.getElementById('seekBar');
        this.currentTimeDisplay = document.getElementById('currentTimeDisplay');
        this.durationDisplay = document.getElementById('durationDisplay');
        
        // Quality selector
        this.qualitySelect = document.getElementById('qualitySelect');
        
        // Connection elements
        this.xtreamServer = document.getElementById('xtreamServer');
        this.xtreamUsername = document.getElementById('xtreamUsername');
        this.xtreamPassword = document.getElementById('xtreamPassword');
        this.connectBtn = document.getElementById('connectBtn');
        this.demoBtn = document.getElementById('demoBtn');
        this.m3uUrl = document.getElementById('m3uUrl');
        this.m3uFile = document.getElementById('m3uFile');
        this.loadM3uBtn = document.getElementById('loadM3uBtn');
        
        // Type buttons
        this.typeBtns = document.querySelectorAll('.type-btn');
        this.connectionForms = document.querySelectorAll('.connection-form');
        
        // Category elements
        this.categoriesList = document.getElementById('categoriesList');
        this.categorySearch = document.getElementById('categorySearch');
        
        // Channel elements
        this.channelsGrid = document.getElementById('channelsGrid');
        this.channelsListView = document.getElementById('channelsListView');
        this.channelsCount = document.getElementById('channelsCount');
        this.channelSearch = document.getElementById('channelSearch');
        this.viewBtns = document.querySelectorAll('.view-btn');
        
        // Status elements
        this.currentSource = document.getElementById('currentSource');
        this.channelsLoaded = document.getElementById('channelsLoaded');
        this.uptime = document.getElementById('uptime');
        this.currentTimeElement = document.getElementById('currentTime');
        
        // Settings elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        
        // Settings form elements
        this.playerEngine = document.getElementById('playerEngine');
        this.defaultQuality = document.getElementById('defaultQuality');
        this.autoPlay = document.getElementById('autoPlay');
        this.autoNext = document.getElementById('autoNext');
        this.rememberVolume = document.getElementById('rememberVolume');
    }
    
    bindEvents() {
        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevChannelBtn.addEventListener('click', () => this.prevChannel());
        this.nextChannelBtn.addEventListener('click', () => this.nextChannel());
        this.rewindBtn.addEventListener('click', () => this.seek(-10));
        this.forwardBtn.addEventListener('click', () => this.seek(30));
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.retryStreamBtn.addEventListener('click', () => this.retryStream());
        
        // Video events
        this.video.addEventListener('play', () => this.onPlay());
        this.video.addEventListener('pause', () => this.onPause());
        this.video.addEventListener('waiting', () => this.onBuffering());
        this.video.addEventListener('playing', () => this.onPlaying());
        this.video.addEventListener('error', (e) => this.onVideoError(e));
        this.video.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        
        // Volume control
        this.volumeSliderOverlay.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.video.volume = volume;
            this.updateVolumeIcon(volume);
            if (this.settings.rememberVolume) {
                localStorage.setItem('playerVolume', volume.toString());
            }
        });
        
        // Progress bar
        this.seekBar.addEventListener('input', (e) => {
            const time = (e.target.value / 100) * this.video.duration;
            this.video.currentTime = time;
        });
        
        // Update progress bar
        this.video.addEventListener('timeupdate', () => {
            if (this.video.duration) {
                const percent = (this.video.currentTime / this.video.duration) * 100;
                this.seekBar.value = percent;
                this.currentTimeDisplay.textContent = this.formatTime(this.video.currentTime);
                this.durationDisplay.textContent = this.formatTime(this.video.duration);
            }
        });
        
        // Quality selector
        this.qualitySelect.addEventListener('change', (e) => {
            this.changeQuality(e.target.value);
        });
        
        // Connection type buttons
        this.typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.switchConnectionType(type);
            });
        });
        
        // Connect button
        this.connectBtn.addEventListener('click', () => this.connectXtream());
        this.demoBtn.addEventListener('click', () => this.loadDemoData());
        this.loadM3uBtn.addEventListener('click', () => this.loadM3u());
        this.m3uFile.addEventListener('change', (e) => this.handleM3uFile(e));
        
        // Search functionality
        this.categorySearch.addEventListener('input', (e) => this.filterCategories(e.target.value));
        this.channelSearch.addEventListener('input', (e) => this.filterChannels(e.target.value));
        
        // View buttons
        this.viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
        
        // Settings
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // Fullscreen
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        
        // EPG
        document.getElementById('epgCurrentTime').addEventListener('click', () => this.showEpg());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'arrowleft':
                    this.seek(-10);
                    break;
                case 'arrowright':
                    this.seek(30);
                    break;
                case 'arrowup':
                    this.changeVolume(10);
                    break;
                case 'arrowdown':
                    this.changeVolume(-10);
                    break;
                case 'f':
                    this.toggleFullscreen();
                    break;
                case 'm':
                    this.toggleMute();
                    break;
                case 'escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        });
    }
    
    // Player Controls
    togglePlayPause() {
        if (this.video.paused) {
            this.video.play();
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            this.video.pause();
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
    
    onPlay() {
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.hideError();
    }
    
    onPause() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    onBuffering() {
        this.showLoading();
    }
    
    onPlaying() {
        this.hideLoading();
    }
    
    onVideoError(e) {
        console.error('Video error:', e);
        this.showError('Gabim në riprodhim të stream-it');
        this.hideLoading();
    }
    
    onLoadedMetadata() {
        const width = this.video.videoWidth;
        const height = this.video.videoHeight;
        document.getElementById('resolutionBadge').textContent = 
            width > 1920 ? '4K' : width > 1280 ? 'FHD' : width > 720 ? 'HD' : 'SD';
    }
    
    prevChannel() {
        if (!this.currentChannel || this.channels.length === 0) return;
        
        const filteredChannels = this.getFilteredChannels();
        const currentIndex = filteredChannels.findIndex(c => c.id === this.currentChannel.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredChannels.length - 1;
        if (filteredChannels[prevIndex]) {
            this.playChannel(filteredChannels[prevIndex]);
        }
    }
    
    nextChannel() {
        if (!this.currentChannel || this.channels.length === 0) return;
        
        const filteredChannels = this.getFilteredChannels();
        const currentIndex = filteredChannels.findIndex(c => c.id === this.currentChannel.id);
        const nextIndex = (currentIndex + 1) % filteredChannels.length;
        if (filteredChannels[nextIndex]) {
            this.playChannel(filteredChannels[nextIndex]);
        }
    }
    
    seek(seconds) {
        if (!this.video.duration) return;
        
        const newTime = this.video.currentTime + seconds;
        this.video.currentTime = Math.max(0, Math.min(newTime, this.video.duration));
    }
    
    toggleMute() {
        this.video.muted = !this.video.muted;
        const icon = this.video.muted ? 'fa-volume-mute' : 'fa-volume-up';
        this.muteBtn.innerHTML = `<i class="fas ${icon}"></i>`;
        this.volumeIconOverlay.className = `fas ${icon}`;
    }
    
    updateVolumeIcon(volume) {
        let icon = 'fa-volume-up';
        if (volume === 0) icon = 'fa-volume-mute';
        else if (volume < 0.5) icon = 'fa-volume-down';
        
        this.volumeIconOverlay.className = `fas ${icon}`;
        if (!this.video.muted) {
            this.muteBtn.innerHTML = `<i class="fas ${icon}"></i>`;
        }
    }
    
    changeVolume(delta) {
        const currentVolume = this.video.volume * 100;
        const newVolume = Math.min(100, Math.max(0, currentVolume + delta));
        this.video.volume = newVolume / 100;
        this.volumeSliderOverlay.value = newVolume;
        this.updateVolumeIcon(newVolume / 100);
        
        if (this.settings.rememberVolume) {
            localStorage.setItem('playerVolume', (newVolume / 100).toString());
        }
    }
    
    retryStream() {
        if (this.currentChannel) {
            this.playChannel(this.currentChannel);
        }
    }
    
    changeQuality(quality) {
        if (this.hls && this.hls.levels) {
            if (quality === 'auto') {
                this.hls.currentLevel = -1;
            } else {
                const level = this.hls.levels.findIndex(l => l.height === parseInt(quality));
                if (level !== -1) {
                    this.hls.currentLevel = level;
                }
            }
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    // Channel Management
    playChannel(channel) {
        if (!channel || !channel.url) {
            this.showError('Ky kanal nuk ka stream të disponueshëm');
            return;
        }
        
        this.currentChannel = channel;
        this.updateChannelUI(channel);
        this.playStream(channel.url);
    }
    
    updateChannelUI(channel) {
        // Update overlay
        this.channelNameOverlay.textContent = channel.name;
        this.programInfoOverlay.textContent = channel.category || 'Live TV';
        
        // Update now playing
        this.nowPlayingChannel.textContent = channel.name;
        this.nowPlayingProgram.textContent = channel.category || 'Programi aktual';
        
        // Update EPG
        this.updateEpgForChannel(channel);
        
        // Update logo
        if (channel.logo) {
            this.channelLogoOverlay.src = channel.logo;
            this.channelLogoNow.src = channel.logo;
            this.channelLogoOverlay.style.display = 'block';
            this.channelLogoNow.style.display = 'block';
        } else {
            this.channelLogoOverlay.style.display = 'none';
            this.channelLogoNow.style.display = 'none';
        }
        
        // Update active channel in grid
        document.querySelectorAll('.channel-card').forEach(card => {
            card.classList.remove('active');
            if (parseInt(card.dataset.id) === channel.id) {
                card.classList.add('active');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
        
        // Update active channel in list
        document.querySelectorAll('.channel-list-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === channel.id) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }
    
    async playStream(url) {
        this.showLoading();
        this.hideError();
        
        // Stop previous stream
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        this.video.pause();
        this.video.src = '';
        
        try {
            if (this.settings.playerEngine === 'hls' && Hls.isSupported()) {
                // Use HLS.js
                this.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                    enableSoftwareAES: true,
                    manifestLoadingTimeOut: 10000,
                    manifestLoadingMaxRetry: 3,
                    levelLoadingTimeOut: 10000,
                    levelLoadingMaxRetry: 3,
                    fragLoadingTimeOut: 10000,
                    fragLoadingMaxRetry: 3
                });
                
                this.hls.loadSource(url);
                this.hls.attachMedia(this.video);
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (this.settings.autoPlay) {
                        this.video.play().catch(e => console.log('Auto-play prevented:', e));
                    }
                    this.hideLoading();
                });
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', data);
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                this.showError('Gabim në rrjet. Duke u rikonektuar...');
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                this.showError('Gabim në media. Duke u riluar...');
                                this.hls.recoverMediaError();
                                break;
                            default:
                                this.hls.destroy();
                                this.showError('Gabim fatal. Ju lutem rifreskoni faqen.');
                                break;
                        }
                    }
                });
                
                this.hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
                    const bitrate = Math.round(data.level.bitrate / 1000);
                    document.getElementById('bitrateBadge').textContent = `${bitrate} kbps`;
                });
            } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                this.video.src = url;
                if (this.settings.autoPlay) {
                    await this.video.play();
                }
                this.hideLoading();
            } else {
                // Try direct play
                this.video.src = url;
                this.video.type = 'application/x-mpegURL';
                if (this.settings.autoPlay) {
                    await this.video.play();
                }
                this.hideLoading();
            }
            
            this.currentSource.textContent = 'Stream aktiv';
        } catch (error) {
            console.error('Stream error:', error);
            this.showError('Nuk mund të ngarkojë stream-in');
            this.hideLoading();
        }
    }
    
    // M3U/Xtream Connection
    switchConnectionType(type) {
        // Update active button
        this.typeBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Show active form
        this.connectionForms.forEach(form => form.classList.remove('active'));
        document.getElementById(`${type}Form`).classList.add('active');
    }
    
    async connectXtream() {
        const server = this.xtreamServer.value.trim();
        const username = this.xtreamUsername.value.trim();
        const password = this.xtreamPassword.value.trim();
        
        if (!server || !username || !password) {
            alert('Ju lutem plotësoni të gjitha fushat!');
            return;
        }
        
        this.showLoading('Duke u lidhur me server...');
        
        try {
            // Clean server URL
            let serverUrl = server;
            if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
                serverUrl = 'http://' + serverUrl;
            }
            serverUrl = serverUrl.replace(/\/$/, '');
            
            // Test with simplified API
            const apiUrl = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
            console.log('API URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'IPTV-Player/1.0',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && Array.isArray(data)) {
                this.processXtreamData(serverUrl, username, password, data);
                this.showSuccess('U lidh me sukses!');
            } else {
                throw new Error('Format i pavlefshëm i të dhënave');
            }
            
        } catch (error) {
            console.error('Xtream connection error:', error);
            
            // Try alternative method
            try {
                await this.connectXtreamAlternative(server, username, password);
            } catch (altError) {
                this.showError('Gabim në lidhje. Provoni:\n1. Kontrolloni kredencialet\n2. Provoni me http:// ose https://\n3. Kontrolloni nëse serveri është online');
                
                // Offer to load demo
                if (confirm('Nuk mund të lidhemi. Dëshironi të ngarkoni të dhëna demo?')) {
                    this.loadDemoData();
                }
            }
        } finally {
            this.hideLoading();
        }
    }
    
    async connectXtreamAlternative(server, username, password) {
        let serverUrl = server;
        if (!serverUrl.includes('://')) {
            serverUrl = 'http://' + serverUrl;
        }
        serverUrl = serverUrl.replace(/\/$/, '');
        
        // Try to get M3U playlist
        const m3uUrl = `${serverUrl}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`;
        
        const response = await fetch(m3uUrl);
        if (!response.ok) {
            throw new Error('Alternative method failed');
        }
        
        const m3uContent = await response.text();
        this.parseM3UContent(m3uContent);
        this.showSuccess('U lidh me sukses (M3U method)!');
    }
    
    processXtreamData(serverUrl, username, password, streams) {
        this.channels = [];
        this.categories = [];
        
        // Create categories map
        const categoryMap = new Map();
        
        streams.forEach((stream, index) => {
            const categoryName = stream.category_name || 'Pa kategori';
            const categoryId = stream.category_id || categoryName;
            
            // Add category if not exists
            if (!categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                    id: categoryId,
                    name: categoryName,
                    count: 0
                });
            }
            
            // Update category count
            const category = categoryMap.get(categoryId);
            category.count++;
            
            // Create channel
            const channel = {
                id: stream.stream_id || index + 1,
                name: stream.name || `Kanal ${index + 1}`,
                category: categoryName,
                category_id: categoryId,
                logo: stream.stream_icon || '',
                url: `${serverUrl}/live/${username}/${password}/${stream.stream_id}.m3u8`,
                epg_channel_id: stream.epg_channel_id || '',
                tvg_id: stream.tvg_id || '',
                tvg_name: stream.tvg_name || '',
                tvg_logo: stream.tvg_logo || ''
            };
            
            this.channels.push(channel);
        });
        
        // Convert map to array
        this.categories = Array.from(categoryMap.values());
        
        // Update UI
        this.updateUIAfterLoad('Xtream Codes');
    }
    
    async loadM3u() {
        const url = this.m3uUrl.value.trim();
        
        if (!url) {
            alert('Ju lutem vendosni një URL M3U!');
            return;
        }
        
        this.showLoading('Duke ngarkuar playlist...');
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'IPTV-Player/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const content = await response.text();
            this.parseM3UContent(content);
            this.showSuccess('Playlist u ngarkua me sukses!');
            
        } catch (error) {
            console.error('M3U load error:', error);
            this.showError('Gabim në ngarkimin e playlist. Kontrolloni URL-në.');
        } finally {
            this.hideLoading();
        }
    }
    
    handleM3uFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.parseM3UContent(e.target.result);
            this.showSuccess('Playlist u ngarkua nga skedari!');
        };
        reader.readAsText(file);
    }
    
    parseM3UContent(content) {
        this.channels = [];
        this.categories = [];
        
        const lines = content.split('\n');
        const categoryMap = new Map();
        let currentChannel = null;
        let channelIndex = 1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Parse EXTINF line
                const extinf = line.substring(8);
                const commaIndex = extinf.lastIndexOf(',');
                
                if (commaIndex !== -1) {
                    const attributesStr = extinf.substring(0, commaIndex);
                    const channelName = extinf.substring(commaIndex + 1);
                    
                    // Parse attributes
                    const attributes = this.parseM3UAttributes(attributesStr);
                    
                    currentChannel = {
                        id: channelIndex++,
                        name: channelName.trim(),
                        category: attributes['group-title'] || 'Pa kategori',
                        logo: attributes['tvg-logo'] || attributes.logo || '',
                        url: '',
                        tvg_id: attributes['tvg-id'] || '',
                        tvg_name: attributes['tvg-name'] || '',
                        epg_channel_id: attributes['tvg-id'] || ''
                    };
                    
                    // Add to category map
                    const categoryName = currentChannel.category;
                    if (!categoryMap.has(categoryName)) {
                        categoryMap.set(categoryName, {
                            id: categoryName,
                            name: categoryName,
                            count: 0
                        });
                    }
                    categoryMap.get(categoryName).count++;
                }
            } else if (line.startsWith('#EXTGRP:')) {
                // Group line
                if (currentChannel) {
                    currentChannel.category = line.substring(8).trim();
                }
            } else if (line && !line.startsWith('#') && currentChannel) {
                // URL line
                currentChannel.url = line;
                this.channels.push({...currentChannel});
                currentChannel = null;
            }
        }
        
        // Convert map to array
        this.categories = Array.from(categoryMap.values());
        
        // Sort categories alphabetically
        this.categories.sort((a, b) => a.name.localeCompare(b.name));
        
        // Sort channels by category then name
        this.channels.sort((a, b) => {
            if (a.category === b.category) {
                return a.name.localeCompare(b.name);
            }
            return a.category.localeCompare(b.category);
        });
        
        // Update UI
        this.updateUIAfterLoad('M3U Playlist');
        
        // Play first channel if autoPlay is enabled
        if (this.channels.length > 0 && this.settings.autoPlay) {
            setTimeout(() => {
                const firstChannel = this.channels[0];
                if (firstChannel.url) {
                    this.playChannel(firstChannel);
                }
            }, 500);
        }
    }
    
    parseM3UAttributes(attributesStr) {
        const attributes = {};
        const regex = /([a-zA-Z0-9\-]+)="([^"]*)"/g;
        let match;
        
        while ((match = regex.exec(attributesStr)) !== null) {
            attributes[match[1]] = match[2];
        }
        
        return attributes;
    }
    
    updateUIAfterLoad(sourceName) {
        // Update source display
        this.currentSource.textContent = sourceName;
        this.channelsLoaded.textContent = this.channels.length;
        this.channelsCount.textContent = this.channels.length;
        
        // Update categories
        this.updateCategories();
        
        // Update channels
        this.updateChannels();
        
        // Save connection info
        this.saveConnectionInfo();
    }
    
    updateCategories() {
        this.categoriesList.innerHTML = '';
        
        // Add "All" category
        const allItem = document.createElement('div');
        allItem.className = 'category-item active';
        allItem.innerHTML = `
            <span class="category-name">Të gjitha</span>
            <span class="category-count">${this.channels.length}</span>
        `;
        allItem.addEventListener('click', () => {
            this.currentCategory = 'all';
            document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
            allItem.classList.add('active');
            this.updateChannels();
        });
        this.categoriesList.appendChild(allItem);
        
        // Add actual categories
        this.categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.innerHTML = `
                <span class="category-name">${category.name}</span>
                <span class="category-count">${category.count}</span>
            `;
            item.addEventListener('click', () => {
                this.currentCategory = category.name;
                document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
                item.classList.add('active');
                this.updateChannels();
            });
            this.categoriesList.appendChild(item);
        });
    }
    
    updateChannels() {
        this.channelsGrid.innerHTML = '';
        this.channelsListView.innerHTML = '';
        
        const filteredChannels = this.getFilteredChannels();
        
        filteredChannels.forEach(channel => {
            // Grid view
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.dataset.id = channel.id;
            
            const logoFallback = channel.name.substring(0, 2).toUpperCase();
            const logoUrl = channel.logo || 
                           channel.tvg_logo || 
                           `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=2196f3&color=fff&size=150`;
            
            card.innerHTML = `
                <div class="channel-logo-card">
                    <img src="${logoUrl}" alt="${channel.name}" 
                         onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(logoFallback)}&background=607d8b&color=fff&size=150';"
                         loading="lazy">
                </div>
                <div class="channel-info-card">
                    <h4>${channel.name}</h4>
                    <p>${channel.category}</p>
                </div>
            `;
            
            card.addEventListener('click', () => this.playChannel(channel));
            this.channelsGrid.appendChild(card);
            
            // List view
            const listItem = document.createElement('div');
            listItem.className = 'channel-list-item';
            listItem.dataset.id = channel.id;
            
            listItem.innerHTML = `
                <div class="channel-logo-list">
                    <img src="${logoUrl}" alt="${channel.name}" 
                         onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(logoFallback)}&background=607d8b&color=fff&size=40';"
                         loading="lazy">
                </div>
                <div>
                    <h4>${channel.name}</h4>
                    <p>${channel.category}</p>
                </div>
            `;
            
            listItem.addEventListener('click', () => this.playChannel(channel));
            this.channelsListView.appendChild(listItem);
        });
    }
    
    getFilteredChannels() {
        let filtered = this.channels;
        
        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(channel => channel.category === this.currentCategory);
        }
        
        // Filter by search
        const searchTerm = this.channelSearch.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(channel => 
                channel.name.toLowerCase().includes(searchTerm) ||
                channel.category.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }
    
    filterCategories(searchTerm) {
        const items = this.categoriesList.querySelectorAll('.category-item');
        items.forEach(item => {
            const name = item.querySelector('.category-name').textContent.toLowerCase();
            if (name.includes(searchTerm.toLowerCase()) || searchTerm === '') {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    filterChannels(searchTerm) {
        const cards = this.channelsGrid.querySelectorAll('.channel-card');
        const listItems = this.channelsListView.querySelectorAll('.channel-list-item');
        
        const filteredChannels = this.getFilteredChannels();
        const filteredIds = new Set(filteredChannels.map(c => c.id));
        
        const updateVisibility = (elements) => {
            elements.forEach(el => {
                const channelId = parseInt(el.dataset.id);
                el.style.display = filteredIds.has(channelId) ? '' : 'none';
            });
        };
        
        updateVisibility(cards);
        updateVisibility(listItems);
    }
    
    switchView(view) {
        this.viewBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        if (view === 'grid') {
            this.channelsGrid.style.display = 'grid';
            this.channelsListView.style.display = 'none';
        } else if (view === 'list') {
            this.channelsGrid.style.display = 'none';
            this.channelsListView.style.display = 'block';
        } else if (view === 'favorites') {
            this.showFavorites();
        }
    }
    
    showFavorites() {
        // Filter channels to show only favorites
        const favoriteChannels = this.channels.filter(channel => this.favorites.has(channel.id));
        
        this.channelsGrid.innerHTML = '';
        favoriteChannels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.dataset.id = channel.id;
            
            const logoFallback = channel.name.substring(0, 2).toUpperCase();
            const logoUrl = channel.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=2196f3&color=fff&size=150`;
            
            card.innerHTML = `
                <div class="channel-logo-card">
                    <img src="${logoUrl}" alt="${channel.name}" 
                         onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(logoFallback)}&background=607d8b&color=fff&size=150';">
                </div>
                <div class="channel-info-card">
                    <h4>${channel.name}</h4>
                    <p>${channel.category} <i class="fas fa-star" style="color: #ffd700; margin-left: 5px;"></i></p>
                </div>
            `;
            
            card.addEventListener('click', () => this.playChannel(channel));
            this.channelsGrid.appendChild(card);
        });
        
        this.channelsGrid.style.display = 'grid';
        this.channelsListView.style.display = 'none';
    }
    
    // EPG Functions
    updateEpgForChannel(channel) {
        const epgTitle = document.getElementById('epgCurrentTitle');
        
        if (channel.epg_channel_id) {
            // Here you would fetch EPG data from your EPG source
            // For now, show placeholder
            epgTitle.textContent = `Programi aktual - ${channel.name}`;
        } else {
            epgTitle.textContent = 'Pa informacion EPG';
        }
    }
    
    showEpg() {
        if (!this.currentChannel) {
            alert('Zgjidhni një kanal për të parë EPG');
            return;
        }
        
        // Create EPG modal
        const epgModal = document.createElement('div');
        epgModal.className = 'modal-overlay';
        epgModal.innerHTML = `
            <div class="modal-container" style="max-width: 900px;">
                <div class="modal-header">
                    <h2><i class="fas fa-tv"></i> EPG - ${this.currentChannel.name}</h2>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="epg-timeline">
                        <div class="epg-now">Tani: ${new Date().toLocaleTimeString()}</div>
                        <div class="epg-programs">
                            <div class="epg-program current">
                                <div class="epg-time">20:00 - 21:00</div>
                                <div class="epg-title">Lajmet e Mbrëmjes</div>
                                <div class="epg-desc">Lajmet e fundit nga vendi dhe bota</div>
                            </div>
                            <div class="epg-program">
                                <div class="epg-time">21:00 - 22:00</div>
                                <div class="epg-title">Filmi i Mbrëmjes</div>
                                <div class="epg-desc">Film dramatik</div>
                            </div>
                            <div class="epg-program">
                                <div class="epg-time">22:00 - 23:00</div>
                                <div class="epg-title">Debat</div>
                                <div class="epg-desc">Debat politik</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(epgModal);
        
        // Add CSS for EPG
        if (!document.querySelector('#epg-styles')) {
            const style = document.createElement('style');
            style.id = 'epg-styles';
            style.textContent = `
                .epg-timeline {
                    padding: 20px;
                }
                .epg-now {
                    background: #2196f3;
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                    font-weight: bold;
                }
                .epg-programs {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .epg-program {
                    background: #2d2d2d;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #404040;
                }
                .epg-program.current {
                    border-left-color: #2196f3;
                    background: #1a1a1a;
                }
                .epg-time {
                    color: #ff4081;
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .epg-title {
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .epg-desc {
                    color: #b0b0b0;
                    font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Utility Functions
    showLoading(message = 'Duke ngarkuar...') {
        this.loadingSpinner.querySelector('p').textContent = message;
        this.loadingSpinner.style.display = 'block';
    }
    
    hideLoading() {
        this.loadingSpinner.style.display = 'none';
    }
    
    showError(message) {
        this.errorMessage.querySelector('h4').textContent = message;
        this.errorMessage.style.display = 'block';
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
    
    showSuccess(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('sq-AL', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.currentTimeElement.textContent = timeString;
    }
    
    updateUptime() {
        const uptimeMs = Date.now() - this.startTime;
        const hours = Math.floor(uptimeMs / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        const seconds = Math.floor((uptimeMs % 60000) / 1000);
        
        this.uptime.textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Settings Management
    showSettings() {
        this.settingsModal.style.display = 'flex';
    }
    
    hideSettings() {
        this.settingsModal.style.display = 'none';
    }
    
    loadSettings() {
        const saved = localStorage.getItem('iptvPlayerSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
        
        // Apply to UI
        this.playerEngine.value = this.settings.playerEngine;
        this.defaultQuality.value = this.settings.defaultQuality;
        this.autoPlay.checked = this.settings.autoPlay;
        this.autoNext.checked = this.settings.autoNext;
        this.rememberVolume.checked = this.settings.rememberVolume;
        
        // Apply volume memory
        if (this.settings.rememberVolume) {
            const savedVolume = localStorage.getItem('playerVolume');
            if (savedVolume) {
                const volume = parseFloat(savedVolume);
                this.video.volume = volume;
                this.volumeSliderOverlay.value = volume * 100;
                this.updateVolumeIcon(volume);
            }
        }
        
        // Load connection info
        this.loadConnectionInfo();
    }
    
    saveConnectionInfo() {
        const connectionInfo = {
            server: this.xtreamServer.value,
            username: this.xtreamUsername.value,
            m3uUrl: this.m3uUrl.value,
            lastLoaded: Date.now()
        };
        
        localStorage.setItem('iptvConnectionInfo', JSON.stringify(connectionInfo));
    }
    
    loadConnectionInfo() {
        const saved = localStorage.getItem('iptvConnectionInfo');
        if (saved) {
            try {
                const info = JSON.parse(saved);
                this.xtreamServer.value = info.server || '';
                this.xtreamUsername.value = info.username || '';
                this.m3uUrl.value = info.m3uUrl || '';
            } catch (e) {
                console.warn('Could not load connection info:', e);
            }
        }
    }
    
    saveSettings() {
        this.settings = {
            playerEngine: this.playerEngine.value,
            defaultQuality: this.defaultQuality.value,
            autoPlay: this.autoPlay.checked,
            autoNext: this.autoNext.checked,
            rememberVolume: this.rememberVolume.checked
        };
        
        localStorage.setItem('iptvPlayerSettings', JSON.stringify(this.settings));
        
        // Save volume
        if (this.settings.rememberVolume) {
            localStorage.setItem('playerVolume', this.video.volume.toString());
        }
        
        this.hideSettings();
        this.showSuccess('Cilësimet u ruajtën!');
    }
    
    resetSettings() {
        if (confirm('Jeni i sigurt që dëshironi të rivendosni cilësimet?')) {
            localStorage.removeItem('iptvPlayerSettings');
            localStorage.removeItem('playerVolume');
            this.settings = {
                playerEngine: 'hls',
                defaultQuality: '720',
                autoPlay: true,
                autoNext: false,
                rememberVolume: true
            };
            
            this.loadSettings();
            this.showSuccess('Cilësimet u rivendosën!');
        }
    }
    
    loadFavorites() {
        const saved = localStorage.getItem('iptvFavorites');
        if (saved) {
            this.favorites = new Set(JSON.parse(saved));
        }
    }
    
    saveFavorites() {
        localStorage.setItem('iptvFavorites', JSON.stringify([...this.favorites]));
    }
    
    loadDemoData() {
        this.channels = [
            { 
                id: 1, 
                name: "RTK 1", 
                category: "Lajme", 
                logo: "https://upload.wikimedia.org/wikipedia/sq/thumb/6/6c/RTK1.svg/512px-RTK1.svg.png",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 2, 
                name: "RTK 2", 
                category: "Argëtim", 
                logo: "https://upload.wikimedia.org/wikipedia/sq/thumb/1/1b/RTK2.svg/512px-RTK2.svg.png",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            }
        ];
        
        this.categories = [
            { id: 'lajme', name: 'Lajme', count: 1 },
            { id: 'argëtim', name: 'Argëtim', count: 1 }
        ];
        
        this.updateUIAfterLoad('Demo Mode');
        this.showSuccess('U ngarkuan të dhëna demo!');
    }
    
    loadFromUrlParams() {
        const params = new URLSearchParams(window.location.search);
        
        const m3uUrl = params.get('m3u');
        const xtream = params.get('xtream');
        
        if (m3uUrl) {
            this.m3uUrl.value = decodeURIComponent(m3uUrl);
            this.switchConnectionType('m3u');
            setTimeout(() => this.loadM3u(), 1000);
        } else if (xtream) {
            const [server, username, password] = decodeURIComponent(xtream).split(':');
            if (server && username && password) {
                this.xtreamServer.value = server;
                this.xtreamUsername.value = username;
                this.xtreamPassword.value = password;
                this.switchConnectionType('xtream');
                setTimeout(() => this.connectXtream(), 1000);
            }
        }
    }
}

// Add toast animation styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(toastStyles);

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.player = new IptvPlayerPro();
});
