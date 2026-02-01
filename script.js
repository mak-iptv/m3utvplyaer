class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.hls = null;
        this.isHlsSupported = false;
        
        // KONFIGURIME STRINGTE PËR TË NDALUAR AUTO-SWITCHING
        this.autoSwitchEnabled = false; // FIKUR DEFAULT
        this.isSwitching = false;
        this.currentChannelIndex = -1;
        this.playbackAttempts = 0;
        this.maxPlaybackAttempts = 1; // VETËM 1 PROVIM
        this.errorTimeout = null;
        this.retryTimeout = null;
        
        // Kontroll për HLS.js
        this.hlsErrorCount = 0;
        this.maxHlsErrors = 2;
        
        // Flag për të parandaluar çdo auto-switch
        this.blockAllAutoSwitches = true;
        
        this.init();
    }
    
    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupHLS();
        
        // Fik butonin auto-switch që nga fillimi
        const autoSwitchToggle = document.getElementById('autoSwitchToggle');
        if (autoSwitchToggle) {
            autoSwitchToggle.checked = false;
            this.autoSwitchEnabled = false;
        }
        
        this.showMessage('IPTV Player u inicializua. Auto-switch është FIKUR.', 'info');
        
        console.log('IPTV Player initialized - AUTO-SWITCH DISABLED');
    }
    
    setupElements() {
        // Elementet bazë
        this.elements = {
            videoPlayer: document.getElementById('videoPlayer'),
            channelList: document.getElementById('channelList'),
            currentChannel: document.getElementById('currentChannel'),
            status: document.getElementById('status'),
            playerState: document.getElementById('playerState'),
            channelsLoaded: document.getElementById('channelsLoaded'),
            channelCount: document.getElementById('channelCount'),
            streamStatus: document.getElementById('streamStatus'),
            bufferIndicator: document.getElementById('bufferIndicator'),
            playerOverlay: document.getElementById('playerOverlay'),
            overlayText: document.getElementById('overlayText'),
            overlayIcon: document.getElementById('overlayIcon')
        };
        
        // Krijo loading overlay
        this.createLoadingOverlay();
        this.createErrorOverlay();
        this.createStrictModeControls();
    }
    
    createStrictModeControls() {
        // Shto kontrolle strikte për të parandaluar auto-switch
        const playerInfo = document.querySelector('.player-info');
        if (!playerInfo) return;
        
        const strictControls = document.createElement('div');
        strictControls.className = 'strict-controls';
        strictControls.innerHTML = `
            <div class="strict-header">
                <h4>🔒 Strict Playback Controls</h4>
                <span class="strict-status" id="strictStatus">ACTIVE</span>
            </div>
            <div class="strict-options">
                <div class="strict-option">
                    <label class="strict-switch">
                        <input type="checkbox" id="strictModeToggle" checked disabled>
                        <span class="strict-slider"></span>
                        <span class="strict-label">STRICT MODE (No Auto-switch)</span>
                    </label>
                </div>
                <div class="strict-buttons">
                    <button id="forceStopSwitch" class="btn-danger">
                        ⏹️ Force Stop Auto-Switch
                    </button>
                    <button id="lockChannel" class="btn-success">
                        🔒 Lock Current Channel
                    </button>
                    <button id="disableHlsRecovery" class="btn-warning">
                        🚫 Disable HLS Recovery
                    </button>
                </div>
                <div class="protection-status">
                    <div class="protection-item">
                        <span class="protection-label">Auto-Switch:</span>
                        <span class="protection-value blocked">BLOCKED</span>
                    </div>
                    <div class="protection-item">
                        <span class="protection-label">HLS Recovery:</span>
                        <span class="protection-value blocked" id="hlsRecoveryStatus">BLOCKED</span>
                    </div>
                    <div class="protection-item">
                        <span class="protection-label">Channel Lock:</span>
                        <span class="protection-value" id="channelLockStatus">OFF</span>
                    </div>
                </div>
            </div>
        `;
        
        playerInfo.appendChild(strictControls);
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
        
        // Sample data
        document.getElementById('loadSample').addEventListener('click', () => {
            this.loadSampleData();
        });
        
        // Direct play
        document.getElementById('playDirect').addEventListener('click', () => {
            this.playDirectStream();
        });
        
        // STRICT CONTROLS
        this.setupStrictControlListeners();
        
        // Video events - KONFIGURIME STRIKTE
        this.setupStrictVideoEvents();
    }
    
    setupStrictControlListeners() {
        // Force Stop Auto-Switch
        document.getElementById('forceStopSwitch').addEventListener('click', () => {
            this.blockAllAutoSwitches = true;
            this.autoSwitchEnabled = false;
            this.showMessage('FORCE STOP: All auto-switching disabled', 'warning');
            this.updateProtectionStatus();
        });
        
        // Lock Channel
        document.getElementById('lockChannel').addEventListener('click', () => {
            this.lockCurrentChannel();
        });
        
        // Disable HLS Recovery
        document.getElementById('disableHlsRecovery').addEventListener('click', () => {
            this.disableHlsRecovery();
        });
        
        // Auto-switch toggle - GJITHMONË FIKUR
        const autoSwitchToggle = document.getElementById('autoSwitchToggle');
        if (autoSwitchToggle) {
            autoSwitchToggle.checked = false;
            autoSwitchToggle.disabled = true; // Bëje të pa-editueshme
            autoSwitchToggle.addEventListener('change', (e) => {
                // Mos lejo ndryshim
                e.target.checked = false;
                this.autoSwitchEnabled = false;
                this.showMessage('Auto-switch is PERMANENTLY DISABLED in strict mode', 'error');
            });
        }
    }
    
    setupStrictVideoEvents() {
        const video = this.elements.videoPlayer;
        
        // FSHI çdo event listener ekzistues për të parandaluar konflikte
        video.replaceWith(video.cloneNode(true));
        this.elements.videoPlayer = document.getElementById('videoPlayer');
        
        const newVideo = this.elements.videoPlayer;
        
        // VETËM eventet bazë, JO asnjë auto-recovery
        newVideo.addEventListener('playing', () => {
            this.elements.playerState.textContent = 'Playing';
            this.elements.streamStatus.textContent = 'Playing';
            this.elements.bufferIndicator.style.display = 'none';
            this.hlsErrorCount = 0; // Reset error count kur fillon të luajë
            console.log('PLAYING - No auto-switch allowed');
        });
        
        newVideo.addEventListener('pause', () => {
            this.elements.playerState.textContent = 'Paused';
            this.elements.streamStatus.textContent = 'Paused';
        });
        
        newVideo.addEventListener('waiting', () => {
            this.elements.playerState.textContent = 'Buffering';
            this.elements.streamStatus.textContent = 'Buffering...';
            this.elements.bufferIndicator.style.display = 'block';
            
            // MOS bëj asgjë automatikisht - vetëm prit
            console.log('BUFFERING - Waiting for user action');
        });
        
        // ERROR HANDLING STRIKT - MOS bëj asgjë automatikisht
        newVideo.addEventListener('error', (e) => {
            console.error('Video error (STRICT MODE):', e);
            this.elements.playerState.textContent = 'Error';
            this.elements.streamStatus.textContent = 'Playback Error';
            
            // SHFAQ MESAZH POR MOS BËJ ASNJË AUTO-SWITCH
            this.showStrictError();
            
            // MOS fillo asnjë timeout për auto-switch
            // MOS provo të rikthehesh automatikisht
            // MOS ndërro kanal automatikisht
        });
        
        newVideo.addEventListener('loadeddata', () => {
            this.elements.playerState.textContent = 'Loaded';
        });
        
        // MOS shto event listener për 'ended' - mos lejo auto-switch
        // MOS shto buffer monitoring automatik
    }
    
    setupHLS() {
        if (window.Hls) {
            this.isHlsSupported = Hls.isSupported();
            console.log('HLS.js supported:', this.isHlsSupported);
            
            // Override Hls default behaviors për të parandaluar auto-recovery
            this.patchHlsBehavior();
        }
    }
    
    patchHlsBehavior() {
        // Ruaj konstruktorin origjinal të Hls
        const OriginalHls = window.Hls;
        
        // Override konstruktorin për të ndryshuar default config
        window.Hls = class StrictHls extends OriginalHls {
            constructor(config = {}) {
                // Konfigurim STRIKT që parandalon çdo auto-recovery
                const strictConfig = {
                    ...config,
                    // DISABLE ALL AUTO-RECOVERY FEATURES
                    enableWorker: false, // Worker shkakton probleme
                    lowLatencyMode: false,
                    backBufferLength: 0,
                    
                    // ZERO RETRIES - MOS PROVO AUTOMATIKISHT
                    manifestLoadingMaxRetry: 0,
                    manifestLoadingRetryDelay: 0,
                    manifestLoadingMaxRetryTimeout: 0,
                    
                    levelLoadingMaxRetry: 0,
                    levelLoadingRetryDelay: 0,
                    levelLoadingMaxRetryTimeout: 0,
                    
                    fragLoadingMaxRetry: 0,
                    fragLoadingRetryDelay: 0,
                    fragLoadingMaxRetryTimeout: 0,
                    
                    // DISABLE AUTO-QUALITY SWITCHING
                    autoLevelEnabled: false,
                    capLevelToPlayerSize: false,
                    capLevelOnFPSDrop: false,
                    
                    // DISABLE OTHER AUTO-FEATURES
                    testBandwidth: false,
                    abrEwmaDefaultEstimate: 0,
                    abrEwmaSlowLive: 0,
                    abrEwmaFastLive: 0,
                    abrEwmaDefaultLive: 0,
                    abrEwmaSlowVoD: 0,
                    abrEwmaFastVoD: 0,
                    abrEwmaDefaultVoD: 0,
                    
                    // MAX BUFFER VERY SMALL
                    maxMaxBufferLength: 1,
                    maxBufferSize: 1000,
                    
                    // DISABLE LIVE SYNC
                    liveSyncDurationCount: 0,
                    liveMaxLatencyDurationCount: 0,
                    liveSyncDuration: 0
                };
                
                super(strictConfig);
                
                // Override event handlers për të parandaluar auto-recovery
                this.on(this.Events.ERROR, (event, data) => {
                    console.log('HLS ERROR (STRICT MODE - NO AUTO-RECOVERY):', data);
                    
                    // MOS bëj asnjë auto-recovery
                    // MOS thirr startLoad()
                    // MOS thirr recoverMediaError()
                    // MOS bëj asgjë automatikisht
                    
                    // Vetëm log dhe stop
                    if (data.fatal) {
                        console.log('FATAL HLS ERROR - STOPPING PLAYBACK');
                        this.destroy();
                    }
                });
            }
        };
        
        // Ruaj reference
        window.Hls = Object.assign(window.Hls, OriginalHls);
    }
    
    async playChannel(channel, index) {
        if (this.isSwitching) {
            console.log('Already switching, please wait...');
            return;
        }
        
        this.isSwitching = true;
        this.showLoading(`Loading ${channel.name}...`);
        
        try {
            // Stop any existing playback COMPLETELY
            await this.stopAllPlayback();
            
            // Update UI
            this.setActiveChannel(index);
            this.updateChannelInfo(channel);
            this.currentChannelIndex = index;
            this.currentChannel = channel;
            this.playbackAttempts = 0;
            
            // Play new stream with STRICT settings
            await this.playStreamStrict(channel.url);
            
            this.showMessage(`Playing: ${channel.name}`, 'success');
            
        } catch (error) {
            console.error('Play channel error:', error);
            
            // MOS PROVO AUTO-SWITCH KURRË
            this.showStrictError(`Failed to play: ${error.message}. Click another channel manually.`);
            
        } finally {
            this.isSwitching = false;
            this.hideLoading();
        }
    }
    
    async stopAllPlayback() {
        const video = this.elements.videoPlayer;
        
        // Pause and reset
        video.pause();
        video.src = '';
        video.load();
        
        // Destroy HLS instance COMPLETELY
        if (this.hls) {
            // Force destroy without any cleanup that might trigger events
            try {
                this.hls.destroy();
                this.hls = null;
            } catch (e) {
                console.log('Force HLS destroy');
            }
        }
        
        // Clear ALL timeouts and intervals
        this.clearAllTimeouts();
        
        // Force garbage collection
        video.removeAttribute('src');
        video.load();
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    clearAllTimeouts() {
        if (this.errorTimeout) clearTimeout(this.errorTimeout);
        if (this.retryTimeout) clearTimeout(this.retryTimeout);
        this.errorTimeout = null;
        this.retryTimeout = null;
        
        // Clear any other potential intervals
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
            window.clearTimeout(i);
            window.clearInterval(i);
        }
    }
    
    async playStreamStrict(url) {
        return new Promise((resolve, reject) => {
            const video = this.elements.videoPlayer;
            
            // Reset video completely
            video.src = '';
            video.load();
            
            // Setup ONE-TIME event listeners
            const onCanPlay = () => {
                cleanup();
                video.play().then(resolve).catch(reject);
            };
            
            const onError = (e) => {
                cleanup();
                reject(new Error(`Playback failed: ${video.error?.message || 'Unknown error'}`));
            };
            
            const cleanup = () => {
                video.removeEventListener('canplay', onCanPlay);
                video.removeEventListener('error', onError);
            };
            
            video.addEventListener('canplay', onCanPlay, { once: true });
            video.addEventListener('error', onError, { once: true });
            
            // Set source and load
            video.src = url;
            video.load();
            
            // Timeout për të mos pritur pafundësisht
            setTimeout(() => {
                if (video.readyState < 2) { // Nuk ka filluar të ngarkohet
                    cleanup();
                    reject(new Error('Playback timeout'));
                }
            }, 10000);
        });
    }
    
    showStrictError(message = 'Playback error. Channel will NOT switch automatically.') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'strict-error';
        errorDiv.innerHTML = `
            <div class="strict-error-header">
                <span class="strict-error-icon">🚫</span>
                <strong>STRICT MODE ERROR</strong>
            </div>
            <div class="strict-error-body">
                ${message}
            </div>
            <div class="strict-error-actions">
                <button onclick="iptvPlayer.retryCurrentChannelStrict()" class="btn-warning">
                    🔄 Manual Retry
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-small">
                    Close
                </button>
            </div>
        `;
        
        // Fshi çdo error ekzistues
        document.querySelectorAll('.strict-error').forEach(el => el.remove());
        
        document.querySelector('.player-section').appendChild(errorDiv);
        
        // Auto-remove pas 10 sekondash
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }
    
    retryCurrentChannelStrict() {
        if (this.currentChannel && this.currentChannelIndex >= 0) {
            this.playChannel(this.currentChannel, this.currentChannelIndex);
        }
    }
    
    lockCurrentChannel() {
        // Blloko çdo ndryshim kanali
        const lockStatus = document.getElementById('channelLockStatus');
        if (lockStatus.textContent === 'OFF') {
            lockStatus.textContent = 'ON';
            lockStatus.className = 'protection-value active';
            
            // Blloko klikimet në kanalet e tjera
            document.querySelectorAll('.channel-item').forEach(item => {
                if (!item.classList.contains('active')) {
                    item.style.opacity = '0.5';
                    item.style.pointerEvents = 'none';
                }
            });
            
            this.showMessage('Channel LOCKED - Other channels disabled', 'warning');
        } else {
            lockStatus.textContent = 'OFF';
            lockStatus.className = 'protection-value';
            
            // Zgjidh bllokimin
            document.querySelectorAll('.channel-item').forEach(item => {
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
            });
            
            this.showMessage('Channel UNLOCKED', 'info');
        }
    }
    
    disableHlsRecovery() {
        const recoveryStatus = document.getElementById('hlsRecoveryStatus');
        recoveryStatus.textContent = 'DISABLED';
        recoveryStatus.className = 'protection-value disabled';
        
        // Çaktivizo plotësisht HLS.js
        this.isHlsSupported = false;
        window.Hls = null;
        
        this.showMessage('HLS.js COMPLETELY DISABLED - Using native playback only', 'warning');
    }
    
    updateProtectionStatus() {
        const strictStatus = document.getElementById('strictStatus');
        strictStatus.textContent = this.blockAllAutoSwitches ? 'ACTIVE' : 'INACTIVE';
        strictStatus.className = this.blockAllAutoSwitches ? 'active' : '';
    }
    
    // ... (metodat e tjera mbeten të njëjta)
}

// Initialize kur faqja ngarkohet
document.addEventListener('DOMContentLoaded', () => {
    window.iptvPlayer = new IPTVPlayer();
});
