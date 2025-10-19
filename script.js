import confetti from 'canvas-confetti';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const scoreDisplay = document.getElementById('score-display');
    const scoreEl = document.getElementById('score');
    const startMenu = document.getElementById('start-menu');
    const gameOverMenu = document.getElementById('game-over-menu');
    const finalScoreEl = document.getElementById('final-score');
    const restartBtn = document.getElementById('restart-btn');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');

    let devicePixelRatio = window.devicePixelRatio || 1;
    let size, radius, lineWidth;

    function resizeCanvas() {
        const containerSize = Math.min(canvas.parentElement.offsetWidth, canvas.parentElement.offsetHeight);
        canvas.style.width = `${containerSize}px`;
        canvas.style.height = `${containerSize}px`;

        size = containerSize * devicePixelRatio;
        canvas.width = size;
        canvas.height = size;
        
        radius = size * 0.4;
        lineWidth = size * 0.05;
        ctx.lineCap = 'butt';
    }

    let gameState = 'start'; // 'start', 'playing', 'gameover'
    let score = 0;
    let angle = Math.PI / 2;
    let direction = 1;
    let speed = 0;
    
    let targetAngle = 0;
    let targetSize = 0;

    const difficulties = {
        easy: { speed: 0.02, size: Math.PI / 2 },
        medium: { speed: 0.035, size: Math.PI / 3 },
        hard: { speed: 0.05, size: Math.PI / 4 }
    };

    let successSound, failSound;
    
    const myConfetti = confetti.create(null, {
        resize: true,
        useWorker: true
    });

    function playConfetti() {
        const rect = canvas.getBoundingClientRect();
        const origin = {
            x: (rect.left + rect.right) / 2 / window.innerWidth,
            y: (rect.top + rect.bottom) / 2 / window.innerHeight
        };
        myConfetti({
            particleCount: 50,
            spread: 90,
            angle: 270,
            origin: origin,
            ticks: 200,
            gravity: 0.7,
            scalar: 1.2,
            colors: ['#4CAF50', '#8BC34A', '#FFFFFF']
        });
    }


    function initAudio() {
        if (window.AudioContext || window.webkitAudioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();

            const loadSound = (url) => {
                return fetch(url)
                    .then(response => response.arrayBuffer())
                    .then(buffer => audioCtx.decodeAudioData(buffer));
            };

            Promise.all([
                loadSound('success.mp3'),
                loadSound('fail.mp3')
            ]).then(([successBuffer, failBuffer]) => {
                successSound = () => {
                    const source = audioCtx.createBufferSource();
                    source.buffer = successBuffer;
                    source.connect(audioCtx.destination);
                    source.start(0);
                };
                failSound = () => {
                    const source = audioCtx.createBufferSource();
                    source.buffer = failBuffer;
                    source.connect(audioCtx.destination);
                    source.start(0);
                };
            }).catch(e => console.error("Error loading audio:", e));
        }
    }

    function generateNewTarget() {
        targetAngle = Math.random() * Math.PI * 2;
    }

    function startGame(difficulty) {
        const settings = difficulties[difficulty];
        speed = settings.speed;
        targetSize = settings.size;

        score = 0;
        angle = Math.PI / 2;
        direction = 1;
        scoreEl.textContent = score;

        generateNewTarget();
        
        gameState = 'playing';
        startMenu.classList.add('hidden');
        gameOverMenu.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');

        requestAnimationFrame(gameLoop);
    }

    function gameOver() {
        if (failSound) failSound();
        gameState = 'gameover';
        finalScoreEl.textContent = score;
        scoreDisplay.classList.add('hidden');
        gameOverMenu.classList.remove('hidden');
    }

    function draw() {
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(size / 2, size / 2);

        // Draw track
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#0f3460';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Draw target zone
        ctx.beginPath();
        ctx.arc(0, 0, radius, targetAngle, targetAngle + targetSize);
        ctx.strokeStyle = '#4CAF50';
        ctx.stroke();

        // Draw rotating line
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius + lineWidth / 2, 0);
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = lineWidth / 3;
        ctx.stroke();
        
        ctx.restore();
    }

    function gameLoop() {
        if (gameState !== 'playing') return;

        angle += speed * direction;
        // Normalize angle to be always within [0, 2*PI)
        angle = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        draw();
        requestAnimationFrame(gameLoop);
    }
    
    function normalizeAngle(a) {
        const twoPi = Math.PI * 2;
        return (a % twoPi + twoPi) % twoPi;
    }

    function handleTap() {
        if (gameState !== 'playing') return;
        
        // This is a robust geometric collision check that accounts for the visual
        // thickness of both the line and the target arc.

        // 1. Calculate the angular half-width of the target arc's stroke
        const targetAngularHalfWidth = Math.atan2(lineWidth / 2, radius);
        // 2. Calculate the angular half-width of the rotating line's stroke
        const lineAngularHalfWidth = Math.atan2((lineWidth / 3) / 2, radius);

        // 3. Define the full visual range of the target arc.
        // It starts at its defined angle minus its half-width and ends at its
        // end angle plus its half-width.
        let targetStart = normalizeAngle(targetAngle - targetAngularHalfWidth);
        let targetEnd = normalizeAngle(targetAngle + targetSize + targetAngularHalfWidth);

        // 4. Define the full visual range of the rotating line.
        let lineStart = normalizeAngle(angle - lineAngularHalfWidth);
        let lineEnd = normalizeAngle(angle + lineAngularHalfWidth);
        
        let inZone = false;

        // 5. Check for overlap. This is tricky because the ranges can wrap around
        // the 0 -> 2*PI boundary.
        if (targetStart <= targetEnd) { // Case 1: Target does NOT wrap around
            // Check if the line overlaps, also considering if the line itself wraps
            if (lineStart <= lineEnd) { // Line does not wrap
                inZone = lineStart <= targetEnd && targetStart <= lineEnd;
            } else { // Line wraps (e.g., starts at 350deg, ends at 10deg)
                inZone = (lineStart <= targetEnd) || (targetStart <= lineEnd);
            }
        } else { // Case 2: Target WRAPS around (e.g., starts at 350deg, ends at 20deg)
            // The target is in two parts: [targetStart, 2*PI] and [0, targetEnd]
            if (lineStart <= lineEnd) { // Line does not wrap
                 inZone = (lineStart <= Math.PI * 2 && targetStart <= lineEnd) || (0 <= lineEnd && lineStart <= targetEnd);
            } else { // Line also wraps
                // If both wrap, they must overlap.
                inZone = true;
            }
        }


        if (inZone) {
            if (successSound) successSound();
            playConfetti();
            score++;
            scoreEl.textContent = score;
            direction *= -1; // Reverse direction
            speed *= 1.03; // Slightly increase speed
            generateNewTarget();
        } else {
            gameOver();
        }
    }

    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            startGame(btn.dataset.difficulty);
        });
    });

    restartBtn.addEventListener('click', () => {
        gameOverMenu.classList.add('hidden');
        startMenu.classList.remove('hidden');
    });

    // Use touchend for mobile to avoid issues with tap-and-hold
    window.addEventListener('touchend', handleTap, { passive: false });
    window.addEventListener('mousedown', (e) => {
        // Prevent firing on button clicks
        if (e.target.tagName !== 'BUTTON') {
            handleTap();
        }
    });

    window.addEventListener('resize', resizeCanvas);

    // Initial setup
    resizeCanvas();
    initAudio();
    draw(); // Draw initial state for start menu
});