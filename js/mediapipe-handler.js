/**
 * MediaPipe Hands Handler
 * Manages webcam input and hand detection using MediaPipe
 */

class MediaPipeHandler {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.onResultsCallback = null;
        this.lastResults = null;
        
        // Drawing options
        this.drawingOptions = {
            showConnections: true,
            showLandmarks: true,
            showNumbers: false,
            showLabels: true,
            connectionColor: '#00FF00',
            landmarkColor: '#FF0000'
        };
        
        // Web Audio API components
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isAudioPlaying = false;
        this.audioEnabled = false;
        
        // Audio smoothing
        this.lastFrequency = 261.63; // C4
        this.lastGain = 0;
        this.smoothingFactor = 0.1;
        
        // Drum samples
        this.drumSamples = {};
        this.drumContext = null;
        this.drumEnabled = true;
        
        // Gesture tracking for drums
        this.gestureHistory = [];
        this.maxHistoryLength = 10;
        this.lastGestureTime = 0;
        this.gestureThreshold = 0.1; // Minimum movement to register
        this.velocityThreshold = 0.05; // Minimum velocity for drum trigger
        
        // Hand position tracking
        this.lastHandPositions = {};
        this.handVelocities = {};
        
        // Check if MediaPipe drawing utilities are available
        this.hasDrawingUtils = typeof drawConnectors !== 'undefined' && typeof drawLandmarks !== 'undefined' && typeof HAND_CONNECTIONS !== 'undefined';
        
