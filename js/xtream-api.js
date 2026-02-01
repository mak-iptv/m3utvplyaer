class XtreamAPI {
    constructor(server, username, password) {
        this.server = server;
        this.username = username;
        this.password = password;
        this.baseURL = `${server}/player_api.php`;
        this.isAuthenticated = false;
    }
    
    async authenticate() {
        try {
            const response = await fetch(`${this.baseURL}?username=${this.username}&password=${this.password}`);
            const data = await response.json();
            
            if (data.user_info) {
                this.userInfo = data.user_info;
                this.isAuthenticated = true;
                return true;
            }
            return false;
        } catch (error) {
            throw new Error('Authentication failed: ' + error.message);
        }
    }
    
    async getLiveStreams() {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_live_streams`
        );
        return await response.json();
    }
    
    async getLiveCategories() {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_live_categories`
        );
        return await response.json();
    }
    
    async getVodStreams() {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_vod_streams`
        );
        return await response.json();
    }
    
    async getVodCategories() {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_vod_categories`
        );
        return await response.json();
    }
    
    async getSeries() {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_series`
        );
        return await response.json();
    }
    
    async getSeriesCategories() {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_series_categories`
        );
        return await response.json();
    }
    
    async getSeriesInfo(seriesId) {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_series_info&series_id=${seriesId}`
        );
        return await response.json();
    }
    
    async getSeriesEpisodes(seriesId, seasonNumber) {
        if (!this.isAuthenticated) await this.authenticate();
        
        const response = await fetch(
            `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_series_info&series_id=${seriesId}&season=${seasonNumber}`
        );
        const data = await response.json();
        return data.episodes || [];
    }
    
    getLiveURL(streamId, extension = 'ts') {
        return `${this.server}/live/${this.username}/${this.password}/${streamId}.${extension}`;
    }
    
    getVodURL(vodId, extension = 'mp4') {
        return `${this.server}/movie/${this.username}/${this.password}/${vodId}.${extension}`;
    }
    
    getSeriesEpisodeURL(episodeId, extension = 'mp4') {
        return `${this.server}/series/${this.username}/${this.password}/${episodeId}.${extension}`;
    }
    
    async getEPG(channelId = '') {
        const url = channelId 
            ? `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_short_epg&channel_id=${channelId}`
            : `${this.baseURL}?username=${this.username}&password=${this.password}&action=get_simple_data_table`;
        
        const response = await fetch(url);
        return await response.json();
    }
}
