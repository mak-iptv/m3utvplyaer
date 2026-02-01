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
        
        // Proxy option for CORS issues
        this.useProxy = false;
        this.proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Public proxy
        
        this.init();
    }
    
    async init() {
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
    
    // FIX 1: Metoda e re për të testuar lidhjen
    async testProviderConnection(serverUrl, username, password) {
        try {
            // Clean server URL
            const baseUrl = serverUrl.replace(/\/$/, '');
            
            // Test multiple endpoints
            const endpoints = [
                `${baseUrl}/player_api.php?username=${username}&password=${password}`,
                `${baseUrl}/panel_api.php?username=${username}&password=${password}`,
                `${baseUrl}/api.php?username=${username}&password=${password}`
            ];
            
            let workingEndpoint = null;
            
            for (const endpoint of endpoints) {
                try {
                    console.log('Testing endpoint:', endpoint);
                    
                    const testUrl = this.useProxy ? this.proxyUrl + endpoint : endpoint;
                    
                    const response = await fetch(testUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'IPTV-Player/1.0'
                        },
                        timeout: 10000
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Response data:', data);
                        
                        if (data && (data.user_info || Array.isArray(data))) {
                            workingEndpoint = endpoint;
                            break;
                        }
                    }
                } catch (e) {
                    console.log(`Endpoint ${endpoint} failed:`, e.message);
                    continue;
                }
            }
            
            return workingEndpoint;
            
        } catch (error) {
            console.error('Test connection error:', error);
            return null;
        }
    }
    
    // FIX 2: Metoda e përmirësuar për authentication
    async authenticate(endpoint) {
        try {
            const url = this.useProxy ? this.proxyUrl + endpoint : endpoint;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.user_info) {
                // Xtream Codes format
                if (data.user_info.auth === 1) {
                    this.config.token = data.user_info.token || '';
                    this.config.expiration = data.user_info.exp_date || '';
                    return true;
                } else {
                    throw new Error('Authentication failed: Invalid credentials');
                }
            } else if (data.server_info) {
                // Alternative format
                this.config.token = data.server_info.token || '';
                return true;
            } else if (Array.isArray(data)) {
                // Simple array response
                this.config.token = 'array_response';
                return true;
            } else {
                throw new Error('Unknown response format');
            }
            
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }
    
    // FIX 3: Metoda e përmirësuar për të marrë kanalet
    async loadLiveData() {
        try {
            // Try multiple API endpoints
            const endpoints = [
                `get_live_categories`,
                `live_categories`,
                `categories`
            ];
            
            let categoriesData = null;
            let categoriesEndpoint = null;
            
            // Try each endpoint
            for (const endpoint of endpoints) {
                try {
                    const url = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=${endpoint}`;
                    const fullUrl = this.useProxy ? this.proxyUrl + url : url;
                    
                    const response = await fetch(fullUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`Endpoint ${endpoint} response:`, data);
                        
                        if (data && (Array.isArray(data) || data.categories)) {
                            categoriesData = data;
                            categoriesEndpoint = endpoint;
                            break;
                        }
                    }
                } catch (e) {
                    console.log(`Endpoint ${endpoint} failed:`, e.message);
                    continue;
                }
            }
            
            if (!categoriesData) {
                throw new Error('Could not fetch categories from any endpoint');
            }
            
            // Parse categories
            if (Array.isArray(categoriesData)) {
                this.data.liveCategories = categoriesData;
            } else if (categoriesData.categories) {
                this.data.liveCategories = categoriesData.categories;
            } else {
                this.data.liveCategories = [];
            }
            
            // Now get streams
            const streamEndpoints = [
                `get_live_streams`,
                `live_streams`,
                `streams`
            ];
            
            let streamsData = null;
            
            for (const endpoint of streamEndpoints) {
                try {
                    const url = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}&action=${endpoint}`;
                    const fullUrl = this.useProxy ? this.proxyUrl + url : url;
                    
                    const response = await fetch(fullUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`Stream endpoint ${endpoint} response:`, data);
                        
                        if (data && (Array.isArray(data) || data.streams)) {
                            streamsData = data;
                            break;
                        }
                    }
                } catch (e) {
                    console.log(`Stream endpoint ${endpoint} failed:`, e.message);
                    continue;
                }
            }
            
            if (!streamsData) {
                throw new Error('Could not fetch streams from any endpoint');
            }
            
            // Parse streams
            let rawStreams = [];
            if (Array.isArray(streamsData)) {
                rawStreams = streamsData;
            } else if (streamsData.streams) {
                rawStreams = streamsData.streams;
            }
            
            // Process streams
            this.data.liveStreams = rawStreams.map((stream, index) => {
                // Handle different field names from different providers
                const streamId = stream.stream_id || stream.id || index + 1;
                const name = stream.name || stream.title || stream.stream_display_name || `Channel ${streamId}`;
                const categoryId = stream.category_id || stream.cat_id || stream.categoryId || 1;
                const logo = stream.stream_icon || stream.logo || stream.channel_logo || '';
                const number = stream.num || stream.number || index + 101;
                
                return {
                    stream_id: streamId,
                    name: name,
                    category_id: categoryId,
                    number: number,
                    logo: logo,
                    quality: this.detectQuality(name),
                    language: this.detectLanguage(name),
                    added: stream.added || '',
                    custom_sid: stream.custom_sid || '',
                    tv_archive: stream.tv_archive || 0,
                    direct_source: stream.direct_source || '',
                    tv_archive_duration: stream.tv_archive_duration || 0
                };
            });
            
            console.log('Processed streams:', this.data.liveStreams);
            
            // Group streams by category
            this.groupStreamsByCategory();
            
            // Render categories
            this.renderCategories();
            
            // Update counters
            this.categoriesCount.textContent = this.data.liveCategories.length;
            this.channelsCount.textContent = this.data.liveStreams.length;
            this.totalChannels.textContent = this.data.liveStreams.length;
            
            this.showToast(`U ngarkuan ${this.data.liveCategories.length} kategori dhe ${this.data.liveStreams.length} kanale`, 'success');
            
        } catch (error) {
            console.error('Error loading live data:', error);
            throw error;
        }
    }
    
    // FIX 4: Metoda alternative për providerë të ndryshëm
    async loadAllDataAlternative() {
        try {
            // Try to get everything from one endpoint
            const url = `${this.config.apiBase}/player_api.php?username=${this.config.username}&password=${this.config.password}`;
            const fullUrl = this.useProxy ? this.proxyUrl + url : url;
            
            const response = await fetch(fullUrl);
            const data = await response.json();
            
            console.log('Full API response:', data);
            
            if (data) {
                // Try to extract categories and streams
                if (data.categories && Array.isArray(data.categories)) {
                    this.data.liveCategories = data.categories;
                }
                
                if (data.available_channels && Array.isArray(data.available_channels)) {
                    this.data.liveStreams = data.available_channels.map((channel, index) => ({
                        stream_id: channel.id || index + 1,
                        name: channel.name || `Channel ${index + 1}`,
                        category_id: channel.category_id || 1,
                        number: channel.num || index + 101,
                        logo: channel.logo || '',
                        quality: this.detectQuality(channel.name),
                        language: this.detectLanguage(channel.name)
                    }));
                }
                
                if (this.data.liveStreams.length > 0) {
                    this.groupStreamsByCategory();
                    this.renderCategories();
                    this.categoriesCount.textContent = this.data.liveCategories.length;
                    this.channelsCount.textContent = this.data.liveStreams.length;
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('Alternative method failed:', error);
            return false;
        }
    }
    
    // FIX 5: Metoda e re për debug
    async debugProviderAPI() {
        const serverUrl = this.serverUrlInput.value.trim();
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!serverUrl || !username || !password) {
            this.showToast('Ju lutem plotësoni të gjitha fushat!', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Test basic connection
            const testUrl = `${serverUrl}/player_api.php?username=${username}&password=${password}`;
            console.log('Testing URL:', testUrl);
            
            const response = await fetch(testUrl);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            const text = await response.text();
            console.log('Response text:', text.substring(0, 500));
            
            try {
                const json = JSON.parse(text);
                console.log('Response JSON:', json);
                
                // Analyze response
                this.analyzeAPIResponse(json);
                
            } catch (e) {
                console.log('Response is not JSON:', e.message);
                this.showToast('Provideri nuk kthen JSON valid', 'error');
            }
            
        } catch (error) {
            console.error('Debug error:', error);
            this.showToast(`Debug error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    analyzeAPIResponse(data) {
        let analysis = 'Analiza e përgjigjes:\n\n';
        
        if (data.user_info) {
            analysis += `✓ User Info: ${JSON.stringify(data.user_info, null, 2)}\n`;
        }
        
        if (data.server_info) {
            analysis += `✓ Server Info: ${JSON.stringify(data.server_info, null, 2)}\n`;
        }
        
        if (Array.isArray(data)) {
            analysis += `✓ Array me ${data.length} elemente\n`;
            if (data.length > 0) {
                analysis += `✓ Shembull i elementit të parë: ${JSON.stringify(data[0], null, 2)}\n`;
            }
        }
        
        // Check for common fields
        const fields = Object.keys(data);
        analysis += `\nFushat e gjetura: ${fields.join(', ')}\n`;
        
        // Look for categories
        if (data.categories) {
            analysis += `✓ Kategoritë: ${Array.isArray(data.categories) ? data.categories.length : 'object'}\n`;
        }
        
        // Look for streams
        if (data.streams) {
            analysis += `✓ Streams: ${Array.isArray(data.streams) ? data.streams.length : 'object'}\n`;
        }
        
        if (data.available_channels) {
            analysis += `✓ Available Channels: ${data.available_channels.length}\n`;
        }
        
        console.log(analysis);
        alert(analysis);
    }
    
    // FIX 6: Metoda e përditësuar për të lidhur
    async connectToProvider() {
        const serverUrl = this.serverUrlInput.value.trim();
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!serverUrl || !username || !password) {
            this.showToast('Ju lutem plotësoni të gjitha fushat!', 'error');
            return;
        }
        
        // Validate and clean URL
        let cleanUrl = serverUrl;
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = 'http://' + cleanUrl;
        }
        cleanUrl = cleanUrl.replace(/\/$/, ''); // Remove trailing slash
        
        this.showLoading(true);
        this.updateConnectionStatus('connecting', 'Duke lidhur...');
        
        try {
            console.log('Attempting connection to:', cleanUrl);
            
            // Try different connection methods
            let connected = false;
            
            // Method 1: Standard Xtream Codes
            try {
                const endpoint = await this.testProviderConnection(cleanUrl, username, password);
                
                if (endpoint) {
                    console.log('Found working endpoint:', endpoint);
                    
                    this.config.apiBase = cleanUrl;
                    this.config.username = username;
                    this.config.password = password;
                    
                    // Authenticate
                    await this.authenticate(endpoint);
                    
                    // Try standard data loading
                    await this.loadLiveData();
                    connected = true;
                }
            } catch (e) {
                console.log('Method 1 failed:', e.message);
            }
            
            // Method 2: Alternative API structure
            if (!connected) {
                console.log('Trying alternative method...');
                try {
                    connected = await this.loadAllDataAlternative();
                } catch (e) {
                    console.log('Method 2 failed:', e.message);
                }
            }
            
            // Method 3: Manual M3U parsing
            if (!connected) {
                console.log('Trying M3U method...');
                try {
                    connected = await this.loadFromM3U(cleanUrl, username, password);
                } catch (e) {
                    console.log('Method 3 failed:', e.message);
                }
            }
            
            if (connected) {
                // Save credentials
                if (document.getElementById('remember').checked) {
                    this.saveCredentials();
                }
                
                // Update UI
                this.displayUsername.textContent = username;
                this.displayServerUrl.textContent = new URL(cleanUrl).hostname;
                
                // Switch to channels view
                this.loginContainer.style.display = 'none';
                this.channelsContainer.style.display = 'flex';
                
                // Update connection status
                this.updateConnectionStatus('connected', 'I lidhur');
                this.state.isConnected = true;
                
                this.showToast('U lidhë me sukses!', 'success');
                
                // Auto-play first channel if enabled
                if (this.state.settings.autoPlay && this.data.liveStreams.length > 0) {
                    setTimeout(() => {
                        this.playChannel(this.data.liveStreams[0]);
                    }, 1000);
                }
                
            } else {
                throw new Error('Nuk mund të lidhemi me provider. Provoni debug mode.');
            }
            
        } catch (error) {
            console.error('Connection error:', error);
            this.showToast(`Gabim: ${error.message}`, 'error');
            this.updateConnectionStatus('disconnected', 'Gabim në lidhje');
            
            // Offer debug option
            if (confirm('Dështoi lidhja. Dëshironi të ekzekutoni debug mode për të parë problemin?')) {
                this.debugProviderAPI();
            }
        } finally {
            this.showLoading(false);
        }
    }
    
    // FIX 7: Metoda për të lexuar M3U direkt
    async loadFromM3U(baseUrl, username, password) {
        try {
            // Try different M3U URLs
            const m3uUrls = [
                `${baseUrl}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`,
                `${baseUrl}/get.php?username=${username}&password=${password}&type=m3u&output=m3u8`,
                `${baseUrl}/live/${username}/${password}/`,
                `${baseUrl}/${username}/${password}/all.m3u`
            ];
            
            let m3uContent = null;
            
            for (const m3uUrl of m3uUrls) {
                try {
                    console.log('Trying M3U URL:', m3uUrl);
                    const response = await fetch(this.useProxy ? this.proxyUrl + m3uUrl : m3uUrl);
                    
                    if (response.ok) {
                        m3uContent = await response.text();
                        console.log('M3U content sample:', m3uContent.substring(0, 500));
                        break;
                    }
                } catch (e) {
                    console.log(`M3U URL ${m3uUrl} failed:`, e.message);
                    continue;
                }
            }
            
            if (!m3uContent) {
                throw new Error('Could not fetch M3U from any URL');
            }
            
            // Parse M3U content
            this.parseM3UContent(m3uContent, baseUrl, username, password);
            
            // Create dummy categories
            this.createCategoriesFromStreams();
            
            // Render data
            this.renderCategories();
            this.categoriesCount.textContent = this.data.liveCategories.length;
            this.channelsCount.textContent = this.data.liveStreams.length;
            
            return true;
            
        } catch (error) {
            console.error('Error loading from M3U:', error);
            throw error;
        }
    }
    
    parseM3UContent(content, baseUrl, username, password) {
        this.data.liveStreams = [];
        
        const lines = content.split('\n');
        let currentStream = null;
        let category = 'General';
        let channelNumber = 101;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Parse EXTINF line
                currentStream = {
                    stream_id: channelNumber,
                    number: channelNumber,
                    category_id: 1,
                    quality: 'HD',
                    language: 'Multi'
                };
                
                // Extract name and other info
                const match = line.match(/#EXTINF:.*,(.*)/);
                if (match && match[1]) {
                    currentStream.name = match[1].trim();
                    
                    // Try to extract category from group-title
                    const groupMatch = line.match(/group-title="([^"]*)"/);
                    if (groupMatch && groupMatch[1]) {
                        category = groupMatch[1];
                    }
                    
                    // Extract logo
                    const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                    if (logoMatch && logoMatch[1]) {
                        currentStream.logo = logoMatch[1];
                    }
                }
                
            } else if (line && !line.startsWith('#') && currentStream) {
                // This is the stream URL
                currentStream.url = line;
                
                // If URL is relative, make it absolute
                if (currentStream.url && !currentStream.url.startsWith('http')) {
                    currentStream.url = `${baseUrl}/${currentStream.url}`;
                }
                
                // Add to streams
                this.data.liveStreams.push({
                    ...currentStream,
                    category_id: this.getOrCreateCategoryId(category),
                    category_name: category
                });
                
                channelNumber++;
                currentStream = null;
            }
        }
        
        console.log('Parsed M3U streams:', this.data.liveStreams);
    }
    
    getOrCreateCategoryId(categoryName) {
        // Find existing category
        const existingCategory = this.data.liveCategories.find(cat => 
            cat.category_name === categoryName
        );
        
        if (existingCategory) {
            return existingCategory.category_id;
        }
        
        // Create new category
        const newCategoryId = this.data.liveCategories.length + 1;
        this.data.liveCategories.push({
            category_id: newCategoryId,
            category_name: categoryName,
            parent_id: 0
        });
        
        return newCategoryId;
    }
    
    createCategoriesFromStreams() {
        // Extract unique categories from streams
        const categories = {};
        
        this.data.liveStreams.forEach(stream => {
            if (stream.category_name && !categories[stream.category_name]) {
                categories[stream.category_name] = {
                    category_id: stream.category_id,
                    category_name: stream.category_name,
                    parent_id: 0
                };
            }
        });
        
        this.data.liveCategories = Object.values(categories);
    }
    
    // FIX 8: Metoda e përditësuar për të luajtur stream
    async playStream(stream) {
        // Destroy previous HLS instance
        if (this.state.hls) {
            this.state.hls.destroy();
            this.state.hls = null;
        }
        
        try {
            let streamUrl = '';
            
            // Method 1: If we have direct URL from M3U
            if (stream.url) {
                streamUrl = stream.url;
            }
            // Method 2: Standard Xtream Codes format
            else if (this.state.currentType === 'live') {
                streamUrl = `${this.config.apiBase}/live/${this.config.username}/${this.config.password}/${stream.stream_id}.m3u8`;
            }
            // Method 3: Alternative format
            else {
                streamUrl = `${this.config.apiBase}/live/${this.config.username}/${this.config.password}/${stream.stream_id}`;
            }
            
            console.log('Attempting to play:', streamUrl);
            
            // Try with proxy if needed
            let finalUrl = streamUrl;
            if (this.useProxy && !streamUrl.includes(this.proxyUrl)) {
                finalUrl = this.proxyUrl + streamUrl;
            }
            
            if (Hls.isSupported()) {
                this.state.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: this.state.settings.bufferSize,
                    manifestLoadingTimeOut: 10000,
                    manifestLoadingMaxRetry: 5,
                    levelLoadingTimeOut: 10000,
                    levelLoadingMaxRetry: 5,
                    fragLoadingTimeOut: 10000,
                    fragLoadingMaxRetry: 5
                });
                
                this.state.hls.loadSource(finalUrl);
                this.state.hls.attachMedia(this.player);
                
                this.state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('Manifest parsed successfully');
                    if (this.state.settings.autoPlay) {
                        this.player.play().catch(e => {
                            console.log('Auto-play prevented:', e);
                            this.showToast('Klikoni play për të filluar', 'info');
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
                                this.showToast('Gabim fatal, duke provuar alternativë...', 'error');
                                this.state.hls.destroy();
                                this.tryAlternativeStream(stream);
                                break;
                        }
                    }
                });
                
            } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support
                this.player.src = finalUrl;
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
            this.showToast(`Gabim: ${error.message}`, 'error');
            this.tryAlternativeStream(stream);
        }
    }
    
    tryAlternativeStream(stream) {
        // Try alternative stream URLs
        const alternativeUrls = [
            `${this.config.apiBase}/live/${this.config.username}/${this.config.password}/${stream.stream_id}.ts`,
            `${this.config.apiBase}/${this.config.username}/${this.config.password}/${stream.stream_id}`,
            stream.name // Some providers use name as ID
        ];
        
        this.showToast('Duke provuar URL alternative...', 'info');
        
        // Try each alternative
        this.tryUrlSequence(alternativeUrls, 0);
    }
    
    async tryUrlSequence(urls, index) {
        if (index >= urls.length) {
            this.showToast('Nuk u gjet asnjë stream funksional', 'error');
            return;
        }
        
        const url = urls[index];
        console.log(`Trying alternative ${index + 1}:`, url);
        
        try {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(this.player);
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log(`Alternative ${index + 1} works!`);
                    this.state.hls = hls;
                    this.player.play();
                    this.showToast('Stream u gjet në alternativë!', 'success');
                });
                
                hls.on(Hls.Events.ERROR, () => {
                    hls.destroy();
                    this.tryUrlSequence(urls, index + 1);
                });
            }
        } catch (e) {
            this.tryUrlSequence(urls, index + 1);
        }
    }
    
    // FIX 9: Shto buton debug në HTML dhe event listener
    setupEventListeners() {
        // ... existing code ...
        
        // Add debug button if not exists
        if (!document.getElementById('debugBtn')) {
            const debugBtn = document.createElement('button');
            debugBtn.id = 'debugBtn';
            debugBtn.className = 'btn btn-secondary btn-block';
            debugBtn.innerHTML = '<i class="fas fa-bug"></i> Debug Mode';
            debugBtn.style.marginTop = '10px';
            
            this.loginForm = document.querySelector('.login-buttons');
            if (this.loginForm) {
                this.loginForm.parentNode.insertBefore(debugBtn, this.loginForm.nextSibling);
            }
            
            debugBtn.addEventListener('click', () => this.debugProviderAPI());
        }
        
        // Add CORS proxy toggle
        if (!document.getElementById('proxyToggle')) {
            const proxyLabel = document.createElement('label');
            proxyLabel.className = 'checkbox-label';
            proxyLabel.style.marginTop = '10px';
            proxyLabel.innerHTML = `
                <input type="checkbox" id="proxyToggle">
                <span>Përdor Proxy për CORS (nëse keni probleme)</span>
            `;
            
            const loginForm = document.querySelector('.login-form');
            if (loginForm) {
                loginForm.appendChild(proxyLabel);
            }
            
            document.getElementById('proxyToggle').addEventListener('change', (e) => {
                this.useProxy = e.target.checked;
                localStorage.setItem('iptv_use_proxy', e.target.checked);
            });
            
            // Load proxy setting
            const savedProxy = localStorage.getItem('iptv_use_proxy');
            if (savedProxy) {
                this.useProxy = savedProxy === 'true';
                document.getElementById('proxyToggle').checked = this.useProxy;
            }
        }
        
        // ... rest of existing event listeners ...
    }
    
    // FIX 10: Metoda për të shfaqur info të detajuara
    showDetailedInfo() {
        const info = `
            Informacione të detajuara:
            
            Server URL: ${this.config.apiBase}
            Username: ${this.config.username}
            Connected: ${this.state.isConnected}
            
            Live Categories: ${this.data.liveCategories.length}
            Live Streams: ${this.data.liveStreams.length}
            
            Using Proxy: ${this.useProxy}
            Proxy URL: ${this.proxyUrl}
            
            Sample Categories:
            ${this.data.liveCategories.slice(0, 5).map(cat => `- ${cat.category_name} (ID: ${cat.category_id})`).join('\n')}
            
            Sample Streams:
            ${this.data.liveStreams.slice(0, 5).map(stream => `- ${stream.name} (#${stream.number})`).join('\n')}
        `;
        
        console.log(info);
        
        // Create modal with info
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-info-circle"></i> Debug Info</h2>
                    <button class="close-modal" onclick="this.parentElement.parentElement.style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <pre style="background: #1a1a1a; padding: 15px; border-radius: 5px; overflow: auto; max-height: 400px; color: #00ff00;">
${info}
                    </pre>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // ... rest of the class methods remain the same ...
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    window.player = new IPTVProviderPlayer();
    
    // Add global debug function
    window.debugIPTV = function() {
        if (window.player) {
            window.player.showDetailedInfo();
        }
    };
    
    // Add test function
    window.testConnection = function(url, user, pass) {
        if (window.player) {
            window.player.serverUrlInput.value = url || '';
            window.player.usernameInput.value = user || '';
            window.player.passwordInput.value = pass || '';
            window.player.connectToProvider();
        }
    };
});