        this.init();
    }

    init() {
        // Get DOM elements
        this.videoElement = document.getElementById('input_video');
        this.canvasElement = document.getElementById('output_canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');

        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: this.isMobileDevice() ? 0 : 1, // Lower complexity for mobile
            minDetectionConfidence: 0.7, // Higher confidence for better performance
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));

        // Initialize camera
        this.initCamera();
        
        // Initialize Web Audio API
        this.initAudio();
        
        // Initialize drum samples
        this.initDrumSamples();
        
        // Setup tutorial link click detection
        this.setupTutorialLink();
        
        // Setup encouraging messages
        this.setupEncouragingMessages();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
    }

    setupPerformanceMonitoring() {
        this.performanceStats = {
            frameCount: 0,
            lastFpsTime: Date.now(),
            fps: 0,
            frameTime: 0,
            lastFrameTime: Date.now(),
            skippedFrames: 0
        };
        
        // Monitor performance every 2 seconds
        setInterval(() => {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.performanceStats.lastFpsTime;
            
            if (deltaTime >= 2000) {
                this.performanceStats.fps = Math.round((this.performanceStats.frameCount * 1000) / deltaTime);
                this.performanceStats.frameCount = 0;
                this.performanceStats.lastFpsTime = currentTime;
                
                // Auto-adjust quality based on performance
                this.adjustQualityBasedOnPerformance();
            }
        }, 2000);
    }

    adjustQualityBasedOnPerformance() {
        if (!this.hands) return;
        
        const targetFps = this.isMobileDevice() ? 20 : 30;
        const currentFps = this.performanceStats.fps;
        
        if (currentFps < targetFps * 0.7) {
            // Performance is poor, reduce quality
            this.hands.setOptions({
                modelComplexity: 0,
                minDetectionConfidence: 0.8,
                minTrackingConfidence: 0.6
            });
            
            // Reduce rendering frequency
            this.renderSkipFrame = (this.renderSkipFrame || 0) + 1;
            
            console.log(`🔧 Performance optimization: Reduced quality (FPS: ${currentFps})`);
            
        } else if (currentFps > targetFps * 1.2 && !this.isMobileDevice()) {
            // Performance is good, can increase quality
            this.hands.setOptions({
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });
            
            this.renderSkipFrame = Math.max(0, (this.renderSkipFrame || 0) - 1);
            
            console.log(`🚀 Performance optimization: Increased quality (FPS: ${currentFps})`);
        }
    }

    async initAudio() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = 0; // Start muted
            
            console.log('Web Audio API initialized successfully');
            
            // Add click handler to enable audio (required by browsers)
            this.setupAudioEnableHandler();
            
        } catch (error) {
            console.error('Error initializing Web Audio API:', error);
        }
    }

    setupAudioEnableHandler() {
        // Create a one-time click handler to enable audio
        const enableAudio = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            this.audioEnabled = true;
            console.log('Audio enabled by user interaction');
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('keydown', enableAudio);
            
            // Show audio enabled message
            this.showAudioMessage('🔊 Audio Enabled! Hand tracking will now control sound.');
        };
        
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        
        // Show instruction message
        setTimeout(() => {
            this.showAudioMessage('🖱️ Click anywhere or press any key to enable audio');
        }, 2000);
    }

    showAudioMessage(message) {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 16px;
            font-weight: bold;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        // Fade in
        setTimeout(() => messageEl.style.opacity = '1', 100);

        // Fade out and remove
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    setupTutorialLink() {
        // Add click listener to canvas for tutorial link
        if (this.canvasElement) {
            this.canvasElement.addEventListener('click', (event) => {
                if (this.tutorialLinkArea) {
                    const rect = this.canvasElement.getBoundingClientRect();
                    const scaleX = this.canvasElement.width / rect.width;
                    const scaleY = this.canvasElement.height / rect.height;
                    
                    // Get click coordinates relative to canvas display size
                    const x = (event.clientX - rect.left) * scaleX / (this.pixelRatio || 1);
                    const y = (event.clientY - rect.top) * scaleY / (this.pixelRatio || 1);
                    
                    // Check if click is within tutorial link area
                    if (x >= this.tutorialLinkArea.x && 
                        x <= this.tutorialLinkArea.x + this.tutorialLinkArea.width &&
                        y >= this.tutorialLinkArea.y && 
                        y <= this.tutorialLinkArea.y + this.tutorialLinkArea.height) {
                        
                        // Open GitHub repository
                        window.open('https://github.com/GunaTeja777/Control-Music-Using-Hand-Gestures', '_blank');
                        
                        // Show feedback
                        this.showAudioMessage('🚀 Opening GitHub repository with code & tutorials!');
                    }
                }
            });
            
            // Add cursor pointer style when hovering over tutorial link
            this.canvasElement.addEventListener('mousemove', (event) => {
                if (this.tutorialLinkArea) {
                    const rect = this.canvasElement.getBoundingClientRect();
                    const scaleX = this.canvasElement.width / rect.width;
                    const scaleY = this.canvasElement.height / rect.height;
                    
                    const x = (event.clientX - rect.left) * scaleX / (this.pixelRatio || 1);
                    const y = (event.clientY - rect.top) * scaleY / (this.pixelRatio || 1);
                    
                    if (x >= this.tutorialLinkArea.x && 
                        x <= this.tutorialLinkArea.x + this.tutorialLinkArea.width &&
                        y >= this.tutorialLinkArea.y && 
                        y <= this.tutorialLinkArea.y + this.tutorialLinkArea.height) {
                        this.canvasElement.style.cursor = 'pointer';
                    } else {
                        this.canvasElement.style.cursor = 'default';
                    }
                }
            });
        }
    }

    setupEncouragingMessages() {
        const encouragingMessages = [
            "🎵 Try moving your RIGHT hand up and down to control volume!",
            "✋ Open and close your RIGHT hand to change pitch!",
            "🥁 Use your LEFT hand for drums - try fast movements!",
            "🚀 Combine both hands for amazing musical performances!",
            "💫 The higher your right hand, the louder the music!",
            "🎶 Experiment with different hand positions and speeds!",
            "🔥 You're creating music with your hands - keep going!",
            "⭐ Try the 3D visualizer demo for the full experience!"
        ];
        
        let messageIndex = 0;
        
        // Show encouraging messages every 15 seconds
        setInterval(() => {
            if (this.audioEnabled) {
                this.showAudioMessage(encouragingMessages[messageIndex]);
                messageIndex = (messageIndex + 1) % encouragingMessages.length;
            }
        }, 15000);
        
        // Show first message after 5 seconds
        setTimeout(() => {
            if (this.audioEnabled) {
                this.showAudioMessage("🎵 Welcome! Use your hands to control music and drums!");
            }
        }, 5000);
    }

    async initDrumSamples() {
        try {
            // Create separate audio context for drums to avoid conflicts
            this.drumContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create drum samples using Web Audio API synthesis
            await this.createDrumSamples();
            
            console.log('Drum samples initialized successfully');
            
        } catch (error) {
            console.error('Error initializing drum samples:', error);
        }
    }

    async createDrumSamples() {
        // Create synthesized drum sounds using Web Audio API
        this.drumSamples = {
            kick: await this.createKickDrum(),
            snare: await this.createSnareDrum(),
            hihat: await this.createHiHat(),
            clap: await this.createClap()
        };
    }

    async createKickDrum() {
        // Create kick drum using oscillator + envelope
        return {
            play: (velocity = 1.0) => {
                const osc = this.drumContext.createOscillator();
                const gain = this.drumContext.createGain();
                
                // Kick drum characteristics
                osc.type = 'sine';
                osc.frequency.setValueAtTime(60, this.drumContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(0.01, this.drumContext.currentTime + 0.5);
                
                // Envelope
                gain.gain.setValueAtTime(0, this.drumContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(velocity * 0.8, this.drumContext.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, this.drumContext.currentTime + 0.5);
                
                osc.connect(gain);
                gain.connect(this.drumContext.destination);
                
                osc.start(this.drumContext.currentTime);
                osc.stop(this.drumContext.currentTime + 0.5);
            }
        };
    }

    async createSnareDrum() {
        return {
            play: (velocity = 1.0) => {
                // Noise component
                const bufferSize = this.drumContext.sampleRate * 0.3;
                const buffer = this.drumContext.createBuffer(1, bufferSize, this.drumContext.sampleRate);
                const output = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * 0.3;
                }
                
                const noise = this.drumContext.createBufferSource();
                noise.buffer = buffer;
                
                const noiseGain = this.drumContext.createGain();
                const filter = this.drumContext.createBiquadFilter();
                
                filter.type = 'highpass';
                filter.frequency.value = 1000;
                
                noiseGain.gain.setValueAtTime(0, this.drumContext.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(velocity * 0.5, this.drumContext.currentTime + 0.01);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, this.drumContext.currentTime + 0.2);
                
                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(this.drumContext.destination);
                
                noise.start(this.drumContext.currentTime);
                noise.stop(this.drumContext.currentTime + 0.2);
            }
        };
    }

    async createHiHat() {
        return {
            play: (velocity = 1.0) => {
                const bufferSize = this.drumContext.sampleRate * 0.1;
                const buffer = this.drumContext.createBuffer(1, bufferSize, this.drumContext.sampleRate);
                const output = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * 0.1;
                }
                
                const noise = this.drumContext.createBufferSource();
                noise.buffer = buffer;
                
                const gain = this.drumContext.createGain();
                const filter = this.drumContext.createBiquadFilter();
                
                filter.type = 'highpass';
                filter.frequency.value = 5000;
                
                gain.gain.setValueAtTime(0, this.drumContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(velocity * 0.3, this.drumContext.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, this.drumContext.currentTime + 0.1);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.drumContext.destination);
                
                noise.start(this.drumContext.currentTime);
                noise.stop(this.drumContext.currentTime + 0.1);
            }
        };
    }

    async createClap() {
        return {
            play: (velocity = 1.0) => {
                // Multiple short bursts for clap effect
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        const bufferSize = this.drumContext.sampleRate * 0.05;
                        const buffer = this.drumContext.createBuffer(1, bufferSize, this.drumContext.sampleRate);
                        const output = buffer.getChannelData(0);
                        
                        for (let j = 0; j < bufferSize; j++) {
                            output[j] = (Math.random() * 2 - 1) * 0.2;
                        }
                        
                        const noise = this.drumContext.createBufferSource();
                        noise.buffer = buffer;
                        
                        const gain = this.drumContext.createGain();
                        const filter = this.drumContext.createBiquadFilter();
                        
                        filter.type = 'bandpass';
                        filter.frequency.value = 2000;
                        filter.Q.value = 10;
                        
                        gain.gain.setValueAtTime(0, this.drumContext.currentTime);
                        gain.gain.exponentialRampToValueAtTime(velocity * 0.4, this.drumContext.currentTime + 0.01);
                        gain.gain.exponentialRampToValueAtTime(0.001, this.drumContext.currentTime + 0.05);
                        
                        noise.connect(filter);
                        filter.connect(gain);
                        gain.connect(this.drumContext.destination);
                        
                        noise.start(this.drumContext.currentTime);
                        noise.stop(this.drumContext.currentTime + 0.05);
                    }, i * 20);
                }
            }
        };
    }

    async initCamera() {
        try {
            // Detect device type and set optimal camera settings
            const isMobile = this.isMobileDevice();
            const optimalSettings = this.getOptimalCameraSettings(isMobile);
            
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    await this.hands.send({ image: this.videoElement });
                },
                width: optimalSettings.width,
                height: optimalSettings.height,
                facingMode: optimalSettings.facingMode
            });

            await this.camera.start();
            this.setupResponsiveCanvas();
            this.updateCameraStatus(true);
            console.log(`Camera initialized successfully - ${isMobile ? 'Mobile' : 'Desktop'} mode (${optimalSettings.width}x${optimalSettings.height})`);
        } catch (error) {
            console.error('Error initializing camera:', error);
            this.updateCameraStatus(false);
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
               window.innerWidth <= 768;
    }

    getOptimalCameraSettings(isMobile) {
        if (isMobile) {
            return {
                width: 480,
                height: 360,
                facingMode: 'user' // Front camera for mobile
            };
        } else {
            return {
                width: 640,
                height: 480,
                facingMode: 'user'
            };
        }
    }

    setupResponsiveCanvas() {
        if (!this.videoElement || !this.canvasElement) return;

        // Make canvas responsive
        const updateCanvasSize = () => {
            const container = this.canvasElement.parentElement;
            const containerWidth = container ? container.clientWidth : window.innerWidth;
            const containerHeight = container ? container.clientHeight : window.innerHeight;
            
            // Calculate aspect ratio
            const videoAspect = this.videoElement.videoWidth / this.videoElement.videoHeight;
            const containerAspect = containerWidth / containerHeight;
            
            let displayWidth, displayHeight;
            
            if (containerAspect > videoAspect) {
                // Container is wider than video aspect ratio
                displayHeight = Math.min(containerHeight * 0.8, 600);
                displayWidth = displayHeight * videoAspect;
            } else {
                // Container is taller than video aspect ratio
                displayWidth = Math.min(containerWidth * 0.9, 800);
                displayHeight = displayWidth / videoAspect;
            }
            
            // Set canvas display size (CSS)
            this.canvasElement.style.width = `${displayWidth}px`;
            this.canvasElement.style.height = `${displayHeight}px`;
            this.videoElement.style.width = `${displayWidth}px`;
            this.videoElement.style.height = `${displayHeight}px`;
            
            // Set canvas internal resolution for crisp rendering
            const pixelRatio = window.devicePixelRatio || 1;
            this.canvasElement.width = displayWidth * pixelRatio;
            this.canvasElement.height = displayHeight * pixelRatio;
            
            // Scale the context to match device pixel ratio
            this.canvasCtx.scale(pixelRatio, pixelRatio);
            
            // Store scale factors for coordinate calculations
            this.scaleX = displayWidth / this.videoElement.videoWidth;
            this.scaleY = displayHeight / this.videoElement.videoHeight;
            this.pixelRatio = pixelRatio;
            
            console.log(`Canvas resized: ${displayWidth}x${displayHeight} (${pixelRatio}x pixel ratio)`);
        };

        // Initial setup
        setTimeout(updateCanvasSize, 500);
        
        // Update on window resize with debouncing
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateCanvasSize, 250);
        });
        
        // Update when video loads
        this.videoElement.addEventListener('loadedmetadata', updateCanvasSize);
        
        // Store the resize function for later use
        this.updateCanvasSize = updateCanvasSize;
    }

    onResults(results) {
        // Performance monitoring
        const currentTime = Date.now();
        this.performanceStats.frameTime = currentTime - this.performanceStats.lastFrameTime;
        this.performanceStats.lastFrameTime = currentTime;
        this.performanceStats.frameCount++;
        
        // Skip frames for performance on low-end devices
        if (this.renderSkipFrame && this.performanceStats.frameCount % (this.renderSkipFrame + 1) !== 0) {
            this.performanceStats.skippedFrames++;
            // Still update audio and gestures for responsiveness
            this.updateAudioSynthesis();
            this.processDrumGestures(results);
            return;
        }
        
        // Store results for external access
        this.storeResults(results);
        
        // Clear canvas with proper scaling
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Update canvas size if video dimensions changed
        if (this.videoElement.videoWidth && this.videoElement.videoHeight) {
            const currentVideoWidth = this.videoElement.videoWidth;
            const currentVideoHeight = this.videoElement.videoHeight;
            
            if (this.lastVideoWidth !== currentVideoWidth || this.lastVideoHeight !== currentVideoHeight) {
                this.lastVideoWidth = currentVideoWidth;
                this.lastVideoHeight = currentVideoHeight;
                
                // Update canvas size responsively
                if (this.updateCanvasSize) {
                    this.updateCanvasSize();
                }
            }
        }

        // Draw hand landmarks and connections for both hands
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // Scale landmarks for responsive display
                const scaledLandmarks = this.scaleHandLandmarks(landmarks);
                
                // Choose colors based on hand (left/right)
                const isLeftHand = handedness.label === 'Left';
                const connectionColor = isLeftHand ? '#00FF00' : '#0080FF'; // Green for left, Blue for right
                const landmarkColor = isLeftHand ? '#FF0000' : '#FF8000';   // Red for left, Orange for right
                
                // Draw hand connections (bones) if enabled
                if (this.drawingOptions.showConnections) {
                    if (this.hasDrawingUtils) {
                        // Use MediaPipe drawing utilities if available
                        drawConnectors(this.canvasCtx, scaledLandmarks, HAND_CONNECTIONS, {
                            color: connectionColor,
                            lineWidth: this.getResponsiveLineWidth(3)
                        });
                    } else {
                        // Use custom drawing function as fallback
                        this.drawHandConnections(scaledLandmarks, connectionColor);
                    }
                }
                
                // Draw landmarks (joints) if enabled
                if (this.drawingOptions.showLandmarks) {
                    if (this.hasDrawingUtils) {
                        // Use MediaPipe drawing utilities if available
                        drawLandmarks(this.canvasCtx, scaledLandmarks, {
                            color: landmarkColor,
                            lineWidth: this.getResponsiveLineWidth(2),
                            radius: this.getResponsiveRadius(4)
                        });
                    } else {
                        // Use custom drawing function as fallback
                        this.drawHandLandmarks(scaledLandmarks, landmarkColor);
                    }
                }
                
                // Draw hand label if enabled
                if (this.drawingOptions.showLabels) {
                    this.drawHandLabel(scaledLandmarks, handedness, i);
                }
                
                // Draw numbered landmarks if enabled (skip on mobile for performance)
                if (this.drawingOptions.showNumbers && !this.isMobileDevice()) {
                    this.drawLandmarkNumbers(scaledLandmarks);
                }
            }
        }

        this.canvasCtx.restore();

        // Display audio control values (reduce frequency on mobile)
        const shouldUpdateUI = !this.isMobileDevice() || this.performanceStats.frameCount % 2 === 0;
        if (shouldUpdateUI) {
            this.displayAudioValues();
        }
        
        // Update audio synthesis in real-time
        this.updateAudioSynthesis();
        
        // Process drum gestures
        this.processDrumGestures(results);

        // Update landmark info (less frequently on mobile)
        if (shouldUpdateUI) {
            this.updateLandmarkInfo(results);
        }

        // Call callback if set
        if (this.onResultsCallback) {
            this.onResultsCallback(results);
        }
    }

    scaleHandLandmarks(landmarks) {
        if (!landmarks || !this.scaleX || !this.scaleY) return landmarks;
        
        return landmarks.map(landmark => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z || 0
        }));
    }

    getResponsiveLineWidth(baseWidth) {
        const scale = Math.min(this.scaleX || 1, this.scaleY || 1);
        return Math.max(1, baseWidth * scale * (this.pixelRatio || 1));
    }

    getResponsiveRadius(baseRadius) {
        const scale = Math.min(this.scaleX || 1, this.scaleY || 1);
        return Math.max(2, baseRadius * scale * (this.pixelRatio || 1));
    }

    getResponsiveFontSize(baseFontSize) {
        const isMobile = this.isMobileDevice();
        const scale = Math.min(this.scaleX || 1, this.scaleY || 1);
        const mobileFactor = isMobile ? 0.8 : 1;
        return Math.max(10, baseFontSize * scale * mobileFactor);
    }

    updateLandmarkInfo(results) {
        const landmarkInfo = document.getElementById('landmark-info');
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            let infoText = `Hands detected: ${results.multiHandLandmarks.length}\n\n`;
            
            results.multiHandLandmarks.forEach((landmarks, index) => {
                const handedness = results.multiHandedness[index];
                const label = handedness.label;
                const score = (handedness.score * 100).toFixed(1);
                
                infoText += `Hand ${index + 1}: ${label} (${score}%)\n`;
                
                // Show key landmark positions (all 21 landmarks)
                const landmarkNames = [
                    'Wrist', 'Thumb_CMC', 'Thumb_MCP', 'Thumb_IP', 'Thumb_Tip',
                    'Index_MCP', 'Index_PIP', 'Index_DIP', 'Index_Tip',
                    'Middle_MCP', 'Middle_PIP', 'Middle_DIP', 'Middle_Tip',
                    'Ring_MCP', 'Ring_PIP', 'Ring_DIP', 'Ring_Tip',
                    'Pinky_MCP', 'Pinky_PIP', 'Pinky_DIP', 'Pinky_Tip'
                ];
                
                // Show first 5 key landmarks for readability
                for (let i = 0; i < Math.min(5, landmarks.length); i++) {
                    const landmark = landmarks[i];
                    const name = landmarkNames[i] || `Point_${i}`;
                    infoText += `  ${name}: (${landmark.x.toFixed(3)}, ${landmark.y.toFixed(3)}, ${landmark.z ? landmark.z.toFixed(3) : 'N/A'})\n`;
                }
                
                infoText += `  ... and ${landmarks.length - 5} more landmarks\n\n`;
            });
            
            landmarkInfo.textContent = infoText;
        } else {
            landmarkInfo.textContent = 'No hands detected\n\nMove your hand in front of the camera to see landmark data.\n\nThe system can track up to 2 hands simultaneously with 21 landmarks each.';
        }
    }

    drawHandLabel(landmarks, handedness, handIndex) {
        if (!landmarks || landmarks.length === 0) return;
        
        // Get wrist position for label placement
        const wrist = landmarks[0];
        const x = wrist.x * this.canvasElement.width;
        const y = wrist.y * this.canvasElement.height;
        
        // Set text style
        this.canvasCtx.font = '16px Arial';
        this.canvasCtx.fillStyle = handedness.label === 'Left' ? '#00FF00' : '#0080FF';
        this.canvasCtx.strokeStyle = '#000000';
        this.canvasCtx.lineWidth = 2;
        
        const label = `${handedness.label} Hand`;
        const confidence = `${(handedness.score * 100).toFixed(0)}%`;
        
        // Draw background rectangle
        const textWidth = Math.max(
            this.canvasCtx.measureText(label).width,
            this.canvasCtx.measureText(confidence).width
        );
        
        this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.canvasCtx.fillRect(x - 5, y - 40, textWidth + 10, 35);
        
        // Draw text
        this.canvasCtx.fillStyle = handedness.label === 'Left' ? '#00FF00' : '#0080FF';
        this.canvasCtx.fillText(label, x, y - 20);
        this.canvasCtx.fillText(confidence, x, y - 5);
    }

    drawLandmarkNumbers(landmarks) {
        if (!landmarks) return;
        
        this.canvasCtx.font = '10px Arial';
        this.canvasCtx.fillStyle = '#FFFFFF';
        this.canvasCtx.strokeStyle = '#000000';
        this.canvasCtx.lineWidth = 1;
        
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.canvasElement.width;
            const y = landmark.y * this.canvasElement.height;
            
            // Draw small circle with number
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, 8, 0, 2 * Math.PI);
            this.canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.canvasCtx.fill();
            this.canvasCtx.strokeStyle = '#000000';
            this.canvasCtx.stroke();
            
            // Draw number
            this.canvasCtx.fillStyle = '#000000';
            this.canvasCtx.textAlign = 'center';
            this.canvasCtx.textBaseline = 'middle';
            this.canvasCtx.fillText(index.toString(), x, y);
        });
        
        // Reset text alignment
        this.canvasCtx.textAlign = 'start';
        this.canvasCtx.textBaseline = 'alphabetic';
    }

    updateCameraStatus(isActive) {
        const statusDot = document.getElementById('camera-status');
        if (isActive) {
            statusDot.classList.add('active');
        } else {
            statusDot.classList.remove('active');
        }
    }

    // Custom drawing functions to replace MediaPipe drawing utilities
    drawHandConnections(landmarks, color) {
        if (!landmarks || landmarks.length < 21) return;
        
        // Define hand connection pairs (bone structure)
        const connections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index finger
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle finger
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring finger
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm connections
            [5, 9], [9, 13], [13, 17]
        ];
        
        this.canvasCtx.strokeStyle = color;
        this.canvasCtx.lineWidth = this.getResponsiveLineWidth(3);
        this.canvasCtx.lineCap = 'round';
        
        connections.forEach(([startIdx, endIdx]) => {
            if (landmarks[startIdx] && landmarks[endIdx]) {
                const start = landmarks[startIdx];
                const end = landmarks[endIdx];
                
                this.canvasCtx.beginPath();
                this.canvasCtx.moveTo(
                    start.x * this.canvasElement.width, 
                    start.y * this.canvasElement.height
                );
                this.canvasCtx.lineTo(
                    end.x * this.canvasElement.width, 
                    end.y * this.canvasElement.height
                );
                this.canvasCtx.stroke();
            }
        });
    }

    drawHandLandmarks(landmarks, color) {
        if (!landmarks) return;
        
        this.canvasCtx.fillStyle = color;
        this.canvasCtx.strokeStyle = '#FFFFFF';
        this.canvasCtx.lineWidth = this.getResponsiveLineWidth(1);
        
        const radius = this.getResponsiveRadius(4);
        
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.canvasElement.width;
            const y = landmark.y * this.canvasElement.height;
            
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, radius, 0, 2 * Math.PI);
            this.canvasCtx.fill();
            this.canvasCtx.stroke();
        });
    }

    setOnResultsCallback(callback) {
        this.onResultsCallback = callback;
    }

    // Get hand landmarks for gesture recognition
    getHandLandmarks() {
        return this.lastResults ? this.lastResults.multiHandLandmarks : null;
    }

    // Get hand classification (left/right)
    getHandedness() {
        return this.lastResults ? this.lastResults.multiHandedness : null;
    }

    // Store last results for external access
    storeResults(results) {
        this.lastResults = results;
    }

    // Stop camera and cleanup
    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        this.updateCameraStatus(false);
        
        // Stop audio synthesis
        this.stopAudioSynthesis();
        
        // Stop drum context
        if (this.drumContext && this.drumContext.state !== 'closed') {
            this.drumContext.close();
        }
    }

    // Restart camera
    async restart() {
        this.stop();
        await this.initCamera();
    }

    // Get detailed hand information
    getHandsInfo() {
        if (!this.lastResults || !this.lastResults.multiHandLandmarks) {
            return null;
        }

        return this.lastResults.multiHandLandmarks.map((landmarks, index) => ({
            landmarks: landmarks,
            handedness: this.lastResults.multiHandedness[index],
            isLeft: this.lastResults.multiHandedness[index].label === 'Left',
            isRight: this.lastResults.multiHandedness[index].label === 'Right',
            confidence: this.lastResults.multiHandedness[index].score,
            fingerTips: {
                thumb: landmarks[4],
                index: landmarks[8],
                middle: landmarks[12],
                ring: landmarks[16],
                pinky: landmarks[20]
            },
            wrist: landmarks[0]
        }));
    }

    // Get landmark names mapping
    getLandmarkNames() {
        return [
            'WRIST',
            'THUMB_CMC', 'THUMB_MCP', 'THUMB_IP', 'THUMB_TIP',
            'INDEX_FINGER_MCP', 'INDEX_FINGER_PIP', 'INDEX_FINGER_DIP', 'INDEX_FINGER_TIP',
            'MIDDLE_FINGER_MCP', 'MIDDLE_FINGER_PIP', 'MIDDLE_FINGER_DIP', 'MIDDLE_FINGER_TIP',
            'RING_FINGER_MCP', 'RING_FINGER_PIP', 'RING_FINGER_DIP', 'RING_FINGER_TIP',
            'PINKY_MCP', 'PINKY_PIP', 'PINKY_DIP', 'PINKY_TIP'
        ];
    }

    // Toggle landmark numbers display
    toggleLandmarkNumbers() {
        this.showLandmarkNumbers = !this.showLandmarkNumbers;
    }

    // Set drawing options
    setDrawingOptions(options) {
        this.drawingOptions = {
            showConnections: options.showConnections !== false,
            showLandmarks: options.showLandmarks !== false,
            showNumbers: options.showNumbers || false,
            showLabels: options.showLabels !== false,
            connectionColor: options.connectionColor || '#00FF00',
            landmarkColor: options.landmarkColor || '#FF0000'
        };
    }

    // Get camera capabilities
    async getCameraCapabilities() {
        if (!this.videoElement || !this.videoElement.srcObject) {
            return null;
        }

        const stream = this.videoElement.srcObject;
        const videoTrack = stream.getVideoTracks()[0];
        
        if (videoTrack) {
            const capabilities = videoTrack.getCapabilities();
            const settings = videoTrack.getSettings();
            
            return {
                capabilities: capabilities,
                currentSettings: settings,
                constraints: videoTrack.getConstraints()
            };
        }
        
        return null;
    }

    // Update MediaPipe options
    updateOptions(options) {
        if (this.hands) {
            this.hands.setOptions(options);
            console.log('MediaPipe options updated:', options);
        }
    }

    // Calculate volume based on RIGHT hand Y position (dedicated right hand control)
    calculateVolume() {
        const handsInfo = this.getHandsInfo();
        if (!handsInfo) return 0;

        // ONLY use right hand for volume control
        const rightHand = handsInfo.find(hand => hand.isRight);
        if (!rightHand) return 0;

        // Get wrist Y position (normalized 0-1, where 0 is top, 1 is bottom)
        const wristY = rightHand.wrist.y;
        
        // Invert Y so higher hand = higher volume
        // Map Y position (0.1 to 0.9) to volume (0.0 to 1.0) for better range
        const minY = 0.1; // Top 10% of screen
        const maxY = 0.9; // Bottom 90% of screen
        
        let volume = (maxY - wristY) / (maxY - minY);
        
        // Clamp volume between 0 and 1
        volume = Math.max(0, Math.min(1, volume));
        
        return parseFloat(volume.toFixed(2));
    }

    // Calculate pitch based on RIGHT hand openness/finger spread (dedicated right hand control)
    calculatePitch() {
        const handsInfo = this.getHandsInfo();
        if (!handsInfo) return { note: 'C4', frequency: 261.63 };

        // ONLY use right hand for pitch control
        const rightHand = handsInfo.find(hand => hand.isRight);
        if (!rightHand) return { note: 'C4', frequency: 261.63 };

        // Calculate hand openness based on finger spread
        const openness = this.calculateHandOpenness(rightHand.landmarks);
        
        // Expanded frequency range for more expressive control
        const minFreq = 200;   // Lower bound
        const maxFreq = 1200;  // Upper bound
        
        // Map openness (0-1) to frequency range
        const frequency = minFreq + (openness * (maxFreq - minFreq));
        
        // Convert frequency to musical note
        const note = this.frequencyToNote(frequency);
        
        return {
            note: note,
            frequency: parseFloat(frequency.toFixed(2)),
            openness: parseFloat(openness.toFixed(2))
        };
    }

    // Calculate hand openness based on finger distances
    calculateHandOpenness(landmarks) {
        if (!landmarks || landmarks.length < 21) return 0;

        // Calculate distances between finger tips
        const fingerTips = [
            landmarks[4],  // Thumb
            landmarks[8],  // Index
            landmarks[12], // Middle
            landmarks[16], // Ring
            landmarks[20]  // Pinky
        ];

        const palm = landmarks[0]; // Wrist as palm center
        
        // Calculate average distance from palm to finger tips
        let totalDistance = 0;
        fingerTips.forEach(tip => {
            const distance = this.calculateDistance3D(palm, tip);
            totalDistance += distance;
        });
        
        const averageDistance = totalDistance / fingerTips.length;
        
        // Normalize to 0-1 range (typical range is 0.1 to 0.3)
        const minDistance = 0.1;
        const maxDistance = 0.3;
        let openness = (averageDistance - minDistance) / (maxDistance - minDistance);
        
        // Clamp between 0 and 1
        openness = Math.max(0, Math.min(1, openness));
        
        return openness;
    }

    // Calculate 3D distance between two landmarks
    calculateDistance3D(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = (point1.z || 0) - (point2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Convert frequency to musical note name
    frequencyToNote(frequency) {
        const A4 = 440;
        const C0 = A4 * Math.pow(2, -4.75);
        
        if (frequency > C0) {
            const h = Math.round(12 * Math.log2(frequency / C0));
            const octave = Math.floor(h / 12);
            const n = h % 12;
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            return notes[n] + octave;
        }
        return 'C4';
    }

    // Get audio control values
    getAudioControlValues() {
        const volume = this.calculateVolume();
        const pitch = this.calculatePitch();
        
        return {
            volume: volume,
            pitch: pitch.note,
            frequency: pitch.frequency,
            openness: pitch.openness || 0,
            timestamp: Date.now()
        };
    }

    // Get separate left and right hand control values for enhanced visualization
    getHandControlValues() {
        const handsInfo = this.getHandsInfo();
        if (!handsInfo) {
            return {
                leftHand: null,
                rightHand: null,
                audioControls: this.getAudioControlValues()
            };
        }

        const leftHand = handsInfo.find(hand => hand.isLeft);
        const rightHand = handsInfo.find(hand => hand.isRight);
        
        let leftHandData = null;
        let rightHandData = null;
        
        // Left hand data (drum control)
        if (leftHand) {
            const leftHandId = 'Left_0';
            const velocity = this.handVelocities[leftHandId] || { magnitude: 0, x: 0, y: 0, z: 0 };
            
            leftHandData = {
                position: {
                    x: leftHand.wrist.x,
                    y: leftHand.wrist.y,
                    z: leftHand.wrist.z || 0
                },
                velocity: velocity,
                openness: this.calculateHandOpenness(leftHand.landmarks),
                fingerTips: leftHand.fingerTips,
                landmarks: leftHand.landmarks,
                isActive: velocity.magnitude > this.velocityThreshold
            };
        }
        
        // Right hand data (audio control)
        if (rightHand) {
            const rightHandId = 'Right_0';
            const velocity = this.handVelocities[rightHandId] || { magnitude: 0, x: 0, y: 0, z: 0 };
            
            rightHandData = {
                position: {
                    x: rightHand.wrist.x,
                    y: rightHand.wrist.y,
                    z: rightHand.wrist.z || 0
                },
                velocity: velocity,
                openness: this.calculateHandOpenness(rightHand.landmarks),
                fingerTips: rightHand.fingerTips,
                landmarks: rightHand.landmarks,
                volume: this.calculateVolume(),
                pitch: this.calculatePitch()
            };
        }
        
        return {
            leftHand: leftHandData,
            rightHand: rightHandData,
            audioControls: this.getAudioControlValues(),
            timestamp: Date.now()
        };
    }

    // Display audio values on canvas
    displayAudioValues() {
        if (!this.canvasCtx) return;

        const audioValues = this.getAudioControlValues();
        
        // Draw main instructions and values
        this.drawMainInstructions(audioValues);
        
        // Draw drum instructions
        this.drawDrumInstructions();
        
        // Draw tutorial link
        this.drawTutorialLink();
        
        // Draw volume bar
        this.drawVolumeBar(audioValues.volume);
        
        // Draw pitch indicator
        this.drawPitchIndicator(audioValues.pitch);
    }

    drawMainInstructions(audioValues) {
        const isMobile = this.isMobileDevice();
        const canvasWidth = this.canvasElement.width / (this.pixelRatio || 1);
        const canvasHeight = this.canvasElement.height / (this.pixelRatio || 1);
        
        // Set responsive text style for main title
        this.canvasCtx.font = `bold ${this.getResponsiveFontSize(isMobile ? 18 : 24)}px Arial`;
        this.canvasCtx.fillStyle = '#FFFFFF';
        this.canvasCtx.strokeStyle = '#000000';
        this.canvasCtx.lineWidth = this.getResponsiveLineWidth(2);
        
        // Main title - responsive positioning
        const titleText = isMobile ? "🎵 Hand Music Control 🎵" : "🎵 Raise Your Hands to Raise the Roof! 🎵";
        const titleX = canvasWidth / 2;
        const titleY = isMobile ? 30 : 40;
        
        // Center the title
        this.canvasCtx.textAlign = 'center';
        this.canvasCtx.strokeText(titleText, titleX, titleY);
        this.canvasCtx.fillText(titleText, titleX, titleY);
        
        // Reset alignment
        this.canvasCtx.textAlign = 'start';
        
        // Instructions box - responsive positioning and sizing
        const x = isMobile ? 10 : 20;
        const y = isMobile ? 60 : 80;
        
        this.canvasCtx.font = `bold ${this.getResponsiveFontSize(isMobile ? 12 : 16)}px Arial`;
        
        // Right hand instructions - shortened for mobile
        const rightHandTitle = isMobile ? "🫲 RIGHT - Audio:" : "🫲 RIGHT HAND - Audio Control:";
        const volumeText = `Volume: ${audioValues.volume.toFixed(2)} ${isMobile ? '(up/down)' : '(Move up/down)'}`;
        const pitchText = `Pitch: ${audioValues.pitch} ${isMobile ? '(open/close)' : '(Open/close hand)'}`;
        const freqText = `Freq: ${audioValues.frequency.toFixed(0)} Hz`;
        
        // Calculate box dimensions
        const instructionTexts = [rightHandTitle, volumeText, pitchText, freqText];
        const maxWidth = Math.max(...instructionTexts.map(text => this.canvasCtx.measureText(text).width));
        const lineHeight = this.getResponsiveFontSize(isMobile ? 12 : 16) + 5;
        const boxHeight = instructionTexts.length * lineHeight + 20;
        
        // Draw background for instructions
        this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.canvasCtx.fillRect(x - 5, y - 20, maxWidth + 15, boxHeight);
        
        // Draw right hand title
        this.canvasCtx.fillStyle = '#4444FF'; // Blue for right hand
        this.canvasCtx.strokeText(rightHandTitle, x, y);
        this.canvasCtx.fillText(rightHandTitle, x, y);
        
        // Draw volume text
        this.canvasCtx.fillStyle = '#00FF00'; // Green for volume
        this.canvasCtx.strokeText(volumeText, x, y + lineHeight);
        this.canvasCtx.fillText(volumeText, x, y + lineHeight);
        
        // Draw pitch text
        this.canvasCtx.fillStyle = '#00BFFF'; // Cyan for pitch
        this.canvasCtx.strokeText(pitchText, x, y + lineHeight * 2);
        this.canvasCtx.fillText(pitchText, x, y + lineHeight * 2);
        
        // Draw frequency text
        this.canvasCtx.fillStyle = '#FFD700'; // Gold for frequency
        this.canvasCtx.strokeText(freqText, x, y + lineHeight * 3);
        this.canvasCtx.fillText(freqText, x, y + lineHeight * 3);
    }

    drawDrumInstructions() {
        const isMobile = this.isMobileDevice();
        const canvasWidth = this.canvasElement.width / (this.pixelRatio || 1);
        const canvasHeight = this.canvasElement.height / (this.pixelRatio || 1);
        
        // Left hand drum instructions - responsive positioning
        const x = isMobile ? 10 : 20;
        const y = canvasHeight - (isMobile ? 100 : 140);
        
        this.canvasCtx.font = `bold ${this.getResponsiveFontSize(isMobile ? 11 : 16)}px Arial`;
        
        const leftHandTitle = isMobile ? "🫱 LEFT - Drums:" : "🫱 LEFT HAND - Drums:";
        const kickText = isMobile ? "🦵 Down = KICK" : "🦵 KICK: Fast downward movement";
        const snareText = isMobile ? "🥁 Up = SNARE" : "🥁 SNARE: Quick upward movement";
        const hihatText = isMobile ? "🎶 Horiz = HI-HAT" : "🎶 HI-HAT: Fast horizontal (closed hand)";
        const clapText = isMobile ? "👏 Horiz = CLAP" : "👏 CLAP: Fast horizontal (open hand)";
        
        const drumTexts = [leftHandTitle, kickText, snareText, hihatText, clapText];
        const maxWidth = Math.max(...drumTexts.map(text => this.canvasCtx.measureText(text).width));
        const lineHeight = this.getResponsiveFontSize(isMobile ? 11 : 16) + 5;
        const boxHeight = drumTexts.length * lineHeight + 20;
        
        // Draw background for drum instructions
        this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.canvasCtx.fillRect(x - 5, y - 20, maxWidth + 15, boxHeight);
        
        // Draw left hand title
        this.canvasCtx.fillStyle = '#FF4444'; // Red for left hand
        this.canvasCtx.strokeText(leftHandTitle, x, y);
        this.canvasCtx.fillText(leftHandTitle, x, y);
        
        // Draw drum instructions
        this.canvasCtx.fillStyle = '#FFFF00'; // Yellow for drums
        this.canvasCtx.strokeText(kickText, x, y + lineHeight);
        this.canvasCtx.fillText(kickText, x, y + lineHeight);
        
        this.canvasCtx.strokeText(snareText, x, y + lineHeight * 2);
        this.canvasCtx.fillText(snareText, x, y + lineHeight * 2);
        
        this.canvasCtx.strokeText(hihatText, x, y + lineHeight * 3);
        this.canvasCtx.fillText(hihatText, x, y + lineHeight * 3);
        
        this.canvasCtx.strokeText(clapText, x, y + lineHeight * 4);
        this.canvasCtx.fillText(clapText, x, y + lineHeight * 4);
    }

    drawTutorialLink() {
        const isMobile = this.isMobileDevice();
        const canvasWidth = this.canvasElement.width / (this.pixelRatio || 1);
        const canvasHeight = this.canvasElement.height / (this.pixelRatio || 1);
        
        // Tutorial link - responsive positioning
        const linkText = isMobile ? "💻 Code" : "💻 Code & Tutorials Here";
        const x = canvasWidth - (isMobile ? 10 : 20);
        const y = canvasHeight - (isMobile ? 10 : 20);
        
        this.canvasCtx.font = `bold ${this.getResponsiveFontSize(isMobile ? 11 : 14)}px Arial`;
        this.canvasCtx.textAlign = 'end';
        
        // Draw background
        const textWidth = this.canvasCtx.measureText(linkText).width;
        const linkHeight = this.getResponsiveFontSize(isMobile ? 11 : 14) + 10;
        this.canvasCtx.fillStyle = 'rgba(0, 100, 200, 0.8)';
        this.canvasCtx.fillRect(x - textWidth - 10, y - linkHeight, textWidth + 20, linkHeight + 5);
        
        // Draw link text
        this.canvasCtx.fillStyle = '#FFFFFF';
        this.canvasCtx.strokeStyle = '#000000';
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.strokeText(linkText, x - 5, y - 5);
        this.canvasCtx.fillText(linkText, x - 5, y - 5);
        
        // Add clickable area (store for click detection) - scale coordinates
        this.tutorialLinkArea = {
            x: x - textWidth - 10,
            y: y - linkHeight,
            width: textWidth + 20,
            height: linkHeight + 5
        };
        
        // Reset text alignment
        this.canvasCtx.textAlign = 'start';
    }

    // Draw volume bar visualization - responsive
    drawVolumeBar(volume) {
        const isMobile = this.isMobileDevice();
        const canvasWidth = this.canvasElement.width / (this.pixelRatio || 1);
        const canvasHeight = this.canvasElement.height / (this.pixelRatio || 1);
        
        const barWidth = isMobile ? 15 : 20;
        const barHeight = isMobile ? 120 : 200;
        const barX = canvasWidth - (isMobile ? 35 : 60);
        const barY = isMobile ? 80 : 50;
        
        // Draw background bar
        this.canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.canvasCtx.fillRect(barX, barY, barWidth, barHeight);
        
        // Draw volume level
        const volumeHeight = volume * barHeight;
        const gradient = this.canvasCtx.createLinearGradient(0, barY + barHeight, 0, barY);
        gradient.addColorStop(0, '#FF0000'); // Red at bottom
        gradient.addColorStop(0.5, '#FFFF00'); // Yellow in middle
        gradient.addColorStop(1, '#00FF00'); // Green at top
        
        this.canvasCtx.fillStyle = gradient;
        this.canvasCtx.fillRect(barX, barY + barHeight - volumeHeight, barWidth, volumeHeight);
        
        // Draw border
        this.canvasCtx.strokeStyle = '#FFFFFF';
        this.canvasCtx.lineWidth = this.getResponsiveLineWidth(2);
        this.canvasCtx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Add label
        this.canvasCtx.fillStyle = '#FFFFFF';
        this.canvasCtx.font = `${this.getResponsiveFontSize(10)}px Arial`;
        this.canvasCtx.textAlign = 'center';
        this.canvasCtx.fillText('VOL', barX + barWidth/2, barY + barHeight + 15);
        this.canvasCtx.textAlign = 'start'; // Reset alignment
    }

    // Draw pitch indicator - responsive
    drawPitchIndicator(pitchNote) {
        const isMobile = this.isMobileDevice();
        const canvasWidth = this.canvasElement.width / (this.pixelRatio || 1);
        const canvasHeight = this.canvasElement.height / (this.pixelRatio || 1);
        
        const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
        const noteIndex = notes.indexOf(pitchNote);
        
        if (noteIndex === -1) return;
        
        const noteWidth = isMobile ? 12 : 15;
        const noteHeight = isMobile ? 15 : 25;
        const indicatorX = canvasWidth - (isMobile ? 80 : 120);
        const indicatorY = isMobile ? 80 : 50;
        
        // Draw only a subset of notes on mobile
        const displayNotes = isMobile ? notes.slice(0, 5) : notes;
        const displayNoteIndex = isMobile ? Math.min(noteIndex, 4) : noteIndex;
        
        // Draw notes
        displayNotes.forEach((note, index) => {
            const x = indicatorX;
            const y = indicatorY + index * noteHeight;
            
            // Highlight current note
            if (index === displayNoteIndex) {
                this.canvasCtx.fillStyle = '#FFD700'; // Gold for active note
                this.canvasCtx.fillRect(x - 5, y - 18, noteWidth + 10, noteHeight - 2);
            }
            
            // Draw note text
            this.canvasCtx.fillStyle = index === displayNoteIndex ? '#000000' : '#FFFFFF';
            this.canvasCtx.font = `${this.getResponsiveFontSize(isMobile ? 9 : 12)}px Arial`;
            this.canvasCtx.fillText(note, x, y);
        });
        
        // Add label
        this.canvasCtx.fillStyle = '#FFFFFF';
        this.canvasCtx.font = `${this.getResponsiveFontSize(10)}px Arial`;
        this.canvasCtx.fillText('PITCH', indicatorX - 5, indicatorY + displayNotes.length * noteHeight + 10);
    }

    // Process drum gestures based on LEFT hand movements ONLY
    processDrumGestures(results) {
        if (!this.drumEnabled || !results.multiHandLandmarks) return;

        const currentTime = Date.now();
        
        // Filter to ONLY process LEFT hand for drum triggers
        results.multiHandLandmarks.forEach((landmarks, index) => {
            const handedness = results.multiHandedness[index];
            
            // ONLY process LEFT hand for drums
            if (handedness.label !== 'Left') return;
            
            const handId = `${handedness.label}_${index}`;
            
            // Track hand position (use wrist as reference point)
            const currentPos = {
                x: landmarks[0].x,
                y: landmarks[0].y,
                z: landmarks[0].z || 0,
                time: currentTime
            };
            
            // Calculate velocity if we have previous position
            if (this.lastHandPositions[handId]) {
                const lastPos = this.lastHandPositions[handId];
                const deltaTime = (currentTime - lastPos.time) / 1000; // Convert to seconds
                
                if (deltaTime > 0) {
                    const velocity = {
                        x: (currentPos.x - lastPos.x) / deltaTime,
                        y: (currentPos.y - lastPos.y) / deltaTime,
                        z: (currentPos.z - lastPos.z) / deltaTime,
                        magnitude: 0
                    };
                    
                    velocity.magnitude = Math.sqrt(
                        velocity.x * velocity.x + 
                        velocity.y * velocity.y + 
                        velocity.z * velocity.z
                    );
                    
                    this.handVelocities[handId] = velocity;
                    
                    // Detect drum gestures based on velocity and direction
                    this.detectDrumGestures(handId, velocity, landmarks, handedness);
                }
            }
            
            // Update last position
            this.lastHandPositions[handId] = currentPos;
        });
    }

    detectDrumGestures(handId, velocity, landmarks, handedness) {
        const minVelocity = this.velocityThreshold;
        const currentTime = Date.now();
        
        // Prevent rapid triggering (minimum 100ms between drum hits per hand)
        if (currentTime - (this.lastGestureTime || 0) < 100) return;
        
        // Only process significant movements
        if (velocity.magnitude < minVelocity) return;
        
        // Determine drum type based on gesture characteristics
        const drumType = this.classifyDrumGesture(velocity, landmarks, handedness);
        
        if (drumType) {
            this.triggerDrum(drumType, velocity.magnitude);
            this.lastGestureTime = currentTime;
            
            // Visual feedback
            this.showDrumHit(drumType, handedness.label);
        }
    }

    classifyDrumGesture(velocity, landmarks, handedness) {
        const speed = velocity.magnitude;
        const isLeftHand = handedness.label === 'Left';
        
        // Get hand openness for gesture classification
        const openness = this.calculateHandOpenness(landmarks);
        
        // Classify based on movement direction and characteristics
        if (Math.abs(velocity.y) > Math.abs(velocity.x)) {
            // Vertical movement dominant
            if (velocity.y > 0.1 && speed > 0.8) {
                // Fast downward movement = Kick drum
                return 'kick';
            } else if (velocity.y < -0.1 && speed > 0.6) {
                // Upward movement = Snare
                return 'snare';
            }
        } else {
            // Horizontal movement dominant
            if (speed > 0.4 && openness < 0.3) {
                // Fast horizontal movement with closed hand = Hi-hat
                return 'hihat';
            } else if (speed > 0.5 && openness > 0.7) {
                // Fast horizontal movement with open hand = Clap
                return 'clap';
            }
        }
        
        // Fallback classification based on hand and speed
        if (speed > 0.3) {
            if (isLeftHand) {
                return speed > 0.6 ? 'kick' : 'hihat';
            } else {
                return speed > 0.6 ? 'snare' : 'clap';
            }
        }
        
        return null;
    }

    triggerDrum(drumType, velocity) {
        if (!this.drumSamples[drumType] || !this.drumContext) return;
        
        // Resume audio context if suspended
        if (this.drumContext.state === 'suspended') {
            this.drumContext.resume();
        }
        
        // Normalize velocity (0.1 to 1.0)
        const normalizedVelocity = Math.min(1.0, Math.max(0.1, velocity * 2));
        
        // Play drum sample
        this.drumSamples[drumType].play(normalizedVelocity);
        
        console.log(`🥁 ${drumType.toUpperCase()} hit! Velocity: ${normalizedVelocity.toFixed(2)}`);
    }

    showDrumHit(drumType, handLabel) {
        // Create visual feedback for drum hit
        const drumEmojis = {
            kick: '🦵',
            snare: '🥁',
            hihat: '🎶',
            clap: '👏'
        };
        
        const message = `${drumEmojis[drumType]} ${drumType.toUpperCase()} (${handLabel})`;
        
        // Create temporary visual element
        const drumFeedback = document.createElement('div');
        drumFeedback.style.cssText = `
            position: fixed;
            top: ${handLabel === 'Left' ? '100px' : '140px'};
            right: 20px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            z-index: 10000;
            font-size: 14px;
            font-weight: bold;
            opacity: 0;
            transform: scale(0.5);
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        drumFeedback.textContent = message;
        document.body.appendChild(drumFeedback);

        // Animate in
        setTimeout(() => {
            drumFeedback.style.opacity = '1';
            drumFeedback.style.transform = 'scale(1)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            drumFeedback.style.opacity = '0';
            drumFeedback.style.transform = 'scale(0.5)';
            setTimeout(() => {
                if (drumFeedback.parentNode) {
                    drumFeedback.parentNode.removeChild(drumFeedback);
                }
            }, 300);
        }, 1000);
    }

    // Real-time audio synthesis control
    updateAudioSynthesis() {
        if (!this.audioContext || !this.audioEnabled) return;

        const audioValues = this.getAudioControlValues();
        const handsInfo = this.getHandsInfo();
        
        // Check if hands are detected
        if (!handsInfo || handsInfo.length === 0) {
            this.stopAudioSynthesis();
            return;
        }

        // Start or update audio synthesis
        if (audioValues.volume > 0.05) { // Threshold to avoid noise
            this.startAudioSynthesis();
            this.updateAudioParameters(audioValues.frequency, audioValues.volume);
        } else {
            this.stopAudioSynthesis();
        }
    }

    startAudioSynthesis() {
        if (this.isAudioPlaying || !this.audioContext) return;

        try {
            // Create oscillator
            this.oscillator = this.audioContext.createOscillator();
            this.oscillator.type = 'sine'; // Smooth sine wave
            this.oscillator.frequency.value = this.lastFrequency;
            
            // Connect oscillator to gain node
            this.oscillator.connect(this.gainNode);
            
            // Start oscillator
            this.oscillator.start();
            this.isAudioPlaying = true;
            
            console.log('Audio synthesis started');
            
        } catch (error) {
            console.error('Error starting audio synthesis:', error);
        }
    }

    stopAudioSynthesis() {
        if (!this.isAudioPlaying || !this.oscillator) return;

        try {
            // Smooth fade out
            const currentTime = this.audioContext.currentTime;
            this.gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);
            
            // Stop oscillator after fade
            setTimeout(() => {
                if (this.oscillator) {
                    this.oscillator.stop();
                    this.oscillator = null;
                    this.isAudioPlaying = false;
                }
            }, 100);
            
        } catch (error) {
            console.error('Error stopping audio synthesis:', error);
            this.oscillator = null;
            this.isAudioPlaying = false;
        }
    }

    updateAudioParameters(targetFrequency, targetVolume) {
        if (!this.oscillator || !this.gainNode || !this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        
        // Smooth frequency changes
        const smoothedFrequency = this.lastFrequency + 
            (targetFrequency - this.lastFrequency) * this.smoothingFactor;
        
        // Smooth volume changes
        const smoothedGain = this.lastGain + 
            (targetVolume - this.lastGain) * this.smoothingFactor;
        
        // Apply smoothed values
        this.oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(80, smoothedFrequency), // Minimum frequency 80Hz
            currentTime + 0.05
        );
        
        this.gainNode.gain.exponentialRampToValueAtTime(
            Math.max(0.001, Math.min(0.3, smoothedGain)), // Clamp gain for safety
            currentTime + 0.05
        );
        
        // Update last values
        this.lastFrequency = smoothedFrequency;
        this.lastGain = smoothedGain;
    }

    // Audio control methods
    enableAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.audioEnabled = true;
        this.showAudioMessage('🔊 Audio synthesis enabled');
    }

    disableAudio() {
        this.stopAudioSynthesis();
        this.audioEnabled = false;
        this.showAudioMessage('🔇 Audio synthesis disabled');
    }

    toggleAudio() {
        if (this.audioEnabled) {
            this.disableAudio();
        } else {
            this.enableAudio();
        }
    }

    setOscillatorType(type) {
        // type: 'sine', 'square', 'sawtooth', 'triangle'
        if (this.oscillator) {
            this.oscillator.type = type;
        }
        console.log(`Oscillator type set to: ${type}`);
    }

    setSmoothingFactor(factor) {
        this.smoothingFactor = Math.max(0.01, Math.min(1.0, factor));
        console.log(`Audio smoothing factor set to: ${this.smoothingFactor}`);
    }

    // Get audio status
    getAudioStatus() {
        return {
            audioContext: !!this.audioContext,
            audioEnabled: this.audioEnabled,
            isPlaying: this.isAudioPlaying,
            currentFrequency: this.lastFrequency,
            currentGain: this.lastGain,
            oscillatorType: this.oscillator ? this.oscillator.type : 'none',
            drumEnabled: this.drumEnabled,
            drumContext: !!this.drumContext
        };
    }

    // Drum control methods
    enableDrums() {
        this.drumEnabled = true;
        if (this.drumContext && this.drumContext.state === 'suspended') {
            this.drumContext.resume();
        }
        this.showAudioMessage('🥁 Drum triggers enabled');
    }

    disableDrums() {
        this.drumEnabled = false;
        this.showAudioMessage('🚫 Drum triggers disabled');
    }

    toggleDrums() {
        if (this.drumEnabled) {
            this.disableDrums();
        } else {
            this.enableDrums();
        }
    }

    setDrumSensitivity(sensitivity) {
        // Adjust velocity threshold (0.01 = very sensitive, 0.2 = less sensitive)
        this.velocityThreshold = Math.max(0.01, Math.min(0.2, sensitivity));
        console.log(`Drum sensitivity set to: ${this.velocityThreshold}`);
    }

    // Manual drum triggers for testing
    playDrum(drumType, velocity = 0.7) {
        if (this.drumSamples[drumType]) {
            this.triggerDrum(drumType, velocity);
        }
    }

    // Get drum status and info
    getDrumStatus() {
        return {
            enabled: this.drumEnabled,
            samples: Object.keys(this.drumSamples),
            sensitivity: this.velocityThreshold,
            lastTrigger: this.lastGestureTime,
            context: !!this.drumContext
        };
    }

    // Get performance statistics
    getPerformanceStats() {
        return {
            fps: this.performanceStats?.fps || 0,
            frameTime: this.performanceStats?.frameTime || 0,
            skippedFrames: this.performanceStats?.skippedFrames || 0,
            totalFrames: this.performanceStats?.frameCount || 0,
            renderSkipFrame: this.renderSkipFrame || 0,
            isMobile: this.isMobileDevice(),
            canvasSize: {
                width: this.canvasElement?.width || 0,
                height: this.canvasElement?.height || 0,
                displayWidth: this.canvasElement?.style.width || '0px',
                displayHeight: this.canvasElement?.style.height || '0px'
            }
        };
    }

    // Update MediaPipe options for performance
    optimizeForPerformance(level = 'auto') {
        if (!this.hands) return;
        
        let options = {};
        
        switch (level) {
            case 'high':
                options = {
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                };
                this.renderSkipFrame = 0;
                break;
                
            case 'medium':
                options = {
                    maxNumHands: 2,
                    modelComplexity: 0,
                    minDetectionConfidence: 0.8,
                    minTrackingConfidence: 0.6
                };
                this.renderSkipFrame = 1;
                break;
                
            case 'low':
                options = {
                    maxNumHands: 1,
                    modelComplexity: 0,
                    minDetectionConfidence: 0.9,
                    minTrackingConfidence: 0.7
                };
                this.renderSkipFrame = 2;
                break;
                
            case 'auto':
            default:
                const currentFps = this.performanceStats?.fps || 0;
                const isMobile = this.isMobileDevice();
                
                if (currentFps < 15 || isMobile) {
                    this.optimizeForPerformance('low');
                } else if (currentFps < 25) {
                    this.optimizeForPerformance('medium');
                } else {
                    this.optimizeForPerformance('high');
                }
                return;
        }
        
        this.hands.setOptions(options);
        console.log(`🔧 Performance optimized for ${level} quality:`, options);
    }

    // Responsive design utilities
    getOptimalCanvasSize() {
        const container = this.canvasElement?.parentElement;
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        const isMobile = this.isMobileDevice();
        
        // Base dimensions
        let baseWidth = isMobile ? 480 : 640;
        let baseHeight = isMobile ? 360 : 480;
        
        // Calculate scaling
        const scaleX = containerWidth / baseWidth;
        const scaleY = containerHeight / baseHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
        
        return {
            width: Math.round(baseWidth * scale),
            height: Math.round(baseHeight * scale),
            scale: scale,
            isMobile: isMobile
        };
    }

    // Method to force canvas resize
    forceCanvasResize() {
        if (this.updateCanvasSize) {
            this.updateCanvasSize();
            console.log('Canvas resized manually');
        }
    }

    // Clear gesture history (useful for debugging)
    clearGestureHistory() {
        this.gestureHistory = [];
        this.lastHandPositions = {};
        this.handVelocities = {};
        this.lastGestureTime = 0;
        
        if (this.performanceStats) {
            this.performanceStats.skippedFrames = 0;
            this.performanceStats.frameCount = 0;
        }
        
        console.log('Gesture history and performance stats cleared');
    }
}

// Export for use in other modules
window.MediaPipeHandler = MediaPipeHandler;
