/**
 * Gesture Recognition System
 * Analyzes hand landmarks to detect specific gestures for music control
 */

class GestureRecognizer {
    constructor() {
        this.lastGestureTime = 0;
        this.gestureDebounceDelay = 1000; // 1 second between gestures
        this.gestureHistory = [];
        this.maxHistoryLength = 5;
        
        // Gesture confidence thresholds
        this.confidenceThreshold = 0.7;
        this.stabilityFrames = 3; // Number of consecutive frames needed for gesture confirmation
        
        // Current gesture state
        this.currentGesture = null;
        this.gestureFrameCount = 0;
        
        // Callbacks
        this.onGestureCallback = null;
    }

    // Main method to analyze hand landmarks and detect gestures
    recognizeGesture(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.resetGestureState();
            return null;
        }

        const landmarks = results.multiHandLandmarks[0]; // Use first hand
        const handedness = results.multiHandedness[0];
        
        const gesture = this.analyzeHandGesture(landmarks, handedness);
        
        if (gesture) {
            this.processGestureDetection(gesture);
        } else {
            this.resetGestureState();
        }

        return gesture;
    }

    analyzeHandGesture(landmarks, handedness) {
        // Get key landmark positions
        const fingerPositions = this.getFingerPositions(landmarks);
        const palmCenter = this.getPalmCenter(landmarks);
        const wrist = landmarks[0];

        // Analyze different gesture patterns
        const gestures = [
            this.detectOpenPalm(fingerPositions, palmCenter),
            this.detectClosedFist(fingerPositions, palmCenter),
            this.detectThumbsUp(fingerPositions, palmCenter, handedness),
            this.detectThumbsDown(fingerPositions, palmCenter, handedness),
            this.detectPointingLeft(fingerPositions, palmCenter),
            this.detectPointingRight(fingerPositions, palmCenter),
            this.detectPeaceSign(fingerPositions, palmCenter),
            this.detectOkSign(fingerPositions, palmCenter)
        ];

        // Return the gesture with highest confidence
        const validGestures = gestures.filter(g => g && g.confidence > this.confidenceThreshold);
        
        if (validGestures.length > 0) {
            validGestures.sort((a, b) => b.confidence - a.confidence);
            return validGestures[0];
        }

        return null;
    }

    getFingerPositions(landmarks) {
        return {
            thumb: {
                tip: landmarks[4],
                ip: landmarks[3],
                mcp: landmarks[2]
            },
            index: {
                tip: landmarks[8],
                pip: landmarks[7],
                dip: landmarks[6],
                mcp: landmarks[5]
            },
            middle: {
                tip: landmarks[12],
                pip: landmarks[11],
                dip: landmarks[10],
                mcp: landmarks[9]
            },
            ring: {
                tip: landmarks[16],
                pip: landmarks[15],
                dip: landmarks[14],
                mcp: landmarks[13]
            },
            pinky: {
                tip: landmarks[20],
                pip: landmarks[19],
                dip: landmarks[18],
                mcp: landmarks[17]
            }
        };
    }

    getPalmCenter(landmarks) {
        // Calculate palm center using key palm landmarks
        const palmLandmarks = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
        let centerX = 0, centerY = 0;
        
        palmLandmarks.forEach(landmark => {
            centerX += landmark.x;
            centerY += landmark.y;
        });
        
        return {
            x: centerX / palmLandmarks.length,
            y: centerY / palmLandmarks.length
        };
    }

    // Gesture detection methods
    detectOpenPalm(fingers, palm) {
        const extendedFingers = this.countExtendedFingers(fingers);
        
        if (extendedFingers >= 4) {
            const confidence = Math.min(1.0, extendedFingers / 5);
            return {
                name: 'open_palm',
                action: 'play_pause',
                confidence: confidence,
                description: 'Open Palm - Play/Pause'
            };
        }
        return null;
    }

    detectClosedFist(fingers, palm) {
        const extendedFingers = this.countExtendedFingers(fingers);
        
        if (extendedFingers <= 1) {
            const confidence = 1.0 - (extendedFingers / 5);
            return {
                name: 'closed_fist',
                action: 'stop',
                confidence: confidence,
                description: 'Closed Fist - Stop'
            };
        }
        return null;
    }

    detectThumbsUp(fingers, palm, handedness) {
        const thumbExtended = this.isFingerExtended(fingers.thumb);
        const otherFingersClosed = this.countExtendedFingers(fingers, ['thumb']) === 0;
        
        if (thumbExtended && otherFingersClosed) {
            // Check thumb orientation (should be pointing up)
            const thumbDirection = this.getThumbDirection(fingers.thumb);
            
            if (thumbDirection === 'up') {
                return {
                    name: 'thumbs_up',
                    action: 'volume_up',
                    confidence: 0.9,
                    description: 'Thumbs Up - Volume Up'
                };
            }
        }
        return null;
    }

    detectThumbsDown(fingers, palm, handedness) {
        const thumbExtended = this.isFingerExtended(fingers.thumb);
        const otherFingersClosed = this.countExtendedFingers(fingers, ['thumb']) === 0;
        
        if (thumbExtended && otherFingersClosed) {
            // Check thumb orientation (should be pointing down)
            const thumbDirection = this.getThumbDirection(fingers.thumb);
            
            if (thumbDirection === 'down') {
                return {
                    name: 'thumbs_down',
                    action: 'volume_down',
                    confidence: 0.9,
                    description: 'Thumbs Down - Volume Down'
                };
            }
        }
        return null;
    }

    detectPointingLeft(fingers, palm) {
        const indexExtended = this.isFingerExtended(fingers.index);
        const otherFingersClosed = this.countExtendedFingers(fingers, ['index']) <= 1;
        
        if (indexExtended && otherFingersClosed) {
            const pointingDirection = this.getPointingDirection(fingers.index);
            
            if (pointingDirection === 'left') {
                return {
                    name: 'pointing_left',
                    action: 'previous',
                    confidence: 0.85,
                    description: 'Point Left - Previous Track'
                };
            }
        }
        return null;
    }

    detectPointingRight(fingers, palm) {
        const indexExtended = this.isFingerExtended(fingers.index);
        const otherFingersClosed = this.countExtendedFingers(fingers, ['index']) <= 1;
        
        if (indexExtended && otherFingersClosed) {
            const pointingDirection = this.getPointingDirection(fingers.index);
            
            if (pointingDirection === 'right') {
                return {
                    name: 'pointing_right',
                    action: 'next',
                    confidence: 0.85,
                    description: 'Point Right - Next Track'
                };
            }
        }
        return null;
    }

    detectPeaceSign(fingers, palm) {
        const indexExtended = this.isFingerExtended(fingers.index);
        const middleExtended = this.isFingerExtended(fingers.middle);
        const otherFingersClosed = this.countExtendedFingers(fingers, ['index', 'middle']) === 0;
        
        if (indexExtended && middleExtended && otherFingersClosed) {
            return {
                name: 'peace_sign',
                action: 'toggle_visualization',
                confidence: 0.8,
                description: 'Peace Sign - Toggle Visualization'
            };
        }
        return null;
    }

    detectOkSign(fingers, palm) {
        // Check if thumb and index finger form a circle
        const thumbIndexDistance = this.calculateDistance(fingers.thumb.tip, fingers.index.tip);
        const otherFingersExtended = this.countExtendedFingers(fingers, ['thumb', 'index']) >= 2;
        
        if (thumbIndexDistance < 0.05 && otherFingersExtended) {
            return {
                name: 'ok_sign',
                action: 'confirm',
                confidence: 0.75,
                description: 'OK Sign - Confirm'
            };
        }
        return null;
    }

    // Helper methods
    countExtendedFingers(fingers, excludeFingers = []) {
        let count = 0;
        
        Object.keys(fingers).forEach(fingerName => {
            if (!excludeFingers.includes(fingerName) && this.isFingerExtended(fingers[fingerName])) {
                count++;
            }
        });
        
        return count;
    }

    isFingerExtended(finger) {
        if (!finger.tip || !finger.mcp) return false;
        
        // Check if tip is higher than MCP joint (extended)
        const tipToMcpDistance = Math.abs(finger.tip.y - finger.mcp.y);
        const isExtended = finger.tip.y < finger.mcp.y; // Y decreases upward
        
        return isExtended && tipToMcpDistance > 0.02;
    }

    getThumbDirection(thumb) {
        if (!thumb.tip || !thumb.mcp) return 'unknown';
        
        const yDiff = thumb.tip.y - thumb.mcp.y;
        
        if (yDiff < -0.05) return 'up';
        if (yDiff > 0.05) return 'down';
        return 'neutral';
    }

    getPointingDirection(index) {
        if (!index.tip || !index.mcp) return 'unknown';
        
        const xDiff = index.tip.x - index.mcp.x;
        
        if (xDiff < -0.1) return 'left';
        if (xDiff > 0.1) return 'right';
        return 'forward';
    }

    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Gesture state management
    processGestureDetection(gesture) {
        if (this.currentGesture && this.currentGesture.name === gesture.name) {
            this.gestureFrameCount++;
            
            if (this.gestureFrameCount >= this.stabilityFrames) {
                this.executeGesture(gesture);
                this.resetGestureState();
            }
        } else {
            this.currentGesture = gesture;
            this.gestureFrameCount = 1;
        }
    }

    executeGesture(gesture) {
        const now = Date.now();
        
        // Debounce gestures to prevent rapid firing
        if (now - this.lastGestureTime < this.gestureDebounceDelay) {
            return;
        }
        
        this.lastGestureTime = now;
        this.addToHistory(gesture);
        
        if (this.onGestureCallback) {
            this.onGestureCallback(gesture);
        }
        
        console.log(`Gesture detected: ${gesture.description} (confidence: ${gesture.confidence.toFixed(2)})`);
    }

    resetGestureState() {
        this.currentGesture = null;
        this.gestureFrameCount = 0;
    }

    addToHistory(gesture) {
        this.gestureHistory.push({
            gesture: gesture,
            timestamp: Date.now()
        });
        
        if (this.gestureHistory.length > this.maxHistoryLength) {
            this.gestureHistory.shift();
        }
    }

    // Configuration methods
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
    }

    setDebounceDelay(delay) {
        this.gestureDebounceDelay = Math.max(100, delay);
    }

    setStabilityFrames(frames) {
        this.stabilityFrames = Math.max(1, frames);
    }

    // Callback setter
    setOnGestureCallback(callback) {
        this.onGestureCallback = callback;
    }

    // Get gesture history
    getGestureHistory() {
        return this.gestureHistory;
    }

    // Get current detection state
    getCurrentState() {
        return {
            currentGesture: this.currentGesture,
            frameCount: this.gestureFrameCount,
            lastGestureTime: this.lastGestureTime
        };
    }
}

// Export for use in other modules
window.GestureRecognizer = GestureRecognizer;
