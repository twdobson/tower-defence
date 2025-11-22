const express = require('express');
const router = express.Router();
const { addScore, getTopScores, getPlayerRank } = require('../database');

router.get('/', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const scores = getTopScores(limit);
        res.json(scores);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

router.post('/', (req, res) => {
    try {
        const { playerName, score, wavesSurvived } = req.body;

        if (!playerName || score === undefined || wavesSurvived === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (playerName.length > 20 || playerName.length < 1) {
            return res.status(400).json({ error: 'Player name must be 1-20 characters' });
        }

        const scoreId = addScore(playerName, score, wavesSurvived);
        const rankInfo = getPlayerRank(scoreId);

        res.json({
            id: scoreId,
            rank: rankInfo.rank,
            message: 'Score submitted successfully'
        });
    } catch (error) {
        console.error('Error adding score:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

module.exports = router;
