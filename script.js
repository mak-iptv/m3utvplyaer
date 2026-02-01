class IPTVPlayer {
    constructor() {
        this.currentChannel = null;
        this.hlsInstance = null;
        this.channels = [];
        this.categories = [];
        this.epgData = {};
        this.history = JSON.parse(localStorage.getItem('iptv_history')) || [];
        this.settings = JSON.parse(localStorage.getItem('iptv_settings')) || {
            autoPlay: true,
            bufferSize: 50,
            quality: 'auto'
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
        this.updateTime();
        setInterval(() => this.updateTime(), 60000);
    }
    
    initializeElements() {
        // Player elements
        this.player = document.getElementById('player');
        this.channelName = document.getElementById('channel-name');
        this.epgInfo = document.getElementById('epg-info');
        this.volumeBtn = document.getElementById('volume-btn');
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeValue = document.getElementById('volume-value');
        this.volumePopup = document.getElementById('volume-popup');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        
        // Login elements
        this.serverInput = document.getElementById('server');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.connectBtn = document.getElementById('connect-btn');
        
        // Navigation elements
        this.navBtns = document.querySelectorAll('.nav-btn');
        this.sections = {
            'login-section': document.getElementById('login-section'),
            'channels-section': document.getElementById('channels-section'),
            'epg-section': document.getElementById('epg-section')
        };
        
        // Channels elements
        this.searchInput = document.getElementById('search-channel');
        this.categoriesDiv = document.getElementById('categories');
        this.channelsList = document.getElementById('channels-list');
        
        // EPG elements
        this.epgContainer = document.getElementById('epg-container');
        
        // Settings elements
        this.settingsModal = document.getElementById('settings-modal');
        this.settingsBtn = document.getElementById('settings-btn');
        this.closeSettingsBtn = document.getElementById('close-settings');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.autoPlayCheckbox = document.getElementById('auto-play');
        this.bufferSizeSlider = document.getElementById('buffer-size');
        this.bufferValue = document.getElementById('buffer-value');
        this.qualitySelect = document.getElementById('quality');
        
        // Loading
        this.loading = document.getElementById('loading');
        
        // Status
        this.status = document.querySelector('.status');
    }
    
    setupEventListeners() {
        // Player controls
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value;
            this.player.volume = volume / 100;
            this.volumeValue.textContent = `${volume}%`;
            
            // Show volume popup
            this.volumePopup.style.display = 'block';
            setTimeout(() => {
                this.volumePopup.style.display = 'none';
            }, 1000);
        });
        
        this.volumeBtn.addEventListener('click', () => {
            if (this.player.volume > 0) {
                this.player.volume = 0;
                this.volumeSlider.value = 0;
                this.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else {
                this.player.volume = 0.5;
                this.volumeSlider.value = 50;
                this.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });
        
        this.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                document.exitFullscreen();
                this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
        });
        
        // Navigation
        this.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                this.switchSection(target);
                
                // Update active state
                this.navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Connect button
        this.connectBtn.addEventListener('click', () => this.connectToServer());
        
        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.filterChannels(e.target.value);
        });
        
        // Settings
        this.settingsBtn.addEventListener('click', () => {
            this.settingsModal.style.display = 'flex';
        });
        
        this.closeSettingsBtn.addEventListener('click', () => {
            this.settingsModal.style.display = 'none';
        });
        
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        
        this.bufferSizeSlider.addEventListener('input', (e) => {
            this.bufferValue.textContent = `${e.target.value}MB`;
        });
        
        // Keyboard shortcuts for Smart TV remote
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
                    this.player.currentTime -= 10;
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.player.currentTime += 10;
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.currentChannel) {
                        this.play(this.currentChannel);
                    }
                    break;
                case 'Backspace':
                case 'Escape':
                    e.preventDefault();
                    if (this.settingsModal.style.display === 'flex') {
                        this.settingsModal.style.display = 'none';
                    }
                    break;
            }
        });
    }
    
    async connectToServer() {
        const server = this.serverInput.value.trim();
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!server || !username || !password) {
            alert('Ju lutem plotësoni të gjitha fushat!');
            return;
        }
        
        this.showLoading();
        this.status.textContent = 'Duke lidhur...';
        this.status.style.background = '#f39c12';
        
        try {
            // Në rastin real, kjo do të ishte një thirrje në serverin tuaj IPTV
            // Për demonstrim, do të përdorim të dhëna testimi
            await this.fetchChannels(server, username, password);
            
            this.status.textContent = 'I lidhur';
            this.status.style.background = '#2ecc71';
            
            this.switchSection('channels-section');
            document.querySelector('[data-target="channels-section"]').classList.add('active');
            
        } catch (error) {
            console.error('Error connecting:', error);
            this.status.textContent = 'Gabim në lidhje';
            this.status.style.background = '#e74c3c';
            alert('Nuk mund të lidhemi me serverin. Kontrolloni konfigurimin.');
        } finally {
            this.hideLoading();
        }
    }
    
    async fetchChannels(server, username, password) {
        // Kjo është një simulim - në realitet do të merrnit të dhëna nga serveri IPTV
        // Për demonstrim, po krijoj kanale testimi
        
        this.categories = ['Të gjitha', 'Lajme', 'Sport', 'Filma', 'Muzikë', 'Fëmijë', 'Dokumentar'];
        this.channels = [];
        
        // Krijo kanale testimi
        const channelNames = [
            'TVSH', 'RTSH 1', 'RTSH 2', 'Top Channel', 'Klan TV', 'Vizion Plus',
            'ABC News', 'Telesport', 'Film Hits', 'Music Channel', 'Kidz TV', 'Nat Geo'
        ];
        
        const categoryMap = {
            0: 'Lajme', 1: 'Lajme', 2: 'Lajme', 3: 'Të gjitha', 4: 'Të gjitha',
            5: 'Të gjitha', 6: 'Lajme', 7: 'Sport', 8: 'Filma', 9: 'Muzikë',
            10: 'Fëmijë', 11: 'Dokumentar'
        };
        
        for (let i = 0; i < channelNames.length; i++) {
            this.channels.push({
                id: i + 1,
                name: channelNames[i],
                number: i + 101,
                category: categoryMap[i],
                stream_id: i + 1000,
                logo: `https://via.placeholder.com/40x40/4cc9f0/ffffff?text=${channelNames[i].charAt(0)}`
            });
        }
        
        // Krijo EPG testimi
        this.epgData = {};
        this.channels.forEach(channel => {
            this.epgData[channel.id] = [
                {
                    title: `Programi kryesor - ${channel.name}`,
                    start: '19:00',
                    end: '20:30',
                    description: 'Programi kryesor i ditës'
                },
                {
                    title: 'Lajmet e mbrëmjes',
                    start: '20:30',
                    end: '21:00',
                    description: 'Përmbledhje e lajmeve të ditës'
                },
                {
                    title: 'Filma/Seria',
                    start: '21:00',
                    end: '22:30',
                    description: 'Filma ose seri televizive'
                }
            ];
        });
        
        this.renderCategories();
        this.renderChannels();
    }
    
    renderCategories() {
        this.categoriesDiv.innerHTML = '';
        this.categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.textContent = category;
            button.dataset.category = category;
            button.addEventListener('click', () => this.filterByCategory(category));
            this.categoriesDiv.appendChild(button);
        });
        
        // Aktivizo kategorinë e parë
        if (this.categories.length > 0) {
            this.categoriesDiv.firstChild.classList.add('active');
        }
    }
    
    renderChannels(filteredChannels = this.channels) {
        this.channelsList.innerHTML = '';
        
        filteredChannels.forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'channel-item';
            channelItem.dataset.id = channel.id;
            
            channelItem.innerHTML = `
                <img src="${channel.logo}" alt="${channel.name}" class="channel-logo" onerror="this.src='https://via.placeholder.com/40x40/333/fff?text=TV'">
                <div class="channel-name">${channel.name}</div>
                <div class="channel-number">${channel.number}</div>
                <div class="now-playing">Live</div>
            `;
            
            channelItem.addEventListener('click', () => this.play(channel));
            this.channelsList.appendChild(channelItem);
        });
    }
    
    filterByCategory(category) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        if (category === 'Të gjitha') {
            this.renderChannels();
        } else {
            const filtered = this.channels.filter(ch => ch.category === category);
            this.renderChannels(filtered);
        }
    }
    
    filterChannels(searchTerm) {
        const filtered = this.channels.filter(channel =>
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.number.toString().includes(searchTerm)
        );
        this.renderChannels(filtered);
    }
    
    navigateChannels(direction) {
        const currentIndex = this.channels.findIndex(ch => ch.id === this.currentChannel?.id);
        if (currentIndex === -1) return;
        
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = this.channels.length - 1;
        if (newIndex >= this.channels.length) newIndex = 0;
        
        const nextChannel = this.channels[newIndex];
        this.play(nextChannel);
    }
    
    play(channel) {
        if (!channel) return;
        
        this.currentChannel = channel;
        this.channelName.textContent = channel.name;
        
        // Ndrysho kanalin aktiv në listë
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === channel.id) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        // Shto në historik
        this.addToHistory(channel);
        
        // Shfaq EPG për kanalin aktual
        this.showEPG(channel.id);
        
        // Start video
        this.startVideo(channel);
    }
    
    startVideo(channel) {
        // Për demonstrim, përdorim një stream testimi
        // Në rastin real, do të përdorni URL-në nga serveri juaj
        const testStreams = [
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            'https://test-streams.mux.dev/test_001/stream.m3u8',
            'https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8'
        ];
        
        const streamUrl = testStreams[channel.id % testStreams.length];
        
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }
        
        if (Hls.isSupported()) {
            this.hlsInstance = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: this.settings.bufferSize,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 3,
                levelLoadingTimeOut: 10000,
                levelLoadingMaxRetry: 3,
                fragLoadingTimeOut: 10000,
                fragLoadingMaxRetry: 3
            });
            
            this.hlsInstance.loadSource(streamUrl);
            this.hlsInstance.attachMedia(this.player);
            
            this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                if (this.settings.autoPlay) {
                    this.player.play().catch(e => console.log('Auto-play prevented:', e));
                }
            });
            
            this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('Network error, trying to recover...');
                            this.hlsInstance.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('Media error, trying to recover...');
                            this.hlsInstance.recoverMediaError();
                            break;
                        default:
                            console.log('Fatal error, destroying HLS instance');
                            this.hlsInstance.destroy();
                            break;
                    }
                }
            });
        } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
            this.player.src = streamUrl;
            if (this.settings.autoPlay) {
                this.player.play().catch(e => console.log('Auto-play prevented:', e));
            }
        }
    }
    
    addToHistory(channel) {
        const historyItem = {
            id: channel.id,
            name: channel.name,
            timestamp: new Date().toISOString()
        };
        
        // Hiq nëse ekziston
        this.history = this.history.filter(item => item.id !== channel.id);
        
        // Shto në fillim
        this.history.unshift(historyItem);
        
        // Mbaj vetëm 20 të fundit
        this.history = this.history.slice(0, 20);
        
        localStorage.setItem('iptv_history', JSON.stringify(this.history));
    }
    
    showEPG(channelId) {
        const epg = this.epgData[channelId] || [];
        this.epgContainer.innerHTML = '';
        
        if (epg.length === 0) {
            this.epgContainer.innerHTML = '<p class="no-epg">Nuk ka informacion EPG për këtë kanal</p>';
            this.epgInfo.textContent = 'Nuk ka informacion EPG';
            return;
        }
        
        epg.forEach(program => {
            const epgItem = document.createElement('div');
            epgItem.className = 'epg-item';
            epgItem.innerHTML = `
                <div class="epg-time">${program.start} - ${program.end}</div>
                <div class="epg-title">${program.title}</div>
                <div class="epg-desc">${program.description}</div>
            `;
            this.epgContainer.appendChild(epgItem);
        });
        
        // Shfaq programin aktual në player overlay
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const currentProgram = epg.find(p => currentTime >= p.start && currentTime <= p.end);
        
        if (currentProgram) {
            this.epgInfo.textContent = `${currentProgram.title} (${currentProgram.start}-${currentProgram.end})`;
        } else {
            this.epgInfo.textContent = 'Nuk ka program të drejtpërdrejtë';
        }
    }
    
    switchSection(sectionId) {
        // Fshi të gjitha seksionet
        Object.values(this.sections).forEach(section => {
            if (section) section.style.display = 'none';
        });
        
        // Shfaq seksionin e zgjedhur
        if (this.sections[sectionId]) {
            this.sections[sectionId].style.display = 'block';
        }
    }
    
    loadSettings() {
        this.autoPlayCheckbox.checked = this.settings.autoPlay;
        this.bufferSizeSlider.value = this.settings.bufferSize;
        this.bufferValue.textContent = `${this.settings.bufferSize}MB`;
        this.qualitySelect.value = this.settings.quality;
    }
    
    saveSettings() {
        this.settings = {
            autoPlay: this.autoPlayCheckbox.checked,
            bufferSize: parseInt(this.bufferSizeSlider.value),
            quality: this.qualitySelect.value
        };
        
        localStorage.setItem('iptv_settings', JSON.stringify(this.settings));
        this.settingsModal.style.display = 'none';
        alert('Cilësimet u ruajtën me sukses!');
    }
    
    showLoading() {
        this.loading.style.display = 'flex';
    }
    
    hideLoading() {
        this.loading.style.display = 'none';
    }
    
    updateTime() {
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
        
        document.getElementById('current-time').textContent = 
            `${dateString} | ${timeString}`;
    }
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.iptvPlayer = new IPTVPlayer();
});
