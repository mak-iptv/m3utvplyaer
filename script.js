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
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSettings();
        this.loadFavorites();
        this.updateClock();
        this.loadDemoData();
        
        // Start clock update
        setInterval(() => this.updateClock(), 1000);
        setInterval(() => this.updateUptime(), 1000);
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
            `${width}x${height}`;
    }
    
    prevChannel() {
        if (!this.currentChannel || this.channels.length === 0) return;
        
        const currentIndex = this.channels.findIndex(c => c.id === this.currentChannel.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.channels.length - 1;
        this.playChannel(this.channels[prevIndex]);
    }
    
    nextChannel() {
        if (!this.currentChannel || this.channels.length === 0) return;
        
        const currentIndex = this.channels.findIndex(c => c.id === this.currentChannel.id);
        const nextIndex = (currentIndex + 1) % this.channels.length;
        this.playChannel(this.channels[nextIndex]);
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
            }
        });
        
        // Update active channel in list
        document.querySelectorAll('.channel-list-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === channel.id) {
                item.classList.add('active');
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
                    backBufferLength: 90
                });
                
                this.hls.loadSource(url);
                this.hls.attachMedia(this.video);
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (this.settings.autoPlay) {
                        this.video.play();
                    }
                    this.hideLoading();
                });
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', data);
                    if (data.fatal) {
                        this.showError('Gabim fatal në stream');
                    }
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
    
    // UI Updates
    showLoading() {
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
    
    // Connection Management
    switchConnectionType(type) {
        // Update active button
        this.typeBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Show active form
        this.connectionForms.forEach(form => form.classList.remove('active'));
        document.getElementById(`${type}Form`).classList.add('active');
    }
    
    connectXtream() {
        const server = this.xtreamServer.value.trim();
        const username = this.xtreamUsername.value.trim();
        const password = this.xtreamPassword.value.trim();
        
        if (!server || !username || !password) {
            alert('Ju lutem plotësoni të gjitha fushat!');
            return;
        }
        
        // Simulate connection (replace with actual API call)
        setTimeout(() => {
            this.loadDemoData(); // For now, load demo data
            alert('U lidh me sukses! (Demo Mode)');
        }, 1500);
    }
    
    // Data Loading
    loadDemoData() {
        this.categories = [
            { id: 1, name: "Lajme", count: 15 },
            { id: 2, name: "Sport", count: 8 },
            { id: 3, name: "Filma", count: 12 },
            { id: 4, name: "Muzikë", count: 6 },
            { id: 5, name: "Dokumentarë", count: 7 },
            { id: 6, name: "Fëmijë", count: 5 },
            { id: 7, name: "Informativ", count: 9 },
            { id: 8, name: "Argëtim", count: 11 }
        ];
        
        this.channels = [
            { 
                id: 1, 
                name: "RTK 1", 
                category: "Lajme", 
                logo: "https://via.placeholder.com/150/2196f3/ffffff?text=RTK1",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 2, 
                name: "RTK 2", 
                category: "Argëtim", 
                logo: "https://via.placeholder.com/150/ff4081/ffffff?text=RTK2",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 3, 
                name: "Klan Kosova", 
                category: "Lajme", 
                logo: "https://via.placeholder.com/150/4caf50/ffffff?text=KLN",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 4, 
                name: "RTV21", 
                category: "Lajme", 
                logo: "https://via.placeholder.com/150/ff9800/ffffff?text=RTV21",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 5, 
                name: "Artmotion", 
                category: "Muzikë", 
                logo: "https://via.placeholder.com/150/9c27b0/ffffff?text=ART",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 6, 
                name: "Discovery", 
                category: "Dokumentarë", 
                logo: "https://via.placeholder.com/150/00bcd4/ffffff?text=DS",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 7, 
                name: "National Geographic", 
                category: "Dokumentarë", 
                logo: "https://via.placeholder.com/150/ff5722/ffffff?text=NG",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            },
            { 
                id: 8, 
                name: "EuroSport", 
                category: "Sport", 
                logo: "https://via.placeholder.com/150/3f51b5/ffffff?text=ES",
                url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            }
        ];
        
        // Add more demo channels
        for (let i = 9; i <= 30; i++) {
            const category = this.categories[Math.floor(Math.random() * this.categories.length)];
            this.channels.push({
                id: i,
                name: `Kanal ${i}`,
                category: category.name,
                logo: `https://via.placeholder.com/150/607d8b/ffffff?text=K${i}`,
                url: i <= 15 ? "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" : ""
            });
        }
        
        this.updateCategories();
        this.updateChannels();
        this.currentSource.textContent = 'Demo Mode';
        this.channelsLoaded.textContent = this.channels.length;
        this.channelsCount.textContent = this.channels.length;
    }
    
    updateCategories() {
        this.categoriesList.innerHTML = '';
        
        const allItem = document.createElement('div');
        allItem.className = 'category-item active';
        allItem.innerHTML = `
            <span class="category-name">Të gjitha</span>
            <span class="category-count">${this.channels.length}</span>
        `;
        allItem.addEventListener('click', () => {
            document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
            allItem.classList.add('active');
            this.updateChannels();
        });
        this.categoriesList.appendChild(allItem);
        
        this.categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.innerHTML = `
                <span class="category-name">${category.name}</span>
                <span class="category-count">${category.count}</span>
            `;
            item.addEventListener('click', () => {
                document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
                item.classList.add('active');
                this.filterChannelsByCategory(category.name);
            });
            this.categoriesList.appendChild(item);
        });
    }
    
    updateChannels() {
        this.channelsGrid.innerHTML = '';
        this.channelsListView.innerHTML = '';
        
        this.channels.forEach(channel => {
            // Grid view
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.dataset.id = channel.id;
            
            card.innerHTML = `
                <div class="channel-logo-card">
                    ${channel.logo ? 
                        `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\"logo-fallback\">${channel.name.substring(0,2)}</div>'">` :
                        `<div class="logo-fallback">${channel.name.substring(0,2)}</div>`
                    }
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
                    ${channel.logo ? 
                        `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<div>${channel.name.substring(0,2)}</div>'">` :
                        `<div>${channel.name.substring(0,2)}</div>`
                    }
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
        
        const filter = (elements) => {
            elements.forEach(el => {
                const name = el.querySelector('h4').textContent.toLowerCase();
                const category = el.querySelector('p')?.textContent.toLowerCase() || '';
                
                if (name.includes(searchTerm.toLowerCase()) || 
                    category.includes(searchTerm.toLowerCase()) || 
                    searchTerm === '') {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            });
        };
        
        filter(cards);
        filter(listItems);
    }
    
    filterChannelsByCategory(categoryName) {
        const cards = this.channelsGrid.querySelectorAll('.channel-card');
        const listItems = this.channelsListView.querySelectorAll('.channel-list-item');
        
        const filter = (elements) => {
            elements.forEach(el => {
                const category = el.querySelector('p')?.textContent || '';
                if (categoryName === 'Të gjitha' || category === categoryName) {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            });
        };
        
        filter(cards);
        filter(listItems);
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
            // Show favorites (to be implemented)
            this.channelsGrid.style.display = 'grid';
            this.channelsListView.style.display = 'none';
        }
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
        alert('Cilësimet u ruajtën!');
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
            alert('Cilësimet u rivendosën!');
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
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.player = new IptvPlayerPro();
});
