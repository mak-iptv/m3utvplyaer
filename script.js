document.addEventListener('DOMContentLoaded', function() {
    // Element references
    const refreshBtn = document.getElementById('refreshBtn');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const infoBtn = document.getElementById('infoBtn');
    const loadingAnimation = document.getElementById('loadingAnimation');
    const statusMessage = document.getElementById('statusMessage');
    
    // Status messages
    const messages = {
        refresh: "Duke rifreskuar playlist-in...",
        play: "Duke u përpjekur të lidhemi me Live TV...",
        stop: "Lidhja u ndal",
        info: "Informacion: Playlist-i aktual ka skaduar. Ju lutem rifreskoni ose kontaktoni administratorin.",
        error: "Gabim: Nuk mund të lidhet me serverin. Provoni përsëri."
    };
    
    // Show status message
    function showMessage(text, type = 'info') {
        statusMessage.textContent = text;
        statusMessage.style.opacity = '1';
        
        // Set color based on type
        if (type === 'error') {
            statusMessage.style.backgroundColor = 'rgba(255, 82, 82, 0.2)';
            statusMessage.style.color = '#ff5252';
            statusMessage.style.border = '1px solid #ff5252';
        } else {
            statusMessage.style.backgroundColor = 'rgba(79, 195, 247, 0.2)';
            statusMessage.style.color = '#4fc3f7';
            statusMessage.style.border = '1px solid #4fc3f7';
        }
        
        // Hide message after 4 seconds
        setTimeout(() => {
            statusMessage.style.opacity = '0';
        }, 4000);
    }
    
    // Simulate loading
    function simulateLoading(action) {
        loadingAnimation.style.display = 'flex';
        
        // Hide after random time (simulating network request)
        setTimeout(() => {
            loadingAnimation.style.display = 'none';
            
            // For demo purposes, always show error when trying to play
            if (action === 'play') {
                showMessage(messages.error, 'error');
            }
        }, 2000);
    }
    
    // Button event handlers
    refreshBtn.addEventListener('click', function() {
        showMessage(messages.refresh, 'info');
        simulateLoading('refresh');
    });
    
    playBtn.addEventListener('click', function() {
        showMessage(messages.play, 'info');
        simulateLoading('play');
    });
    
    stopBtn.addEventListener('click', function() {
        showMessage(messages.stop, 'info');
        loadingAnimation.style.display = 'none';
    });
    
    infoBtn.addEventListener('click', function() {
        showMessage(messages.info, 'info');
    });
    
    // Initialize with a message
    setTimeout(() => {
        showMessage("Sistemi është gati. Playlist-i aktual ka skaduar.", 'info');
    }, 1000);
});
