// IPTV Player me mbështetje për Xtream Codes dhe M3U
class IptvPlayer {
    constructor() {
        this.currentChannel = null;
        this.channels = [];
        this.categories = [];
        this.playlists = [];
        this.epgData = {};
        this.hls = null;
        this.currentCategory = null;
        this.settings = {
            playerType: 'hls',
            defaultQuality: '720p',
            autoPlay: true,
            bufferSize: 10,
            maxBufferLength: 60
        };
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSettings();
        this.setupPlayer();
    }
    
    cacheElements() {
        // Player elements
        this.videoPlayer = document.getElementById('videoPlayer');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.noStreamMessage = document.getElementById('noStreamMessage');
        
        // Channel info
        this.currentChannelName = document.getElementById('currentChannelName');
        this.currentProgram = document.getElementById('currentProgram');
        this.currentLogo = document.getElementById('currentLogo');
        
        // Control elements
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevChannelBtn = document.getElementById('prevChannel');
        this.nextChannelBtn = document.getElementById('nextChannel');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        
        // Stream info
        this.streamResolution = document.getElementById('streamResolution');
        this.streamBitrate = document.getElementById('streamBitrate');
        this.streamStatus = document.getElementById('streamStatus');
        
        // Login elements
        this.serverUrl = document.getElementById('serverUrl');
        this.username = document.getElementById('username');
        this.password = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.loadM3uBtn = document.getElementById('loadM3uBtn');
        this.importXtreamBtn = document.getElementById('importXtreamBtn');
        
        // Categories & channels
        this.categoriesList = document.getElementById('categoriesList');
        this.channelsList = document.getElementById('channelsList');
        this.channelCount = document.getElementById('channelCount');
        this.searchChannel = document.getElementById('searchChannel');
        
        // EPG elements
        this.epgInfo = document.getElementById('epgInfo');
        this.epgTitle = document.getElementById('epgTitle');
        this.epgDescription = document.getElementById('epgDescription');
        this.epgStart = document.getElementById('epgStart');
        this.epgEnd = document.getElementById('epgEnd');
        this.epgBtn = document.getElementById('epg-btn');
        
        // Modal elements
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.m3uModal = document.getElementById('m3uModal');
        this.closeM3uBtn = document.getElementById('closeM3uBtn');
        this.epgModal = document.getElementById('epgModal');
        this.closeEpgBtn = document.getElementById('closeEpgBtn');
        this.m3uUrl = document.getElementById('m3uUrl');
        this.m3uFile = document.getElementById('m3uFile');
        this.parseM3uBtn = document.getElementById('parseM3uBtn');
        this.loadM3uUrlBtn = document.getElementById('loadM3uUrlBtn');
        
        // Settings elements
        this.playerType = document.getElementById('playerType');
        this.defaultQuality = document.getElementById('defaultQuality');
        this.autoPlayCheck = document.getElementById('autoPlayCheck');
        this.bufferSize = document.getElementById('bufferSize');
        this.maxBufferLength = document.getElementById('maxBufferLength');
        this.bufferValue = document.getElementById('bufferValue');
        this.maxBufferValue = document.getElementById('maxBufferValue');
        
        // EPG grid
        this.epgGrid = document.getElementById('epgGrid');
    }
    
