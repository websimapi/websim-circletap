document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const scoreDisplay = document.getElementById('score-display');
    const scoreEl = document.getElementById('score');
    const startMenu = document.getElementById('start-menu');
    const gameOverMenu = document.getElementById('game-over-menu');
    const finalScoreEl = document.getElementById('final-score');
    const restartBtn = document.getElementById('restart-btn');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    const replayBtn = document.getElementById('replay-btn');
    const shareReplayBtn = document.getElementById('share-replay-btn');
    const replayContainer = document.getElementById('replay-container');
    const closeReplayBtn = document.getElementById('close-replay-btn');

    // CSS Color variables
    const computedStyles = getComputedStyle(document.documentElement);
    const colors = {
        secondary: computedStyles.getPropertyValue('--secondary-color'),
        success: computedStyles.getPropertyValue('--success-color'),
        fail: computedStyles.getPropertyValue('--fail-color')
    };

    // Canvas/Drawing state
    let devicePixelRatio = window.devicePixelRatio || 1;
    let size, radius, lineWidth;

    // Game state
    let gameState = 'start'; // 'start', 'playing', 'gameover'
    let score = 0;
    let angle = -Math.PI / 2; // Start at the top
    let direction = 1;
    let speed = 0;
    let targetStartAngle = 0;
    let targetSize = 0;
    let lastFrameTime = 0;
    let animationFrameId;
    let currentDifficulty = 'easy';
    let replayFrames = [];
    let replayConfig = {};

    const difficulties = {
        easy: { speed: 1.2 * Math.PI, size: 0.4, trackWidthFactor: 0.12 }, 
        medium: { speed: 1.5 * Math.PI, size: 0.25, trackWidthFactor: 0.07 },
        hard: { speed: 1.8 * Math.PI, size: 0.15, trackWidthFactor: 0.035 }
    };

    // Audio
    let audioCtx;
    let successSound, failSound, startSound;

    function resizeCanvas() {
        const containerSize = Math.min(canvas.parentElement.offsetWidth, canvas.parentElement.offsetHeight) * 0.9;
        canvas.style.width = `${containerSize}px`;
        canvas.style.height = `${containerSize}px`;

        size = containerSize * devicePixelRatio;
        canvas.width = size;
        canvas.height = size;
        
        radius = size * 0.4;
        lineWidth = size * difficulties[currentDifficulty].trackWidthFactor;
        // ctx.lineCap is now set in draw() for specific elements
        
        // Redraw if game is not active
        if (gameState !== 'playing') {
            draw();
        }
    }
    
    function initAudio() {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();

            const loadSound = (url) => {
                return fetch(url)
                    .then(response => response.arrayBuffer())
                    .then(buffer => audioCtx.decodeAudioData(buffer));
            };

            const createSoundPlayer = (buffer) => () => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.start(0);
            };

            Promise.all([
                loadSound('success.mp3'),
                loadSound('fail.mp3'),
                loadSound('start_sound.mp3')
            ]).then(([successBuffer, failBuffer, startBuffer]) => {
                successSound = createSoundPlayer(successBuffer);
                failSound = createSoundPlayer(failBuffer);
                startSound = createSoundPlayer(startBuffer);
            }).catch(e => console.error("Error loading audio:", e));
        }
    }

    function generateNewTarget() {
        targetStartAngle = Math.random() * Math.PI * 2;
    }

    function startGame(difficulty) {
        currentDifficulty = difficulty;
        resizeCanvas(); // Update track width for new difficulty

        initAudio(); // Initialize audio on first user interaction
        if (startSound) startSound();
        const settings = difficulties[difficulty];
        speed = settings.speed;
        targetSize = settings.size;

        score = 0;
        angle = -Math.PI / 2; // Reset to top
        direction = 1;
        scoreEl.textContent = score;

        generateNewTarget();
        
        gameState = 'playing';
        startMenu.classList.add('hidden');
        gameOverMenu.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');

        replayFrames = [];
        replayConfig = {
            difficulty: currentDifficulty,
            difficulties,
            colors,
        };

        lastFrameTime = performance.now();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function gameOver() {
        if (failSound) failSound();
        gameState = 'gameover';
        finalScoreEl.textContent = score;
        scoreDisplay.classList.add('hidden');
        gameOverMenu.classList.remove('hidden');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        
        // Add the final frame to the replay
        replayFrames.push({
            angle,
            targetStartAngle,
            targetSize,
            score,
            success: false,
            timestamp: performance.now(),
        });

        // The last drawn frame from gameLoop will remain visible.
    }

    function draw() {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(size / 2, size / 2);

        // Draw track
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'butt'; // Use flat ends for the track circle
        ctx.stroke();

        // Draw target zone only if size is positive
        if (targetSize > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, radius, targetStartAngle, targetStartAngle + targetSize);
            ctx.strokeStyle = colors.success;
            ctx.lineWidth = lineWidth * 0.95; // Make target slightly thinner than track for a better look
            ctx.lineCap = 'round'; // Use round ends for the target zone
            ctx.stroke();
        }

        // Draw rotating line
        ctx.rotate(angle);
        ctx.beginPath();
        // Start the line from the inner edge of the track
        ctx.moveTo(radius - lineWidth / 2, 0);
        // End the line at the outer edge of the track
        ctx.lineTo(radius + lineWidth / 2, 0);
        ctx.strokeStyle = colors.fail;
        ctx.lineWidth = lineWidth / 2.5;
        ctx.lineCap = 'butt'; // Use flat ends for the rotating line
        ctx.stroke();
        
        ctx.restore();
    }

    function gameLoop(currentTime) {
        if (gameState !== 'playing') return;

        const deltaTime = (currentTime - lastFrameTime) / 1000; // time in seconds
        lastFrameTime = currentTime;

        angle += speed * direction * deltaTime;
        
        replayFrames.push({
            angle,
            targetStartAngle,
            targetSize,
            score,
            timestamp: currentTime,
        });

        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    // This is the new, robust hit detection.
    function isAngleInArc(angleToCheck, arcStart, arcSize) {
        // Normalize all angles to be in the [0, 2*PI) range
        const twoPi = Math.PI * 2;
        const normAngle = (angleToCheck % twoPi + twoPi) % twoPi;
        const normArcStart = (arcStart % twoPi + twoPi) % twoPi;
        
        // Calculate the end of the arc
        const normArcEnd = (normArcStart + arcSize) % twoPi;

        if (normArcStart < normArcEnd) {
            // Standard case (arc doesn't cross the 0 line)
            return normAngle >= normArcStart && normAngle <= normArcEnd;
        } else {
            // Wrap-around case (e.g., starts at 350deg, ends at 20deg)
            return normAngle >= normArcStart || normAngle <= normArcEnd;
        }
    }

    function handleTap() {
        if (gameState !== 'playing') return;
        
        // This provides a generous tolerance based on the visual width of the line.
        const angleTolerance = Math.atan2(lineWidth / 2.5, radius);

        const inZone = isAngleInArc(angle, targetStartAngle - angleTolerance, targetSize + 2 * angleTolerance);

        if (inZone) {
            if (successSound) successSound();
            score++;
            scoreEl.textContent = score;
            direction *= -1; // Reverse direction
            speed *= 1.04; // Slightly increase speed

            // Record successful tap
            const lastFrame = replayFrames[replayFrames.length - 1];
            if (lastFrame) {
                lastFrame.success = true;
                lastFrame.newTarget = {
                    start: targetStartAngle,
                    size: difficulties[currentDifficulty].size
                };
            }

            generateNewTarget();
        } else {
            gameOver();
        }
    }

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => startGame(btn.dataset.difficulty));
    });

    restartBtn.addEventListener('click', () => {
        gameOverMenu.classList.add('hidden');
        startMenu.classList.remove('hidden');
        // Reset to the initial preview state for the start menu
        currentDifficulty = 'easy'; // Reset to easy for preview
        targetSize = difficulties.easy.size;
        targetStartAngle = Math.PI / 4;
        angle = -Math.PI / 2;
        resizeCanvas(); // This will call draw()
    });

    shareReplayBtn.addEventListener('click', async () => {
        shareReplayBtn.disabled = true;
        shareReplayBtn.style.opacity = '0.5';
        shareReplayBtn.style.cursor = 'wait';

        try {
            // Lazy-load composition only when needed
            const { ReplayComposition } = await import('./composition.jsx');

            try {
                const currentUser = await window.websim.getCurrentUser();
                replayConfig.currentUser = currentUser;
            } catch (error) {
                console.warn("Could not get current user, proceeding without it.");
                replayConfig.currentUser = null;
            }
            
            const replayData = { frames: replayFrames, config: replayConfig };
            const durationInSeconds = (replayData.frames[replayData.frames.length - 1].timestamp - replayData.frames[0].timestamp) / 1000;
            const durationInFrames = Math.ceil(durationInSeconds * 30) + 90; // Add 3 seconds for end screen

            if (typeof window.websim.renderAndPost !== 'function') {
                throw new Error("The 'renderAndPost' feature is not available. Please try updating your environment.");
            }

            // Use the integrated websim function to handle rendering and posting
            await window.websim.renderAndPost({
                component: ReplayComposition,
                durationInFrames: durationInFrames,
                fps: 30,
                compositionWidth: 540,
                compositionHeight: 960,
                inputProps: { replayData },
                comment: {
                    content: `Check out my score of ${score}!`,
                },
                fileName: 'circle-tap-replay.mp4'
            });

        } catch (error) {
            console.error("Failed to share replay:", error);
            alert(`Sorry, there was an error sharing your replay. ${error.message}`);
        } finally {
            shareReplayBtn.disabled = false;
            shareReplayBtn.style.opacity = '1';
            shareReplayBtn.style.cursor = 'pointer';
        }
    });

    replayBtn.addEventListener('click', async () => {
        gameOverMenu.classList.add('hidden');
        replayContainer.classList.remove('hidden');
        
        try {
            const currentUser = await window.websim.getCurrentUser();
            replayConfig.currentUser = currentUser;
        } catch (error) {
            console.error("Could not get current user for replay:", error);
            replayConfig.currentUser = null;
        }

        const event = new CustomEvent('showReplay', {
            detail: {
                frames: replayFrames,
                config: replayConfig
            }
        });
        window.dispatchEvent(event);
    });

    closeReplayBtn.addEventListener('click', () => {
        replayContainer.classList.add('hidden');
        gameOverMenu.classList.remove('hidden');
        const event = new CustomEvent('hideReplay');
        window.dispatchEvent(event);
    });

    const tapHandler = (e) => {
        // Prevent event from firing on UI buttons
        if (e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            handleTap();
        }
    };

    // Use pointer events for better cross-device compatibility
    window.addEventListener('pointerdown', tapHandler);

    window.addEventListener('resize', resizeCanvas);

    // Initial setup
    currentDifficulty = 'easy'; // Set for initial draw
    resizeCanvas();
    // Show a preview of the target zone on the start screen
    targetSize = difficulties.easy.size;
    targetStartAngle = Math.PI / 4;
    draw(); // Draw initial state for start menu
});