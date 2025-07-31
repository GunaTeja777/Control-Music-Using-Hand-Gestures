/**
 * Music Player Controller
 * Handles audio playback, file management, and player controls
 */

class MusicPlayer {
    constructor() {
        this.audioElement = null;
        this.currentTrackIndex = 0;
        this.playlist = [];
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 0.5;
        
        // Callbacks
        this.onTrackChangeCallback = null;
        this.onPlayStateChangeCallback = null;
        
        this.init();
    }

    init() {
        this.audioElement = document.getElementById('audio-player');
        this.setupEventListeners();
        this.setupFileInput();
        this.updateUI();
    }

    setupEventListeners() {
        // Audio element events
        this.audioElement.addEventListener('loadedmetadata', () => {
            this.duration = this.audioElement.duration;
            this.updateTimeDisplay();
        });

        this.audioElement.addEventListener('timeupdate', () => {
            this.currentTime = this.audioElement.currentTime;
            this.updateProgress();
            this.updateTimeDisplay();
        });

        this.audioElement.addEventListener('ended', () => {
            this.next();
        });

        this.audioElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            if (this.onPlayStateChangeCallback) {
                this.onPlayStateChangeCallback(true);
            }
        });

        this.audioElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            if (this.onPlayStateChangeCallback) {
                this.onPlayStateChangeCallback(false);
            }
        });

        // Control buttons
        const playPauseBtn = document.getElementById('play-pause-btn');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const volumeSlider = document.getElementById('volume-slider');
        const progressBar = document.querySelector('.progress-bar');

        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previous());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.next());
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }

        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                this.seek(percentage * this.duration);
            });
        }
    }

    setupFileInput() {
        const fileInput = document.getElementById('file-input');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.loadFiles(e.target.files);
            });
        }

        // Drag and drop support
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            this.loadFiles(files);
        });
    }

    loadFiles(files) {
        this.playlist = [];
        
        for (let file of files) {
            if (file.type.startsWith('audio/')) {
                const track = {
                    file: file,
                    name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                    artist: 'Unknown Artist',
                    url: URL.createObjectURL(file)
                };
                this.playlist.push(track);
            }
        }

        if (this.playlist.length > 0) {
            this.currentTrackIndex = 0;
            this.loadTrack(this.currentTrackIndex);
            console.log(`Loaded ${this.playlist.length} tracks`);
        }
    }

    loadTrack(index) {
        if (index >= 0 && index < this.playlist.length) {
            const track = this.playlist[index];
            this.audioElement.src = track.url;
            this.currentTrackIndex = index;
            this.updateTrackInfo(track);
            
            if (this.onTrackChangeCallback) {
                this.onTrackChangeCallback(track);
            }
        }
    }

    updateTrackInfo(track) {
        const titleElement = document.getElementById('track-title');
        const artistElement = document.getElementById('track-artist');
        
        if (titleElement) {
            titleElement.textContent = track.name;
        }
        
        if (artistElement) {
            artistElement.textContent = track.artist;
        }
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.playlist.length > 0) {
            this.audioElement.play().catch(error => {
                console.error('Error playing audio:', error);
            });
        }
    }

    pause() {
        this.audioElement.pause();
    }

    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
    }

    next() {
        if (this.playlist.length > 0) {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
            this.loadTrack(this.currentTrackIndex);
            if (this.isPlaying) {
                this.play();
            }
        }
    }

    previous() {
        if (this.playlist.length > 0) {
            this.currentTrackIndex = this.currentTrackIndex === 0 
                ? this.playlist.length - 1 
                : this.currentTrackIndex - 1;
            this.loadTrack(this.currentTrackIndex);
            if (this.isPlaying) {
                this.play();
            }
        }
    }

    seek(time) {
        this.audioElement.currentTime = Math.max(0, Math.min(time, this.duration));
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audioElement.volume = this.volume;
        
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
        }
    }

    getVolume() {
        return this.volume;
    }

    updatePlayButton() {
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'inline';
        } else {
            if (playIcon) playIcon.style.display = 'inline';
            if (pauseIcon) pauseIcon.style.display = 'none';
        }
    }

    updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill && this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }

    updateTimeDisplay() {
        const currentTimeElement = document.getElementById('current-time');
        const totalTimeElement = document.getElementById('total-time');
        
        if (currentTimeElement) {
            currentTimeElement.textContent = this.formatTime(this.currentTime);
        }
        
        if (totalTimeElement) {
            totalTimeElement.textContent = this.formatTime(this.duration);
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    updateUI() {
        this.updatePlayButton();
        this.updateProgress();
        this.updateTimeDisplay();
        this.setVolume(this.volume);
    }

    // Gesture control methods
    gesturePlay() {
        if (!this.isPlaying) {
            this.play();
        }
    }

    gesturePause() {
        if (this.isPlaying) {
            this.pause();
        }
    }

    gestureTogglePlayPause() {
        this.togglePlayPause();
    }

    gestureVolumeUp() {
        const newVolume = Math.min(1, this.volume + 0.1);
        this.setVolume(newVolume);
        this.showVolumeChange(`Volume: ${Math.round(newVolume * 100)}%`);
    }

    gestureVolumeDown() {
        const newVolume = Math.max(0, this.volume - 0.1);
        this.setVolume(newVolume);
        this.showVolumeChange(`Volume: ${Math.round(newVolume * 100)}%`);
    }

    gestureNext() {
        this.next();
        this.showTrackChange('Next Track');
    }

    gesturePrevious() {
        this.previous();
        this.showTrackChange('Previous Track');
    }

    gestureStop() {
        this.stop();
        this.showMessage('Stopped');
    }

    // Visual feedback for gesture actions
    showVolumeChange(message) {
        this.showTemporaryMessage(message, 1000);
    }

    showTrackChange(message) {
        this.showTemporaryMessage(message, 1500);
    }

    showMessage(message) {
        this.showTemporaryMessage(message, 1000);
    }

    showTemporaryMessage(message, duration = 1000) {
        // Create or update temporary message element
        let messageEl = document.getElementById('gesture-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'gesture-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1000;
                font-size: 14px;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.style.opacity = '1';

        // Clear existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        // Hide message after duration
        this.messageTimeout = setTimeout(() => {
            messageEl.style.opacity = '0';
        }, duration);
    }

    // Callback setters
    setOnTrackChangeCallback(callback) {
        this.onTrackChangeCallback = callback;
    }

    setOnPlayStateChangeCallback(callback) {
        this.onPlayStateChangeCallback = callback;
    }

    // Get current track info
    getCurrentTrack() {
        return this.playlist[this.currentTrackIndex] || null;
    }

    getPlaylist() {
        return this.playlist;
    }

    isCurrentlyPlaying() {
        return this.isPlaying;
    }

    // Get audio element for visualizer connection
    getAudioElement() {
        return this.audioElement;
    }
}

// Export for use in other modules
window.MusicPlayer = MusicPlayer;
