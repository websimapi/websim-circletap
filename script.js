import { Game, difficulties } from './game.js';
import { UIController } from './ui.js';
import { submitScore, fetchLeaderboard, renderLeaderboard } from './leaderboard.js';
import { showReplay, hideReplay } from './replay.js';
import { playBackgroundMusic } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    let hasInteracted = false;

    const handleFirstInteraction = () => {
        if (!hasInteracted) {
            hasInteracted = true;
            playBackgroundMusic();
        }
    };
    
    // UI Elements
    const elements = {
        scoreDisplay: document.getElementById('score-display'),
        scoreEl: document.getElementById('score'),
        levelDisplay: document.getElementById('level-display'),
        startMenu: document.getElementById('start-menu'),
        gameOverMenu: document.getElementById('game-over-menu'),
        finalScoreEl: document.getElementById('final-score'),
        restartBtn: document.getElementById('restart-btn'),
        homeBtn: document.getElementById('home-btn'),
        difficultyBtns: document.querySelectorAll('.difficulty-btn'),
        replayBtn: document.getElementById('replay-btn'),
        replayContainer: document.getElementById('replay-container'),
        closeReplayBtn: document.getElementById('close-replay-btn'),
        submitScoreBtn: document.getElementById('submit-score-btn'),
        leaderboardBtn: document.getElementById('leaderboard-btn'),
        leaderboardView: document.getElementById('leaderboard-view'),
        closeLeaderboardBtn: document.getElementById('close-leaderboard-btn'),
        leaderboardList: document.getElementById('leaderboard-list'),
        leaderboardDifficultyFilters: document.getElementById('leaderboard-difficulty-filters'),
        leaderboardFilterBtns: document.querySelectorAll('.leaderboard-filter-btn')
    };

    const game = new Game(canvas);
    const ui = new UIController(elements);
    let rankedPlayersData = [];

    // Set up game callbacks
    game.onScoreUpdate = (score) => ui.updateScore(score);
    game.onLevelUp = (level, isInitial) => ui.updateLevel(level, isInitial);
    game.onGameOver = (gameData) => {
        ui.showGameOverMenu(gameData.score);
    };

    // Difficulty selection
    elements.difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            handleFirstInteraction();
            game.start(btn.dataset.difficulty);
            ui.showGameScreen();
        });
    });

    // Restart button
    elements.restartBtn.addEventListener('click', () => {
        ui.clearTimeouts(); // Clear any pending timeouts from the previous game over screen
        game.reset();
        ui.showGameScreen();
        game.start(game.currentDifficulty);
    });

    // Home button
    elements.homeBtn.addEventListener('click', () => {
        ui.clearTimeouts();
        game.reset();
        ui.showStartMenu();
    });

    // Replay button
    elements.replayBtn.addEventListener('click', async () => {
        handleFirstInteraction();
        ui.showReplayContainer();
        
        if (!game.replayConfig.currentUser) {
            try {
                const currentUser = await window.websim.getCurrentUser();
                game.replayConfig.currentUser = currentUser;
            } catch (error) {
                console.error("Could not get current user for replay:", error);
                game.replayConfig.currentUser = null;
            }
        }

        showReplay({
            frames: game.replayFrames,
            config: game.replayConfig
        });
    });

    elements.closeReplayBtn.addEventListener('click', () => {
        ui.hideReplayContainer();
        hideReplay();
    });

    // Submit score button
    elements.submitScoreBtn.addEventListener('click', async () => {
        ui.setSubmitButtonState('disabled', 'Submitting...');
        
        await submitScore(
            game.lastGameData,
            () => ui.setSubmitButtonState('disabled', 'Submitted!'),
            () => {
                ui.setSubmitButtonState('disabled', 'Error!');
                setTimeout(() => {
                    ui.setSubmitButtonState('enabled', 'To Submit');
                }, 2000);
            }
        );
    });

    async function loadLeaderboard(difficulty) {
        ui.showLeaderboardView();
        elements.leaderboardList.innerHTML = '<p>Loading scores...</p>';
        rankedPlayersData = [];

        // Update active button state
        elements.leaderboardFilterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });

        try {
            rankedPlayersData = await fetchLeaderboard(difficulty);
            
            if (rankedPlayersData.length === 0) {
                elements.leaderboardList.innerHTML = `<p>No scores for ${difficulty} difficulty yet. Be the first!</p>`;
            } else {
                elements.leaderboardList.innerHTML = renderLeaderboard(rankedPlayersData);
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            elements.leaderboardList.innerHTML = '<p>Could not load leaderboard. Please try again later.</p>';
        }
    }

    // Leaderboard button
    elements.leaderboardBtn.addEventListener('click', async () => {
        handleFirstInteraction();
        loadLeaderboard('easy'); // Default to easy
    });

    elements.leaderboardDifficultyFilters.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.leaderboard-filter-btn');
        if (targetBtn && !targetBtn.classList.contains('active')) {
            const difficulty = targetBtn.dataset.difficulty;
            loadLeaderboard(difficulty);
        }
    });

    elements.closeLeaderboardBtn.addEventListener('click', () => {
        ui.hideLeaderboardView();
    });

    // Leaderboard replay buttons
    elements.leaderboardList.addEventListener('click', async (e) => {
        const watchBtn = e.target.closest('.watch-replay-btn');
        const entry = e.target.closest('.leaderboard-entry');

        if (watchBtn) {
            e.stopPropagation();
            const index = watchBtn.dataset.index;
            const scoreIndex = watchBtn.dataset.scoreIndex;
            const playerData = rankedPlayersData[index];
            
            const gameData = scoreIndex !== undefined
                ? playerData.allScores[scoreIndex]
                : playerData.bestGameData;

            if (playerData && gameData && gameData.replayDataUrl) {
                try {
                    const originalText = watchBtn.textContent;
                    watchBtn.textContent = 'Loading...';
                    watchBtn.disabled = true;

                    const response = await fetch(gameData.replayDataUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const replayData = await response.json();

                    if (!replayData.config.currentUser) {
                        replayData.config.currentUser = {
                            username: playerData.username,
                            avatar_url: `https://images.websim.com/avatar/${playerData.username}`
                        };
                    }

                    elements.leaderboardView.classList.add('hidden');
                    ui.showReplayContainer();
                    showReplay(replayData);
                    
                    watchBtn.textContent = originalText;
                    watchBtn.disabled = false;

                } catch (fetchError) {
                    console.error("Error fetching replay data:", fetchError);
                    alert("Could not load replay.");
                    watchBtn.textContent = 'Failed';
                    setTimeout(() => {
                        watchBtn.textContent = 'Watch';
                        watchBtn.disabled = false;
                    }, 2000);
                }
            }
        } else if (entry) {
            const scoreList = entry.nextElementSibling;
            if (scoreList && scoreList.classList.contains('score-list-container')) {
                scoreList.classList.toggle('hidden');
                entry.classList.toggle('expanded');
            }
        }
    });

    // Tap handler
    const tapHandler = (e) => {
        if (e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            game.handleTap();
        }
    };
    window.addEventListener('pointerdown', tapHandler);

    // Window resize
    window.addEventListener('resize', () => game.resizeCanvas());

    // Initial setup
    game.reset();
});