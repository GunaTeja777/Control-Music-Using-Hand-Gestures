/**
 * Demo Mode for Hand Gesture Music Control
 * Provides a demonstration when camera is not available
 */

class DemoMode {
    constructor() {
        this.isDemo = false;
        this.demoInterval = null;
        this.demoHandPositions = {
            left: { x: 0.3, y: 0.5, active: false },
            right: { x: 0.7, y: 0.5, active: false }
        };
        this.init();
    }

    init() {
        this.setupDemoButton();
        console.log('🎭 Demo mode initialized');
    }

    setupDemoButton() {
        // Add demo button to the camera section
        const cameraSection = document.querySelector('.camera-section');
        if (cameraSection) {
            const demoButton = document.createElement('button');
            demoButton.id = 'demo-mode-btn';
            demoButton.className = 'demo-btn';
            demoButton.innerHTML = '🎭 Try Demo Mode';
            demoButton.title = 'Experience the app without camera';
            
            demoButton.addEventListener('click', () => {
                this.toggleDemo();
            });

            // Add demo button styles
            const demoStyles = document.createElement('style');
            demoStyles.textContent = `
                .demo-btn {
                    background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
                    border: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-top: 15px;
                    width: 100%;
                    max-width: 200px;
                    font-size: 0.9rem;
                    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                }

                .demo-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
                    background: linear-gradient(135deg, #ff5252, #26a69a);
                }

                .demo-btn.active {
                    background: linear-gradient(135deg, #4caf50, #2196f3);
                    box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
                }

                .demo-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(78, 205, 196, 0.1));
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(5px);
                    z-index: 10;
                }

                .demo-content {
                    text-align: center;
                    color: white;
                    padding: 20px;
                }

                .demo-hand {
                    position: absolute;
                    font-size: 3rem;
                    transition: all 0.5s ease;
                    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.7));
                    z-index: 11;
                }

                .demo-hand.left {
                    left: 30%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                }

                .demo-hand.right {
                    right: 30%;
                    top: 50%;
                    transform: translate(50%, -50%);
                }

                .demo-hand.active {
                    transform: scale(1.2) translate(-50%, -50%);
                    filter: drop-shadow(0 0 20px rgba(255, 107, 107, 0.8));
                }

                .demo-instructions {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    padding: 15px 20px;
                    border-radius: 10px;
                    color: white;
                    font-size: 0.9rem;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                @media (max-width: 768px) {
                    .demo-hand {
                        font-size: 2rem;
                    }
                    
                    .demo-instructions {
                        font-size: 0.8rem;
                        padding: 12px 16px;
                        bottom: 10px;
                    }
                }
            `;
            document.head.appendChild(demoStyles);

            const videoContainer = cameraSection.querySelector('.video-container');
            if (videoContainer) {
                videoContainer.appendChild(demoButton);
            }
        }
    }

    toggleDemo() {
        if (this.isDemo) {
            this.stopDemo();
        } else {
            this.startDemo();
        }
    }

    startDemo() {
        this.isDemo = true;
        const demoButton = document.getElementById('demo-mode-btn');
        const videoContainer = document.querySelector('.video-container');
        
        if (demoButton) {
            demoButton.textContent = '🎥 Exit Demo';
            demoButton.classList.add('active');
        }

        // Create demo overlay
        const demoOverlay = document.createElement('div');
        demoOverlay.className = 'demo-overlay';
        demoOverlay.innerHTML = `
            <div class="demo-content">
                <h3>🎭 Demo Mode Active</h3>
                <p>Watch the virtual hands control music!</p>
            </div>
            <div class="demo-hand left">🤚</div>
            <div class="demo-hand right">✋</div>
            <div class="demo-instructions">
                <strong>Demo Controls:</strong><br>
                Left hand (🤚) - Drums | Right hand (✋) - Volume & Pitch
            </div>
        `;

        if (videoContainer) {
            videoContainer.appendChild(demoOverlay);
        }

        // Start demo animation
        this.startDemoAnimation();

        // Show notification
        if (typeof UIEnhancements !== 'undefined') {
            UIEnhancements.showNotification('🎭 Demo mode started! Watch the virtual hands control music.', 'info', 4000);
        }
    }

