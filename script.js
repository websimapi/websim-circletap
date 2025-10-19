import { Game, difficulties } from './game.js';
import { UIController } from './ui.js';
import { submitScore, fetchLeaderboard, renderLeaderboard } from './leaderboard.js';
import { showReplay, hideReplay } from './replay.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    
    // UI Elements
    const elements = {
        scoreDisplay: document.getElementById('score-display'),
        scoreEl: document.getElementById('score'),
        levelDisplay: document.getElementById('level-display'),
        startMenu: document.getElementById('start-menu'),
        gameOverMenu: document.getElementById('game-over-menu'),
        finalScoreEl: document.getElementById('final-score'),
        restartBtn: document.getElementById('restart-btn'),
        difficultyBtns: document.querySelectorAll('.difficulty-btn'),
        replayBtn: document.getElementById('replay-btn'),
        replayContainer: document.getElementById('replay-container'),
        closeReplayBtn: document.getElementById('close-replay-btn'),
        submitScoreBtn: document.getElementById('submit-score-btn'),
        leaderboardBtn: document.getElementById('leaderboard-btn'),
        leaderboardView: document.getElementById('leaderboard-view'),
        closeLeaderboardBtn: document.getElementById('close-leaderboard-btn'),
        leaderboardList: document.getElementById('leaderboard-list')
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
            game.start(btn.dataset.difficulty);
            ui.showGameScreen();
        });
    });

    // Restart button
    elements.restartBtn.addEventListener('click', () => {
        game.reset();
        ui.showStartMenu();
    });

    // Replay button
    elements.replayBtn.addEventListener('click', async () => {
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

    // Leaderboard button
    elements.leaderboardBtn.addEventListener('click', async () => {
        ui.showLeaderboardView();
        elements.leaderboardList.innerHTML = '<p>Loading scores...</p>';
        rankedPlayersData = [];

        try {
            rankedPlayersData = await fetchLeaderboard();
            
            if (rankedPlayersData.length === 0) {
                elements.leaderboardList.innerHTML = '<p>No scores submitted yet. Be the first!</p>';
            } else {
                elements.leaderboardList.innerHTML = renderLeaderboard(rankedPlayersData);
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            elements.leaderboardList.innerHTML = '<p>Could not load leaderboard. Please try again later.</p>';
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

            if (playerData && gameData && gameData.replayData) {
                const replayData = gameData.replayData;

                if (!replayData.config.currentUser) {
                    replayData.config.currentUser = {
                        username: playerData.username,
                        avatar_url: `https://images.websim.com/avatar/${playerData.username}`
                    };
                }

                elements.leaderboardView.classList.add('hidden');
                ui.showReplayContainer();
                showReplay(replayData);
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