/**
 * Main Application Controller
 * Coordinates MediaPipe, Music Player, Visualizer, and Gesture Recognition
 */

class MusicGestureApp {
    constructor() {
        this.mediaPipeHandler = null;
        this.musicPlayer = null;
        this.visualizer = null;
        this.gestureRecognizer = null;
        
        this.isInitialized = false;
        this.isRunning = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Music Gesture Control App...');
            
            // Initialize components
            await this.initializeComponents();
            
            // Set up connections between components
            this.setupConnections();
            
            // Set up global event listeners
            this.setupGlobalEventListeners();
            
            this.isInitialized = true;
            this.isRunning = true;
            
            console.log('App initialized successfully!');
            this.showInitializationMessage();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showErrorMessage('Failed to initialize the application. Please refresh and try again.');
        }
    }

    async initializeComponents() {
        // Initialize MediaPipe Handler
        console.log('Initializing MediaPipe...');
        this.mediaPipeHandler = new MediaPipeHandler();
        
        // Initialize Music Player
        console.log('Initializing Music Player...');
        this.musicPlayer = new MusicPlayer();
        
        // Initialize Three.js Visualizer
        console.log('Initializing 3D Visualizer...');
        this.visualizer = new ThreeVisualizer('three-canvas');
        
        // Initialize Gesture Recognizer
        console.log('Initializing Gesture Recognition...');
        this.gestureRecognizer = new GestureRecognizer();
        
        // Wait a bit for MediaPipe to fully initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setupConnections() {
        // Connect MediaPipe results to Gesture Recognizer
        this.mediaPipeHandler.setOnResultsCallback((results) => {
            if (this.gestureRecognizer) {
                this.gestureRecognizer.recognizeGesture(results);
            }
        });

        // Connect Gesture Recognition to Music Player
        this.gestureRecognizer.setOnGestureCallback((gesture) => {
            this.handleGestureAction(gesture);
        });

        // Connect Music Player to Visualizer
        this.musicPlayer.setOnTrackChangeCallback((track) => {
            const audioElement = this.musicPlayer.getAudioElement();
            this.visualizer.connectAudio(audioElement);
        });

        this.musicPlayer.setOnPlayStateChangeCallback((isPlaying) => {
            if (isPlaying) {
                this.visualizer.resumeAudioContext();
            }
        });

        console.log('Component connections established');
    }

    handleGestureAction(gesture) {
        console.log(`Executing gesture action: ${gesture.action}`);
        
        switch (gesture.action) {
            case 'play_pause':
                this.musicPlayer.gestureTogglePlayPause();
                break;
                
            case 'stop':
                this.musicPlayer.gestureStop();
                break;
                
            case 'next':
                this.musicPlayer.gestureNext();
                break;
                
            case 'previous':
                this.musicPlayer.gesturePrevious();
                break;
                
            case 'volume_up':
                this.musicPlayer.gestureVolumeUp();
                break;
                
            case 'volume_down':
                this.musicPlayer.gestureVolumeDown();
                break;
                
            case 'toggle_visualization':
                this.toggleVisualization();
                break;
                
            case 'confirm':
                this.handleConfirmGesture();
                break;
                
            default:
                console.log(`Unknown gesture action: ${gesture.action}`);
        }

        // Visual feedback for gesture
        this.showGestureFeedback(gesture);
    }

    toggleVisualization() {
        const toggleBtn = document.getElementById('toggle-viz');
        if (toggleBtn) {
            toggleBtn.click();
        }
    }

    handleConfirmGesture() {
        // Could be used for confirming actions or triggering special features
        this.musicPlayer.showMessage('Gesture Confirmed');
    }

    showGestureFeedback(gesture) {
        // Add visual feedback class to gesture items
        const gestureItems = document.querySelectorAll('.gesture-item');
        
        gestureItems.forEach(item => {
            const desc = item.querySelector('.gesture-desc strong');
            if (desc && this.gestureMatchesDescription(gesture, desc.textContent)) {
                item.classList.add('pulse');
                setTimeout(() => {
                    item.classList.remove('pulse');
                }, 1000);
            }
        });
    }

    gestureMatchesDescription(gesture, description) {
        const gestureMap = {
            'open_palm': 'Open Palm',
            'closed_fist': 'Closed Fist',
            'thumbs_up': 'Thumbs Up',
            'thumbs_down': 'Thumbs Down',
            'pointing_left': 'Point Left',
            'pointing_right': 'Point Right',
            'peace_sign': 'Peace Sign',
            'ok_sign': 'OK Sign'
        };
        
        return gestureMap[gesture.name] === description;
    }

    setupGlobalEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseApp();
            } else {
                this.resumeApp();
            }
        });

        // Handle window beforeunload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Handle errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showErrorMessage('An error occurred. Some features may not work properly.');
        });

        // Handle WebGL context loss
        const canvas = document.getElementById('three-canvas');
        if (canvas) {
            canvas.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                console.warn('WebGL context lost, attempting to restore...');
                this.showErrorMessage('3D visualization temporarily unavailable.');
            });

            canvas.addEventListener('webglcontextrestored', () => {
                console.log('WebGL context restored');
                if (this.visualizer) {
                    this.visualizer.onWindowResize();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }

    handleKeyboardShortcuts(event) {
        // Only handle shortcuts if not typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.musicPlayer.togglePlayPause();
                break;
                
            case 'ArrowRight':
                event.preventDefault();
                this.musicPlayer.next();
                break;
                
            case 'ArrowLeft':
                event.preventDefault();
                this.musicPlayer.previous();
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.musicPlayer.gestureVolumeUp();
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                this.musicPlayer.gestureVolumeDown();
                break;
                
            case 'KeyS':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.musicPlayer.stop();
                }
                break;
        }
    }

    pauseApp() {
        if (this.isRunning) {
            this.isRunning = false;
            if (this.mediaPipeHandler) {
                this.mediaPipeHandler.stop();
            }
            console.log('App paused');
        }
    }

    resumeApp() {
        if (!this.isRunning && this.isInitialized) {
            this.isRunning = true;
            if (this.mediaPipeHandler) {
                this.mediaPipeHandler.restart();
            }
            console.log('App resumed');
        }
    }

    cleanup() {
        console.log('Cleaning up app...');
        
        this.isRunning = false;
        
        if (this.mediaPipeHandler) {
            this.mediaPipeHandler.stop();
        }
        
        if (this.visualizer) {
            this.visualizer.destroy();
        }
        
        if (this.musicPlayer) {
            this.musicPlayer.pause();
        }
    }

    // User feedback methods
    showInitializationMessage() {
        this.showTemporaryMessage('🎵 Music Gesture Control Ready! Load some music files to begin.', 3000);
    }

    showErrorMessage(message) {
        this.showTemporaryMessage(`⚠️ ${message}`, 5000, 'error');
    }

    showTemporaryMessage(message, duration = 2000, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `app-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'error' ? 'rgba(255, 68, 68, 0.9)' : 'rgba(68, 255, 68, 0.9)'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(messageEl);

        // Fade in
        setTimeout(() => {
            messageEl.style.opacity = '1';
        }, 100);

        // Fade out and remove
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, duration);
    }

    // Public API methods
    getStatus() {
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            components: {
                mediaPipe: !!this.mediaPipeHandler,
                musicPlayer: !!this.musicPlayer,
                visualizer: !!this.visualizer,
                gestureRecognizer: !!this.gestureRecognizer
            }
        };
    }

    adjustGestureSettings(settings) {
        if (this.gestureRecognizer) {
            if (settings.confidenceThreshold !== undefined) {
                this.gestureRecognizer.setConfidenceThreshold(settings.confidenceThreshold);
            }
            if (settings.debounceDelay !== undefined) {
                this.gestureRecognizer.setDebounceDelay(settings.debounceDelay);
            }
            if (settings.stabilityFrames !== undefined) {
                this.gestureRecognizer.setStabilityFrames(settings.stabilityFrames);
            }
        }
    }

    getGestureHistory() {
        return this.gestureRecognizer ? this.gestureRecognizer.getGestureHistory() : [];
    }

    getCurrentTrack() {
        return this.musicPlayer ? this.musicPlayer.getCurrentTrack() : null;
    }

    getVisualizationMode() {
        return this.visualizer ? this.visualizer.mode : null;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Create global app instance
    window.musicGestureApp = new MusicGestureApp();
    
    // Add app to window for debugging
    window.app = window.musicGestureApp;
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicGestureApp;
}