    stopDemo() {
        this.isDemo = false;
        const demoButton = document.getElementById('demo-mode-btn');
        const demoOverlay = document.querySelector('.demo-overlay');
        
        if (demoButton) {
            demoButton.textContent = '🎭 Try Demo Mode';
            demoButton.classList.remove('active');
        }

        if (demoOverlay) {
            demoOverlay.remove();
        }

        // Stop demo animation
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
            this.demoInterval = null;
        }

        // Show notification
        if (typeof UIEnhancements !== 'undefined') {
            UIEnhancements.showNotification('🎥 Demo mode stopped. Connect camera for real hand tracking.', 'info');
        }
    }

    startDemoAnimation() {
        let time = 0;
        
        this.demoInterval = setInterval(() => {
            time += 0.1;
            
            const leftHand = document.querySelector('.demo-hand.left');
            const rightHand = document.querySelector('.demo-hand.right');
            
            if (leftHand && rightHand) {
                // Animate left hand (drums)
                const leftY = 50 + Math.sin(time * 2) * 15;
                const leftActive = Math.sin(time * 2) > 0.7;
                leftHand.style.top = leftY + '%';
                leftHand.classList.toggle('active', leftActive);
                
                // Animate right hand (volume/pitch)
                const rightY = 50 + Math.sin(time) * 20;
                const rightScale = 1 + Math.sin(time * 1.5) * 0.3;
                rightHand.style.top = rightY + '%';
                rightHand.style.transform = `translate(50%, -50%) scale(${rightScale})`;
                
                // Simulate audio values based on hand positions
                this.updateDemoAudioValues(leftActive, rightY, rightScale);
            }
        }, 100);
    }

    updateDemoAudioValues(leftActive, rightY, rightScale) {
        // Simulate volume based on right hand Y position
        const volume = Math.max(0, Math.min(1, (70 - rightY) / 40));
        
        // Simulate pitch based on right hand scale (openness)
        const pitchValue = Math.max(0, Math.min(1, (rightScale - 0.7) / 0.6));
        const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        const noteNames = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
        const noteIndex = Math.floor(pitchValue * (frequencies.length - 1));
        
        // Update volume slider if it exists
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.value = Math.round(volume * 100);
        }

        // Trigger drum sounds in demo mode
        if (leftActive && Math.random() > 0.7) {
            this.playDemoSound('drum');
        }

        // Update any audio visualization
        this.updateDemoVisualization(volume, pitchValue);
    }

    playDemoSound(type) {
        // Create a simple beep sound for demo
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (type === 'drum') {
                // Simple drum-like sound
                oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            }
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Demo audio not available:', error);
        }
    }

    updateDemoVisualization(volume, pitch) {
        // Update any 3D visualization or UI elements
        const volumeInfo = document.querySelector('.volume-info');
        const pitchInfo = document.querySelector('.pitch-info');
        
        if (volumeInfo) {
            volumeInfo.textContent = `Volume: ${Math.round(volume * 100)}%`;
        }
        
        if (pitchInfo) {
            const noteNames = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
            const noteIndex = Math.floor(pitch * (noteNames.length - 1));
            pitchInfo.textContent = `Pitch: ${noteNames[noteIndex]}`;
        }
    }

    // Public method to check if demo is active
    isDemoActive() {
        return this.isDemo;
    }

    // Public method to get demo hand positions for external use
    getDemoHandPositions() {
        if (!this.isDemo) return null;
        
        return {
            leftHand: {
                landmarks: this.generateDemoLandmarks(this.demoHandPositions.left),
                isLeft: true,
                active: this.demoHandPositions.left.active
            },
            rightHand: {
                landmarks: this.generateDemoLandmarks(this.demoHandPositions.right),
                isRight: true,
                active: this.demoHandPositions.right.active
            }
        };
    }

    generateDemoLandmarks(handPos) {
        // Generate fake landmarks for demo purposes
        const landmarks = [];
        for (let i = 0; i < 21; i++) {
            landmarks.push({
                x: handPos.x + (Math.random() - 0.5) * 0.1,
                y: handPos.y + (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1
            });
        }
        return landmarks;
    }
}

// Initialize demo mode when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DemoMode());
} else {
    new DemoMode();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DemoMode;
}