    bindEvents() {
        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevChannelBtn.addEventListener('click', () => this.prevChannel());
        this.nextChannelBtn.addEventListener('click', () => this.nextChannel());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Video events
        this.videoPlayer.addEventListener('play', () => this.onPlay());
        this.videoPlayer.addEventListener('pause', () => this.onPause());
        this.videoPlayer.addEventListener('error', (e) => this.onPlayerError(e));
        this.videoPlayer.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
        
        // Login events
        this.loginBtn.addEventListener('click', () => this.loginXtream());
        this.loadM3uBtn.addEventListener('click', () => this.showM3uModal());
        this.importXtreamBtn.addEventListener('click', () => this.importXtreamCodes());
        
        // Search
        this.searchChannel.addEventListener('input', (e) => this.searchChannels(e.target.value));
        
        // Modal events
        this.closeSettingsBtn.addEventListener('click', () => this.hideModal(this.settingsModal));
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.closeM3uBtn.addEventListener('click', () => this.hideModal(this.m3uModal));
        this.closeEpgBtn.addEventListener('click', () => this.hideModal(this.epgModal));
        this.epgBtn.addEventListener('click', () => this.showEpgModal());
        
        // M3U modal events
        this.parseM3uBtn.addEventListener('click', () => this.parseM3uFile());
        this.loadM3uUrlBtn.addEventListener('click', () => this.loadM3uFromUrl());
        this.m3uFile.addEventListener('change', (e) => this.previewM3uFile(e));
        
        // Settings tab events
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });
        
        // Buffer size controls
        this.bufferSize.addEventListener('input', (e) => {
            this.bufferValue.textContent = e.target.value + 's';
        });
        
        this.maxBufferLength.addEventListener('input', (e) => {
            this.maxBufferValue.textContent = e.target.value + 's';
        });
        
        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.hideModal(this.settingsModal);
            if (e.target === this.m3uModal) this.hideModal(this.m3uModal);
            if (e.target === this.epgModal) this.hideModal(this.epgModal);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    this.seek(-10);
                    break;
                case 'ArrowRight':
                    this.seek(10);
                    break;
                case 'ArrowUp':
                    this.changeVolume(10);
                    break;
                case 'ArrowDown':
                    this.changeVolume(-10);
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
                case 'm':
                case 'M':
                    this.toggleMute();
                    break;
            }
        });
    }
    
    setupPlayer() {
        // Setup HLS.js if available
        if (typeof Hls !== 'undefined') {
            this.hls = new Hls({
                maxBufferSize: this.settings.bufferSize * 1000,
                maxBufferLength: this.settings.maxBufferLength,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
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
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS Manifest parsed');
            });
            
            this.hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
                this.updateStreamInfo(data);
            });
        }
    }
    
    // Xtream Codes Login
    async loginXtream() {
        const server = this.serverUrl.value.trim();
        const user = this.username.value.trim();
        const pass = this.password.value.trim();
        
        if (!server || !user || !pass) {
            this.showError('Ju lutem plotësoni të gjitha fushat!');
            return;
        }
        
        this.showLoading('Duke u lidhur me server...');
        
        try {
            // Format server URL
            const serverUrl = server.endsWith('/') ? server.slice(0, -1) : server;
            
            // Get categories from Xtream Codes API
            const categoriesUrl = `${serverUrl}/player_api.php?username=${user}&password=${pass}&action=get_live_categories`;
            const categoriesResponse = await fetch(categoriesUrl);
            const categories = await categoriesResponse.json();
            
            // Get channels from Xtream Codes API
            const channelsUrl = `${serverUrl}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
            const channelsResponse = await fetch(channelsUrl);
            const channels = await channelsResponse.json();
            
            // Format data
            this.categories = categories.map(cat => ({
                id: cat.category_id,
                name: cat.category_name,
                parent_id: cat.parent_id || 0
            }));
            
            this.channels = channels.map(chan => ({
                id: chan.stream_id,
                name: chan.name,
                category: chan.category_id,
                logo: chan.stream_icon || '',
                url: `${serverUrl}/live/${user}/${pass}/${chan.stream_id}.m3u8`,
                epg_channel_id: chan.epg_channel_id || ''
            }));
            
            // Load EPG if available
            await this.loadEpg(serverUrl, user, pass);
            
            // Update UI
            this.updateCategories();
            this.updateChannelCount();
            this.hideLoading();
            
            this.showSuccess(`U lidh me sukses! ${this.channels.length} kanale të gjetura.`);
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Gabim në lidhje. Kontrolloni kredencialet!');
            this.hideLoading();
        }
    }
    
    // M3U Playlist Parser
    async parseM3uFile() {
        const file = this.m3uFile.files[0];
        if (!file) {
            this.showError('Ju lutem zgjidhni një skedar M3U!');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.processM3uContent(content);
        };
        reader.readAsText(file);
    }
    
    async loadM3uFromUrl() {
        const url = this.m3uUrl.value.trim();
        if (!url) {
            this.showError('Ju lutem vendosni një URL!');
            return;
        }
        
        this.showLoading('Duke ngarkuar playlist...');
        
        try {
            const response = await fetch(url);
            const content = await response.text();
            this.processM3uContent(content);
            this.hideLoading();
            this.showSuccess('Playlist u ngarkua me sukses!');
            this.hideModal(this.m3uModal);
        } catch (error) {
            console.error('Error loading M3U:', error);
            this.showError('Gabim në ngarkimin e playlist!');
            this.hideLoading();
        }
    }
    
    processM3uContent(content) {
        const lines = content.split('\n');
        const channels = [];
        const categories = new Set();
        let currentChannel = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Parse EXTINF line
                const match = line.match(/#EXTINF:(-?\d+)\s*(.*?),(.*)/);
                if (match) {
                    currentChannel = {
                        id: channels.length + 1,
                        duration: parseInt(match[1]),
                        attributes: this.parseAttributes(match[2]),
                        name: match[3].trim()
                    };
                }
            } else if (line.startsWith('#EXTGRP:')) {
                // Parse group/category
                const group = line.replace('#EXTGRP:', '').trim();
                currentChannel.category = group;
                categories.add(group);
            } else if (line.startsWith('#EXTVLCOPT:')) {
                // VLC options - skip
                continue;
            } else if (line.startsWith('#')) {
                // Other comments - skip
                continue;
            } else if (line && line.length > 0 && !line.startsWith('#')) {
                // URL line
                if (currentChannel.name) {
                    currentChannel.url = line.trim();
                    currentChannel.logo = currentChannel.attributes['tvg-logo'] || '';
                    currentChannel.epg_channel_id = currentChannel.attributes['tvg-id'] || '';
                    
                    channels.push({...currentChannel});
                    currentChannel = {};
                }
            }
        }
        
        this.channels = channels;
        this.categories = Array.from(categories).map((cat, index) => ({
            id: index + 1,
            name: cat
        }));
        
        this.updateCategories();
        this.updateChannelCount();
        this.showSuccess(`U ngarkuan ${channels.length} kanale nga ${this.categories.length} kategori`);
    }
    
    parseAttributes(attrString) {
        const attributes = {};
        const regex = /(\w+)=["']([^"']+)["']/g;
        let match;
        
        while ((match = regex.exec(attrString)) !== null) {
            attributes[match[1]] = match[2];
        }
        
        return attributes;
    }
    
    previewM3uFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const preview = document.getElementById('previewContent');
            preview.textContent = content.substring(0, 1000) + 
                (content.length > 1000 ? '\n\n... (skedari është i gjatë, shfaqen vetëm 1000 karakteret e para)' : '');
        };
        reader.readAsText(file);
    }
    
    // Load EPG data
    async loadEpg(serverUrl, username, password) {
        try {
            const epgUrl = `${serverUrl}/xmltv.php?username=${username}&password=${password}`;
            const response = await fetch(epgUrl);
            const xmlText = await response.text();
            
            // Simple XML parsing for EPG
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");
            const programmes = xmlDoc.getElementsByTagName('programme');
            
            this.epgData = {};
            
            for (let prog of programmes) {
                const channel = prog.getAttribute('channel');
                const start = prog.getAttribute('start');
                const stop = prog.getAttribute('stop');
                const title = prog.getElementsByTagName('title')[0]?.textContent || '';
                const desc = prog.getElementsByTagName('desc')[0]?.textContent || '';
                
                if (!this.epgData[channel]) {
                    this.epgData[channel] = [];
                }
                
                this.epgData[channel].push({
                    start: this.parseEpgTime(start),
                    end: this.parseEpgTime(stop),
                    title,
                    description: desc
                });
            }
            
            console.log('EPG loaded:', Object.keys(this.epgData).length, 'channels');
        } catch (error) {
            console.warn('Could not load EPG:', error);
        }
    }
    
    parseEpgTime(epgTime) {
        // EPG time format: YYYYMMDDHHMMSS +0000
        const year = epgTime.substring(0, 4);
        const month = epgTime.substring(4, 6);
        const day = epgTime.substring(6, 8);
        const hour = epgTime.substring(8, 10);
        const minute = epgTime.substring(10, 12);
        const second = epgTime.substring(12, 14);
        
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
    }
    
    // UI Updates
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
            document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
            allItem.classList.add('active');
            this.currentCategory = null;
            this.displayChannels();
        });
        this.categoriesList.appendChild(allItem);
        
        // Add actual categories
        this.categories.forEach(category => {
            const count = this.channels.filter(c => c.category === category.name).length;
            if (count === 0) return;
            
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <span class="category-name">${category.name}</span>
                <span class="category-count">${count}</span>
            `;
            
            categoryItem.addEventListener('click', () => {
                document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
                categoryItem.classList.add('active');
                this.currentCategory = category.name;
                this.displayChannels();
            });
            
            this.categoriesList.appendChild(categoryItem);
        });
        
        // Display channels for "All" initially
        this.currentCategory = null;
        this.displayChannels();
    }
    
    displayChannels() {
        this.channelsList.innerHTML = '';
        
        let filteredChannels = this.channels;
        
        // Filter by category
        if (this.currentCategory) {
            filteredChannels = this.channels.filter(c => c.category === this.currentCategory);
        }
        
        // Filter by search
        const searchTerm = this.searchChannel.value.toLowerCase();
        if (searchTerm) {
            filteredChannels = filteredChannels.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                (c.attributes && c.attributes['group-title'] && 
                 c.attributes['group-title'].toLowerCase().includes(searchTerm))
            );
        }
        
        // Display channels
        filteredChannels.forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'channel-item';
            channelItem.dataset.id = channel.id;
            
            const logoText = channel.logo ? 
                `<img src="${channel.logo}" alt="${channel.name}" class="channel-logo-img">` :
                `<span>${channel.name.substring(0, 2).toUpperCase()}</span>`;
            
            channelItem.innerHTML = `
                <div class="channel-logo-small">
                    ${logoText}
                </div>
                <div class="channel-info-small">
                    <h4>${channel.name}</h4>
                    <p>${channel.category || 'Pa kategori'}</p>
                </div>
            `;
            
            channelItem.addEventListener('click', () => this.playChannel(channel));
            this.channelsList.appendChild(channelItem);
        });
        
        this.updateChannelCount();
    }
    
    updateChannelCount() {
        let count = this.channels.length;
        if (this.currentCategory) {
            count = this.channels.filter(c => c.category === this.currentCategory).length;
        }
        this.channelCount.textContent = `${count} kanale`;
    }
    
    searchChannels(term) {
        this.displayChannels();
    }
    
    // Channel playback
    async playChannel(channel) {
        this.currentChannel = channel;
        
        // Update UI
        this.currentChannelName.textContent = channel.name;
        this.currentProgram.textContent = channel.category || 'Live TV';
        this.currentLogo.textContent = channel.name.substring(0, 2).toUpperCase();
        
        // Update active channel in list
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === channel.id) {
                item.classList.add('active');
            }
        });
        
        // Show loading
        this.showLoading(`Duke ngarkuar ${channel.name}...`);
        
        // Update EPG info
        this.updateEpgInfo(channel);
        
        // Play stream
        await this.playStream(channel.url);
    }
    
    async playStream(url) {
        if (!url) {
            this.showError('Nuk ka URL stream!');
            return;
        }
        
        // Stop current playback
        if (this.hls) {
            this.hls.destroy();
        }
        this.videoPlayer.pause();
        this.videoPlayer.src = '';
        
        // Check player type
        if (this.settings.playerType === 'hls' && typeof Hls !== 'undefined' && Hls.isSupported()) {
            // Use HLS.js for better compatibility
            this.hls = new Hls({
                maxBufferSize: this.settings.bufferSize * 1000,
                maxBufferLength: this.settings.maxBufferLength,
                enableWorker: true
            });
            
            this.hls.loadSource(url);
            this.hls.attachMedia(this.videoPlayer);
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (this.settings.autoPlay) {
                    this.videoPlayer.play().catch(e => {
                        console.warn('Auto-play failed:', e);
                    });
                }
                this.hideLoading();
            });
            
        } else if (url.endsWith('.m3u8') && this.videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari, iOS)
            this.videoPlayer.src = url;
            if (this.settings.autoPlay) {
                this.videoPlayer.play().catch(e => {
                    console.warn('Auto-play failed:', e);
                });
            }
            this.hideLoading();
            
        } else {
            // Try direct play
            this.videoPlayer.src = url;
            if (this.settings.autoPlay) {
                this.videoPlayer.play().catch(e => {
                    console.warn('Auto-play failed:', e);
                });
            }
            this.hideLoading();
        }
    }
    
    updateEpgInfo(channel) {
        if (!channel.epg_channel_id || !this.epgData[channel.epg_channel_id]) {
            this.epgTitle.textContent = 'Nuk ka informacion EPG';
            this.epgDescription.textContent = 'Zgjidhni një kanal për të parë programin';
            this.epgStart.textContent = '--:--';
            this.epgEnd.textContent = '--:--';
            return;
        }
        
        const now = new Date();
        const programs = this.epgData[channel.epg_channel_id];
        const currentProgram = programs.find(prog => 
            prog.start <= now && prog.end >= now
        );
        
        if (currentProgram) {
            this.epgTitle.textContent = currentProgram.title;
            this.epgDescription.textContent = currentProgram.description || 'Pa përshkrim';
            this.epgStart.textContent = currentProgram.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            this.epgEnd.textContent = currentProgram.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            this.epgTitle.textContent = 'Nuk ka program aktual';
            this.epgDescription.textContent = 'Nuk ka informacion për programin aktual';
            this.epgStart.textContent = '--:--';
            this.epgEnd.textContent = '--:--';
        }
    }
    
    showEpgModal() {
        if (!this.currentChannel || !this.epgData) {
            this.showError('Nuk ka të dhëna EPG për të shfaqur');
            return;
        }
        
        this.showModal(this.epgModal);
        this.epgGrid.innerHTML = '';
        
        // Simple EPG grid implementation
        const channelId = this.currentChannel.epg_channel_id;
        if (channelId && this.epgData[channelId]) {
            const programs = this.epgData[channelId];
            
            // Create header
            const headerCell = document.createElement('div');
            headerCell.className = 'epg-cell epg-channel-cell';
            headerCell.textContent = this.currentChannel.name;
            this.epgGrid.appendChild(headerCell);
            
            // Create program cells (simplified - just show next 6 hours)
            const now = new Date();
            const endTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
            
            let currentTime = new Date(now);
            currentTime.setMinutes(0, 0, 0); // Round to current hour
            
            while (currentTime < endTime) {
                const programCell = document.createElement('div');
                programCell.className = 'epg-cell epg-program-cell';
                programCell.textContent = currentTime.toLocaleTimeString([], {hour: '2-digit'});
                this.epgGrid.appendChild(programCell);
                
                currentTime.setHours(currentTime.getHours() + 1);
            }
        }
    }
    
    // Player controls
    togglePlayPause() {
        if (this.videoPlayer.paused) {
            this.videoPlayer.play();
        } else {
            this.videoPlayer.pause();
        }
    }
    
    prevChannel() {
        if (!this.currentChannel) return;
        
        const currentIndex = this.channels.findIndex(c => c.id === this.currentChannel.id);
        const prevIndex = (currentIndex - 1 + this.channels.length) % this.channels.length;
        this.playChannel(this.channels[prevIndex]);
    }
    
    nextChannel() {
        if (!this.currentChannel) return;
        
        const currentIndex = this.channels.findIndex(c => c.id === this.currentChannel.id);
        const nextIndex = (currentIndex + 1) % this.channels.length;
        this.playChannel(this.channels[nextIndex]);
    }
    
    setVolume(value) {
        this.videoPlayer.volume = value / 100;
        this.volumeIcon.className = value > 50 ? 'fas fa-volume-up' : 
                                  value > 0 ? 'fas fa-volume-down' : 
                                  'fas fa-volume-mute';
    }
    
    changeVolume(delta) {
        const newVolume = Math.min(100, Math.max(0, this.videoPlayer.volume * 100 + delta));
        this.volumeSlider.value = newVolume;
        this.setVolume(newVolume);
    }
    
    toggleMute() {
        this.videoPlayer.muted = !this.videoPlayer.muted;
        this.volumeIcon.className = this.videoPlayer.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
    
    seek(seconds) {
        this.videoPlayer.currentTime += seconds;
    }
    
    toggleFullscreen() {
        const playerContainer = document.querySelector('.player-container');
        
        if (!document.fullscreenElement) {
            if (playerContainer.requestFullscreen) {
                playerContainer.requestFullscreen();
            } else if (playerContainer.webkitRequestFullscreen) {
                playerContainer.webkitRequestFullscreen();
            } else if (playerContainer.msRequestFullscreen) {
                playerContainer.msRequestFullscreen();
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
    
    // Event handlers
    onPlay() {
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.streamStatus.textContent = 'Duke luajtur';
    }
    
    onPause() {
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.streamStatus.textContent = 'I pauzuar';
    }
    
    onPlayerError(e) {
        console.error('Player error:', e);
        this.showError('Gabim në riprodhim. Duke u rikonektuar...');
        
        // Try to recover after 3 seconds
        setTimeout(() => {
            if (this.currentChannel) {
                this.playChannel(this.currentChannel);
            }
        }, 3000);
    }
    
    onLoadedMetadata() {
        const width = this.videoPlayer.videoWidth;
        const height = this.videoPlayer.videoHeight;
        this.streamResolution.textContent = `${width}x${height}`;
    }
    
    updateStreamInfo(data) {
        if (data && data.level && data.level.bitrate) {
            const bitrate = Math.round(data.level.bitrate / 1000);
            this.streamBitrate.textContent = `${bitrate} kbps`;
        }
    }
    
    // Import Xtream Codes (from URL parameters)
    importXtreamCodes() {
        const url = prompt('Vendosni URL-në e Xtream Codes (ose string connection):');
        if (!url) return;
        
        // Try to parse Xtream Codes URL
        if (url.includes('/player_api.php')) {
            // Full API URL
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);
            
            this.serverUrl.value = `${urlObj.protocol}//${urlObj.host}`;
            this.username.value = params.get('username') || '';
            this.password.value = params.get('password') || '';
            
            this.showSuccess('Xtream Codes URL u importua! Klikoni Lidhu.');
            
        } else if (url.includes(':')) {
            // Format: server:port:username:password
            const parts = url.split(':');
            if (parts.length >= 4) {
                this.serverUrl.value = `http://${parts[0]}:${parts[1]}`;
                this.username.value = parts[2];
                this.password.value = parts[3];
                this.showSuccess('Xtream Codes u importua! Klikoni Lidhu.');
            } else {
                this.showError('Format i pavlefshëm! Përdorni: server:port:username:password');
            }
        } else {
            this.showError('URL e pavlefshme!');
        }
    }
    
    // Settings management
    loadSettings() {
        const saved = localStorage.getItem('iptvPlayerSettings');
        if (saved) {
            this.settings = {...this.settings, ...JSON.parse(saved)};
        }
        
        // Apply settings to UI
        this.playerType.value = this.settings.playerType;
        this.defaultQuality.value = this.settings.defaultQuality;
        this.autoPlayCheck.checked = this.settings.autoPlay;
        this.bufferSize.value = this.settings.bufferSize;
        this.maxBufferLength.value = this.settings.maxBufferLength;
        this.bufferValue.textContent = this.settings.bufferSize + 's';
        this.maxBufferValue.textContent = this.settings.maxBufferLength + 's';
    }
    
    saveSettings() {
        this.settings = {
            playerType: this.playerType.value,
            defaultQuality: this.defaultQuality.value,
            autoPlay: this.autoPlayCheck.checked,
            bufferSize: parseInt(this.bufferSize.value),
            maxBufferLength: parseInt(this.maxBufferLength.value)
        };
        
        localStorage.setItem('iptvPlayerSettings', JSON.stringify(this.settings));
        this.showSuccess('Cilësimet u ruajtën!');
        this.hideModal(this.settingsModal);
    }
    
    switchTab(button) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show corresponding content
        const tabId = button.dataset.tab + 'Tab';
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(tabId).style.display = 'block';
    }
    
    // Utility methods
    showModal(modal) {
        modal.style.display = 'flex';
    }
    
    hideModal(modal) {
        modal.style.display = 'none';
    }
    
    showM3uModal() {
        this.showModal(this.m3uModal);
    }
    
    showLoading(message) {
        this.loadingIndicator.style.display = 'block';
        if (message) {
            this.loadingIndicator.querySelector('p').textContent = message;
        }
    }
    
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }
    
    showError(message) {
        alert(`Gabim: ${message}`);
    }
    
    showSuccess(message) {
        // You could replace this with a toast notification
        console.log('Success:', message);
    }
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.iptvPlayer = new IptvPlayer();
    
    // Try to load demo M3U on startup (optional)
    // You can uncomment this to load a demo playlist
    /*
    setTimeout(() => {
        const demoM3u = `#EXTM3U
#EXTINF:-1 tvg-id="rtk1.al" tvg-name="RTK 1" tvg-logo="https://example.com/rtk1.png" group-title="News",RTK 1
http://example.com/stream1.m3u8
#EXTINF:-1 tvg-id="rtk2.al" tvg-name="RTK 2" tvg-logo="https://example.com/rtk2.png" group-title="Entertainment",RTK 2
http://example.com/stream2.m3u8
#EXTINF:-1 tvg-id="klankosova.al" tvg-name="Klan Kosova" tvg-logo="https://example.com/klankosova.png" group-title="General",Klan Kosova
http://example.com/stream3.m3u8`;
        
        window.iptvPlayer.processM3uContent(demoM3u);
    }, 1000);
    */
});

// Add this CSS for channel logos
const style = document.createElement('style');
style.textContent = `
.channel-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
}

.epg-grid {
    display: grid;
    grid-template-columns: auto repeat(24, 1fr);
    gap: 1px;
    background: #333;
}

.epg-cell {
    padding: 8px;
    background: #1a1a1a;
    min-height: 60px;
    border-bottom: 1px solid #333;
}

.epg-channel-cell {
    background: #121212;
    position: sticky;
    left: 0;
    z-index: 2;
}
`;
document.head.appendChild(style);
