class IptvPlayerPro {
    constructor() {
        this.channels = [];
        this.categories = [];
        this.currentChannel = null;
        this.currentCategory = 'all';
        this.hls = null;
        this.startTime = Date.now();

        this.settings = {
            autoPlay: true,
            rememberVolume: true
        };

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();

        // autoplay compatibility
        this.video.muted = true;
        this.video.playsInline = true;

        this.loadVolume();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        setInterval(() => this.updateUptime(), 1000);
    }

    cacheElements() {
        this.video = document.getElementById('mainVideo');
        this.loading = document.getElementById('loadingSpinner');
        this.error = document.getElementById('errorMessage');

        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevChannelBtn');
        this.nextBtn = document.getElementById('nextChannelBtn');
        this.volumeSlider = document.getElementById('volumeSliderOverlay');
        this.muteBtn = document.getElementById('muteBtn');

        this.channelName = document.getElementById('channelNameOverlay');
        this.currentTimeEl = document.getElementById('currentTime');
        this.uptimeEl = document.getElementById('uptime');

        this.channelsGrid = document.getElementById('channelsGrid');
    }

    bindEvents() {
        this.playPauseBtn.onclick = () => this.togglePlay();
        this.prevBtn.onclick = () => this.prevChannel();
        this.nextBtn.onclick = () => this.nextChannel();
        this.muteBtn.onclick = () => this.toggleMute();

        this.volumeSlider.oninput = e => {
            this.video.volume = e.target.value / 100;
            localStorage.setItem('volume', this.video.volume);
        };

        // Smart TV / Remote / Keyboard
        document.addEventListener('keydown', e => {
            const k = e.key || e.keyCode;
            if (k === 'Enter' || k === 13) this.togglePlay();
            if (k === 'ArrowLeft' || k === 37) this.prevChannel();
            if (k === 'ArrowRight' || k === 39) this.nextChannel();
            if (k === 'ArrowUp' || k === 38) this.changeVolume(10);
            if (k === 'ArrowDown' || k === 40) this.changeVolume(-10);
        });
    }

    /* ================= PLAYER ================= */

    togglePlay() {
        if (this.video.paused) this.video.play().catch(()=>{});
        else this.video.pause();
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
    }

    changeVolume(delta) {
        let v = Math.min(100, Math.max(0, this.video.volume * 100 + delta));
        this.video.volume = v / 100;
        this.volumeSlider.value = v;
        localStorage.setItem('volume', this.video.volume);
    }

    loadVolume() {
        const v = localStorage.getItem('volume');
        if (v !== null) {
            this.video.volume = parseFloat(v);
            this.volumeSlider.value = this.video.volume * 100;
        }
    }

    /* ================= CHANNEL ================= */

    playChannel(channel) {
        if (!channel || !channel.url) return;
        this.currentChannel = channel;
        this.channelName.textContent = channel.name;
        this.playStream(channel.url);
    }

    playStream(url) {
        this.showLoading();
        this.clearStream();

        // 1️⃣ Native HLS (Android / Smart TV)
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.play().then(() => {
                this.video.muted = false;
                this.hideLoading();
            }).catch(()=>{});
            return;
        }

        // 2️⃣ HLS.js (Chrome / Edge)
        if (window.Hls && Hls.isSupported()) {
            this.hls = new Hls({
                maxBufferLength: 60,
                backBufferLength: 30,
                enableWorker: true
            });

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.video.play().then(() => {
                    this.video.muted = false;
                    this.hideLoading();
                }).catch(()=>{});
            });

            this.hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    this.showError('Stream error');
                }
            });
            return;
        }

        // 3️⃣ Fallback
        this.video.src = url;
        this.video.play().catch(()=>{});
        this.hideLoading();
    }

    clearStream() {
        if (this.hls) {
            this.hls.detachMedia();
            this.hls.destroy();
            this.hls = null;
        }
        this.video.pause();
        this.video.src = '';
    }

    prevChannel() {
        if (!this.channels.length) return;
        let i = this.channels.indexOf(this.currentChannel);
        this.playChannel(this.channels[(i - 1 + this.channels.length) % this.channels.length]);
    }

    nextChannel() {
        if (!this.channels.length) return;
        let i = this.channels.indexOf(this.currentChannel);
        this.playChannel(this.channels[(i + 1) % this.channels.length]);
    }

    /* ================= UI ================= */

    showLoading() {
        this.loading.style.display = 'block';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError(msg) {
        this.error.querySelector('h4').textContent = msg;
        this.error.style.display = 'block';
    }

    updateClock() {
        this.currentTimeEl.textContent = new Date().toLocaleTimeString('sq-AL', { hour12:false });
    }

    updateUptime() {
        let t = Math.floor((Date.now() - this.startTime) / 1000);
        let h = String(Math.floor(t / 3600)).padStart(2,'0');
        let m = String(Math.floor((t % 3600) / 60)).padStart(2,'0');
        let s = String(t % 60).padStart(2,'0');
        this.uptimeEl.textContent = `${h}:${m}:${s}`;
    }

    /* ================= DEMO ================= */

    loadDemo() {
        this.channels = [
            {
                name: 'RTK 1',
                url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
            },
            {
                name: 'RTK 2',
                url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
            }
        ];
        this.playChannel(this.channels[0]);
    }
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
    window.player = new IptvPlayerPro();
    player.loadDemo();
});
