const room = new WebsimSocket();

export async function submitScore(lastGameData, onSuccess, onError) {
    try {
        const currentUser = await window.websim.getCurrentUser();
        
        const userRecords = await new Promise(resolve => {
            const collection = room.collection('leaderboard_scores_v1').filter({ username: currentUser.username });
            let unsubscribe;

            const timeout = setTimeout(() => {
                if (unsubscribe) unsubscribe();
                resolve(collection.getList());
            }, 2000);

            unsubscribe = collection.subscribe(records => {
                clearTimeout(timeout);
                if (unsubscribe) unsubscribe();
                resolve(records);
            });
        });

        if (userRecords && userRecords.length > 0) {
            const userRecord = userRecords[0];
            const updatedScores = [...(userRecord.scores || []), lastGameData];
            await room.collection('leaderboard_scores_v1').update(userRecord.id, { scores: updatedScores });
        } else {
            await room.collection('leaderboard_scores_v1').create({
                scores: [lastGameData]
            });
        }
        
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error submitting score:", error);
        if (onError) onError(error);
    }
}

export async function fetchLeaderboard() {
    const allRecords = await new Promise(resolve => {
        const collection = room.collection('leaderboard_scores_v1');
        let unsubscribe;
        
        const timeout = setTimeout(() => {
            if (unsubscribe) unsubscribe();
            resolve(collection.getList());
        }, 2500);

        unsubscribe = collection.subscribe(records => {
            clearTimeout(timeout);
            if (unsubscribe) unsubscribe();
            resolve(records);
        });
    });

    if (!allRecords || allRecords.length === 0) {
        return [];
    }

    const rankedPlayers = allRecords.map(record => {
        if (!record.scores || record.scores.length === 0) return null;

        const bestGame = record.scores.reduce((best, current) => {
            return (!best || current.score > best.score) ? current : best;
        }, null);
        
        return {
            username: record.username,
            highestScore: bestGame ? bestGame.score : 0,
            gamesPlayed: record.scores.length,
            bestGameData: bestGame,
            allScores: record.scores.sort((a,b) => b.score - a.score),
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