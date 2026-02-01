// Variabla globale
let currentChannel = null;
let channels = [
    { id: 1, name: "RTK 1", category: "News", logo: "R1", url: "" },
    { id: 2, name: "RTK 2", category: "Entertainment", logo: "R2", url: "" },
    { id: 3, name: "Klan Kosova", category: "General", logo: "KK", url: "" },
    { id: 4, name: "RTV21", category: "News", logo: "21", url: "" },
    { id: 5, name: "Artmotion", category: "Music", logo: "AM", url: "" }
];

// Elementet DOM
const videoPlayer = document.getElementById('videoPlayer');
const noStreamMessage = document.getElementById('noStreamMessage');
const retryBtn = document.getElementById('retryBtn');
const playlistStatus = document.getElementById('playlistStatus');
const volumeSlider = document.getElementById('volumeSlider');
const channelsList = document.getElementById('channelsList');
const addChannelBtn = document.getElementById('addChannelBtn');
const playlistUrl = document.getElementById('playlistUrl');
const savePlaylistBtn = document.getElementById('savePlaylistBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Funksioni për të inicializuar playerin
function initPlayer() {
    // Kontrollo nëse ka burim video
    checkVideoSource();
    
    // Ngarko kanalet
    loadChannels();
    
    // Vë ngjarjet (event listeners)
    setupEventListeners();
    
    // Shfaq mesazhin "Playlist Expired" në fillim
    showNoStreamMessage();
}

// Kontrollo nëse video ka burim
function checkVideoSource() {
    const hasSource = videoPlayer.src && videoPlayer.src.length > 0;
    if (!hasSource) {
        showNoStreamMessage();
    } else {
        hideNoStreamMessage();
    }
}

// Shfaq mesazhin "No Stream"
function showNoStreamMessage() {
    noStreamMessage.style.display = 'block';
    playlistStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Playlist Status: Expired</span>';
    playlistStatus.style.color = '#e94560';
}

// Fshih mesazhin "No Stream"
function hideNoStreamMessage() {
    noStreamMessage.style.display = 'none';
    playlistStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Playlist Status: Active</span>';
    playlistStatus.style.color = '#4CAF50';
}

// Ngarko kanalet në sidebar
function loadChannels() {
    channelsList.innerHTML = '';
    
    channels.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel-item';
        if (channel.id === 1) channelElement.classList.add('active');
        
        channelElement.innerHTML = `
            <div class="channel-item-logo">${channel.logo}</div>
            <div class="channel-item-info">
                <h4>${channel.name}</h4>
                <p>${channel.category}</p>
            </div>
        `;
        
        channelElement.addEventListener('click', () => selectChannel(channel));
        channelsList.appendChild(channelElement);
    });
}

// Zgjidh një kanal
function selectChannel(channel) {
    currentChannel = channel;
    
    // Hiq klasën active nga të gjitha kanalet
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Shto klasën active tek kanali i zgjedhur
    event.currentTarget.classList.add('active');
    
    // Përditëso informacionin në header
    document.querySelector('.channel-name').textContent = channel.name;
    document.querySelector('.program-title').textContent = `Duke luajtur: ${channel.category} Program`;
    
    // Nëse kanali ka URL video
    if (channel.url && channel.url.length > 0) {
        videoPlayer.src = channel.url;
        hideNoStreamMessage();
        videoPlayer.play().catch(e => console.log("Auto-play u ndal:", e));
    } else {
        showNoStreamMessage();
    }
}

// Vë ngjarjet (event listeners)
function setupEventListeners() {
    // Butoni "Rifresko Listën"
    retryBtn.addEventListener('click', () => {
        alert('Duke rifreskuar listën... Kontrollo URL-në e playlist.');
        if (playlistUrl.value) {
            loadPlaylist(playlistUrl.value);
        }
    });
    
    // Kontrolluesi i volumit
    volumeSlider.addEventListener('input', (e) => {
        videoPlayer.volume = e.target.value / 100;
    });
    
    // Shto kanal të ri
    addChannelBtn.addEventListener('click', () => {
        const channelName = prompt('Emri i kanalit të ri:');
        if (channelName) {
            const newChannel = {
                id: channels.length + 1,
                name: channelName,
                category: "New Channel",
                logo: channelName.substring(0, 2).toUpperCase(),
                url: ""
            };
            channels.push(newChannel);
            loadChannels();
        }
    });
    
    // Ruaj playlist
    savePlaylistBtn.addEventListener('click', () => {
        const url = playlistUrl.value.trim();
        if (url) {
            loadPlaylist(url);
        } else {
            alert('Ju lutem vendosni një URL të vlefshme për playlist.');
        }
    });
    
    // Fullscreen
    fullscreenBtn.addEventListener('click', () => {
        const playerContainer = document.querySelector('.player-container');
        if (!document.fullscreenElement) {
            if (playerContainer.requestFullscreen) {
                playerContainer.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
    
    // Hap modalën e settings
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });
    
    // Mbylle modalën e settings
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
    
    // Ruaj settings
    saveSettingsBtn.addEventListener('click', () => {
        const quality = document.getElementById('qualitySelect').value;
        const bufferSize = document.getElementById('bufferSize').value;
        const autoPlay = document.getElementById('autoPlayCheck').checked;
        
        alert(`Cilësimet u ruajtën:\nCilësia: ${quality}\nBuffer: ${bufferSize}s\nAuto-play: ${autoPlay ? 'Po' : 'Jo'}`);
        settingsModal.style.display = 'none';
    });
    
    // Mbylle modalën kur klikohet jashtë
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
    
    // Kontrollo kur video fillon
    videoPlayer.addEventListener('playing', () => {
        hideNoStreamMessage();
    });
    
    // Kontrollo kur video ndalon për shkak të gabimit
    videoPlayer.addEventListener('error', () => {
        showNoStreamMessage();
    });
}

// Ngarko playlist (simulim)
function loadPlaylist(url) {
    // Kjo është një simulim - në aplikacionin real do të lexoni një skedar M3U
    console.log('Duke ngarkuar playlist nga:', url);
    
    // Simulojmë një vonesë të shkurtër
    setTimeout(() => {
        // Shtojmë disa kanale të reja nga "playlist"
        const newChannels = [
            { id: 6, name: "Discovery", category: "Documentary", logo: "DC", url: "https://example.com/discovery.m3u8" },
            { id: 7, name: "National Geographic", category: "Documentary", logo: "NG", url: "https://example.com/natgeo.m3u8" },
            { id: 8, name: "Sport TV", category: "Sports", logo: "ST", url: "https://example.com/sport.m3u8" }
        ];
        
        // Shto kanalet e reja në listë (duke zëvendësuar të vjetrat)
        channels = [...channels.slice(0, 3), ...newChannels];
        loadChannels();
        
        // Përditëso statusin
        hideNoStreamMessage();
        alert('Playlist u ngarkua me sukses! ' + newChannels.length + ' kanale të reja u shtuan.');
    }, 1500);
}

// Inicializo playerin kur faja të jetë gati
document.addEventListener('DOMContentLoaded', initPlayer);

// Funksion shtesë për të testuar me video demo
function loadDemoStream() {
    // Ky është një stream demo falas (mund të mos funksionojë gjithmonë)
    videoPlayer.src = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    videoPlayer.play().catch(e => {
        console.log('Stream demo nuk funksionoi:', e);
        showNoStreamMessage();
    });
}

// Për të testuar me një stream demo, hiq komentin nga rreshti i mëposhtëm:
// loadDemoStream();
