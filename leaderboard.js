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
            if (!best) return current;
            if (current.score > best.score) return current;
            if (current.score === best.score && current.level > best.level) return current;
            return best;
        }, null);
        
        return {
            username: playerData.username,
            highestScore: bestGame ? bestGame.score : 0,
            bestLevel: bestGame ? bestGame.level : 0,
            gamesPlayed: playerData.allScores.length,
            bestGameData: bestGame,
            allScores: playerData.allScores.sort((a,b) => {
                if (b.score !== a.score) return b.score - a.score;
                return b.level - a.level;
            }),
        };
    }).filter(p => p && p.bestGameData)
      .sort((a, b) => {
          if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
          return b.bestLevel - a.bestLevel;
      });
    
    return rankedPlayers;
}

export function renderLeaderboardList(rankedPlayers, currentPage = 1, itemsPerPage = 10) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const playersOnPage = rankedPlayers.slice(startIndex, endIndex);

    return playersOnPage.map((player, index) => {
        const overallIndex = startIndex + index;
        const scoreListHtml = player.allScores.map((game, scoreIndex) => `
            <div class="score-entry">
                <div class="score-details">
                    <span class="score-entry-score">Score: ${game.score}</span>
                    <span class="score-entry-level">Level: ${game.level || 1}</span>
                    <small class="score-entry-date">${new Date(game.timestamp).toLocaleDateString()}</small>
                </div>
                <button class="watch-replay-btn" data-index="${overallIndex}" data-score-index="${scoreIndex}">Watch</button>
            </div>
        `).join('');

        return `
            <div class="leaderboard-entry-wrapper">
                <div class="leaderboard-entry" data-index="${overallIndex}">
                    <div class="rank">${overallIndex + 1}</div>
                    <img class="avatar" src="https://images.websim.com/avatar/${player.username}" alt="${player.username}'s avatar">
                    <div class="user-info">
                        <div class="username">${player.username}</div>
                        <div class="games-played">${player.gamesPlayed} ${player.gamesPlayed === 1 ? 'game' : 'games'}</div>
                    </div>
                    <div class="score">
                        <div class="score-value">S: ${player.highestScore}</div>
                        <div class="level-value">L: ${player.bestLevel}</div>
                    </div>
                    <button class="watch-replay-btn" data-index="${overallIndex}">Watch Best</button>
                </div>
                <div class="score-list-container hidden">
                    ${scoreListHtml}
                </div>
            </div>
        `
    }).join('');
}

export function renderLeaderboardPagination(totalPages, currentPage) {
    if (totalPages <= 1) return '';

    return `
        <button id="first-page-btn" ${currentPage === 1 ? 'disabled' : ''} aria-label="First page">&lt;&lt;</button>
        <button id="prev-page-btn" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">&lt;</button>
        <div class="page-info">
            Page 
            <input type="number" id="page-input" value="${currentPage}" min="1" max="${totalPages}"> 
            of ${totalPages}
        </div>
        <button id="next-page-btn" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">&gt;</button>
        <button id="last-page-btn" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Last page">&gt;&gt;</button>
    `;
}