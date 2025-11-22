const API_URL = 'http://localhost:3000/api';

async function fetchLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard?limit=10`);
        if (!response.ok) throw new Error('Failed to fetch leaderboard');

        const scores = await response.json();
        displayLeaderboard(scores);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        document.getElementById('leaderboard').innerHTML = '<div class="loading">Failed to load leaderboard</div>';
    }
}

function displayLeaderboard(scores) {
    const leaderboardDiv = document.getElementById('leaderboard');

    if (scores.length === 0) {
        leaderboardDiv.innerHTML = '<div class="loading">No scores yet. Be the first!</div>';
        return;
    }

    leaderboardDiv.innerHTML = scores.map((score, index) => `
        <div class="leaderboard-entry ${index < 3 ? 'top-3' : ''}">
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${escapeHtml(score.player_name)}</span>
            <span class="leaderboard-score">${score.score}</span>
        </div>
    `).join('');
}

async function submitScore(playerName, score, wavesSurvived) {
    try {
        const response = await fetch(`${API_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerName,
                score,
                wavesSurvived
            })
        });

        if (!response.ok) throw new Error('Failed to submit score');

        const result = await response.json();
        await fetchLeaderboard();
        return result;
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

fetchLeaderboard();
