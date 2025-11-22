const express = require('express');
const cors = require('cors');
const path = require('path');
const leaderboardRoutes = require('./routes/leaderboard');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

initDatabase();

app.use('/api/leaderboard', leaderboardRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Game available at http://localhost:${PORT}`);
});
