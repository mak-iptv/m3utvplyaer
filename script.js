class IPTVProviderPlayer {
    constructor() {
        this.config = {
            apiBase: '',
            username: '',
            password: '',
            token: '',
            expiration: ''
        };
        
        this.data = {
            liveCategories: [],
            liveStreams: [],
            vodCategories: [],
            vodStreams: [],
            seriesCategories: [],
            seriesStreams: [],
            epg: {}
        };
        
        this.state = {
            currentType: 'live',
            currentCategory: null,
            currentChannel: null,
            currentStream: null,
            favorites: JSON.parse(localStorage.getItem('iptv_favorites')) || [],
            history: JSON.parse(localStorage.getItem('iptv_history')) || [],
            settings: this.loadSettings(),
            isConnected: false,
            isLoading: false,
            hls: null,
            volume: 0.5
        };
        
        this.init();
    }
    
    async init() {
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
                document.querySelector('.main-container').style.opacity = '1';
            }, 500);
        }, 1000);
        
        this.initElements();
        this.setupEventListeners();
        this.loadSavedCredentials();
        this.updateClock();
        setInterval(() => this.updateClock(), 60000);
    }
    
    initElements() {
        // Login elements
        this.serverUrlInput = document.getElementById('server_url');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.connectBtn = document.getElementById('connectBtn');
        this.testConnectionBtn = document.getElementById('testConnectionBtn');
        this.loadFromStorageBtn = document.getElementById('loadFromStorage');
        this.connectionStatus = document.getElementById('connectionStatus');
        
        // Containers
        this.loginContainer = document.getElementById('loginContainer');
        this.channelsContainer = document.getElementById('channelsContainer');
        
        // User info
        this.displayUsername = document.getElementById('displayUsername');
        this.displayServerUrl = document.getElementById('displayServerUrl');
        
        // Buttons
        this.logoutBtn = document.getElementById('logoutBtn');
        this.refreshDataBtn = document.getElementById('refreshDataBtn');
        
        // Tabs
        this.tabBtns = document.querySelectorAll('.tab-btn');
        
        // Search
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        
        // Lists
        this.categoriesList = document.getElementById('categoriesList');
        this.channelsList = document.getElementById('channelsList');
        this.categoriesCount = document.getElementById('categoriesCount');
        this.channelsCount = document.getElementById('channelsCount');
        this.totalChannels = document.getElementById('totalChannels');
        
        // Player elements
        this.player = document.getElementById('videoPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.rewind10Btn = document.getElementById('rewind10Btn');
        this.forward10Btn = document.getElementById('forward10Btn');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumePopup = document.getElementById('volumePopup');
        this.volumeText = document.getElementById('volumeText');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.playerSettingsBtn = document.getElementById('playerSettingsBtn');
        this.progressBar = document.getElementById('progressBar');
        this.currentTimeEl = document.getElementById('currentTime');
        this.totalTimeEl = document.getElementById('totalTime');
        
        // Channel info
        this.channelNameOverlay = document.getElementById('channelNameOverlay');
        this.programInfoOverlay = document.getElementById('programInfoOverlay');
        this.channelLogoOverlay = document.getElementById('channelLogoOverlay');
        
        // Now playing
        this.npChannelName = document.getElementById('npChannelName');
        this.npProgramName = document.getElementById('npProgramName');
        this.npChannelLogo = document.getElementById('npChannelLogo');
        this.npChannelLogoIcon = document.getElementById('npChannelLogoIcon');
        this.npProgressFill = document.getElementById('npProgressFill');
        this.npCurrentTime = document.getElementById('npCurrentTime');
        this.npEndTime = document.getElementById('npEndTime');
        
        // Info panel
        this.infoCategory = document.getElementById('infoCategory');
        this.infoChannelNumber = document.getElementById('infoChannelNumber');
        this.infoQuality = document.getElementById('infoQuality');
        this.infoLanguage = document.getElementById('infoLanguage');
        
        // Favorites
        this.favoritesList = document.getElementById('favoritesList');
        this.clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
        
        // Server status
        this.serverStatus = document.getElementById('serverStatus');
        this.bufferStatus = document.getElementById('bufferStatus');
        this.serverTime = document.getElementById('serverTime');
        
        // EPG
        this.epgDate = document.getElementById('epgDate');
        this.epgTimeline = document.getElementById('epgTimeline');
        this.prevDayBtn = document.getElementById('prevDayBtn');
        this.nextDayBtn = document.getElementById('nextDayBtn');
        
        // Modals
        this.settingsModal = document.getElementById('settingsModal');
        this.epgDetailModal = document.getElementById('epgDetailModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.closeEpgModal = document.getElementById('closeEpgModal');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        
        // Notification
        this.channelNotification = document.getElementById('channelNotification');
        this.notificationChannelName = document.getElementById('notificationChannelName');
        this.notificationProgram = document.getElementById('notificationProgram');
    }
    
    setupEventListeners() {
        // Login events
        this.connectBtn.addEventListener('click', () => this.connectToProvider());
        this.testConnectionBtn.addEventListener('click', () => this.testConnection());
        this.loadFromStorageBtn.addEventListener('click', () => this.loadFromStorage());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.refreshDataBtn.addEventListener('click', () => this.refreshData());
        
        // Tab events
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.currentType = btn.dataset.type;
                this.loadContentForType(this.state.currentType);
            });
        });
        
        // Search events
        this.searchInput.addEventListener('input', (e) => this.filterChannels(e.target.value));
        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.filterChannels('');
        });
        
        // Player events
        this.player.addEventListener('play', () => {
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        });
        
        this.player.addEventListener('pause', () => {
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        this.player.addEventListener('timeupdate', () => this.updateProgress());
        this.player.addEventListener('loadedmetadata', () => this.updateDuration());
        
        this.player.addEventListener('volumechange', () => {
            this.state.volume = this.player.volume;
            this.volumeSlider.value = this.state.volume * 100;
            this.updateVolumeDisplay();
        });
        
        this.player.addEventListener('waiting', () => {
            this.showToast('Buffering...', 'info');
        });
        
        this.player.addEventListener('playing', () => {
            this.updateBufferStatus();
        });
        
        // Player control buttons
        this.playPauseBtn.addEventListener('click', () => {
            if (this.player.paused) {
                this.player.play();
            } else {
                this.player.pause();
            }
        });
        
        this.rewind10Btn.addEventListener('click', () => {
            this.player.currentTime = Math.max(0, this.player.currentTime - 10);
        });
        
        this.forward10Btn.addEventListener('click', () => {
            this.player.currentTime = Math.min(this.player.duration, this.player.currentTime + 10);
        });
        
        this.volumeBtn.addEventListener('click', () => {
            if (this.player.volume > 0) {
                this.player.volume = 0;
                this.player.muted = true;
            } else {
                this.player.volume = this.state.volume;
                this.player.muted = false;
            }
            this.updateVolumeDisplay();
        });
        
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.player.volume = volume;
            this.player.muted = volume === 0;
            this.state.volume = volume;
            this.updateVolumeDisplay();
        });
        
        this.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
        
        this.playerSettingsBtn.addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // Progress bar
        this.progressBar.addEventListener('input', (e) => {
            if (this.player.duration) {
                const time = (e.target.value / 100) * this.player.duration;
                this.player.currentTime = time;
            }
        });
        
        // Favorites
        this.clearFavoritesBtn.addEventListener('click', () => {
            if (confirm('A jeni të sigurt që dëshironi të fshini të gjitha të preferuarat?')) {
                this.state.favorites = [];
                localStorage.setItem('iptv_favorites', JSON.stringify(this.state.favorites));
                this.renderFavorites();
                this.showToast('Të preferuarat u fshinë', 'success');
            }
        });
        
        // EPG navigation
        this.prevDayBtn.addEventListener('click', () => this.navigateEPG(-1));
        this.nextDayBtn.addEventListener('click', () => this.navigateEPG(1));
        
        // Settings modal
        this.closeSettingsModal.addEventListener('click', () => {
            this.settingsModal.style.display = 'none';
        });
        
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        
        // EPG modal
        this.closeEpgModal.addEventListener('click', () => {
            this.epgDetailModal.style.display = 'none';
        });
        
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
                    if (this.state.currentChannel) {
                        this.playChannel(this.state.currentChannel);
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
                    this.state.volume = this.player.volume;
                    break;
                case '-':
                    e.preventDefault();
                    this.player.volume = Math.max(0, this.player.volume - 0.1);
                    this.state.volume = this.player.volume;
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
                    e.preventDefault();
                    if (this.settingsModal.style.display === 'flex') {
                        this.settingsModal.style.display = 'none';
                    }
                    if (this.epgDetailModal.style.display === 'flex') {
                        this.epgDetailModal.style.display = 'none';
                    }
                    break;
                case '0':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.showSettingsModal();
                    }
                    break;
            }
        });
    }
    
    async connectToProvider() {
        const serverUrl = this.serverUrlInput.value.trim();
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!serverUrl || !username || !password) {
            this.showToast('Ju lutem plotësoni të gjitha fushat!', 'error');
            return;
        }
        
        // Validate URL format
        if (!serverUrl.startsWith('http')) {
            this.showToast('URL duhet të fillojë me http:// ose https://', 'error');
            return;
        }
        
        this.showLoading(true);
        this.updateConnectionStatus('connecting', 'Duke lidhur...');
        
        try {
            // Test connection first
            const isValid = await this.testProviderConnection(serverUrl, username, password);
            
            if (!isValid) {
                throw new Error('Provider nuk është valid ose kredencialet janë gabim');
            }
            
            // Save credentials
            this.config.apiBase = serverUrl.replace(/\/$/, '');
            this.config.username = username;
            this.config.password = password;
            
            // Save to localStorage if remember is checked
            if (document.getElementById('remember').checked) {
                this.saveCredentials();
            }
            
            // Get authentication token
            await this.authenticate();
            
            // Load all data
            await this.loadAllData();
            
            // Update UI
            this.displayUsername.textContent = username;
            this.displayServerUrl.textContent = new URL(serverUrl).hostname;
            
            // Switch to channels view
            this.loginContainer.style.display = 'none';
            this.channelsContainer.style.display = 'flex';
            
            // Update connection status
            this.updateConnectionStatus('connected', 'I lidhur');
            this.state.isConnected = true;
            
            this.showToast('U lidhë me sukses me provider!', 'success');
            
            // Auto-select first category and channel if auto-play is enabled
            if (this.state.settings.autoPlay && this.data.liveCategories.length > 0) {
                setTimeout(() => {
                    this.selectCategory(this.data.liveCategories[0].category_id);
                    if (this.data.liveStreams.length > 0) {
                        setTimeout(() => {
                            this.playChannel(this.data.liveStreams[0]);
                        }, 500);
                    }
                }, 1000);
            }
            
        } catch (error) {
            console.error('Connection error:', error);
            this.showToast(`Gabim në lidhje: ${error.message}`, 'error');
            this.updateConnectionStatus('disconnected', 'Gabim në lidhje');
        } finally {
            this.showLoading(false);
        }
    }
    
    async testConnection() {
        const serverUrl = this.serverUrlInput.value.trim();
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!serverUrl || !username || !password) {
            this.showToast('Ju lutem plotësoni të gjitha fushat!', 'error');
            return;
        }
        
        this.showLoading(true);
        this.updateConnectionStatus('connecting', 'Duke testuar lidhjen...');
        
        try {
            const isValid = await this.testProviderConnection(serverUrl, username, password);
            
            if (isValid) {
                this.showToast('Lidhja u testua me sukses!', 'success');
                this.updateConnectionStatus('connected', 'Lidhja OK');
            } else {
                throw new Error('Provider nuk është valid');
            }
        } catch (error) {
            this.showToast(`Testimi dështoi: ${error.message}`, 'error');
            this.updateConnectionStatus('disconnected', 'Testimi dështoi');
        } finally {
            this.showLoading(false);
        }
    }
    
    async testProviderConnection(serverUrl, username, password) {
        try {
            // Clean server URL
            const baseUrl = serverUrl.replace(/\/$/, '');
            
            // Test with simple API call
            const testUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
            
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'IPTV-Player/1.0'
                },
                timeout: 10000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if response is valid
            if (data && (Array.isArray(data) || data.categories)) {
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Test connection error:', error);
            return false;
        }
    }
    
    async authenticate() {
        try {
            const authUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}`;
            
            const response = await fetch(authUrl);
            
            if (!response.ok) {
                throw new Error(`Authentication failed: HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.user_info && data.user_info.auth === 1) {
                this.config.token = data.user_info.token || '';
                this.config.expiration = data.user_info.exp_date || '';
                
                // Update server info
                this.totalChannels.textContent = data.user_info.active_cons || '1';
                this.serverStatus.textContent = 'I lidhur';
                this.serverStatus.className = 'status-value connected';
                
                return true;
            } else {
                throw new Error('Authentication failed: Invalid credentials');
            }
            
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }
    
    async loadAllData() {
        this.showLoading(true);
        
        try {
            // Load data based on current type
            switch(this.state.currentType) {
                case 'live':
                    await this.loadLiveData();
                    break;
                case 'movies':
                    await this.loadVODData();
                    break;
                case 'series':
                    await this.loadSeriesData();
                    break;
            }
            
            // Load EPG if enabled
            if (this.state.settings.loadEPG) {
                await this.loadEPG();
            }
            
            this.showToast('Të dhënat u ngarkuan me sukses!', 'success');
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast(`Gabim në ngarkimin e të dhënave: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadLiveData() {
        try {
            // Load live categories
            const categoriesUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=get_live_categories`;
            
            const categoriesResponse = await fetch(categoriesUrl);
            const categoriesData = await categoriesResponse.json();
            
            this.data.liveCategories = Array.isArray(categoriesData) ? categoriesData : (categoriesData.categories || []);
            
            // Load live streams
            const streamsUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=get_live_streams`;
            
            const streamsResponse = await fetch(streamsUrl);
            const streamsData = await streamsResponse.json();
            
            this.data.liveStreams = Array.isArray(streamsData) ? streamsData : (streamsData.streams || []);
            
            // Process streams
            this.data.liveStreams = this.data.liveStreams.map((stream, index) => ({
                ...stream,
                stream_id: stream.stream_id || stream.id,
                name: stream.name || stream.title,
                category_id: stream.category_id || stream.cat_id,
                number: stream.num || (index + 101),
                logo: stream.stream_icon || stream.logo,
                quality: this.detectQuality(stream.name),
                language: this.detectLanguage(stream.name)
            }));
            
            // Group streams by category
            this.groupStreamsByCategory();
            
            // Render categories
            this.renderCategories();
            
            // Update counters
            this.categoriesCount.textContent = this.data.liveCategories.length;
            this.channelsCount.textContent = this.data.liveStreams.length;
            
        } catch (error) {
            console.error('Error loading live data:', error);
            throw error;
        }
    }
    
    async loadVODData() {
        try {
            // Load VOD categories
            const categoriesUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=get_vod_categories`;
            
            const categoriesResponse = await fetch(categoriesUrl);
            const categoriesData = await categoriesResponse.json();
            
            this.data.vodCategories = Array.isArray(categoriesData) ? categoriesData : (categoriesData.categories || []);
            
            // Load VOD streams
            const streamsUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=get_vod_streams`;
            
            const streamsResponse = await fetch(streamsUrl);
            const streamsData = await streamsResponse.json();
            
            this.data.vodStreams = Array.isArray(streamsData) ? streamsData : (streamsData.streams || []);
            
            // Process VOD streams
            this.data.vodStreams = this.data.vodStreams.map((stream, index) => ({
                ...stream,
                stream_id: stream.stream_id || stream.id,
                name: stream.name || stream.title,
                category_id: stream.category_id || stream.cat_id,
                number: index + 1,
                logo: stream.stream_icon || stream.cover || stream.poster,
                quality: this.detectQuality(stream.name),
                year: stream.year,
                rating: stream.rating,
                duration: stream.duration
            }));
            
            // Render VOD categories
            this.renderCategories();
            
            // Update counters
            this.categoriesCount.textContent = this.data.vodCategories.length;
            this.channelsCount.textContent = this.data.vodStreams.length;
            
        } catch (error) {
            console.error('Error loading VOD data:', error);
            throw error;
        }
    }
    
    async loadSeriesData() {
        try {
            // Load series categories
            const categoriesUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=get_series_categories`;
            
            const categoriesResponse = await fetch(categoriesUrl);
            const categoriesData = await categoriesResponse.json();
            
            this.data.seriesCategories = Array.isArray(categoriesData) ? categoriesData : (categoriesData.categories || []);
            
            // Load series
            const seriesUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=get_series`;
            
            const seriesResponse = await fetch(seriesUrl);
            const seriesData = await seriesResponse.json();
            
            this.data.seriesStreams = Array.isArray(seriesData) ? seriesData : (seriesData.series || []);
            
            // Process series
            this.data.seriesStreams = this.data.seriesStreams.map((series, index) => ({
                ...series,
                series_id: series.series_id || series.id,
                name: series.name || series.title,
                category_id: series.category_id || series.cat_id,
                number: index + 1,
                logo: series.cover || series.poster,
                year: series.year,
                rating: series.rating,
                plot: series.plot
            }));
            
            // Render series categories
            this.renderCategories();
            
            // Update counters
            this.categoriesCount.textContent = this.data.seriesCategories.length;
            this.channelsCount.textContent = this.data.seriesStreams.length;
            
        } catch (error) {
            console.error('Error loading series data:', error);
            throw error;
        }
    }
    
    async loadEPG() {
        try {
            // Load EPG for live streams
            const epgUrl = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=get_short_epg&stream_id=${this.state.currentChannel?.stream_id || 0}&limit=5`;
            
            const response = await fetch(epgUrl);
            const epgData = await response.json();
            
            if (epgData && Array.isArray(epgData)) {
                this.data.epg[this.state.currentChannel?.stream_id] = epgData;
                this.renderEPG();
            }
            
        } catch (error) {
            console.error('Error loading EPG:', error);
            // Don't throw error for EPG, it's optional
        }
    }
    
    groupStreamsByCategory() {
        // Group live streams by category for faster filtering
        this.data.streamsByCategory = {};
        
        this.data.liveStreams.forEach(stream => {
            const catId = stream.category_id;
            if (!this.data.streamsByCategory[catId]) {
                this.data.streamsByCategory[catId] = [];
            }
            this.data.streamsByCategory[catId].push(stream);
        });
    }
    
    renderCategories() {
        this.categoriesList.innerHTML = '';
        
        let categories = [];
        switch(this.state.currentType) {
            case 'live':
                categories = this.data.liveCategories;
                break;
            case 'movies':
                categories = this.data.vodCategories;
                break;
            case 'series':
                categories = this.data.seriesCategories;
                break;
        }
        
        // Add "All" category
        const allCategory = {
            category_id: 'all',
            category_name: 'Të gjitha',
            parent_id: 0
        };
        
        categories = [allCategory, ...categories];
        
        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.dataset.id = category.category_id;
            
            // Count streams in this category
            let streamCount = 0;
            if (category.category_id === 'all') {
                streamCount = this.getCurrentStreams().length;
            } else {
                streamCount = this.getCurrentStreams().filter(s => 
                    s.category_id == category.category_id
                ).length;
            }
            
            item.innerHTML = `
                <div class="category-name">
                    <div class="category-icon">
                        <i class="fas ${this.getCategoryIcon(category.category_name)}"></i>
                    </div>
                    <span>${category.category_name}</span>
                </div>
                <span class="category-count">${streamCount}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectCategory(category.category_id);
            });
            
            this.categoriesList.appendChild(item);
        });
        
        // Select first category
        if (categories.length > 0) {
            this.selectCategory(categories[0].category_id);
        }
    }
    
    selectCategory(categoryId) {
        // Update active category
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id == categoryId) {
                item.classList.add('active');
            }
        });
        
        this.state.currentCategory = categoryId;
        
        // Filter and render channels
        this.filterChannelsByCategory();
    }
    
    filterChannelsByCategory() {
        let filteredStreams = [];
        const allStreams = this.getCurrentStreams();
        
        if (this.state.currentCategory === 'all') {
            filteredStreams = allStreams;
        } else {
            filteredStreams = allStreams.filter(stream => 
                stream.category_id == this.state.currentCategory
            );
        }
        
        this.renderChannels(filteredStreams);
        this.channelsCount.textContent = filteredStreams.length;
    }
    
    renderChannels(streams) {
        this.channelsList.innerHTML = '';
        
        streams.forEach(stream => {
            const isFavorite = this.state.favorites.some(fav => 
                fav.stream_id === stream.stream_id && fav.type === this.state.currentType
            );
            
            const isActive = this.state.currentChannel && 
                this.state.currentChannel.stream_id === stream.stream_id;
            
            const item = document.createElement('div');
            item.className = `channel-item ${isActive ? 'active' : ''}`;
            item.dataset.id = stream.stream_id;
            
            item.innerHTML = `
                <div class="channel-logo">
                    ${stream.logo ? 
                        `<img src="${stream.logo}" alt="${stream.name}" onerror="this.style.display='none'">` : 
                        `<i class="fas fa-tv"></i>`
                    }
                </div>
                <div class="channel-info">
                    <div class="channel-name">${stream.name}</div>
                    <div class="channel-meta">
                        <span class="channel-number">${stream.number}</span>
                        ${stream.quality ? `<span class="channel-quality ${stream.quality.toLowerCase()}">${stream.quality}</span>` : ''}
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                                onclick="event.stopPropagation(); player.toggleFavorite(${JSON.stringify(stream).replace(/"/g, '&quot;')})">
                            <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.playChannel(stream);
            });
            
            this.channelsList.appendChild(item);
        });
    }
    
    async playChannel(stream) {
        if (!stream) return;
        
        this.state.currentChannel = stream;
        this.state.currentStream = stream;
        
        // Update UI
        this.channelNameOverlay.textContent = stream.name;
        this.npChannelName.textContent = stream.name;
        
        // Update logo
        if (stream.logo) {
            this.channelLogoOverlay.innerHTML = `<img src="${stream.logo}" alt="${stream.name}">`;
            this.channelLogoOverlay.style.display = 'flex';
            this.npChannelLogo.src = stream.logo;
            this.npChannelLogo.style.display = 'block';
            this.npChannelLogoIcon.style.display = 'none';
        } else {
            this.channelLogoOverlay.innerHTML = '<i class="fas fa-tv"></i>';
            this.npChannelLogo.style.display = 'none';
            this.npChannelLogoIcon.style.display = 'block';
        }
        
        // Update info panel
        this.infoCategory.textContent = this.getCategoryName(stream.category_id) || '-';
        this.infoChannelNumber.textContent = stream.number || '-';
        this.infoQuality.textContent = stream.quality || '-';
        this.infoLanguage.textContent = stream.language || 'Shqip';
        
        // Highlight active channel
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === stream.stream_id) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        // Add to history
        this.addToHistory(stream);
        
        // Load EPG
        if (this.state.settings.loadEPG) {
            await this.loadEPG();
        } else {
            this.epgTimeline.innerHTML = `
                <div class="no-epg-message">
                    <i class="fas fa-tv"></i>
                    <p>EPG është çaktivizuar në cilësime</p>
                </div>
            `;
        }
        
        // Play stream
        await this.playStream(stream);
        
        // Show notification
        this.showChannelNotification(stream);
    }
    
    async playStream(stream) {
        // Destroy previous HLS instance
        if (this.state.hls) {
            this.state.hls.destroy();
            this.state.hls = null;
        }
        
        try {
            // Construct stream URL based on provider type
            let streamUrl = '';
            
            if (this.state.currentType === 'live') {
                // Live TV stream
                streamUrl = `${this.config.apiBase}/live/${this.config.username}/${this.config.password}/${stream.stream_id}.m3u8`;
            } else if (this.state.currentType === 'movies') {
                // VOD stream
                streamUrl = `${this.config.apiBase}/movie/${this.config.username}/${this.config.password}/${stream.stream_id}.${stream.container_extension || 'mp4'}`;
            } else if (this.state.currentType === 'series') {
                // Series stream - you need episode ID
                this.showToast('Zgjidhni një episod për të luajtur', 'info');
                return;
            }
            
            console.log('Playing stream:', streamUrl);
            
            if (Hls.isSupported()) {
                this.state.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: this.state.settings.bufferSize,
                    manifestLoadingTimeOut: 10000,
                    manifestLoadingMaxRetry: 3,
                    levelLoadingTimeOut: 10000,
                    levelLoadingMaxRetry: 3,
                    fragLoadingTimeOut: 10000,
                    fragLoadingMaxRetry: 3
                });
                
                this.state.hls.loadSource(streamUrl);
                this.state.hls.attachMedia(this.player);
                
                this.state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (this.state.settings.autoPlay) {
                        this.player.play().catch(e => {
                            console.log('Auto-play prevented:', e);
                        });
                    }
                });
                
                this.state.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS error:', data);
                    
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                this.showToast('Gabim në rrjet, po riprovohet...', 'warning');
                                this.state.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                this.showToast('Gabim në media, po riprovohet...', 'warning');
                                this.state.hls.recoverMediaError();
                                break;
                            default:
                                this.showToast('Gabim fatal, ndërprerja...', 'error');
                                this.state.hls.destroy();
                                break;
                        }
                    }
                });
                
                this.state.hls.on(Hls.Events.BUFFER_CREATED, () => {
                    this.updateBufferStatus();
                });
                
            } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support
                this.player.src = streamUrl;
                if (this.state.settings.autoPlay) {
                    this.player.play().catch(e => {
                        console.log('Auto-play prevented:', e);
                    });
                }
            } else {
                this.showToast('HLS nuk mbështetet nga ky shfletues', 'error');
            }
            
        } catch (error) {
            console.error('Error playing stream:', error);
            this.showToast(`Gabim në luajtjen e stream-it: ${error.message}`, 'error');
            
            // Fallback to test stream for demo
            this.playFallbackStream();
        }
    }
    
    playFallbackStream() {
        // Fallback to test stream for demo purposes
        const testStreams = [
            'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            'https://test-streams.mux.dev/test_001/stream.m3u8'
        ];
        
        const randomStream = testStreams[Math.floor(Math.random() * testStreams.length)];
        
        if (Hls.isSupported()) {
            this.state.hls = new Hls();
            this.state.hls.loadSource(randomStream);
            this.state.hls.attachMedia(this.player);
            this.state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.player.play();
            });
        } else {
            this.player.src = randomStream;
            this.player.play();
        }
        
        this.showToast('Duke përdorur stream demo', 'info');
    }
    
    loadContentForType(type) {
        this.state.currentType = type;
        this.state.currentCategory = null;
        this.state.currentChannel = null;
        
        switch(type) {
            case 'live':
                if (this.data.liveCategories.length === 0) {
                    this.loadLiveData();
                } else {
                    this.renderCategories();
                }
                break;
            case 'movies':
                if (this.data.vodCategories.length === 0) {
                    this.loadVODData();
                } else {
                    this.renderCategories();
                }
                break;
            case 'series':
                if (this.data.seriesCategories.length === 0) {
                    this.loadSeriesData();
                } else {
                    this.renderCategories();
                }
                break;
        }
    }
    
    getCurrentStreams() {
        switch(this.state.currentType) {
            case 'live':
                return this.data.liveStreams;
            case 'movies':
                return this.data.vodStreams;
            case 'series':
                return this.data.seriesStreams;
            default:
                return [];
        }
    }
    
    getCategoryName(categoryId) {
        let categories = [];
        switch(this.state.currentType) {
            case 'live':
                categories = this.data.liveCategories;
                break;
            case 'movies':
                categories = this.data.vodCategories;
                break;
            case 'series':
                categories = this.data.seriesCategories;
                break;
        }
        
        const category = categories.find(c => c.category_id == categoryId);
        return category ? category.category_name : 'Unknown';
    }
    
    getCategoryIcon(categoryName) {
        const lowerName = categoryName.toLowerCase();
        
        if (lowerName.includes('news') || lowerName.includes('lajme')) return 'fa-newspaper';
        if (lowerName.includes('sport')) return 'fa-futbol';
        if (lowerName.includes('movie') || lowerName.includes('film')) return 'fa-film';
        if (lowerName.includes('music') || lowerName.includes('muzik')) return 'fa-music';
        if (lowerName.includes('kid') || lowerName.includes('fëmij')) return 'fa-child';
        if (lowerName.includes('doc') || lowerName.includes('dokumentar')) return 'fa-camera';
        if (lowerName.includes('entertainment') || lowerName.includes('argëtim')) return 'fa-tv';
        if (lowerName.includes('educational') || lowerName.includes('edukativ')) return 'fa-graduation-cap';
        if (lowerName.includes('local') || lowerName.includes('lokale')) return 'fa-map-marker-alt';
        if (lowerName.includes('international') || lowerName.includes('ndërkombëtare')) return 'fa-globe';
        
        return 'fa-folder';
    }
    
    detectQuality(name) {
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('4k') || lowerName.includes('uhd')) return '4K';
        if (lowerName.includes('fhd') || lowerName.includes('1080')) return 'FHD';
        if (lowerName.includes('hd') || lowerName.includes('720')) return 'HD';
        if (lowerName.includes('sd')) return 'SD';
        
        return null;
    }
    
    detectLanguage(name) {
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('shqip') || lowerName.includes('albanian')) return 'Shqip';
        if (lowerName.includes('english') || lowerName.includes('anglisht')) return 'English';
        if (lowerName.includes('italian') || lowerName.includes('italisht')) return 'Italian';
        if (lowerName.includes('german') || lowerName.includes('gjermanisht')) return 'German';
        if (lowerName.includes('french') || lowerName.includes('frëngjisht')) return 'French';
        if (lowerName.includes('turkish') || lowerName.includes('turqisht')) return 'Turkish';
        if (lowerName.includes('greek') || lowerName.includes('grekisht')) return 'Greek';
        
        return 'Multi';
    }
    
    filterChannels(searchTerm) {
        const filtered = this.getCurrentStreams().filter(stream =>
            stream.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (stream.number && stream.number.toString().includes(searchTerm))
        );
        
        this.renderChannels(filtered);
        this.channelsCount.textContent = filtered.length;
    }
    
    navigateChannels(direction) {
        const currentStreams = this.getCurrentStreams();
        if (currentStreams.length === 0) return;
        
        let currentIndex = 0;
        if (this.state.currentChannel) {
            currentIndex = currentStreams.findIndex(stream => 
                stream.stream_id === this.state.currentChannel.stream_id
            );
        }
        
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = currentStreams.length - 1;
        if (newIndex >= currentStreams.length) newIndex = 0;
        
        const nextChannel = currentStreams[newIndex];
        this.playChannel(nextChannel);
    }
    
    toggleFavorite(stream) {
        const favoriteIndex = this.state.favorites.findIndex(fav => 
            fav.stream_id === stream.stream_id && fav.type === this.state.currentType
        );
        
        if (favoriteIndex === -1) {
            // Add to favorites
            this.state.favorites.push({
                stream_id: stream.stream_id,
                name: stream.name,
                logo: stream.logo,
                type: this.state.currentType,
                category_id: stream.category_id,
                added: new Date().toISOString()
            });
            this.showToast('U shtua në të preferuara', 'success');
        } else {
            // Remove from favorites
            this.state.favorites.splice(favoriteIndex, 1);
            this.showToast('U hoq nga të preferuarat', 'info');
        }
        
        // Save to localStorage
        localStorage.setItem('iptv_favorites', JSON.stringify(this.state.favorites));
        
        // Re-render channels to update favorite buttons
        this.filterChannelsByCategory();
        
        // Update favorites list
        this.renderFavorites();
    }
    
    renderFavorites() {
        this.favoritesList.innerHTML = '';
        
        if (this.state.favorites.length === 0) {
            this.favoritesList.innerHTML = `
                <div class="empty-favorites">
                    <i class="far fa-heart"></i>
                    <p>Shtoni kanale te preferuara</p>
                </div>
            `;
            return;
        }
        
        this.state.favorites.forEach(fav => {
            const item = document.createElement('div');
            item.className = 'favorite-channel-item';
            item.dataset.id = fav.stream_id;
            item.dataset.type = fav.type;
            
            item.innerHTML = `
                <div class="favorite-channel-logo">
                    ${fav.logo ? 
                        `<img src="${fav.logo}" alt="${fav.name}" onerror="this.style.display='none'">` : 
                        `<i class="fas fa-tv"></i>`
                    }
                </div>
                <div class="favorite-channel-name">${fav.name}</div>
                <button class="remove-favorite" onclick="event.stopPropagation(); player.removeFavorite('${fav.stream_id}', '${fav.type}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            item.addEventListener('click', () => {
                // Switch to correct tab and play channel
                this.tabBtns.forEach(btn => {
                    if (btn.dataset.type === fav.type) {
                        btn.click();
                    }
                });
                
                // Find and play the channel
                setTimeout(() => {
                    let stream = null;
                    switch(fav.type) {
                        case 'live':
                            stream = this.data.liveStreams.find(s => s.stream_id === fav.stream_id);
                            break;
                        case 'movies':
                            stream = this.data.vodStreams.find(s => s.stream_id === fav.stream_id);
                            break;
                        case 'series':
                            stream = this.data.seriesStreams.find(s => s.series_id === fav.stream_id);
                            break;
                    }
                    
                    if (stream) {
                        this.playChannel(stream);
                    }
                }, 500);
            });
            
            this.favoritesList.appendChild(item);
        });
    }
    
    removeFavorite(streamId, type) {
        this.state.favorites = this.state.favorites.filter(fav => 
            !(fav.stream_id == streamId && fav.type === type)
        );
        
        localStorage.setItem('iptv_favorites', JSON.stringify(this.state.favorites));
        this.renderFavorites();
        this.filterChannelsByCategory(); // Update favorite buttons
        this.showToast('U hoq nga të preferuarat', 'info');
    }
    
    addToHistory(stream) {
        const historyItem = {
            stream_id: stream.stream_id,
            name: stream.name,
            type: this.state.currentType,
            timestamp: new Date().toISOString()
        };
        
        // Remove if exists
        this.state.history = this.state.history.filter(item => 
            !(item.stream_id === stream.stream_id && item.type === this.state.currentType)
        );
        
        // Add to beginning
        this.state.history.unshift(historyItem);
        
        // Keep only last 50 items
        this.state.history = this.state.history.slice(0, 50);
        
        localStorage.setItem('iptv_history', JSON.stringify(this.state.history));
    }
    
    renderEPG() {
        if (!this.state.currentChannel) {
            this.epgTimeline.innerHTML = `
                <div class="no-epg-message">
                    <i class="fas fa-tv"></i>
                    <p>Zgjidhni një kanal për të parë programin</p>
                </div>
            `;
            return;
        }
        
        const epgData = this.data.epg[this.state.currentChannel.stream_id];
        
        if (!epgData || epgData.length === 0) {
            this.epgTimeline.innerHTML = `
                <div class="no-epg-message">
                    <i class="fas fa-tv"></i>
                    <p>Nuk ka informacion EPG për këtë kanal</p>
                </div>
            `;
            return;
        }
        
        this.epgTimeline.innerHTML = '';
        
        epgData.forEach(program => {
            const item = document.createElement('div');
            item.className = 'epg-item';
            
            const startTime = new Date(parseInt(program.start) * 1000);
            const endTime = new Date(parseInt(program.end) * 1000);
            const now = new Date();
            
            const isNow = now >= startTime && now <= endTime;
            
            if (isNow) {
                item.style.borderLeftColor = 'var(--success)';
                this.programInfoOverlay.textContent = `${program.title} (${this.formatTime(startTime)} - ${this.formatTime(endTime)})`;
                this.npProgramName.textContent = program.title;
            }
            
            item.innerHTML = `
                <div class="epg-time">
                    <i class="far fa-clock"></i>
                    ${this.formatTime(startTime)} - ${this.formatTime(endTime)}
                    ${isNow ? '<span class="live-indicator"><i class="fas fa-circle"></i> TANI</span>' : ''}
                </div>
                <div class="epg-title">${program.title}</div>
                <div class="epg-desc">${program.description || 'Nuk ka përshkrim'}</div>
            `;
            
            item.addEventListener('click', () => {
                this.showEPGDetail(program);
            });
            
            this.epgTimeline.appendChild(item);
        });
    }
    
    showEPGDetail(program) {
        const detailContent = document.getElementById('epgDetailContent');
        
        const startTime = new Date(parseInt(program.start) * 1000);
        const endTime = new Date(parseInt(program.end) * 1000);
        const duration = (endTime - startTime) / (1000 * 60); // in minutes
        
        detailContent.innerHTML = `
            <div class="epg-detail-item">
                <div class="epg-detail-time">
                    <i class="far fa-clock"></i>
                    ${this.formatTime(startTime)} - ${this.formatTime(endTime)}
                    <span style="margin-left: 10px; color: var(--text-muted);">
                        (${duration} minuta)
                    </span>
                </div>
                <div class="epg-detail-title">${program.title}</div>
                <div class="epg-detail-description">
                    ${program.description || 'Nuk ka përshkrim të disponueshëm për këtë program.'}
                </div>
            </div>
        `;
        
        this.epgDetailModal.style.display = 'flex';
    }
    
    navigateEPG(direction) {
        // Implement EPG day navigation
        this.showToast('Navigimi EPG do të implementohet', 'info');
    }
    
    updateProgress() {
        if (!this.player.duration || !this.player.duration) return;
        
        const progress = (this.player.currentTime / this.player.duration) * 100;
        this.progressBar.value = progress;
        
        // Update time display
        this.currentTimeEl.textContent = this.formatTimeSeconds(this.player.currentTime);
        this.totalTimeEl.textContent = this.formatTimeSeconds(this.player.duration);
        
        // Update now playing progress
        this.npProgressFill.style.width = `${progress}%`;
        this.npCurrentTime.textContent = this.formatTimeSeconds(this.player.currentTime);
        this.npEndTime.textContent = this.formatTimeSeconds(this.player.duration);
    }
    
    updateDuration() {
        if (this.player.duration) {
            this.totalTimeEl.textContent = this.formatTimeSeconds(this.player.duration);
            this.npEndTime.textContent = this.formatTimeSeconds(this.player.duration);
        }
    }
    
    updateVolumeDisplay() {
        const volume = Math.round(this.player.volume * 100);
        const isMuted = this.player.muted || volume === 0;
        
        this.volumeText.textContent = isMuted ? 'Muted' : `${volume}%`;
        
        // Update icon
        if (isMuted) {
            this.volumeIcon.className = 'fas fa-volume-mute';
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (volume < 50) {
            this.volumeIcon.className = 'fas fa-volume-down';
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            this.volumeIcon.className = 'fas fa-volume-up';
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
        
        // Show popup
        this.volumePopup.style.display = 'block';
        setTimeout(() => {
            this.volumePopup.style.display = 'none';
        }, 1000);
    }
    
    updateBufferStatus() {
        if (this.state.hls) {
            const buffer = this.state.hls.media.buffered;
            if (buffer.length > 0) {
                const bufferedTime = buffer.end(buffer.length - 1) - buffer.start(0);
                const bufferPercent = Math.min(100, (bufferedTime / 10) * 100);
                this.bufferStatus.textContent = `${Math.round(bufferPercent)}%`;
                
                // Update color based on buffer level
                if (bufferPercent > 50) {
                    this.bufferStatus.className = 'status-value connected';
                } else if (bufferPercent > 20) {
                    this.bufferStatus.className = 'status-value buffering';
                } else {
                    this.bufferStatus.className = 'status-value disconnected';
                }
            }
        }
    }
    
    updateConnectionStatus(status, message) {
        const indicator = this.connectionStatus.querySelector('.status-indicator');
        const text = this.connectionStatus.querySelector('span');
        
        indicator.className = 'status-indicator ' + status;
        text.textContent = message;
    }
    
    showChannelNotification(channel) {
        this.notificationChannelName.textContent = channel.name;
        
        // Try to get current program from EPG
        const epgData = this.data.epg[channel.stream_id];
        if (epgData && epgData.length > 0) {
            const now = new Date();
            const currentProgram = epgData.find(program => {
                const start = new Date(parseInt(program.start) * 1000);
                const end = new Date(parseInt(program.end) * 1000);
                return now >= start && now <= end;
            });
            
            if (currentProgram) {
                this.notificationProgram.textContent = currentProgram.title;
            } else {
                this.notificationProgram.textContent = 'Programi aktual';
            }
        } else {
            this.notificationProgram.textContent = 'Programi aktual';
        }
        
        this.channelNotification.style.display = 'block';
        
        setTimeout(() => {
            this.channelNotification.style.display = 'none';
        }, 3000);
    }
    
    showSettingsModal() {
        // Load current settings into form
        document.getElementById('videoQuality').value = this.state.settings.videoQuality || 'auto';
        document.getElementById('bufferSize').value = this.state.settings.bufferSize || 50;
        document.getElementById('bufferSizeValue').textContent = `${this.state.settings.bufferSize || 50} MB`;
        document.getElementById('autoPlay').checked = this.state.settings.autoPlay !== false;
        document.getElementById('hardwareAcceleration').checked = this.state.settings.hardwareAcceleration !== false;
        document.getElementById('timeout').value = this.state.settings.timeout || 30;
        document.getElementById('autoReconnect').checked = this.state.settings.autoReconnect !== false;
        document.getElementById('cacheChannels').checked = this.state.settings.cacheChannels !== false;
        document.getElementById('loadEPG').checked = this.state.settings.loadEPG !== false;
        document.getElementById('theme').value = this.state.settings.theme || 'dark';
        document.getElementById('showChannelNumbers').checked = this.state.settings.showChannelNumbers !== false;
        document.getElementById('showChannelLogos').checked = this.state.settings.showChannelLogos !== false;
        
        // Setup settings tabs
        const settingsTabs = document.querySelectorAll('.settings-tab');
        const settingsPanes = document.querySelectorAll('.settings-pane');
        
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                settingsTabs.forEach(t => t.classList.remove('active'));
                settingsPanes.forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(tabName + 'Settings').classList.add('active');
            });
        });
        
        // Buffer size slider update
        document.getElementById('bufferSize').addEventListener('input', (e) => {
            document.getElementById('bufferSizeValue').textContent = `${e.target.value} MB`;
        });
        
        this.settingsModal.style.display = 'flex';
    }
    
    saveSettings() {
        this.state.settings = {
            videoQuality: document.getElementById('videoQuality').value,
            bufferSize: parseInt(document.getElementById('bufferSize').value),
            autoPlay: document.getElementById('autoPlay').checked,
            hardwareAcceleration: document.getElementById('hardwareAcceleration').checked,
            timeout: parseInt(document.getElementById('timeout').value),
            autoReconnect: document.getElementById('autoReconnect').checked,
            cacheChannels: document.getElementById('cacheChannels').checked,
            loadEPG: document.getElementById('loadEPG').checked,
            theme: document.getElementById('theme').value,
            showChannelNumbers: document.getElementById('showChannelNumbers').checked,
            showChannelLogos: document.getElementById('showChannelLogos').checked
        };
        
        localStorage.setItem('iptv_settings', JSON.stringify(this.state.settings));
        
        // Apply theme
        document.body.className = `${this.state.settings.theme}-theme`;
        
        this.settingsModal.style.display = 'none';
        this.showToast('Cilësimet u ruajtën', 'success');
    }
    
    resetSettings() {
        if (confirm('A jeni të sigurt që dëshironi të rivendosni të gjitha cilësimet në default?')) {
            localStorage.removeItem('iptv_settings');
            this.state.settings = this.loadSettings();
            this.showSettingsModal(); // Reload modal with default values
            this.showToast('Cilësimet u rivendosën', 'info');
        }
    }
    
    loadSettings() {
        const defaultSettings = {
            videoQuality: 'auto',
            bufferSize: 50,
            autoPlay: true,
            hardwareAcceleration: true,
            timeout: 30,
            autoReconnect: true,
            cacheChannels: true,
            loadEPG: true,
            theme: 'dark',
            showChannelNumbers: true,
            showChannelLogos: true
        };
        
        const saved = localStorage.getItem('iptv_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }
    
    saveCredentials() {
        const credentials = {
            serverUrl: this.serverUrlInput.value,
            username: this.usernameInput.value,
            password: this.passwordInput.value,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('iptv_credentials', JSON.stringify(credentials));
    }
    
    loadSavedCredentials() {
        const saved = localStorage.getItem('iptv_credentials');
        if (saved) {
            try {
                const credentials = JSON.parse(saved);
                this.serverUrlInput.value = credentials.serverUrl || '';
                this.usernameInput.value = credentials.username || '';
                this.passwordInput.value = credentials.password || '';
            } catch (e) {
                console.error('Error loading saved credentials:', e);
            }
        }
    }
    
    loadFromStorage() {
        this.loadSavedCredentials();
        this.showToast('Të dhënat u ngarkuan nga memoria', 'info');
    }
    
    logout() {
        if (confirm('A jeni të sigurt që dëshironi të dilni?')) {
            // Destroy HLS instance
            if (this.state.hls) {
                this.state.hls.destroy();
                this.state.hls = null;
            }
            
            // Stop player
            this.player.pause();
            this.player.src = '';
            
            // Reset state
            this.state.isConnected = false;
            this.state.currentChannel = null;
            this.state.currentStream = null;
            
            // Clear data
            this.data = {
                liveCategories: [],
                liveStreams: [],
                vodCategories: [],
                vodStreams: [],
                seriesCategories: [],
                seriesStreams: [],
                epg: {}
            };
            
            // Switch to login view
            this.channelsContainer.style.display = 'none';
            this.loginContainer.style.display = 'flex';
            
            // Update connection status
            this.updateConnectionStatus('disconnected', 'Jo i lidhur');
            this.serverStatus.textContent = 'Jo i lidhur';
            this.serverStatus.className = 'status-value disconnected';
            
            this.showToast('Jeni duke u shkëputur', 'info');
        }
    }
    
    refreshData() {
        if (this.state.isConnected) {
            this.loadAllData();
        } else {
            this.showToast('Ju duhet të lidheni fillimisht', 'warning');
        }
    }
    
    showLoading(show) {
        this.state.isLoading = show;
        
        if (show) {
            document.getElementById('loadingScreen').style.display = 'flex';
            document.getElementById('loadingScreen').style.opacity = '1';
        } else {
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
            }, 500);
        }
    }
    
    showToast(message, type = 'info') {
        const backgroundColor = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        }[type] || '#3498db';
        
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: backgroundColor,
            stopOnFocus: true
        }).showToast();
    }
    
    updateClock() {
        const now = new Date();
        this.epgDate.textContent = now.toLocaleDateString('sq-AL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        this.serverTime.textContent = now.toLocaleTimeString('sq-AL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('sq-AL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatTimeSeconds(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    window.player = new IPTVProviderPlayer();
});
