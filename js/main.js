class IPTVPlayer {
    constructor() {
        this.xtreamApi = null;
        this.currentStream = null;
        this.hls = null;
        this.favorites = JSON.parse(localStorage.getItem('iptv_favorites')) || [];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupVideoPlayer();
        this.loadCategories();
    }
    
    bindEvents() {
        // Lidhja me server
        document.getElementById('connect-btn').addEventListener('click', () => this.connectToServer());
        
        // Navigimi
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Kontrollet e player-it
        document.getElementById('play-btn').addEventListener('click', () => this.play());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('volume-slider').addEventListener('input', (e) => this.setVolume(e.target.value));
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        
        // Kërkimi
        document.getElementById('vod-search').addEventListener('input', (e) => this.searchVOD(e.target.value));
        
        // Importi i M3U
        document.getElementById('load-m3u').addEventListener('click', () => this.loadM3UFile());
        document.getElementById('m3u-file').addEventListener('change', (e) => this.handleM3UFile(e.target.files[0]));
    }
    
    async connectToServer() {
        const server = document.getElementById('server-url').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!server || !username || !password) {
            this.showMessage('Ju lutem plotësoni të gjitha fushat!', 'error');
            return;
        }
        
        this.xtreamApi = new XtreamAPI(server, username, password);
        
        try {
            // Testo lidhjen
            const auth = await this.xtreamApi.authenticate();
            if (auth) {
                this.showMessage('Lidhja u krye me sukses!', 'success');
                this.loadAllContent();
            }
        } catch (error) {
            this.showMessage('Gabim në lidhje: ' + error.message, 'error');
        }
    }
    
    async loadAllContent() {
        try {
            // Ngarko Live TV
            const liveChannels = await this.xtreamApi.getLiveStreams();
            this.displayLiveChannels(liveChannels);
            
            // Ngarko VOD
            const vodList = await this.xtreamApi.getVodStreams();
            this.displayVOD(vodList);
            
            // Ngarko Seri
            const seriesList = await this.xtreamApi.getSeries();
            this.displaySeries(seriesList);
            
            // Ngarko EPG
            this.loadEPG();
            
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }
    
    displayLiveChannels(channels) {
        const container = document.getElementById('live-channels');
        container.innerHTML = '';
        
        // Grupimi sipas kategorive
        const categories = {};
        channels.forEach(channel => {
            if (!categories[channel.category_name]) {
                categories[channel.category_name] = [];
            }
            categories[channel.category_name].push(channel);
        });
        
        // Mbush kategoritë në filter
        const filterSelect = document.getElementById('live-category-filter');
        filterSelect.innerHTML = '<option value="all">Të gjitha kategoritë</option>';
        
        Object.keys(categories).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
        
        // Funksioni për shfaqjen e kanaleve
        const displayChannels = (category = 'all') => {
            container.innerHTML = '';
            const channelsToDisplay = category === 'all' 
                ? channels 
                : channels.filter(c => c.category_name === category);
            
            channelsToDisplay.forEach(channel => {
                const channelCard = this.createChannelCard(channel);
                container.appendChild(channelCard);
            });
        };
        
        // Shfaq fillimisht të gjitha kanalet
        displayChannels();
        
        // Shto event listener për filter
        filterSelect.addEventListener('change', (e) => {
            displayChannels(e.target.value);
        });
    }
    
    createChannelCard(channel) {
        const div = document.createElement('div');
        div.className = 'channel-card';
        div.dataset.id = channel.stream_id;
        
        const isFavorite = this.favorites.some(fav => 
            fav.type === 'live' && fav.id === channel.stream_id
        );
        
        div.innerHTML = `
            <img src="${channel.stream_icon || 'assets/default-channel.png'}" 
                 alt="${channel.name}" 
                 class="channel-logo"
                 onerror="this.src='assets/default-channel.png'">
            <div class="channel-info">
                <div class="channel-header">
                    <h4 class="channel-name">${channel.name}</h4>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            onclick="iptvPlayer.toggleFavorite('live', ${channel.stream_id}, '${channel.name}')">
                        <i class="fas ${isFavorite ? 'fa-star' : 'fa-star-o'}"></i>
                    </button>
                </div>
                <p class="channel-category">${channel.category_name}</p>
            </div>
        `;
        
        div.addEventListener('click', () => this.playLiveChannel(channel));
        return div;
    }
    
    displayVOD(movies) {
        const container = document.getElementById('vod-movies');
        container.innerHTML = '';
        
        movies.forEach(movie => {
            const movieCard = this.createVODCard(movie);
            container.appendChild(movieCard);
        });
    }
    
    createVODCard(movie) {
        const div = document.createElement('div');
        div.className = 'vod-card';
        
        const isFavorite = this.favorites.some(fav => 
            fav.type === 'vod' && fav.id === movie.stream_id
        );
        
        div.innerHTML = `
            <img src="${movie.stream_icon || movie.cover || 'assets/default-movie.png'}" 
                 alt="${movie.name}" 
                 class="vod-poster"
                 onerror="this.src='assets/default-movie.png'">
            <div class="vod-info">
                <div class="vod-header">
                    <h4 class="vod-title">${movie.name}</h4>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}"
                            onclick="iptvPlayer.toggleFavorite('vod', ${movie.stream_id}, '${movie.name}')">
                        <i class="fas ${isFavorite ? 'fa-star' : 'fa-star-o'}"></i>
                    </button>
                </div>
                <p class="vod-year">${movie.releaseDate || movie.added || ''}</p>
                <p class="vod-rating">⭐ ${movie.rating || 'N/A'}</p>
                <p class="vod-duration">${this.formatDuration(movie.duration)}</p>
            </div>
        `;
        
        div.addEventListener('click', () => this.playVOD(movie));
        return div;
    }
    
    displaySeries(seriesList) {
        const container = document.getElementById('series-container');
        container.innerHTML = '';
        
        seriesList.forEach(series => {
            const seriesCard = this.createSeriesCard(series);
            container.appendChild(seriesCard);
        });
    }
    
    createSeriesCard(series) {
        const div = document.createElement('div');
        div.className = 'series-card';
        
        const isFavorite = this.favorites.some(fav => 
            fav.type === 'series' && fav.id === series.series_id
        );
        
        div.innerHTML = `
            <img src="${series.cover || series.poster || 'assets/default-series.png'}" 
                 alt="${series.name}" 
                 class="series-poster"
                 onerror="this.src='assets/default-series.png'">
            <div class="series-details">
                <div class="series-header">
                    <h4>${series.name}</h4>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}"
                            onclick="iptvPlayer.toggleFavorite('series', ${series.series_id}, '${series.name}')">
                        <i class="fas ${isFavorite ? 'fa-star' : 'fa-star-o'}"></i>
                    </button>
                </div>
                <p class="series-plot">${series.plot?.substring(0, 150) || 'Nuk ka përshkrim'}...</p>
                <div class="seasons-dropdown">
                    <select class="season-selector" data-series="${series.series_id}">
                        <option value="">Zgjidh sezonin</option>
                    </select>
                    <div class="episode-list" id="episodes-${series.series_id}"></div>
                </div>
            </div>
        `;
        
        // Ngarko sezonet kur të klikohet seria
        div.querySelector('.series-details').addEventListener('click', async () => {
            await this.loadSeasons(series.series_id);
        });
        
        return div;
    }
    
    async loadSeasons(seriesId) {
        try {
            const seasons = await this.xtreamApi.getSeriesInfo(seriesId);
            const selector = document.querySelector(`select[data-series="${seriesId}"]`);
            const episodeList = document.getElementById(`episodes-${seriesId}`);
            
            selector.innerHTML = '<option value="">Zgjidh sezonin</option>';
            
            seasons.forEach(season => {
                const option = document.createElement('option');
                option.value = season.id;
                option.textContent = `Sezoni ${season.season_number}`;
                selector.appendChild(option);
            });
            
            // Kur ndryshohet sezoni, ngarko episodet
            selector.addEventListener('change', async (e) => {
                if (e.target.value) {
                    const episodes = await this.xtreamApi.getSeriesEpisodes(seriesId, e.target.value);
                    this.displayEpisodes(seriesId, episodes);
                }
            });
            
        } catch (error) {
            console.error('Error loading seasons:', error);
        }
    }
    
    displayEpisodes(seriesId, episodes) {
        const episodeList = document.getElementById(`episodes-${seriesId}`);
        episodeList.innerHTML = '';
        episodeList.style.display = 'block';
        
        episodes.forEach(episode => {
            const div = document.createElement('div');
            div.className = 'episode-item';
            div.innerHTML = `
                <span>Episoda ${episode.episode_num}: ${episode.title}</span>
                <span class="episode-duration">${this.formatDuration(episode.duration)}</span>
            `;
            
            div.addEventListener('click', () => this.playSeriesEpisode(episode));
            episodeList.appendChild(div);
        });
    }
    
    async playLiveChannel(channel) {
        const streamUrl = this.xtreamApi.getLiveURL(channel.stream_id);
        await this.playStream(streamUrl, channel.name);
        
        // Shfaq informacionin në player
        document.getElementById('now-playing').textContent = `Live: ${channel.name}`;
        this.currentStream = { type: 'live', id: channel.stream_id, name: channel.name };
    }
    
    async playVOD(movie) {
        const streamUrl = this.xtreamApi.getVodURL(movie.stream_id);
        await this.playStream(streamUrl, movie.name);
        
        document.getElementById('now-playing').textContent = `VOD: ${movie.name}`;
        this.currentStream = { type: 'vod', id: movie.stream_id, name: movie.name };
    }
    
    async playSeriesEpisode(episode) {
        const streamUrl = this.xtreamApi.getSeriesEpisodeURL(episode.id);
        await this.playStream(streamUrl, episode.title);
        
        document.getElementById('now-playing').textContent = `Seri: ${episode.title}`;
        this.currentStream = { type: 'series', id: episode.id, name: episode.title };
    }
    
    async playStream(url, title) {
        const video = document.getElementById('main-video');
        
        // Stop existing stream
        if (this.hls) {
            this.hls.destroy();
        }
        
        // Check if HLS stream
        if (url.includes('.m3u8')) {
            if (Hls.isSupported()) {
                this.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });
                
                this.hls.loadSource(url);
                this.hls.attachMedia(video);
                
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play();
                });
                
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                this.hls.recoverMediaError();
                                break;
                            default:
                                this.hls.destroy();
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support
                video.src = url;
                video.play();
            }
        } else {
            // Direct stream
            video.src = url;
            video.play();
        }
        
        // Ruaj historikun
        this.addToHistory({ url, title, timestamp: new Date() });
    }
    
    play() {
        document.getElementById('main-video').play();
    }
    
    pause() {
        document.getElementById('main-video').pause();
    }
    
    setVolume(value) {
        document.getElementById('main-video').volume = value / 100;
    }
    
    toggleFullscreen() {
        const video = document.getElementById('main-video');
        if (!document.fullscreenElement) {
            video.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    toggleFavorite(type, id, name) {
        const index = this.favorites.findIndex(fav => 
            fav.type === type && fav.id === id
        );
        
        if (index > -1) {
            // Hiq nga favoritet
            this.favorites.splice(index, 1);
            this.showMessage('U hoq nga favoritet', 'info');
        } else {
            // Shto në favoritet
            this.favorites.push({ type, id, name, added: new Date() });
            this.showMessage('U shtua në favoritet', 'success');
        }
        
        // Ruaj në localStorage
        localStorage.setItem('iptv_favorites', JSON.stringify(this.favorites));
        
        // Rifresko display
        this.displayFavorites();
        
        // Rifresko butonat e favoritit
        event.stopPropagation();
        const btn = event.target.closest('.favorite-btn');
        if (btn) {
            btn.classList.toggle('active');
            const icon = btn.querySelector('i');
            icon.classList.toggle('fa-star');
            icon.classList.toggle('fa-star-o');
        }
    }
    
    displayFavorites() {
        const container = document.getElementById('favorites-container');
        container.innerHTML = '';
        
        if (this.favorites.length === 0) {
            container.innerHTML = '<p class="empty-message">Nuk keni asnjë favorit ende.</p>';
            return;
        }
        
        this.favorites.forEach(fav => {
            const div = document.createElement('div');
            div.className = 'favorite-item';
            div.innerHTML = `
                <span>${fav.name}</span>
                <span class="fav-type">${fav.type}</span>
                <button onclick="iptvPlayer.playFavorite(${fav.id}, '${fav.type}')">
                    <i class="fas fa-play"></i>
                </button>
                <button onclick="iptvPlayer.removeFavorite(${fav.id}, '${fav.type}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(div);
        });
    }
    
    switchTab(tabName) {
        // Hiq aktivin nga të gjitha
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Shto aktiv tek tab-i i zgjedhur
        document.getElementById(`${tabName}-tab`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }
    
    formatDuration(seconds) {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
    
    showMessage(message, type = 'info') {
        // Krijo një element për mesazhin
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        msgDiv.textContent = message;
        
        // Shto në dokument
        document.body.appendChild(msgDiv);
        
        // Hiq pas 3 sekondash
        setTimeout(() => {
            msgDiv.remove();
        }, 3000);
    }
    
    async loadM3UFile() {
        const urlInput = document.getElementById('m3u-url').value;
        
        if (!urlInput) {
            this.showMessage('Ju lutem shkruani një URL M3U', 'error');
            return;
        }
        
        try {
            const parser = new M3UParser();
            const playlist = await parser.parseFromURL(urlInput);
            this.displayM3UChannels(playlist);
        } catch (error) {
            this.showMessage('Gabim në ngarkimin e M3U: ' + error.message, 'error');
        }
    }
    
    async handleM3UFile(file) {
        const parser = new M3UParser();
        const playlist = await parser.parseFromFile(file);
        this.displayM3UChannels(playlist);
    }
    
    displayM3UChannels(playlist) {
        const container = document.getElementById('live-channels');
        container.innerHTML = '';
        
        playlist.forEach(channel => {
            const div = document.createElement('div');
            div.className = 'channel-card';
            div.innerHTML = `
                <div class="channel-logo" style="background: #333;"></div>
                <div class="channel-info">
                    <h4>${channel.name}</h4>
                    <p>${channel.group || 'Kategoritë e panjohur'}</p>
                </div>
            `;
            
            div.addEventListener('click', () => {
                this.playStream(channel.url, channel.name);
            });
            
            container.appendChild(div);
        });
        
        this.switchTab('live');
        this.showMessage(`U ngarkuan ${playlist.length} kanale nga M3U`, 'success');
    }
    
    async loadEPG() {
        // Implementimi i EPG-it kërkon një burim XMLTV
        // Ky është një shembull i thjeshtë
        const epgContainer = document.getElementById('epg-info');
        
        if (this.xtreamApi && this.xtreamApi.getEPG) {
            try {
                const epg = await this.xtreamApi.getEPG();
                epgContainer.innerHTML = this.formatEPG(epg);
            } catch (error) {
                epgContainer.innerHTML = 'EPG nuk është i disponueshëm';
            }
        } else {
            epgContainer.innerHTML = 'EPG nuk është i konfiguruar';
        }
    }
    
    formatEPG(epgData) {
        // Formatimi i të dhënave EPG
        return 'Informacioni EPG do të shfaqet këtu';
    }
    
    searchVOD(query) {
        const cards = document.querySelectorAll('.vod-card');
        
        cards.forEach(card => {
            const title = card.querySelector('.vod-title').textContent.toLowerCase();
            if (title.includes(query.toLowerCase())) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    addToHistory(item) {
        let history = JSON.parse(localStorage.getItem('iptv_history')) || [];
        history.unshift(item);
        
        // Kufizo historikun në 100 artikuj
        history = history.slice(0, 100);
        
        localStorage.setItem('iptv_history', JSON.stringify(history));
    }
}

// Krijo instancën e player-it
const iptvPlayer = new IPTVPlayer();
