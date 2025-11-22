const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'leaderboard.json');

function readDatabase() {
    try {
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading database:', error);
    }
    return { scores: [], nextId: 1 };
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing database:', error);
    }
}

function initDatabase() {
    if (!fs.existsSync(dbPath)) {
        writeDatabase({ scores: [], nextId: 1 });
    }
    console.log('Database initialized successfully');
}

function addScore(playerName, score, wavesSurvived) {
    const db = readDatabase();
    const newScore = {
        id: db.nextId,
        player_name: playerName,
        score: score,
        waves_survived: wavesSurvived,
        created_at: new Date().toISOString()
    };

    db.scores.push(newScore);
    db.nextId++;
    writeDatabase(db);

    return newScore.id;
}

function getTopScores(limit = 10) {
    const db = readDatabase();
    return db.scores
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.waves_survived - a.waves_survived;
        })
        .slice(0, limit);
}

function getPlayerRank(scoreId) {
    const db = readDatabase();
    const score = db.scores.find(s => s.id === scoreId);
    if (!score) return { rank: 0 };

    const rank = db.scores.filter(s =>
        s.score > score.score || (s.score === score.score && s.id < score.id)
    ).length + 1;

    return { rank };
}

module.exports = {
    initDatabase,
    addScore,
    getTopScores,
    getPlayerRank
};
