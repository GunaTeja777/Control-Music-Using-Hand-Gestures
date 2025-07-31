/**
 * Three.js Audio Visualizer
 * Creates 3D visualizations synchronized with audio and hand gestures
 */

class ThreeVisualizer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.container = document.getElementById(canvasId);
        
        // Three.js core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // MediaPipe integration
        this.mediaPipeHandler = null;
        this.handControlValues = null;
        
        // Audio-responsive properties
        this.currentVolume = 0;
        this.currentFrequency = 261.63;
        this.currentOpenness = 0;
        
        // Visualization objects
        this.waveform = null;
        this.beatSpheres = {};
        this.particles = [];
        this.handTrails = {
            left: [],
            right: []
        };
        
        // Animation properties
        this.waveScale = 1.0;
        this.beatAnimations = {};
        this.visualizationMode = 'waveform';
        this.isActive = true;
        
        // Hand-specific visualization
        this.leftHandVisualizer = null;   // For drum feedback
        this.rightHandVisualizer = null;  // For audio control feedback
        
        this.init();
    }

    init() {
        this.setupThreeJS();
        this.setupAudioContext();
        this.createVisualizations();
        this.createHandVisualizers();
        this.createWaveform();
        this.createBeatVisualizers();
        this.animate();
        this.setupControls();
    }

    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setClearColor(0x000011, 0.8);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.audioData = new Uint8Array(bufferLength);
            
            console.log('Audio context initialized');
        } catch (error) {
            console.error('Error setting up audio context:', error);
        }
    }

    connectAudio(audioElement) {
        if (this.audioContext && audioElement) {
            try {
                if (this.audioSource) {
                    this.audioSource.disconnect();
                }
                
                this.audioSource = this.audioContext.createMediaElementSource(audioElement);
                this.audioSource.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                
                console.log('Audio connected to visualizer');
            } catch (error) {
                console.error('Error connecting audio:', error);
            }
        }
    }

    createVisualizations() {
        this.createParticles();
        this.createWaveform();
        this.createSpectrum();
        this.setMode(this.mode);
    }

    createHandVisualizers() {
        // Left hand visualizer (drum feedback) - Red theme
        const leftHandGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const leftHandMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4444, 
            transparent: true, 
            opacity: 0.0 
        });
        this.leftHandVisualizer = new THREE.Mesh(leftHandGeometry, leftHandMaterial);
        this.scene.add(this.leftHandVisualizer);
        
        // Right hand visualizer (audio control) - Blue theme
        const rightHandGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const rightHandMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4444ff, 
            transparent: true, 
            opacity: 0.0 
        });
        this.rightHandVisualizer = new THREE.Mesh(rightHandGeometry, rightHandMaterial);
        this.scene.add(this.rightHandVisualizer);
        
        // Add glow effects
        this.createHandGlowEffects();
    }

    createHandGlowEffects() {
        // Left hand glow (drum feedback)
        const leftGlowGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const leftGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.0
        });
        this.leftHandGlow = new THREE.Mesh(leftGlowGeometry, leftGlowMaterial);
        this.scene.add(this.leftHandGlow);
        
        // Right hand glow (audio control)
        const rightGlowGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const rightGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.0
        });
        this.rightHandGlow = new THREE.Mesh(rightGlowGeometry, rightGlowMaterial);
        this.scene.add(this.rightHandGlow);
    }

    createParticles() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions in a sphere
            const radius = Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Random colors
            colors[i3] = Math.random();
            colors[i3 + 1] = Math.random();
            colors[i3 + 2] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    createWaveform() {
        // Create enhanced waveform geometry
        this.waveformVertices = [];
        const waveformColors = [];
        
        // Create more vertices for smoother waveform
        for (let i = 0; i < this.waveformSize; i++) {
            const x = (i / this.waveformSize) * 40 - 20; // Spread across 40 units
            this.waveformVertices.push(x, 0, 0);
            
            // Dynamic colors based on position
            const hue = (i / this.waveformSize) * 360;
            const color = new THREE.Color().setHSL(hue / 360, 1, 0.5);
            waveformColors.push(color.r, color.g, color.b);
        }

        this.waveformGeometry = new THREE.BufferGeometry();
        this.waveformGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.waveformVertices, 3));
        this.waveformGeometry.setAttribute('color', new THREE.Float32BufferAttribute(waveformColors, 3));

        this.waveformMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 4,
            transparent: true,
            opacity: 0.9
        });

        this.waveformMesh = new THREE.Line(this.waveformGeometry, this.waveformMaterial);
        this.scene.add(this.waveformMesh);
        
        // Create additional waveform layers for depth
        this.createWaveformLayers();
    }

    createWaveformLayers() {
        this.waveformLayers = [];
        
        for (let layer = 0; layer < 3; layer++) {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const colors = [];
            
            for (let i = 0; i < this.waveformSize; i++) {
                const x = (i / this.waveformSize) * 40 - 20;
                vertices.push(x, 0, layer * 2); // Offset each layer in Z
                
                const hue = ((i / this.waveformSize) * 360 + layer * 60) % 360;
                const color = new THREE.Color().setHSL(hue / 360, 1, 0.4);
                colors.push(color.r, color.g, color.b);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            
            const material = new THREE.LineBasicMaterial({
                vertexColors: true,
                linewidth: 2,
                transparent: true,
                opacity: 0.5 - layer * 0.1
            });
            
            const mesh = new THREE.Line(geometry, material);
            this.waveformLayers.push(mesh);
            this.scene.add(mesh);
        }
    }

    createBeatVisualizers() {
        // Create pulsing spheres for beat visualization
        for (let i = 0; i < 4; i++) { // One for each drum type
            const geometry = new THREE.SphereGeometry(2, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: this.getDrumColor(i),
                transparent: true,
                opacity: 0
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(
                (i - 1.5) * 8, // Spread horizontally
                0,
                -10
            );
            
            this.beatVisualizers.push({
                mesh: sphere,
                type: ['kick', 'snare', 'hihat', 'clap'][i],
                intensity: 0,
                decayRate: 0.05
            });
            
            this.scene.add(sphere);
        }
    }

    getDrumColor(drumIndex) {
        const colors = [
            0xff0000, // Kick - Red
            0x0000ff, // Snare - Blue  
            0xffff00, // Hi-hat - Yellow
            0x00ff00  // Clap - Green
        ];
        return colors[drumIndex] || 0xffffff;
    }

    createSpectrum() {
        const barCount = 64;
        this.spectrumBars = [];

        for (let i = 0; i < barCount; i++) {
            const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(i / barCount, 1, 0.5)
            });

            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = (i - barCount / 2) * 1.2;
            bar.position.y = 0;
            
            this.spectrumBars.push(bar);
            this.scene.add(bar);
        }
    }

    setMode(mode) {
        this.mode = mode;
        
        // Hide all visualizations
        this.particleSystem.visible = false;
        this.waveformMesh.visible = false;
        this.spectrumBars.forEach(bar => bar.visible = false);

        // Show selected visualization
        switch (mode) {
            case 'particles':
                this.particleSystem.visible = true;
                break;
            case 'waveform':
                this.waveformMesh.visible = true;
                break;
            case 'spectrum':
                this.spectrumBars.forEach(bar => bar.visible = true);
                break;
        }
    }

    updateVisualizations() {
        if (!this.analyser || !this.audioData) return;

        this.analyser.getByteFrequencyData(this.audioData);

        switch (this.mode) {
            case 'particles':
                this.updateParticles();
                break;
            case 'waveform':
                this.updateWaveform();
                break;
            case 'spectrum':
                this.updateSpectrum();
                break;
        }
    }

    updateParticles() {
        if (!this.particleSystem) return;

        const positions = this.particleSystem.geometry.attributes.position.array;
        const colors = this.particleSystem.geometry.attributes.color.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const audioIndex = Math.floor((i / 3) * this.audioData.length / (positions.length / 3));
            const audioValue = this.audioData[audioIndex] / 255;
            
            // Scale particles based on audio
            const scale = 1 + audioValue * 2;
            positions[i] *= scale * 0.99; // Slight decay
            positions[i + 1] *= scale * 0.99;
            positions[i + 2] *= scale * 0.99;
            
            // Update colors based on audio
            colors[i] = audioValue;
            colors[i + 1] = 1 - audioValue;
            colors[i + 2] = audioValue * 0.5 + 0.5;
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.geometry.attributes.color.needsUpdate = true;
        
        // Rotate particle system
        this.particleSystem.rotation.y += 0.005;
    }

    updateWaveform() {
        if (!this.waveformMesh) return;

        const positions = this.waveformMesh.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const audioIndex = Math.floor((i / 3) * this.audioData.length / (positions.length / 3));
            const audioValue = this.audioData[audioIndex] / 255;
            
            positions[i + 1] = audioValue * 20 - 10; // Y position based on audio
        }
        
        this.waveformMesh.geometry.attributes.position.needsUpdate = true;
    }

    updateWaveformAnimation() {
        if (!this.waveformMesh || !this.mediaPipeHandler) return;

        // Get hand-specific control values
        const handValues = this.mediaPipeHandler.getHandControlValues();
        
        // Use RIGHT hand for audio control (volume and pitch)
        if (handValues.rightHand) {
            this.volumeAmplitude = handValues.rightHand.volume;
            this.pitchFrequency = handValues.rightHand.pitch.frequency;
            this.currentOpenness = handValues.rightHand.openness;
        } else {
            this.volumeAmplitude = 0;
            this.pitchFrequency = 261.63;
            this.currentOpenness = 0;
        }

        const positions = this.waveformGeometry.attributes.position.array;
        const time = Date.now() * 0.001;

        for (let i = 0; i < this.waveformSize; i++) {
            const x = (i / this.waveformSize) * 40 - 20;
            const index = i * 3;

            // Create animated waveform based on RIGHT hand volume and pitch
            const frequencyFactor = this.pitchFrequency / 440; // Normalize to A4
            const wavePhase = (x * 0.1 * frequencyFactor) + time * 2;
            
            // Multiple wave components for rich visualization
            let y = Math.sin(wavePhase) * this.volumeAmplitude * 8;
            y += Math.sin(wavePhase * 2 + time) * this.volumeAmplitude * 4;
            y += Math.sin(wavePhase * 0.5 + time * 0.5) * this.volumeAmplitude * 2;
            
            // Add hand openness effect
            y += Math.sin(wavePhase * 4 + time * 3) * this.currentOpenness * 3;

            // Add beat-driven pulses
            y += this.beatIntensity * Math.sin(wavePhase * 4) * 3;

            positions[index] = x;
            positions[index + 1] = y;
            positions[index + 2] = Math.sin(wavePhase * 0.3) * this.volumeAmplitude * 2;
        }

        this.waveformGeometry.attributes.position.needsUpdate = true;

        // Update waveform layers with offset phases
        if (this.waveformLayers) {
            this.waveformLayers.forEach((layer, layerIndex) => {
                const layerPositions = layer.geometry.attributes.position.array;
                
                for (let i = 0; i < this.waveformSize; i++) {
                    const x = (i / this.waveformSize) * 40 - 20;
                    const index = i * 3;
                    const phaseOffset = layerIndex * Math.PI * 0.5;
                    
                    const wavePhase = (x * 0.1 * this.pitchFrequency / 440) + time * 2 + phaseOffset;
                    let y = Math.sin(wavePhase) * this.volumeAmplitude * 6;
                    y += this.beatIntensity * Math.sin(wavePhase * 3) * 2;
                    
                    // Add hand openness modulation
                    y += Math.sin(wavePhase * 2 + time) * this.currentOpenness * 4;

                    layerPositions[index] = x;
                    layerPositions[index + 1] = y;
                    layerPositions[index + 2] = layerIndex * 2;
                }
                
                layer.geometry.attributes.position.needsUpdate = true;
                
                // Update opacity based on volume
                layer.material.opacity = (0.5 - layerIndex * 0.1) * (0.3 + this.volumeAmplitude * 0.7);
            });
        }

        // Rotate waveform based on pitch
        if (this.waveformMesh) {
            this.waveformMesh.rotation.z = Math.sin(time * 0.5) * this.volumeAmplitude * 0.5;
            this.waveformMesh.rotation.y = time * 0.1 * (this.pitchFrequency / 440);
        }
    }

    updateBeatVisualizers() {
        if (!this.beatVisualizers || !this.mediaPipeHandler) return;

        const drumStatus = this.mediaPipeHandler.getDrumStatus();
        const currentTime = Date.now();

        // Decay existing beat intensities
        this.beatVisualizers.forEach(visualizer => {
            if (visualizer.intensity > 0) {
                visualizer.intensity = Math.max(0, visualizer.intensity - visualizer.decayRate);
                
                // Update sphere scale and opacity
                const scale = 1 + visualizer.intensity * 3;
                visualizer.mesh.scale.set(scale, scale, scale);
                visualizer.mesh.material.opacity = visualizer.intensity;
                
                // Pulse effect
                const pulse = Math.sin(currentTime * 0.01) * visualizer.intensity;
                visualizer.mesh.position.y = pulse * 2;
            }
        });

        // Update global beat intensity (affects waveform)
        this.beatIntensity = Math.max(0, this.beatIntensity - 0.02);
    }

    updateHandGestureEffects() {
        if (!this.mediaPipeHandler) return;

        // Get hand-specific control values
        const handValues = this.mediaPipeHandler.getHandControlValues();
        
        this.updateLeftHandVisualization(handValues.leftHand);
        this.updateRightHandVisualization(handValues.rightHand);
        this.updateHandTrails(handValues);
    }

    updateLeftHandVisualization(leftHandData) {
        if (!this.leftHandVisualizer || !leftHandData) {
            if (this.leftHandVisualizer) {
                this.leftHandVisualizer.material.opacity = 0;
                this.leftHandGlow.material.opacity = 0;
            }
            return;
        }

        // Convert normalized coordinates to 3D space
        const x = (leftHandData.position.x - 0.5) * 40; // -20 to 20
        const y = -(leftHandData.position.y - 0.5) * 30; // -15 to 15 (inverted Y)
        const z = leftHandData.position.z * 10; // 0 to 10

        // Update visualizer position
        this.leftHandVisualizer.position.set(x, y, z);
        this.leftHandGlow.position.set(x, y, z);

        // Update appearance based on drum activity
        const drumActivity = leftHandData.velocity.magnitude;
        const opacity = Math.min(1.0, 0.3 + drumActivity * 2);
        const scale = 1 + drumActivity * 3;

        this.leftHandVisualizer.material.opacity = opacity;
        this.leftHandVisualizer.scale.setScalar(scale);
        
        // Glow effect for drum feedback
        this.leftHandGlow.material.opacity = drumActivity * 0.5;
        this.leftHandGlow.scale.setScalar(scale * 2);

        // Color intensity based on activity
        const redIntensity = Math.min(1, 0.5 + drumActivity * 2);
        this.leftHandVisualizer.material.color.setRGB(redIntensity, 0.1, 0.1);
    }

    updateRightHandVisualization(rightHandData) {
        if (!this.rightHandVisualizer || !rightHandData) {
            if (this.rightHandVisualizer) {
                this.rightHandVisualizer.material.opacity = 0;
                this.rightHandGlow.material.opacity = 0;
            }
            return;
        }

        // Convert normalized coordinates to 3D space
        const x = (rightHandData.position.x - 0.5) * 40; // -20 to 20
        const y = -(rightHandData.position.y - 0.5) * 30; // -15 to 15 (inverted Y)
        const z = rightHandData.position.z * 10; // 0 to 10

        // Update visualizer position
        this.rightHandVisualizer.position.set(x, y, z);
        this.rightHandGlow.position.set(x, y, z);

        // Update appearance based on audio control
        const volume = rightHandData.volume;
        const openness = rightHandData.openness;
        const opacity = Math.min(1.0, 0.3 + volume);
        const scale = 1 + volume * 2 + openness;

        this.rightHandVisualizer.material.opacity = opacity;
        this.rightHandVisualizer.scale.setScalar(scale);
        
        // Glow effect for audio feedback
        this.rightHandGlow.material.opacity = volume * 0.6;
        this.rightHandGlow.scale.setScalar(scale * 2);

        // Color based on pitch (blue to cyan based on openness)
        const blueIntensity = Math.min(1, 0.3 + volume);
        const cyanComponent = openness * 0.7;
        this.rightHandVisualizer.material.color.setRGB(0.1, cyanComponent, blueIntensity);
    }

    updateHandTrails(handValues) {
        const time = Date.now();
        
        // Update left hand trail (red particles for drum feedback)
        if (handValues.leftHand) {
            const leftPos = handValues.leftHand.position;
            const worldPos = new THREE.Vector3(
                (leftPos.x - 0.5) * 40,
                -(leftPos.y - 0.5) * 30,
                leftPos.z * 10
            );
            
            if (handValues.leftHand.velocity.magnitude > 0.05) {
                this.createHandParticle(worldPos, 'left', handValues.leftHand.velocity.magnitude);
            }
        }
        
        // Update right hand trail (blue particles for audio control)
        if (handValues.rightHand) {
            const rightPos = handValues.rightHand.position;
            const worldPos = new THREE.Vector3(
                (rightPos.x - 0.5) * 40,
                -(rightPos.y - 0.5) * 30,
                rightPos.z * 10
            );
            
            if (handValues.rightHand.volume > 0.1) {
                this.createHandParticle(worldPos, 'right', handValues.rightHand.volume);
            }
        }
        
        // Clean up old trail particles
        this.cleanupTrailParticles(time);
    }

    createHandParticle(position, handType, intensity) {
        // Create particle geometry
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        
        // Color based on hand type
        const color = handType === 'left' ? 0xff4444 : 0x4444ff;
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: intensity
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        
        // Add random velocity for particle movement
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            ),
            life: 1.0,
            decay: 0.02,
            createdAt: Date.now()
        };
        
        this.scene.add(particle);
        
        // Store particle for cleanup
        if (!this.handTrails[handType]) this.handTrails[handType] = [];
        this.handTrails[handType].push(particle);
    }

    cleanupTrailParticles(currentTime) {
        // Clean up particles for both hands
        ['left', 'right'].forEach(handType => {
            if (!this.handTrails[handType]) return;
            
            this.handTrails[handType] = this.handTrails[handType].filter(particle => {
                // Update particle
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.multiplyScalar(0.98); // Slow down over time
                particle.userData.life -= particle.userData.decay;
                particle.material.opacity = particle.userData.life * 0.5;
                
                // Remove if expired or too old
                const age = currentTime - particle.userData.createdAt;
                if (particle.userData.life <= 0 || age > 3000) {
                    this.scene.remove(particle);
                    return false;
                }
                return true;
            });
        });
    }
        // Create trailing particles that follow hand movement
        const wrist = hand.wrist;
        const worldPos = new THREE.Vector3(
            (wrist.x - 0.5) * 40,
            -(wrist.y - 0.5) * 30,
            (wrist.z || 0) * 20
        );

        // Create particle for trail
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        }

    // Method to trigger beat visualization from drum hits
    }

    modulateWaveformByHand(hand, handIndex) {
        // Use hand position to modulate waveform amplitude and frequency locally
        const wrist = hand.wrist;
        const handX = (wrist.x - 0.5) * 40; // Convert to world coordinates
        const handY = -(wrist.y - 0.5) * 30;

        // Find nearby waveform points and influence them
        if (this.waveformGeometry) {
            const positions = this.waveformGeometry.attributes.position.array;
            
            for (let i = 0; i < this.waveformSize; i++) {
                const index = i * 3;
                const waveX = positions[index];
                const distance = Math.abs(waveX - handX);
                
                if (distance < 10) { // Influence radius
                    const influence = Math.max(0, 1 - distance / 10);
                    const additionalY = handY * influence * 0.2;
                    positions[index + 1] += additionalY;
                }
            }
        }
    }

    // Method to trigger beat visualization from drum hits
    triggerBeat(drumType, intensity = 1.0) {
        const visualizer = this.beatVisualizers.find(v => v.type === drumType);
        if (visualizer) {
            visualizer.intensity = Math.min(1.0, intensity);
            
            // Trigger global beat intensity
            this.beatIntensity = Math.max(this.beatIntensity, intensity * 0.8);
            this.lastBeatTime = Date.now();
        }
    }

    updateSpectrum() {
        for (let i = 0; i < this.spectrumBars.length && i < this.audioData.length; i++) {
            const audioValue = this.audioData[i] / 255;
            const height = audioValue * 20 + 0.1;
            
            this.spectrumBars[i].scale.y = height;
            this.spectrumBars[i].position.y = height / 2;
            
            // Update color based on height
            this.spectrumBars[i].material.color.setHSL(
                audioValue * 0.3 + 0.1,
                1,
                0.5 + audioValue * 0.3
            );
        }
    }

    animate() {
        if (!this.isActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.updateVisualizations();
        this.updateWaveformAnimation();
        this.updateBeatVisualizers();
        this.updateHandGestureEffects();
        
        // Auto-rotate camera
        this.camera.position.x = Math.cos(Date.now() * 0.0005) * 50;
        this.camera.position.z = Math.sin(Date.now() * 0.0005) * 50;
        this.camera.lookAt(0, 0, 0);
        
        this.renderer.render(this.scene, this.camera);
    }

    setupControls() {
        const toggleBtn = document.getElementById('toggle-viz');
        const modeSelect = document.getElementById('viz-mode');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isActive = !this.isActive;
                if (this.isActive) {
                    this.animate();
                    toggleBtn.textContent = 'Pause Visualization';
                } else {
                    if (this.animationId) {
                        cancelAnimationFrame(this.animationId);
                    }
                    toggleBtn.textContent = 'Resume Visualization';
                }
            });
        }

        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                this.setMode(e.target.value);
            });
        }
    }

    onWindowResize() {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    // Resume audio context if suspended
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Integration methods for MediaPipe
    setMediaPipeHandler(handler) {
        this.mediaPipeHandler = handler;
        
        // Hook into drum triggers
        if (handler && handler.triggerDrum) {
            const originalTriggerDrum = handler.triggerDrum.bind(handler);
            handler.triggerDrum = (drumType, velocity) => {
                originalTriggerDrum(drumType, velocity);
                this.triggerBeat(drumType, velocity);
            };
        }
    }

    // Update audio values from external source (MediaPipe)
    updateAudioValues(volume, frequency) {
        this.volumeAmplitude = volume;
        this.pitchFrequency = frequency;
    }

    // Set visualization mode
    setVisualizationMode(mode) {
        this.mode = mode;
        this.setMode(mode);
    }

    // Get current visualization stats
    getVisualizationStats() {
        return {
            mode: this.mode,
            isActive: this.isActive,
            particleCount: this.gestureParticles.length,
            beatIntensity: this.beatIntensity,
            volumeAmplitude: this.volumeAmplitude,
            pitchFrequency: this.pitchFrequency
        };
    }

    // Cleanup
    destroy() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Clean up gesture particles
        this.gestureParticles.forEach(particle => {
            this.scene.remove(particle);
        });
        this.gestureParticles = [];
        
        if (this.audioSource) {
            this.audioSource.disconnect();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other modules
window.ThreeVisualizer = ThreeVisualizer;
