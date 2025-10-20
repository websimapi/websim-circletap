const room = new WebsimSocket();
const COLLECTION_NAME = 'leaderboard_scores_v3';

export async function submitScore(lastGameData, onSuccess, onError) {
    try {
        let gameDataForDb = { ...lastGameData };
        if (gameDataForDb.replayData) {
            try {
                const replayJson = JSON.stringify(gameDataForDb.replayData);
                const replayBlob = new Blob([replayJson], { type: 'application/json' });
                const replayFile = new File([replayBlob], 'replay.json');
                const replayUrl = await window.websim.upload(replayFile);

                gameDataForDb.replayDataUrl = replayUrl;
                delete gameDataForDb.replayData;

            } catch (uploadError) {
                console.error("Error uploading replay data:", uploadError);
                if (onError) onError(uploadError);
                return; // Stop submission if upload fails
            }
        }

        const scoreRecord = {
            score: gameDataForDb.score,
            level: gameDataForDb.level,
            difficulty: gameDataForDb.difficulty,
            replayDataUrl: gameDataForDb.replayDataUrl,
            timestamp: gameDataForDb.timestamp,
        };
        
        await room.collection(COLLECTION_NAME).create(scoreRecord);
        
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error submitting score:", error);
        if (onError) onError(error);
    }
}

export async function fetchLeaderboard(difficulty) {
    const collection = room.collection(COLLECTION_NAME);
    const filteredCollection = difficulty ? collection.filter({ difficulty: difficulty }) : collection;

    const allScores = await new Promise(resolve => {
        let unsubscribe;
        
        const timeout = setTimeout(() => {
            if (unsubscribe) unsubscribe();
            resolve(filteredCollection.getList());
        }, 2500);

        unsubscribe = filteredCollection.subscribe(records => {
            clearTimeout(timeout);
            if (unsubscribe) unsubscribe();
            resolve(records);
        });
    });

    if (!allScores || allScores.length === 0) {
        return [];
    }

    const players = {}; // Group scores by username
    allScores.forEach(scoreRecord => {
        const username = scoreRecord.username;
        if (!players[username]) {
            players[username] = {
                username: username,
                allScores: []
            };
        }
        players[username].allScores.push(scoreRecord);
    });

    const rankedPlayers = Object.values(players).map(playerData => {
        const bestGame = playerData.allScores.reduce((best, current) => {
            return (!best || current.score > best.score) ? current : best;
        }, null);
        
        return {
            username: playerData.username,
            highestScore: bestGame ? bestGame.score : 0,
            gamesPlayed: playerData.allScores.length,
            bestGameData: bestGame,
            allScores: playerData.allScores.sort((a,b) => b.score - a.score),
        };
    }).filter(p => p && p.bestGameData)
      .sort((a, b) => b.highestScore - a.highestScore);
    
    return rankedPlayers;
}

export function renderLeaderboard(rankedPlayers) {
    return rankedPlayers.map((player, index) => {
        const scoreListHtml = player.allScores.map((game, scoreIndex) => `
            <div class="score-entry">
                <div>
                    <span class="score-entry-score">Score: ${game.score}</span>
                    <small class="score-entry-date">${new Date(game.timestamp).toLocaleDateString()}</small>
                </div>
                <button class="watch-replay-btn" data-index="${index}" data-score-index="${scoreIndex}">Watch</button>
            </div>
        `).join('');

        return `
            <div class="leaderboard-entry-wrapper">
                <div class="leaderboard-entry" data-index="${index}">
                    <div class="rank">${index + 1}</div>
                    <img class="avatar" src="https://images.websim.com/avatar/${player.username}" alt="${player.username}'s avatar">
                    <div class="user-info">
                        <div class="username">${player.username}</div>
                        <div class="games-played">${player.gamesPlayed} ${player.gamesPlayed === 1 ? 'game' : 'games'}</div>
                    </div>
                    <div class="score">${player.highestScore}</div>
                    <button class="watch-replay-btn" data-index="${index}">Watch Best</button>
                </div>
                <div class="score-list-container hidden">
                    ${scoreListHtml}
                </div>
            </div>
        `
    }).join('');
}