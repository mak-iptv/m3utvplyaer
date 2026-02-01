class IptvPlayerPro {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.hls = null;
        this.startTime = Date.now();

        this.cache();
        this.bind();
        this.initClock();
    }

    /* ================= INIT ================= */

    cache() {
        this.video = document.getElementById('mainVideo');
        this.loading = document.getElementById('loadingSpinner');
        this.error = document.getElementById('errorMessage');

        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevChannelBtn');
        this.nextBtn = document.getElementById('nextChannelBtn');
        this.volumeSlider = document.getElementById('volumeSliderOverlay');

        this.channelName = document.getElementById('channelNameOverlay');
        this.channelsGrid = document.getElementById('channelsGrid');
        this.uptimeEl = document.getElementById('uptime');
        this.timeEl = document.getElementById('currentTime');

        this.video.muted = true;
        this.video.playsInline = true;
    }

    bind() {
        if (this.playPauseBtn)
            this.playPauseBtn.onclick = () => this.togglePlay();

        if (this.prevBtn)
            this.prevBtn.onclick = () => this.prevChannel();

        if (this.nextBtn)
            this.nextBtn.onclick = () => this.nextChannel();

        if (this.volumeSlider)
            this.volumeSlider.oninput = e => {
                this.video.volume = e.target.value / 100;
            };

        document.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.togglePlay();
            if (e.key === 'ArrowLeft') this.prevChannel();
            if (e.key === 'ArrowRight') this.nextChannel();
        });
    }

    initClock() {
        setInterval(() => {
            if (this.timeEl)
                this.timeEl.textContent = new Date().toLocaleTimeString('sq-AL', { hour12: false });

            if (this.uptimeEl) {
                let t = Math.floor((Date.now() - this.startTime) / 1000);
                let h = String(Math.floor(t / 3600)).padStart(2, '0');
                let m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
                let s = String(t % 60).padStart(2, '0');
                this.uptimeEl.textContent = `${h}:${m}:${s}`;
            }
        }, 1000);
    }

    /* ================= PLAYER ================= */

    togglePlay() {
        if (this.video.paused) this.video.play().catch(() => {});
        else this.video.pause();
    }

    playStream(url) {
        this.showLoading();
        this.clearStream();

        // Native HLS (TV / Android)
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.play().then(() => {
                this.video.muted = false;
                this.hideLoading();
            }).catch(() => {});
            return;
        }

        // HLS.js (Chrome / Edge)
        if (window.Hls && Hls.isSupported()) {
            this.hls = new Hls();
            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.video.play().then(() => {
                    this.video.muted = false;
                    this.hideLoading();
                }).catch(() => {});
            });

            this.hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) this.showError();
            });
        }
    }

    clearStream() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        this.video.pause();
        this.video.src = '';
    }

    /* ================= CHANNELS ================= */

    playChannel(channel) {
        if (!channel) return;
        this.currentChannel = channel;
        if (this.channelName) this.channelName.textContent = channel.name;
        this.playStream(channel.url);
        this.highlightChannel(channel);
    }

    prevChannel() {
        let i = this.channels.indexOf(this.currentChannel);
        if (i > 0) this.playChannel(this.channels[i - 1]);
    }

    nextChannel() {
        let i = this.channels.indexOf(this.currentChannel);
        if (i < this.channels.length - 1) this.playChannel(this.channels[i + 1]);
    }

    renderChannels() {
        if (!this.channelsGrid) return;
        this.channelsGrid.innerHTML = '';

        this.channels.forEach(ch => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.innerHTML = `
                <div class="channel-logo-card">
                    <span class="logo-fallback">${ch.name[0]}</span>
                </div>
                <div class="channel-info-card">
                    <h4>${ch.name}</h4>
                </div>
            `;
            card.onclick = () => this.playChannel(ch);
            this.channelsGrid.appendChild(card);
        });
    }

    highlightChannel(channel) {
        document.querySelectorAll('.channel-card').forEach(c => c.classList.remove('active'));
        let i = this.channels.indexOf(channel);
        if (this.channelsGrid.children[i])
            this.channelsGrid.children[i].classList.add('active');
    }

    /* ================= UI ================= */

    showLoading() {
        if (this.loading) this.loading.style.display = 'flex';
    }

    hideLoading() {
        if (this.loading) this.loading.style.display = 'none';
    }

    showError() {
        if (this.error) this.error.style.display = 'flex';
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
            },
            {
                name: 'RTSH 1',
                url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
            }
        ];

        this.renderChannels();
        this.playChannel(this.channels[0]);
    }
}

/* ================= START ================= */

document.addEventListener('DOMContentLoaded', () => {
    window.player = new IptvPlayerPro();
    player.loadDemo();
});
