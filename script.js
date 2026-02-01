class IPTVPlayerPro {
    constructor() {
        this.currentChannel = null;
        this.hls = null;
        this.channels = [];
        this.categories = [];
        this.favorites = new Set();
        this.history = [];
        this.settings = this.loadSettings();
        this.volume = 50;
        this.isPlaying = false;
        this.autoPlayNext = true;
        
        this.init();
    }
    
    async init() {
        // Hide loading screen after 1.5 seconds
        setTimeout(() => {
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                document.querySelector('.main-container').style.opacity = '1';
            }, 500);
        }, 1500);
        
        // Initialize elements
        this.initElements();
        this.setupEventListeners();
        this.loadDemoData();
        this.updateClock();
        setInterval(() => this.updateClock(), 60000);
        
        // Show login modal on start
        setTimeout(() => {
            this.showLoginModal();
        }, 2000);
    }
    
    initElements() {
        // Player elements
        this.player = document.getElementById('videoPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.volumeControl = document.getElementById('volumeControl');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.volumePopup = document.getElementById('volumePopup');
        this.volumeText = document.getElementById('volumeText');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.progressBar = document.getElementById('progressBar');
        this.currentTimeEl = document.getElementById('currentTime');
        this.totalTimeEl = document.getElementById('totalTime');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        
        // Channel elements
        this.currentChannelName = document.getElementById('currentChannelName');
        this.channelBanner = document.getElementById('channelBanner');
        this.bannerChannelName = document.getElementById('bannerChannelName');
        this.channelNotification = document.getElementById('channelNotification');
        
        // Lists
        this.categoriesList = document.getElementById('categoriesList');
        this.channelsList = document.getElementById('channelsList');
        this.channelsCount = document.getElementById('channelsCount');
        
        // Search
        this.searchInput = document.getElementById('channelSearch');
        this.searchContainer = document.getElementById('searchContainer');
        this.searchToggleBtn = document.getElementById('searchToggleBtn');
        this.clearSearch = document.getElementById('clearSearch');
        
        // Tabs
        this.tabs = document.querySelectorAll('.tab-btn');
        
        // Modals
        this.loginModal = document.getElementById('loginModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeLoginModal = document.getElementById('closeLoginModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        
        // Buttons
        this.connectServerBtn = document.getElementById('connectServerBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.rewindBtn = document.getElementById('rewindBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        
        // EPG
        this.epgTimeline = document.getElementById('epgTimeline');
        this.epgDate = document.getElementById('epgDate');
        
        // Now playing
        this.npChannelName = document.getElementById('npChannelName');
        this.npProgressFill = document.getElementById('npProgressFill');
        
        // Info
        this.infoChannelNumber = document.getElementById('infoChannelNumber');
        this.infoCategory = document.getElementById('infoCategory');
        this.infoLanguage = document.getElementById('infoLanguage');
        this.infoResolution = document.getElementById('infoResolution');
        
        // Server status
        this.serverPing = document.getElementById('serverPing');
        this.serverSpeed = document.getElementById('serverSpeed');
        this.bufferStatus = document.getElementById('bufferStatus');
        this.totalChannels = document.getElementById('totalChannels');
        
        // Settings elements
        this.settingsTabs = document.querySelectorAll('.settings-tab');
        this.settingsPanes = document.querySelectorAll('.settings-pane');
    }
    
    setupEventListeners() {
        // Player events
        this.player.addEventListener('play', () => {
            this.isPlaying = true;
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        });
        
        this.player.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        this.player.addEventListener('timeupdate', () => this.updateProgress());
        this.player.addEventListener('loadedmetadata', () => this.updateDuration());
        
        this.player.addEventListener('volumechange', () => {
            this.volume = this.player.volume * 100;
            this.volumeSlider.value = this.volume;
            this.updateVolumeDisplay();
        });
        
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => {
            if (this.player.paused) {
                this.player.play();
            } else {
                this.player.pause();
            }
        });
        
        // Volume controls
        this.volumeControl.addEventListener('click', () => {
            if (this.player.volume > 0) {
                this.player.volume = 0;
            } else {
                this.player.volume = 0.5;
            }
            this.updateVolumeDisplay();
        });
        
        this.volumeSlider.addEventListener('input', (e) => {
            this.player.volume = e.target.value / 100;
            this.updateVolumeDisplay();
        });
        
        // Progress bar
        this.progressBar.addEventListener('input', (e) => {
            const time = (e.target.value / 100) * this.player.duration;
            this.player.currentTime = time;
        });
        
        // Rewind/Forward
        this.rewindBtn.addEventListener('click', () => {
            this.player.currentTime = Math.max(0, this.player.currentTime - 10);
        });
        
        this.forwardBtn.addEventListener('click', () => {
            this.player.currentTime = Math.min(this.player.duration, this.player.currentTime + 10);
        });
        
        // Fullscreen
        this.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
        
        // Search
        this.searchToggleBtn.addEventListener('click', () => {
            this.searchContainer.style.display = 
                this.searchContainer.style.display === 'none' ? 'block' : 'none';
            if (this.searchContainer.style.display === 'block') {
                this.searchInput.focus();
            }
        });
        
        this.searchInput.addEventListener('input', (e) => {
            this.filterChannels(e.target.value);
        });
        
        this.clearSearch.addEventListener('click', () => {
            this.searchInput.value = '';
            this.filterChannels('');
        });
        
        // Tabs
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // Implement tab switching logic here
            });
        });
        
        // Modals
        this.closeLoginModal.addEventListener('click', () => {
            this.loginModal.style.display = 'none';
        });
        
        this.closeSettingsModal.addEventListener('click', () => {
            this.settingsModal.style.display = 'none';
        });
        
        this.settingsBtn.addEventListener('click', () => {
            this.settingsModal.style.display = 'flex';
        });
        
        this.connectServerBtn.addEventListener('click', () => this.connectToServer());
        
        // Settings tabs
        this.settingsTabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                this.settingsTabs.forEach(t => t.classList.remove('active'));
                this.settingsPanes.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                this.settingsPanes[index].classList.add('active');
            });
        });
        
        // Save settings
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // Refresh
        this.refreshBtn.addEventListener('click', () => location.reload());
        
        // Keyboard shortcuts for TV remote
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateChannels(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateChannels(1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (e.ctrlKey) {
                        this.player.currentTime -= 60;
                    } else {
                        this.player.currentTime -= 10;
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (e.ctrlKey) {
                        this.player.currentTime += 60;
                    } else {
                        this.player.currentTime += 10;
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.currentChannel) {
                        this.playChannel(this.currentChannel);
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    if (this.player.paused) {
                        this.player.play();
                    } else {
                        this.player.pause();
                    }
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.player.volume = Math.min(1, this.player.volume + 0.1);
                    break;
                case '-':
                    e.preventDefault();
                    this.player.volume = Math.max(0, this.player.volume - 0.1);
                    break;
                case 'm':
                    e.preventDefault();
                    this.player.muted = !this.player.muted;
                    break;
                case 'f':
                    e.preventDefault();
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen();
                    } else {
                        document.exitFullscreen();
                    }
                    break;
                case 'Escape':
                    if (this.channelBanner.style.display === 'block') {
                        this.channelBanner.style.display = 'none';
                    }
                    if (this.loginModal.style.display === 'flex') {
                        this.loginModal.style.display = 'none';
                    }
                    if (this.settingsModal.style.display === 'flex') {
                        this.settingsModal.style.display = 'none';
                    }
                    break;
            }
        });
    }
    
    loadDemoData() {
        // Demo categories
        this.categories = [
            { id: 1, name: 'Të gjitha', icon: 'fas fa-globe', count: 150 },
            { id: 2, name: 'Lajme', icon: 'fas fa-newspaper', count: 25 },
            { id: 3, name: 'Sport', icon: 'fas fa-futbol', count: 35 },
            { id: 4, name: 'Filma', icon: 'fas fa-film', count: 20 },
            { id: 5, name: 'Muzikë', icon: 'fas fa-music', count: 15 },
            { id: 6, name: 'Fëmijë', icon: 'fas fa-child', count: 10 },
            { id: 7, name: 'Dokumentar', icon: 'fas fa-camera', count: 15 },
            { id: 8, name: 'Shqiptare', icon: 'fas fa-flag', count: 30 }
        ];
        
        // Demo channels
        this.channels = [];
        const channelNames = [
            'TVSH', 'RTSH 1', 'RTSH 2', 'RTSH 24', 'RTSH Muzikë', 'RTSH Sport',
            'Top Channel', 'Klan TV', 'Vizion Plus', 'Tring Tring', 'Tring Shqip',
            'ABC News', 'Euronews Albania', 'News 24', 'A2 CNN', 'Ora News',
            'Telesport', 'SuperSport 1', 'SuperSport 2', 'Sport 1', 'Sport 2',
            'Film Hits', 'Film Aksion', 'Film Komedi', 'Film Dramë', 'Film Thriller',
            'Music Channel', 'Hit Music', 'Dance Music', 'Rock TV', 'Classic Music',
            'Kidz TV', 'Cartoon Network', 'Baby TV', 'Disney Channel', 'Nickelodeon',
            'Nat Geo', 'Discovery', 'History Channel', 'Animal Planet', 'BBC Earth'
        ];
        
        for (let i = 0; i < channelNames.length; i++) {
            const categoryId = Math.floor(Math.random() * 7) + 2;
            const category = this.categories.find(c => c.id === categoryId)?.name || 'Të gjitha';
            
            this.channels.push({
                id: i + 1,
                name: channelNames[i],
                number: 101 + i,
                category: category,
                quality: i % 3 === 0 ? 'HD' : i % 3 === 1 ? 'FHD' : 'SD',
                language: 'Shqip',
                resolution: i % 3 === 0 ? '1920x1080' : i % 3 === 1 ? '1280x720' : '854x480',
                logo: `https://via.placeholder.com/40x40/4361ee/ffffff?text=${channelNames[i].charAt(0)}`,
                stream_id: 1000 + i,
                is_favorite: Math.random() > 0.7,
                epg: this.generateEPG(channelNames[i])
            });
        }
        
        this.renderCategories();
        this.renderChannels();
        this.channelsCount.textContent = this.channels.length;
        this.totalChannels.textContent = this.channels.length;
    }
    
    renderCategories() {
        this.categoriesList.innerHTML = '';
        this.categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.dataset.id = category.id;
            
            item.innerHTML = `
                <div class="category-name">
                    <div class="category-icon">
                        <i class="${category.icon}"></i>
                    </div>
                    <span>${category.name}</span>
                </div>
                <span class="category-count">${category.count}</span>
            `;
            
            item.addEventListener('click', () => {
                document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.filterByCategory(category.id);
            });
            
            this.categoriesList.appendChild(item);
        });
        
        // Activate first category
        if (this.categories.length > 0) {
            this.categoriesList.firstChild.classList.add('active');
        }
    }
    
    renderChannels(filteredChannels = this.channels) {
        this.channelsList.innerHTML = '';
        this.channelsCount.textContent = filteredChannels.length;
        
        filteredChannels.forEach(channel => {
            const item = document.createElement('div');
            item.className = 'channel-item';
            if (this.currentChannel && this.currentChannel.id === channel.id) {
                item.classList.add('active');
            }
            item.dataset.id = channel.id;
            
            item.innerHTML = `
                <div class="channel-logo">
                    ${channel.logo ? `<img src="${channel.logo}" alt="${channel.name}">` : `<i class="fas fa-tv"></i>`}
                </div>
                <div class="channel-info">
                    <div class="channel-name">${channel.name}</div>
                    <div>
                        <span class="channel-number">${channel.number}</span>
                        <span class="channel-quality ${channel.quality.toLowerCase()}">${channel.quality}</span>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => this.playChannel(channel));
            
            this.channelsList.appendChild(item);
        });
    }
    
    filterByCategory(categoryId) {
        if (categoryId === 1) { // "Të gjitha"
            this.renderChannels();
        } else {
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                const filtered = this.channels.filter(ch => ch.category === category.name);
                this.renderChannels(filtered);
            }
        }
    }
    
    filterChannels(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderChannels();
            return;
        }
        
        const filtered = this.channels.filter(channel =>
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.number.toString().includes(searchTerm)
        );
        this.renderChannels(filtered);
    }
    
    navigateChannels(direction) {
        if (this.channels.length === 0) return;
        
        let currentIndex = 0;
        if (this.currentChannel) {
            currentIndex = this.channels.findIndex(ch => ch.id === this.currentChannel.id);
        }
        
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = this.channels.length - 1;
        if (newIndex >= this.channels.length) newIndex = 0;
        
        const nextChannel = this.channels[newIndex];
        this.playChannel(nextChannel);
    }
    
    async playChannel(channel) {
        if (!channel) return;
        
        // Update current channel
        this.currentChannel = channel;
        
        // Update UI
        this.currentChannelName.textContent = channel.name;
        this.bannerChannelName.textContent = channel.name;
        this.npChannelName.textContent = channel.name;
        
        // Update info panel
        this.infoChannelNumber.textContent = channel.number;
        this.infoCategory.textContent = channel.category;
        this.infoLanguage.textContent = channel.language;
        this.infoResolution.textContent = channel.resolution;
        
        // Highlight active channel
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === channel.id) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        // Show channel banner
        this.showChannelBanner(channel);
        
        // Update EPG
        this.updateEPG(channel);
        
        // Play stream
        await this.playStream(channel);
        
        // Add to history
        this.addToHistory(channel);
    }
    
    async playStream(channel) {
        // Destroy previous HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        // For demo, use test streams
        const testStreams = [
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            'https://test-streams.mux.dev/test_001/stream.m3u8',
            'https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8'
        ];
        
        const streamUrl = testStreams[channel.id % testStreams.length];
        
        if (Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: this.settings.bufferSize,
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
            
            this.hls.loadSource(streamUrl);
            this.hls.attachMedia(this.player);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (this.settings.autoPlay) {
                    this.player.play().catch(e => {
                        console.log('Auto-play prevented:', e);
                    });
                }
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('Network error, trying to recover...');
                            this.hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('Media error, trying to recover...');
                            this.hls.recoverMediaError();
                            break;
                        default:
                            console.log('Fatal error, destroying HLS instance');
                            this.hls.destroy();
                            break;
                    }
                }
            });
            
            this.hls.on(Hls.Events.BUFFER_CREATED, () => {
                this.updateBufferStatus();
            });
        } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
            this.player.src = streamUrl;
            if (this.settings.autoPlay) {
                this.player.play().catch(e => {
                    console.log('Auto-play prevented:', e);
                });
            }
        }
        
        // Simulate server status
        this.updateServerStatus();
    }
    
    showChannelBanner(channel) {
        // Update banner content
        this.bannerChannelName.textContent = channel.name;
        
        // Show banner
        this.channelBanner.style.display = 'block';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            this.channelBanner.style.display = 'none';
        }, 3000);
        
        // Show notification
        this.showNotification(channel);
    }
    
    showNotification(channel) {
        const notification = document.getElementById('channelNotification');
        const notificationChannel = document.getElementById('notificationChannel');
        const notificationProgram = document.getElementById('notificationProgram');
        
        notificationChannel.textContent = channel.name;
        notificationProgram.textContent = channel.epg?.[0]?.title || 'Programi aktual';
        
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    updateEPG(channel) {
        this.epgTimeline.innerHTML = '';
        
        if (!channel.epg || channel.epg.length === 0) {
            this.epgTimeline.innerHTML = `
                <div class="epg-item">
                    <div class="epg-title">Nuk ka informacion EPG</div>
                    <div class="epg-desc">Programi për këtë kanal nuk është i disponueshëm</div>
                </div>
            `;
            return;
        }
        
        channel.epg.forEach(program => {
            const item = document.createElement('div');
            item.className = 'epg-item';
            item.innerHTML = `
                <div class="epg-time">
                    <i class="far fa-clock"></i>
                    ${program.start} - ${program.end}
                </div>
                <div class="epg-title">${program.title}</div>
                <div class="epg-desc">${program.description}</div>
            `;
            this.epgTimeline.appendChild(item);
        });
    }
    
    generateEPG(channelName) {
        const programs = [];
        const now = new Date();
        
        const timeSlots = [
            { start: '06:00', end: '08:00', type: 'mëngjes' },
            { start: '08:00', end: '12:00', type: 'mëngjes' },
            { start: '12:00', end: '14:00', type: 'dreke' },
            { start: '14:00', end: '18:00', type: 'pasdite' },
            { start: '18:00', end: '20:00', type: 'mbrëmje' },
            { start: '20:00', end: '22:00', type: 'prime' },
            { start: '22:00', end: '00:00', type: 'natë' }
        ];
        
        const programTemplates = {
            mëngjes: ['Lajmet e mëngjesit', 'Program për fëmijë', 'Program edukativ', 'Program muzikor'],
            dreke: ['Lajmet e mesditës', 'Talk show', 'Program argëtues', 'Serial'],
            pasdite: ['Film', 'Serial', 'Program sportiv', 'Dokumentar'],
            mbrëmje: ['Lajmet e mbrëmjes', 'Talk show', 'Debat', 'Program aktualitetesh'],
            prime: ['Filma kryesore', 'Seria e veçantë', 'Program special', 'Koncert'],
            natë: ['Lajmet e fundit', 'Film', 'Program muzikor', 'Ripublikim']
        };
        
        timeSlots.forEach(slot => {
            const template = programTemplates[slot.type];
            const randomProgram = template[Math.floor(Math.random() * template.length)];
            
            programs.push({
                title: `${randomProgram} - ${channelName}`,
                start: slot.start,
                end: slot.end,
                description: `Program ${slot.type}i në ${channelName}`
            });
        });
        
        return programs;
    }
    
    updateProgress() {
        if (!this.player.duration) return;
        
        const progress = (this.player.currentTime / this.player.duration) * 100;
        this.progressBar.value = progress;
        
        // Update time display
        this.currentTimeEl.textContent = this.formatTime(this.player.currentTime);
        
        // Update now playing progress
        this.npProgressFill.style.width = `${progress}%`;
        
        // Update EPG progress if needed
        this.updateEPGProgress();
    }
    
    updateDuration() {
        this.totalTimeEl.textContent = this.formatTime(this.player.duration);
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateVolumeDisplay() {
        const volume = Math.round(this.player.volume * 100);
        this.volumeValue.textContent = `${volume}%`;
        this.volumeText.textContent = `${volume}%`;
        
        // Update icon
        if (this.player.volume === 0 || this.player.muted) {
            this.volumeIcon.className = 'fas fa-volume-mute';
        } else if (this.player.volume < 0.5) {
            this.volumeIcon.className = 'fas fa-volume-down';
        } else {
            this.volumeIcon.className = 'fas fa-volume-up';
        }
        
        // Show popup
        this.volumePopup.style.display = 'block';
        setTimeout(() => {
            this.volumePopup.style.display = 'none';
        }, 1000);
    }
    
    updateEPGProgress() {
        // This would update the EPG timeline with current program progress
        // Implementation depends on EPG data structure
    }
    
    updateServerStatus() {
        // Simulate server status updates
        const ping = Math.floor(Math.random() * 50) + 20;
        const speed = Math.floor(Math.random() * 30) + 10;
        const buffer = Math.floor(Math.random() * 20);
        
        this.serverPing.textContent = `${ping}ms`;
        this.serverSpeed.textContent = `${speed} Mbps`;
        this.bufferStatus.textContent = `${buffer}%`;
        
        // Update status colors
        this.serverPing.className = ping < 50 ? 'status-value good' : 'status-value warning';
        this.serverSpeed.className = speed > 15 ? 'status-value good' : 'status-value warning';
        this.bufferStatus.className = buffer < 10 ? 'status-value good' : 'status-value warning';
    }
    
    updateBufferStatus() {
        if (this.hls) {
            const buffer = this.hls.media.buffered;
            if (buffer.length > 0) {
                const bufferedTime = buffer.end(buffer.length - 1) - buffer.start(0);
                const bufferPercent = Math.min(100, (bufferedTime / 10) * 100);
                this.bufferStatus.textContent = `${Math.round(bufferPercent)}%`;
                this.bufferStatus.className = bufferPercent > 50 ? 'status-value good' : 
                                            bufferPercent > 20 ? 'status-value warning' : 'status-value bad';
            }
        }
    }
    
    addToHistory(channel) {
        const historyItem = {
            id: channel.id,
            name: channel.name,
            time: new Date().toISOString()
        };
        
        // Remove if exists
        this.history = this.history.filter(item => item.id !== channel.id);
        
        // Add to beginning
        this.history.unshift(historyItem);
        
        // Keep only last 50 items
        this.history = this.history.slice(0, 50);
        
        // Save to localStorage
        localStorage.setItem('iptv_history', JSON.stringify(this.history));
    }
    
    showLoginModal() {
        this.loginModal.style.display = 'flex';
    }
    
    async connectToServer() {
        const serverUrl = document.getElementById('serverUrl').value;
        const username = document.getElementById('serverUsername').value;
        const password = document.getElementById('serverPassword').value;
        
        if (!serverUrl || !username || !password) {
            alert('Ju lutem plotësoni të gjitha fushat!');
            return;
        }
        
        // Update UI
        document.getElementById('username').textContent = username;
        document.getElementById('connectionStatus').textContent = 'Duke lidhur...';
        
        // Simulate connection
        setTimeout(() => {
            document.getElementById('connectionStatus').innerHTML = 
                '<i class="fas fa-circle"></i> I lidhur';
            document.getElementById('connectionStatus').className = 'status connected';
            this.loginModal.style.display = 'none';
            
            // Auto-play first channel
            if (this.channels.length > 0 && this.settings.autoPlay) {
                setTimeout(() => {
                    this.playChannel(this.channels[0]);
                }, 500);
            }
        }, 1500);
        
        // In real app, you would fetch channels from server here
        // await this.fetchChannelsFromServer(serverUrl, username, password);
    }
    
    loadSettings() {
        const defaultSettings = {
            autoPlay: true,
            bufferSize: 50,
            videoQuality: 'auto',
            rewindTime: 10,
            forwardTime: 10,
            rememberPosition: true,
            theme: 'dark',
            language: 'sq',
            showChannelNumbers: true,
            timeoutDuration: 30,
            autoReconnect: true,
            hardwareAcceleration: true
        };
        
        const saved = localStorage.getItem('iptv_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }
    
    saveSettings() {
        // Get values from form
        this.settings = {
            autoPlay: document.getElementById('autoPlay').checked,
            bufferSize: parseInt(document.getElementById('bufferSize').value),
            videoQuality: document.getElementById('videoQuality').value,
            rewindTime: parseInt(document.getElementById('rewindTime').value),
            forwardTime: parseInt(document.getElementById('forwardTime').value),
            rememberPosition: document.getElementById('rememberPosition').checked,
            theme: document.getElementById('themeSelect').value,
            language: document.getElementById('languageSelect').value,
            showChannelNumbers: document.getElementById('showChannelNumbers').checked,
            timeoutDuration: parseInt(document.getElementById('timeoutDuration').value),
            autoReconnect: document.getElementById('autoReconnect').checked,
            hardwareAcceleration: document.getElementById('hardwareAcceleration').checked
        };
        
        // Save to localStorage
        localStorage.setItem('iptv_settings', JSON.stringify(this.settings));
        
        // Update UI
        document.getElementById('bufferSizeValue').textContent = `${this.settings.bufferSize} MB`;
        
        // Apply settings
        this.applySettings();
        
        // Close modal
        this.settingsModal.style.display = 'none';
        
        // Show confirmation
        this.showNotification({
            name: 'Cilësimet',
            epg: [{ title: 'Cilësimet u ruajtën me sukses' }]
        });
    }
    
    resetSettings() {
        if (confirm('A jeni të sigurt që dëshironi të rivendosni cilësimet në default?')) {
            localStorage.removeItem('iptv_settings');
            this.settings = this.loadSettings();
            this.loadSettingsToForm();
            this.applySettings();
        }
    }
    
    loadSettingsToForm() {
        // Load settings into form
        document.getElementById('autoPlay').checked = this.settings.autoPlay;
        document.getElementById('bufferSize').value = this.settings.bufferSize;
        document.getElementById('bufferSizeValue').textContent = `${this.settings.bufferSize} MB`;
        document.getElementById('videoQuality').value = this.settings.videoQuality;
        document.getElementById('rewindTime').value = this.settings.rewindTime;
        document.getElementById('forwardTime').value = this.settings.forwardTime;
        document.getElementById('rememberPosition').checked = this.settings.rememberPosition;
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('languageSelect').value = this.settings.language;
        document.getElementById('showChannelNumbers').checked = this.settings.showChannelNumbers;
        document.getElementById('timeoutDuration').value = this.settings.timeoutDuration;
        document.getElementById('autoReconnect').checked = this.settings.autoReconnect;
        document.getElementById('hardwareAcceleration').checked = this.settings.hardwareAcceleration;
    }
    
    applySettings() {
        // Apply theme
        document.body.className = `${this.settings.theme}-theme`;
        
        // Apply volume
        this.player.volume = this.volume / 100;
        
        // Apply other settings as needed
        if (this.hls) {
            this.hls.config.backBufferLength = this.settings.bufferSize;
        }
    }
    
    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('sq-AL', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const dateString = now.toLocaleDateString('sq-AL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        this.epgDate.textContent = dateString;
    }
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.player = new IPTVPlayerPro();
});
