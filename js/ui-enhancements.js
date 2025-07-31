/**
 * UI Enhancements for Hand Gesture Music Control
 * Adds modern visual feedback, animations, and improved user experience
 */

class UIEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.addLoadingAnimation();
        this.setupResponsiveElements();
        this.addVisualFeedback();
        this.setupIntersectionObserver();
        this.addKeyboardShortcuts();
        this.initializeTooltips();
        console.log('🎨 UI Enhancements initialized');
    }

    addLoadingAnimation() {
        // Add loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <h2>🎵 Loading Hand Music Control</h2>
                <p>Initializing camera and audio systems...</p>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="loading-progress-fill"></div>
                    </div>
                    <span class="progress-text" id="loading-progress-text">0%</span>
                </div>
            </div>
        `;

        // Add loading styles
        const loadingStyles = document.createElement('style');
        loadingStyles.textContent = `
            #loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #667eea 75%, #764ba2 100%);
                background-size: 300% 300%;
                animation: gradientShift 8s ease infinite;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-family: 'Inter', sans-serif;
            }

            .loading-container {
                text-align: center;
                padding: 40px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
            }

            .loading-spinner {
                margin: 0 auto 30px;
                width: 80px;
                height: 80px;
                position: relative;
            }

            .spinner-ring {
                position: absolute;
                border: 4px solid rgba(255, 255, 255, 0.1);
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            .spinner-ring:nth-child(1) {
                width: 80px;
                height: 80px;
            }

            .spinner-ring:nth-child(2) {
                width: 60px;
                height: 60px;
                top: 10px;
                left: 10px;
                animation-delay: -0.3s;
                border-top-color: #764ba2;
            }

            .spinner-ring:nth-child(3) {
                width: 40px;
                height: 40px;
                top: 20px;
                left: 20px;
                animation-delay: -0.6s;
                border-top-color: #ff6b6b;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-container h2 {
                margin-bottom: 15px;
                font-size: 1.8rem;
                font-weight: 700;
                background: linear-gradient(45deg, #667eea, #764ba2, #ff6b6b);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .loading-container p {
                margin-bottom: 25px;
                opacity: 0.9;
                font-size: 1rem;
            }

            .loading-progress {
                margin-top: 20px;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2, #ff6b6b);
                background-size: 300% 100%;
                animation: gradientFlow 2s ease infinite;
                width: 0%;
                transition: width 0.3s ease;
            }

            .progress-text {
                font-size: 0.9rem;
                opacity: 0.8;
            }
        `;

        document.head.appendChild(loadingStyles);
        document.body.appendChild(loadingOverlay);

        // Simulate loading progress
        this.simulateLoading();
    }

    simulateLoading() {
        const progressFill = document.getElementById('loading-progress-fill');
        const progressText = document.getElementById('loading-progress-text');
        let progress = 0;

        const updateProgress = () => {
            progress += Math.random() * 15 + 5;
            progress = Math.min(progress, 100);
            
            if (progressFill && progressText) {
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}%`;
            }

            if (progress < 100) {
                setTimeout(updateProgress, 200 + Math.random() * 300);
            } else {
                setTimeout(() => this.hideLoading(), 500);
            }
        };

        updateProgress();
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(0.9)';
            overlay.style.transition = 'all 0.5s ease';
            setTimeout(() => overlay.remove(), 500);
        }

        // Add entrance animations to main content
        this.animateContentEntrance();
    }

    animateContentEntrance() {
        const sections = document.querySelectorAll('header, .camera-section, .music-player-section, .visualization-section, .gesture-info-section');
        sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
                section.classList.add('fade-in');
            }, index * 100);
        });
    }

    setupResponsiveElements() {
        // Add responsive class based on screen size
        const updateResponsiveClass = () => {
            const body = document.body;
            const width = window.innerWidth;
            
            body.classList.remove('mobile', 'tablet', 'desktop');
            
            if (width <= 480) {
                body.classList.add('mobile');
            } else if (width <= 768) {
                body.classList.add('tablet');
            } else {
                body.classList.add('desktop');
            }
        };

        updateResponsiveClass();
        window.addEventListener('resize', updateResponsiveClass);
    }

    addVisualFeedback() {
        // Add hover effects to interactive elements
        const interactiveElements = document.querySelectorAll('button, input[type="file"], select, canvas');
        
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.transform = 'translateY(-2px)';
                element.style.transition = 'all 0.3s ease';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translateY(0)';
            });
        });

        // Add click feedback
        document.addEventListener('click', (e) => {
            const ripple = document.createElement('div');
            ripple.className = 'click-ripple';
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                z-index: 1000;
            `;

            const rect = e.target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

            e.target.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });

        // Add ripple animation CSS
        const rippleStyle = document.createElement('style');
        rippleStyle.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(rippleStyle);
    }

    setupIntersectionObserver() {
        // Animate elements as they come into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    if (entry.target.classList.contains('gesture-item')) {
                        entry.target.style.animationDelay = `${Math.random() * 0.3}s`;
                    }
                }
            });
        }, { threshold: 0.1 });

        const animatedElements = document.querySelectorAll('.gesture-item, .control-btn, .viz-btn');
        animatedElements.forEach(el => observer.observe(el));
    }

    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Space bar to toggle visualization
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                const toggleBtn = document.getElementById('toggle-viz');
                if (toggleBtn) toggleBtn.click();
            }
            
            // Arrow keys for volume control
            if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
                e.preventDefault();
                const volumeSlider = document.getElementById('volume-slider');
                if (volumeSlider) {
                    const currentValue = parseInt(volumeSlider.value);
                    const newValue = e.code === 'ArrowUp' ? 
                        Math.min(100, currentValue + 5) : 
                        Math.max(0, currentValue - 5);
                    volumeSlider.value = newValue;
                    volumeSlider.dispatchEvent(new Event('input'));
                }
            }
        });

        // Show keyboard shortcuts info
        this.showKeyboardShortcuts();
    }

    showKeyboardShortcuts() {
        const shortcutsInfo = document.createElement('div');
        shortcutsInfo.className = 'keyboard-shortcuts';
        shortcutsInfo.innerHTML = `
            <div class="shortcuts-content">
                <h4>⌨️ Keyboard Shortcuts</h4>
                <div class="shortcut-item">
                    <kbd>Space</kbd> Toggle Visualization
                </div>
                <div class="shortcut-item">
                    <kbd>↑</kbd><kbd>↓</kbd> Volume Control
                </div>
            </div>
        `;

        const shortcutsStyle = document.createElement('style');
        shortcutsStyle.textContent = `
            .keyboard-shortcuts {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 10px;
                font-size: 0.8rem;
                z-index: 1000;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }

            .keyboard-shortcuts.show {
                opacity: 1;
                transform: translateY(0);
            }

            .shortcuts-content h4 {
                margin: 0 0 10px 0;
                font-size: 0.9rem;
            }

            .shortcut-item {
                margin: 5px 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            kbd {
                background: rgba(255, 255, 255, 0.2);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.7rem;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            @media (max-width: 768px) {
                .keyboard-shortcuts {
                    display: none;
                }
            }
        `;
        document.head.appendChild(shortcutsStyle);
        document.body.appendChild(shortcutsInfo);

        // Show shortcuts after delay
        setTimeout(() => {
            shortcutsInfo.classList.add('show');
            setTimeout(() => {
                shortcutsInfo.classList.remove('show');
                setTimeout(() => shortcutsInfo.remove(), 300);
            }, 5000);
        }, 3000);
    }

    initializeTooltips() {
        // Add tooltips to key elements
        const tooltips = [
            { selector: '#toggle-viz', text: 'Toggle 3D visualization effects' },
            { selector: '#viz-mode', text: 'Change visualization mode' },
            { selector: '#volume-slider', text: 'Adjust master volume' },
            { selector: '#file-input', text: 'Load your music files' },
            { selector: '.status-dot', text: 'Camera connection status' }
        ];

        tooltips.forEach(({ selector, text }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.title = text;
                element.setAttribute('aria-label', text);
            }
        });
    }

    // Utility method to show notification messages
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        const notificationStyle = document.createElement('style');
        notificationStyle.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                z-index: 10000;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 300px;
            }

            .notification.show {
                transform: translateX(0);
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .notification-success {
                border-left: 4px solid #4caf50;
            }

            .notification-error {
                border-left: 4px solid #f44336;
            }

            .notification-info {
                border-left: 4px solid #2196f3;
            }
        `;

        if (!document.querySelector('#notification-styles')) {
            notificationStyle.id = 'notification-styles';
            document.head.appendChild(notificationStyle);
        }

        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// Initialize UI enhancements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new UIEnhancements());
} else {
    new UIEnhancements();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIEnhancements;
}
