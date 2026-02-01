class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.videoPlayer = document.getElementById('videoPlayer');
        this.channelList = document.getElementById('channelList');
        this.currentChannelElement = document.getElementById('currentChannel');
        this.statusElement = document.getElementById('status');
        
        this.init();
    }
    
    init() {
        // Event listeners
        document.getElementById('loadM3U').addEventListener('click', () => {
            document.getElementById('m3uFile').click();
        });
        
        document.getElementById('loadURL').addEventListener('click', () => {
            this.loadFromUrl();
        });
        
        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.loadM3UFile(e.target.files[0]);
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterChannels(e.target.value);
        });
        
        document.getElementById('m3uUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadFromUrl();
            }
        });
        
        // Video player events
        this.videoPlayer.addEventListener('error', () => {
            this.updateStatus('Error playing stream');
        });
        
        this.videoPlayer.addEventListener('playing', () => {
            this.updateStatus('Playing');
        });
    }
    
    async loadM3UFile(file) {
        try {
            const text = await file.text();
            this.parseM3U(text);
            this.updateStatus(`Loaded ${this.channels.length} channels from file`);
        } catch (error) {
            this.updateStatus('Error loading file');
            console.error(error);
        }
    }
    
    async loadFromUrl() {
        const url = document.getElementById('m3uUrl').value;
        if (!url) {
            this.updateStatus('Please enter a URL');
            return;
        }
        
        try {
            this.updateStatus('Loading from URL...');
            const response = await fetch(url);
            const text = await response.text();
            this.parseM3U(text);
            this.updateStatus(`Loaded ${this.channels.length} channels from URL`);
        } catch (error) {
            this.updateStatus('Error loading from URL');
            console.error(error);
        }
    }
    
    parseM3U(m3uContent) {
        this.channels = [];
        const lines = m3uContent.split('\n');
        
        let currentChannel = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Parse channel info
                const info = line.substring(8);
                const params = info.split(',');
                
                currentChannel = {
                    name: params.slice(1).join(',').trim(),
                    url: '',
                    tvgId: this.extractParam(info, 'tvg-id'),
                    tvgName: this.extractParam(info, 'tvg-name'),
                    tvgLogo: this.extractParam(info, 'tvg-logo'),
                    groupTitle: this.extractParam(info, 'group-title')
                };
            } else if (line && !line.startsWith('#') && currentChannel.name) {
                // This is the URL
                currentChannel.url = line;
                this.channels.push({...currentChannel});
                currentChannel = {};
            }
        }
        
        this.displayChannels();
    }
    
    extractParam(line, paramName) {
        const regex = new RegExp(`${paramName}="([^"]*)"`);
        const match = line.match(regex);
        return match ? match[1] : '';
    }
    
    displayChannels() {
        this.channelList.innerHTML = '';
        
        this.channels.forEach((channel, index) => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel-item';
            channelElement.innerHTML = `
                <strong>${channel.name}</strong>
                ${channel.groupTitle ? `<br><small>${channel.groupTitle}</small>` : ''}
            `;
            
            channelElement.addEventListener('click', () => {
                this.playChannel(channel, index);
            });
            
            this.channelList.appendChild(channelElement);
        });
    }
    
    filterChannels(searchTerm) {
        const items = this.channelList.getElementsByClassName('channel-item');
        
        for (let item of items) {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm.toLowerCase())) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        }
    }
    
    playChannel(channel, index) {
        // Update active channel
        const items = this.channelList.getElementsByClassName('channel-item');
        for (let item of items) {
            item.classList.remove('active');
        }
        items[index].classList.add('active');
        
        // Update current channel info
        this.currentChannel = channel;
        this.currentChannelElement.textContent = channel.name;
        
        // Set video source
        this.videoPlayer.src = channel.url;
        this.videoPlayer.load();
        
        this.updateStatus(`Loading: ${channel.name}`);
    }
    
    updateStatus(message) {
        this.statusElement.textContent = message;
        console.log(message);
    }
}

// Initialize the player when page loads
document.addEventListener('DOMContentLoaded', () => {
    const player = new IPTVPlayer();
    
    // Optional: Load sample M3U on startup (remove if not needed)
    // player.loadFromUrl();
});
