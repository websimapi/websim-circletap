import { hsl } from 'd3-color';
import { getHslStringForLevel, isAngleInArc, getComputedColors } from './utils.js';
import { initAudio, playSuccess, playFail, playStart } from './audio.js';

export const difficulties = {
    easy: { speed: 1.2 * Math.PI, size: 0.4, trackWidthFactor: 0.12 }, 
    medium: { speed: 1.5 * Math.PI, size: 0.25, trackWidthFactor: 0.07 },
    hard: { speed: 1.8 * Math.PI, size: 0.15, trackWidthFactor: 0.035 }
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.colors = getComputedColors();
        
        // Canvas/Drawing state
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.size = 0;
        this.radius = 0;
        this.lineWidth = 0;

        // Game state
        this.gameState = 'start';
        this.score = 0;
        this.angle = -Math.PI / 2;
        this.direction = 1;
        this.speed = 0;
        this.targetStartAngle = 0;
        this.targetSize = 0;
        this.lastFrameTime = 0;
        this.animationFrameId = null;
        this.currentDifficulty = 'easy';
        this.replayFrames = [];
        this.replayConfig = {};
        this.level = 0;
        this.tapsThisLevel = 0;
        this.tapsForNextLevel = 1;
        this.currentColorHsl = hsl(getHslStringForLevel(1));
        this.targetColorHsl = hsl(getHslStringForLevel(1));
        this.lastGameData = {};

        this.onGameOver = null;
        this.onScoreUpdate = null;
        this.onLevelUp = null;
    }

    resizeCanvas() {
        const containerSize = Math.min(this.canvas.parentElement.offsetWidth, this.canvas.parentElement.offsetHeight) * 0.9;
        this.canvas.style.width = `${containerSize}px`;
        this.canvas.style.height = `${containerSize}px`;

        this.size = containerSize * this.devicePixelRatio;
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        
        this.radius = this.size * 0.4;
        this.lineWidth = this.size * difficulties[this.currentDifficulty].trackWidthFactor;
        
        if (this.gameState !== 'playing') {
            this.draw();
        }
    }

    generateNewTarget() {
        this.targetStartAngle = Math.random() * Math.PI * 2;
    }

    start(difficulty) {
        this.currentDifficulty = difficulty;
        this.resizeCanvas();

        initAudio();
        playStart();
        
        const settings = difficulties[difficulty];
        this.speed = settings.speed;
        this.targetSize = settings.size;

        this.score = 0;
        this.angle = -Math.PI / 2;
        this.direction = 1;

        this.level = 0;
        this.tapsThisLevel = 0;
        this.tapsForNextLevel = 1;
        
        this.currentColorHsl = hsl(getHslStringForLevel(1));
        this.targetColorHsl = hsl(getHslStringForLevel(1));

        this.generateNewTarget();
        
        this.gameState = 'playing';
        this.replayFrames = [];
        this.replayConfig = {
            difficulty: this.currentDifficulty,
            difficulties,
            colors: this.colors,
        };

        this.lastFrameTime = performance.now();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));

        if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        if (this.onLevelUp) this.onLevelUp(this.level, true); // Pass true to indicate initial level
    }

    gameOver() {
        playFail();
        this.gameState = 'gameover';
        
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        this.replayFrames.push({
            angle: this.angle,
            targetStartAngle: this.targetStartAngle,
            targetSize: this.targetSize,
            score: this.score,
            level: this.level, 
            targetColor: this.currentColorHsl.toString(),
            success: false,
            timestamp: performance.now(),
        });

        this.lastGameData = {
            score: this.score,
            level: this.level,
            difficulty: this.currentDifficulty,
            replayData: {
                frames: this.replayFrames,
                config: this.replayConfig,
            },
            timestamp: new Date().toISOString(),
        };

        if (this.onGameOver) this.onGameOver(this.lastGameData);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.size, this.size);
        this.ctx.save();
        this.ctx.translate(this.size / 2, this.size / 2);

        // Draw track
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.colors.secondary;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'butt';
        this.ctx.stroke();

        // Draw target zone
        if (this.targetSize > 0) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.radius, this.targetStartAngle, this.targetStartAngle + this.targetSize);
            this.ctx.strokeStyle = this.currentColorHsl.toString();
            this.ctx.lineWidth = this.lineWidth * 0.95;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }

        // Draw rotating line
        this.ctx.rotate(this.angle);
        this.ctx.beginPath();
        this.ctx.moveTo(this.radius - this.lineWidth / 2, 0);
        this.ctx.lineTo(this.radius + this.lineWidth / 2, 0);
        this.ctx.strokeStyle = this.colors.fail;
        this.ctx.lineWidth = this.lineWidth / 2.5;
        this.ctx.lineCap = 'butt';
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    gameLoop(currentTime) {
        if (this.gameState !== 'playing') return;

        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        // Smooth color interpolation
        const lerpFactor = Math.min(deltaTime * 2.5, 1);
        this.currentColorHsl.h += (this.targetColorHsl.h - this.currentColorHsl.h) * lerpFactor;
        this.currentColorHsl.s += (this.targetColorHsl.s - this.currentColorHsl.s) * lerpFactor;
        this.currentColorHsl.l += (this.targetColorHsl.l - this.currentColorHsl.l) * lerpFactor;
        this.currentColorHsl.opacity += (this.targetColorHsl.opacity - this.currentColorHsl.opacity) * lerpFactor;

        this.angle += this.speed * this.direction * deltaTime;
        
        this.replayFrames.push({
            angle: this.angle,
            targetStartAngle: this.targetStartAngle,
            targetSize: this.targetSize,
            score: this.score,
            level: this.level,
            targetColor: this.currentColorHsl.toString(),
            timestamp: currentTime,
        });

        this.draw();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleTap() {
        if (this.gameState !== 'playing') return;
        
        const angleTolerance = Math.atan2(this.lineWidth / 2.5, this.radius);
        const inZone = isAngleInArc(this.angle, this.targetStartAngle - angleTolerance, this.targetSize + 2 * angleTolerance);

        if (inZone) {
            playSuccess();
            this.score++;
            
            this.tapsThisLevel++;
            if (this.tapsThisLevel >= this.tapsForNextLevel) {
                this.levelUp();
            } else if (this.level === 0) { // First tap of the game
                this.levelUp();
            }

            this.direction *= -1;
            this.speed *= 1.04;

            const lastFrame = this.replayFrames[this.replayFrames.length - 1];
            if (lastFrame) {
                lastFrame.success = true;
                lastFrame.newTarget = {
                    start: this.targetStartAngle,
                    size: difficulties[this.currentDifficulty].size
                };
            }

            this.generateNewTarget();
            
            if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        } else {
            this.gameOver();
        }
    }

    levelUp() {
        this.targetColorHsl = hsl(getHslStringForLevel(this.level + 1));
        
        this.level++;
        this.tapsThisLevel = 0;
        this.tapsForNextLevel = this.level;

        if (this.onLevelUp) this.onLevelUp(this.level);
    }

    reset() {
        this.level = 0;
        this.currentColorHsl = hsl(getHslStringForLevel(1));
        this.targetSize = difficulties[this.currentDifficulty].size;
        this.targetStartAngle = Math.PI / 4;
        this.angle = -Math.PI / 2;
        this.resizeCanvas();
    }
}