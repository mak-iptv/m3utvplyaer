class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.hls = null;
        this.isHlsSupported = false;
        this.debugMode = false;
        this.auth = { username: '', password: '' };
        
        // Variabla të rinj për kontroll
        this.autoSwitchEnabled = false;
        this.isSwitching = false;
        this.currentChannelIndex = -1;
        this.playbackAttempts = 0;
        this.maxPlaybackAttempts = 3;
        this.errorTimeout = null;
        this.retryTimeout = null;
        this.playbackHistory = [];
        this.maxHistory = 10;
        
        this.init();
    }
    
    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupHLS();
        this.loadUserSettings();
        
        this.showMessage('Welcome to IPTV Player! Load your M3U playlist to start.', 'info');
        
        console.log('IPTV Player initialized');
    }
    
    setupElements() {
        // ... (kodi i mëparshëm mbetet i njëjtë)
        
        // Shto elemente të reja për kontroll
        this.createPlaybackControls();
    }
    
    createPlaybackControls() {
        // Shto kontrolle për auto-switching në player section
        const playerInfo = document.querySelector('.player-info');
        const controls = document.createElement('div');
        controls.className = 'playback-controls';
        controls.innerHTML = `
            <div class="control-row">
                <label class="switch">
                    <input type="checkbox" id="autoSwitchToggle" checked>
                    <span class="slider"></span>
                    <span class="switch-label">Auto Switch on Error</span>
                </label>
                <button id="prevChannel" class="btn-small">⏮ Previous</button>
                <button id="nextChannel" class="btn-small">Next ⏭</button>
                <button id="retryChannel" class="btn-small">🔄 Retry</button>
            </div>
            <div class="attempts-counter">
                Attempts: <span id="attemptsCount">0</span>/3
            </div>
        `;
        playerInfo.appendChild(controls);
    }
    
    setupEventListeners() {
        // ... (kodi ekzistues)
        
        // Shto event listenerë të rinj
        this.setupPlaybackControlListeners();
    }
    
    setupPlaybackControlListeners() {
        // Auto-switch toggle
        document.getElementById('autoSwitchToggle').addEventListener('change', (e) => {
            this.autoSwitchEnabled = e.target.checked;
            this.showMessage(`Auto-switch ${this.autoSwitchEnabled ? 'enabled' : 'disabled'}`, 'info');
        });
        
        // Previous channel
        document.getElementById('prevChannel').addEventListener('click', () => {
            this.playPreviousChannel();
        });
        
        // Next channel
        document.getElementById('nextChannel').addEventListener('click', () => {
            this.playNextChannel();
        });
        
        // Retry current channel
        document.getElementById('retryChannel').addEventListener('click', () => {
            this.retryCurrentChannel();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.playPreviousChannel();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.playNextChannel();
                    break;
                case 'r':
                case 'R':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.retryCurrentChannel();
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
            }
        });
    }
    
    setupVideoEvents() {
        const video = this.elements.videoPlayer;
        
        video.addEventListener('playing', () => {
            this.elements.playerState.textContent = 'Playing';
            this.elements.streamStatus.textContent = 'Playing';
            this.elements.bufferIndicator.style.display = 'none';
            this.updatePlayerOverlay('Playing', '▶️');
            
            // Reset attempts counter on successful playback
            this.playbackAttempts = 0;
            this.updateAttemptsCounter();
            
            // Clear any error timeouts
            this.clearErrorTimeouts();
        });
        
        video.addEventListener('pause', () => {
            this.elements.playerState.textContent = 'Paused';
            this.elements.streamStatus.textContent = 'Paused';
        });
        
        video.addEventListener('waiting', () => {
            this.elements.playerState.textContent = 'Buffering';
            this.elements.streamStatus.textContent = 'Buffering...';
            this.elements.bufferIndicator.style.display = 'block';
            
            // Start timeout for buffering
            this.startBufferingTimeout();
        });
        
        video.addEventListener('error', (e) => {
            console.error('Video error:', e);
            this.elements.playerState.textContent = 'Error';
            this.elements.streamStatus.textContent = 'Playback Error';
            
            // Handle error with delay to prevent immediate switching
            this.handlePlaybackErrorWithDelay();
        });
        
        video.addEventListener('ended', () => {
            if (this.autoSwitchEnabled) {
                this.playNextChannel();
            }
        });
        
        video.addEventListener('loadeddata', () => {
            this.elements.playerState.textContent = 'Loaded';
        });
        
        // Monitor buffer health
        this.setupBufferMonitoring();
    }
    
    setupBufferMonitoring() {
        const video = this.elements.videoPlayer;
        let lastTime = 0;
        let stalledTime = 0;
        
        const checkBuffer = () => {
            if (!video.paused && video.currentTime === lastTime) {
                stalledTime += 100;
                if (stalledTime > 5000) { // 5 seconds stalled
                    console.warn('Stream stalled for 5 seconds');
                    this.handleStreamStall();
                }
            } else {
                stalledTime = 0;
            }
            lastTime = video.currentTime;
        };
        
        setInterval(checkBuffer, 100);
    }
    
    handleStreamStall() {
        if (this.playbackAttempts < this.maxPlaybackAttempts) {
            this.playbackAttempts++;
            this.updateAttemptsCounter();
            this.showMessage(`Stream stalled, retrying... (${this.playbackAttempts}/${this.maxPlaybackAttempts})`, 'warning');
            this.retryCurrentChannel();
        } else {
            this.handlePlaybackError();
        }
    }
    
    handlePlaybackErrorWithDelay() {
        // Clear any existing timeout
        this.clearErrorTimeouts();
        
        // Wait 3 seconds before handling error (give time for auto-recovery)
        this.errorTimeout = setTimeout(() => {
            this.handlePlaybackError();
        }, 3000);
    }
    
    clearErrorTimeouts() {
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
    }
    
    handlePlaybackError() {
        if (this.isSwitching) return;
        
        this.playbackAttempts++;
        this.updateAttemptsCounter();
        
        if (this.playbackAttempts >= this.maxPlaybackAttempts) {
            this.showError(`Failed to play ${this.currentChannel?.name || 'channel'} after ${this.maxPlaybackAttempts} attempts`);
            
            if (this.autoSwitchEnabled) {
                this.showMessage('Auto-switching to next channel...', 'info');
                setTimeout(() => this.playNextChannel(), 2000);
            }
        } else {
            this.showMessage(`Playback error, retrying... (${this.playbackAttempts}/${this.maxPlaybackAttempts})`, 'warning');
            this.retryTimeout = setTimeout(() => this.retryCurrentChannel(), 2000);
        }
    }
    
    startBufferingTimeout() {
        // If buffering takes too long, try to recover
        setTimeout(() => {
            if (this.elements.videoPlayer.readyState < 3) { // Still loading
                this.showMessage('Buffering taking too long, trying to recover...', 'warning');
                this.retryCurrentChannel();
            }
        }, 10000); // 10 seconds
    }
    
    async playChannel(channel, index) {
        if (this.isSwitching) {
            console.log('Already switching channels, please wait...');
            return;
        }
        
        this.isSwitching = true;
        this.showLoading(`Loading ${channel.name}...`);
        
        // Add to playback history
        this.addToHistory(index);
        
        try {
            // Update UI
            this.setActiveChannel(index);
            this.updateChannelInfo(channel);
            this.currentChannelIndex = index;
            this.playbackAttempts = 0;
            this.updateAttemptsCounter();
            
            // Stop any existing playback
            await this.stopCurrentPlayback();
            
            // Play new stream
            await this.playStream(channel.url);
            
            this.showMessage(`Playing: ${channel.name}`, 'success');
            
        } catch (error) {
            console.error('Play channel error:', error);
            
            if (this.autoSwitchEnabled && !error.message.includes('user aborted')) {
                this.showMessage(`Failed to play channel, trying next one...`, 'warning');
                setTimeout(() => this.playNextChannel(), 1000);
            } else {
                this.showError(`Failed to play: ${error.message}`);
                this.updatePlayerOverlay('Playback Failed', '❌');
            }
            
        } finally {
            this.isSwitching = false;
            this.hideLoading();
        }
    }
    
    async stopCurrentPlayback() {
        const video = this.elements.videoPlayer;
        
        // Pause and reset video
        video.pause();
        video.src = '';
        video.load();
        
        // Destroy HLS instance if exists
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        // Clear any pending timeouts
        this.clearErrorTimeouts();
        
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    async playStream(url) {
        return new Promise(async (resolve, reject) => {
            const video = this.elements.videoPlayer;
            let playAttempted = false;
            
            const cleanup = () => {
                video.removeEventListener('canplay', canplayHandler);
                video.removeEventListener('error', errorHandler);
                clearTimeout(playTimeout);
            };
            
            const canplayHandler = () => {
                if (!playAttempted) {
                    playAttempted = true;
                    video.play().then(resolve).catch(errorHandler);
                }
            };
            
            const errorHandler = (e) => {
                cleanup();
                reject(new Error(`Playback failed: ${video.error?.message || 'Unknown error'}`));
            };
            
            const playTimeout = setTimeout(() => {
                if (!playAttempted) {
                    cleanup();
                    reject(new Error('Playback timeout'));
                }
            }, 15000);
            
            video.addEventListener('canplay', canplayHandler);
            video.addEventListener('error', errorHandler);
            
            try {
                if (url.includes('.m3u8') && this.isHlsSupported) {
                    await this.playWithHLS(url);
                } else {
                    video.src = url;
                    video.load();
                }
                
                // If video is already ready, trigger canplay
                if (video.readyState >= 3) {
                    canplayHandler();
                }
                
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
    }
    
    async playWithHLS(url) {
        return new Promise((resolve, reject) => {
            // Destroy existing HLS instance
            if (this.hls) {
                this.hls.destroy();
            }
            
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 2, // Reduced retries
                levelLoadingTimeOut: 10000,
                levelLoadingMaxRetry: 2,
                fragLoadingTimeOut: 15000,
                fragLoadingMaxRetry: 2,
                fragLoadingMaxRetryTimeout: 2000,
                manifestLoadingMaxRetryTimeout: 2000,
                levelLoadingMaxRetryTimeout: 2000,
                
                // Error recovery configuration
                enableSoftwareAES: true,
                stretchShortVideoTrack: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10
            });
            
            this.hls.loadSource(url);
            this.hls.attachMedia(this.elements.videoPlayer);
            
            // Prevent HLS from auto-switching quality levels too aggressively
            this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                console.log('Quality level switched to:', data.level);
            });
            
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest parsed successfully');
                resolve();
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
                            console.log('Fatal HLS error, destroying instance');
                            this.hls.destroy();
                            this.hls = null;
                            reject(new Error('HLS fatal error'));
                            break;
                    }
                }
            });
            
            // Timeout for HLS loading
            setTimeout(() => {
                if (this.hls && !this.hls.media) {
                    this.hls.destroy();
                    this.hls = null;
                    reject(new Error('HLS loading timeout'));
                }
            }, 10000);
        });
    }
    
    playPreviousChannel() {
        if (this.channels.length === 0 || this.isSwitching) return;
        
        let newIndex = this.currentChannelIndex - 1;
        if (newIndex < 0) newIndex = this.channels.length - 1;
        
        this.playChannel(this.channels[newIndex], newIndex);
    }
    
    playNextChannel() {
        if (this.channels.length === 0 || this.isSwitching) return;
        
        let newIndex = this.currentChannelIndex + 1;
        if (newIndex >= this.channels.length) newIndex = 0;
        
        this.playChannel(this.channels[newIndex], newIndex);
    }
    
    retryCurrentChannel() {
        if (this.currentChannel && this.currentChannelIndex >= 0 && !this.isSwitching) {
            this.playChannel(this.currentChannel, this.currentChannelIndex);
        }
    }
    
    togglePlayPause() {
        const video = this.elements.videoPlayer;
        if (video.paused) {
            video.play().catch(e => console.log('Play failed:', e));
        } else {
            video.pause();
        }
    }
    
    addToHistory(index) {
        this.playbackHistory.unshift(index);
        if (this.playbackHistory.length > this.maxHistory) {
            this.playbackHistory.pop();
        }
    }
    
    updateAttemptsCounter() {
        const counter = document.getElementById('attemptsCount');
        if (counter) {
            counter.textContent = this.playbackAttempts;
            counter.className = this.playbackAttempts > 1 ? 'warning' : '';
        }
    }
    
    // ... (pjesa tjetër e metodave mbetet e njëjtë)
}
