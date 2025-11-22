const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Original canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
let canvasScale = 1;

const GRID_SIZE = 40;
const COLS = CANVAS_WIDTH / GRID_SIZE;
const ROWS = CANVAS_HEIGHT / GRID_SIZE;

// Responsive canvas sizing
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const maxWidth = Math.min(containerWidth, CANVAS_WIDTH);

    if (window.innerWidth <= 1024) {
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (maxWidth * CANVAS_HEIGHT / CANVAS_WIDTH) + 'px';
        canvasScale = maxWidth / CANVAS_WIDTH;
    } else {
        canvas.style.width = CANVAS_WIDTH + 'px';
        canvas.style.height = CANVAS_HEIGHT + 'px';
        canvasScale = 1;
    }
}

// Helper function to get canvas coordinates from mouse/touch event
function getCanvasCoordinates(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / canvasScale;
    const y = (clientY - rect.top) / canvasScale;
    return { x, y };
}

// Initialize canvas size
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const gamePath = [
    { x: 0, y: 200 },
    { x: 200, y: 200 },
    { x: 200, y: 400 },
    { x: 400, y: 400 },
    { x: 400, y: 100 },
    { x: 600, y: 100 },
    { x: 600, y: 500 },
    { x: 800, y: 500 }
];

const difficultySettings = {
    easy: {
        health: 50,  // Reduced from 150
        money: 300,  // Reduced from 750 - forces strategic choices
        enemyHealthMultiplier: 0.8,  // Slightly harder
        rewardMultiplier: 1.2  // Reduced from 1.3
    },
    normal: {
        health: 30,  // Reduced from 100 - much harder!
        money: 200,  // Reduced from 500 - very limited starting resources
        enemyHealthMultiplier: 1.0,
        rewardMultiplier: 0.9  // Less reward
    },
    hard: {
        health: 20,  // Reduced from 75 - brutal!
        money: 150,  // Reduced from 350 - extreme resource management required
        enemyHealthMultiplier: 1.3,  // Harder enemies
        rewardMultiplier: 0.7  // Much less reward
    }
};

const gameState = {
    health: 100,
    money: 500,
    wave: 0,
    score: 0,
    gameOver: false,
    paused: false,
    enemies: [],
    towers: [],
    projectiles: [],
    selectedTowerType: null,
    selectedTower: null,
    waveInProgress: false,
    enemiesSpawned: 0,
    enemiesToSpawn: 0,
    spawnTimer: 0,
    gameSpeed: 1,
    explosions: [],
    damageNumbers: [],
    difficulty: 'normal',
    waveCountdown: 0,
    waveCountdownActive: false,
    gameStarted: false
};

function updateUI() {
    document.getElementById('health').textContent = gameState.health;
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('wave').textContent = gameState.wave;
    document.getElementById('score').textContent = gameState.score;
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawPath() {
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(gamePath[0].x, gamePath[0].y);

    for (let i = 1; i < gamePath.length; i++) {
        ctx.lineTo(gamePath[i].x, gamePath[i].y);
    }

    ctx.stroke();

    ctx.fillStyle = '#ff0000';
    const endPoint = gamePath[gamePath.length - 1];
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, 20, 0, Math.PI * 2);
    ctx.fill();
}

function isOnPath(x, y, buffer = 35) {
    for (let i = 0; i < gamePath.length - 1; i++) {
        const p1 = gamePath[i];
        const p2 = gamePath[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const dot = ((x - p1.x) * dx + (y - p1.y) * dy) / (length * length);

        if (dot >= 0 && dot <= 1) {
            const closestX = p1.x + dot * dx;
            const closestY = p1.y + dot * dy;
            const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

            if (distance < buffer) {
                return true;
            }
        }
    }

    return false;
}

function isTooCloseToTower(x, y, minDistance = 40) {
    for (const tower of gameState.towers) {
        const dx = tower.x - x;
        const dy = tower.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            return true;
        }
    }

    return false;
}

function spawnWave() {
    if (gameState.waveInProgress) return;

    gameState.wave++;
    gameState.waveInProgress = true;
    gameState.enemiesSpawned = 0;

    const wave = gameState.wave;
    let basicCount = Math.floor(5 + wave * 1.5);
    let fastCount = Math.floor(wave / 2);
    let tankCount = Math.floor(wave / 4);
    let healerCount = wave >= 3 ? Math.floor(wave / 5) : 0;
    let flyingCount = wave >= 5 ? Math.floor(wave / 6) : 0;
    let armoredCount = wave >= 4 ? Math.floor(wave / 5) : 0;
    let shieldedCount = wave >= 6 ? Math.floor(wave / 7) : 0;
    let bossCount = wave % 10 === 0 ? 1 : 0;

    gameState.enemiesToSpawn = basicCount + fastCount + tankCount + healerCount + flyingCount + armoredCount + shieldedCount + bossCount;
    gameState.spawnQueue = [];

    for (let i = 0; i < basicCount; i++) {
        gameState.spawnQueue.push('basic');
    }
    for (let i = 0; i < fastCount; i++) {
        gameState.spawnQueue.push('fast');
    }
    for (let i = 0; i < tankCount; i++) {
        gameState.spawnQueue.push('tank');
    }
    for (let i = 0; i < healerCount; i++) {
        gameState.spawnQueue.push('healer');
    }
    for (let i = 0; i < flyingCount; i++) {
        gameState.spawnQueue.push('flying');
    }
    for (let i = 0; i < armoredCount; i++) {
        gameState.spawnQueue.push('armored');
    }
    for (let i = 0; i < shieldedCount; i++) {
        gameState.spawnQueue.push('shielded');
    }
    for (let i = 0; i < bossCount; i++) {
        gameState.spawnQueue.push('boss');
    }

    gameState.spawnTimer = 0;

    updateUI();
    updateWavePreview();
    document.getElementById('waveCountdown').style.display = 'none';
    document.getElementById('wavePreview').style.display = 'none';
}

function startWaveCountdown() {
    gameState.waveCountdown = 600;
    gameState.waveCountdownActive = true;
    document.getElementById('waveCountdown').style.display = 'block';
    updateWavePreview();
    document.getElementById('wavePreview').style.display = 'block';
}

function updateCountdownDisplay() {
    const seconds = Math.ceil(gameState.waveCountdown / 60);
    document.getElementById('countdownTimer').textContent = seconds;
}

function spawnEnemy() {
    if (gameState.spawnQueue.length === 0) return;

    const enemyType = gameState.spawnQueue.shift();
    const difficultyMod = difficultySettings[gameState.difficulty].enemyHealthMultiplier;
    const enemy = new Enemy(gamePath, enemyType, gameState.wave, difficultyMod);
    gameState.enemies.push(enemy);
    gameState.enemiesSpawned++;
}

function updateGame() {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;

    for (let speed = 0; speed < gameState.gameSpeed; speed++) {
        updateGameLogic();
    }
}

function updateGameLogic() {
    for (let i = gameState.explosions.length - 1; i >= 0; i--) {
        const explosion = gameState.explosions[i];
        explosion.life--;
        explosion.radius += 2;
        explosion.opacity -= 0.05;
        if (explosion.life <= 0) {
            gameState.explosions.splice(i, 1);
        }
    }

    for (let i = gameState.damageNumbers.length - 1; i >= 0; i--) {
        const dmgNum = gameState.damageNumbers[i];
        dmgNum.life--;
        dmgNum.y -= 1;  // Float upward
        dmgNum.opacity = dmgNum.life / 30;  // Fade out
        if (dmgNum.life <= 0) {
            gameState.damageNumbers.splice(i, 1);
        }
    }

    if (gameState.waveInProgress && gameState.spawnQueue.length > 0) {
        gameState.spawnTimer++;
        if (gameState.spawnTimer >= 40) {
            spawnEnemy();
            gameState.spawnTimer = 0;
        }
    }

    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        const status = enemy.update(gameState.enemies);

        if (status === 'reached_end') {
            gameState.health -= enemy.damage;
            gameState.enemies.splice(i, 1);

            if (gameState.health <= 0) {
                gameOver();
            }
        } else if (!enemy.alive) {
            const rewardMod = difficultySettings[gameState.difficulty].rewardMultiplier;
            gameState.money += Math.floor(enemy.reward * rewardMod);
            gameState.score += Math.floor(enemy.reward * gameState.wave * rewardMod);
            gameState.enemies.splice(i, 1);
        }
    }

    for (const tower of gameState.towers) {
        const projectile = tower.update(gameState.enemies);
        if (projectile) {
            gameState.projectiles.push(projectile);
        }
    }

    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const projectile = gameState.projectiles[i];
        const result = projectile.update(gameState.enemies);

        if (result.hit) {
            if (projectile.target) {
                const actualDamage = projectile.damage * (projectile.target.resistances[projectile.damageType] || 1);
                const killed = projectile.target.takeDamage(projectile.damage, projectile.damageType);

                // Track tower stats
                if (projectile.tower) {
                    projectile.tower.totalDamageDealt += actualDamage;
                    if (killed) {
                        projectile.tower.kills++;
                    }
                }

                // Add damage number
                gameState.damageNumbers.push({
                    x: result.x,
                    y: result.y,
                    damage: Math.floor(actualDamage),
                    life: 30,
                    opacity: 1
                });

                gameState.explosions.push({
                    x: result.x,
                    y: result.y,
                    radius: projectile.splashRadius > 0 ? 10 : 5,
                    life: 20,
                    opacity: 1,
                    color: projectile.color
                });

                if (projectile.splashRadius > 0) {
                    for (const enemy of gameState.enemies) {
                        if (enemy !== projectile.target && enemy.alive) {
                            const dx = enemy.x - result.x;
                            const dy = enemy.y - result.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance <= projectile.splashRadius) {
                                const splashDamage = projectile.damage * 0.5;
                                const splashActualDamage = splashDamage * (enemy.resistances[projectile.damageType] || 1);
                                const splashKilled = enemy.takeDamage(splashDamage, projectile.damageType);

                                // Track splash damage stats
                                if (projectile.tower) {
                                    projectile.tower.totalDamageDealt += splashActualDamage;
                                    if (splashKilled) {
                                        projectile.tower.kills++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            gameState.projectiles.splice(i, 1);
        } else if (!projectile.alive) {
            gameState.projectiles.splice(i, 1);
        }
    }

    if (gameState.waveInProgress &&
        gameState.spawnQueue.length === 0 &&
        gameState.enemies.length === 0) {
        gameState.waveInProgress = false;
        gameState.money += 100 + gameState.wave * 20;
        gameState.score += 100 * gameState.wave;
        startWaveCountdown();
    }

    if (gameState.waveCountdownActive && !gameState.paused) {
        gameState.waveCountdown--;
        updateCountdownDisplay();

        if (gameState.waveCountdown <= 0) {
            gameState.waveCountdownActive = false;
            spawnWave();
        }
    }

    updateUI();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawPath();

    for (const explosion of gameState.explosions) {
        ctx.fillStyle = explosion.color.replace(')', `, ${explosion.opacity})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const dmgNum of gameState.damageNumbers) {
        ctx.save();
        ctx.globalAlpha = dmgNum.opacity;
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeText(dmgNum.damage.toString(), dmgNum.x, dmgNum.y);
        ctx.fillText(dmgNum.damage.toString(), dmgNum.x, dmgNum.y);
        ctx.restore();
    }

    for (const enemy of gameState.enemies) {
        enemy.draw(ctx);
    }

    for (const projectile of gameState.projectiles) {
        projectile.draw(ctx);
    }

    for (const tower of gameState.towers) {
        const isSelected = tower === gameState.selectedTower;
        tower.draw(ctx, isSelected);
    }

    if (gameState.selectedTowerType && gameState.previewPosition) {
        const pos = gameState.previewPosition;
        const canPlace = !isOnPath(pos.x, pos.y) && !isTooCloseToTower(pos.x, pos.y);
        const tempTower = new Tower(0, 0, gameState.selectedTowerType);

        ctx.fillStyle = canPlace ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(pos.x - 15, pos.y - 15, 30, 30);

        ctx.strokeStyle = canPlace ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 15, pos.y - 15, 30, 30);

        ctx.strokeStyle = canPlace ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, tempTower.range, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (!gameState.gameStarted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT DIFFICULTY TO BEGIN', canvas.width / 2, canvas.height / 2);
    } else if (gameState.paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    updateGame();
    render();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState.gameOver = true;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalWave').textContent = gameState.wave;
    document.getElementById('gameOverModal').style.display = 'flex';
}

function resetGame() {
    const settings = difficultySettings[gameState.difficulty];
    gameState.health = settings.health;
    gameState.money = settings.money;
    gameState.wave = 0;
    gameState.score = 0;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.enemies = [];
    gameState.towers = [];
    gameState.projectiles = [];
    gameState.selectedTowerType = null;
    gameState.selectedTower = null;
    gameState.waveInProgress = false;
    gameState.enemiesSpawned = 0;
    gameState.enemiesToSpawn = 0;
    gameState.spawnTimer = 0;
    gameState.waveCountdown = 0;
    gameState.waveCountdownActive = false;

    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('towerInfo').style.display = 'none';
    document.getElementById('waveCountdown').style.display = 'none';
    document.getElementById('wavePreview').style.display = 'none';

    updateUI();
    startWaveCountdown();
}

function initGame(difficulty) {
    console.log('Initializing game with difficulty:', difficulty);
    gameState.difficulty = difficulty;
    gameState.gameStarted = true;
    const settings = difficultySettings[difficulty];
    gameState.health = settings.health;
    gameState.money = settings.money;

    document.getElementById('difficultyModal').style.display = 'none';

    updateUI();
    updateWavePreview();
    startWaveCountdown();
    console.log('Game initialized successfully');
}

const towerButtons = document.querySelectorAll('.tower-btn');
towerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const towerType = btn.dataset.type;
        const tower = new Tower(0, 0, towerType);

        if (gameState.money >= tower.cost) {
            gameState.selectedTowerType = towerType;
            gameState.selectedTower = null;

            towerButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            document.getElementById('sellTowerBtn').style.display = 'none';
        }
    });
});

canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    const gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

    gameState.previewPosition = { x: gridX, y: gridY };
});

// Shared function for handling canvas clicks/touches
function handleCanvasInteraction(clientX, clientY) {
    const { x, y } = getCanvasCoordinates(clientX, clientY);

    const gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

    if (gameState.selectedTowerType) {
        const tower = new Tower(0, 0, gameState.selectedTowerType);

        if (gameState.money >= tower.cost && !isOnPath(gridX, gridY) && !isTooCloseToTower(gridX, gridY)) {
            const newTower = new Tower(gridX, gridY, gameState.selectedTowerType);
            gameState.towers.push(newTower);
            gameState.money -= newTower.cost;
            updateUI();

            gameState.selectedTowerType = null;
            towerButtons.forEach(b => b.classList.remove('selected'));
        }
    } else {
        let clickedTower = null;
        for (const tower of gameState.towers) {
            const dx = tower.x - x;
            const dy = tower.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 20) {
                clickedTower = tower;
                break;
            }
        }

        gameState.selectedTower = clickedTower;

        if (clickedTower) {
            showTowerInfo(clickedTower);
        } else {
            document.getElementById('towerInfo').style.display = 'none';
        }
    }
}

canvas.addEventListener('click', (e) => {
    handleCanvasInteraction(e.clientX, e.clientY);
});

// Touch event handlers
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleCanvasInteraction(touch.clientX, touch.clientY);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);

        const gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
        const gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

        gameState.previewPosition = { x: gridX, y: gridY };
    }
}, { passive: false });

function showTowerInfo(tower) {
    const towerInfo = document.getElementById('towerInfo');
    const upgradeCost = tower.getUpgradeCost();

    // Calculate DPS (damage per second)
    const dps = tower.fireRate > 0 ? (tower.damage * 60) / tower.fireRate : 0;

    document.getElementById('towerInfoTitle').textContent = `${tower.type.charAt(0).toUpperCase() + tower.type.slice(1)} Tower (Lvl ${tower.level})`;
    document.getElementById('towerInfoStats').innerHTML = `
        <strong>Stats:</strong><br>
        Damage: ${Math.floor(tower.damage)}<br>
        Range: ${Math.floor(tower.range)}<br>
        DPS: ${dps.toFixed(1)}<br>
        ${tower.special ? 'Special: ' + tower.special + '<br>' : ''}
        <br>
        <strong>Performance:</strong><br>
        Kills: ${tower.kills}<br>
        Total Damage: ${Math.floor(tower.totalDamageDealt)}<br>
        Shots Fired: ${tower.shotsFired}
    `;

    const upgradeBtn = document.getElementById('upgradeTowerBtn');
    const sellBtn = document.getElementById('sellTowerBtn');

    upgradeBtn.textContent = `Upgrade ($${upgradeCost})`;
    upgradeBtn.disabled = gameState.money < upgradeCost || tower.level >= 5;

    sellBtn.textContent = `Sell ($${tower.sellValue})`;

    towerInfo.style.display = 'block';
}

try {
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    console.log('Difficulty buttons found:', difficultyButtons.length);

    difficultyButtons.forEach((btn, index) => {
        console.log(`Setting up button ${index}:`, btn.dataset.difficulty);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const difficulty = btn.dataset.difficulty;
            console.log('Difficulty button clicked:', difficulty);
            initGame(difficulty);
        });
    });
} catch (error) {
    console.error('Error setting up difficulty buttons:', error);
}

document.getElementById('startWaveNowBtn').addEventListener('click', () => {
    if (gameState.waveCountdownActive) {
        gameState.waveCountdown = 0;
    }
});

document.getElementById('sellTowerBtn').addEventListener('click', () => {
    if (gameState.selectedTower) {
        const index = gameState.towers.indexOf(gameState.selectedTower);
        if (index > -1) {
            gameState.money += gameState.selectedTower.sellValue;
            gameState.towers.splice(index, 1);
            gameState.selectedTower = null;
            document.getElementById('towerInfo').style.display = 'none';
            updateUI();
        }
    }
});

document.getElementById('upgradeTowerBtn').addEventListener('click', () => {
    if (gameState.selectedTower) {
        const upgradeCost = gameState.selectedTower.getUpgradeCost();
        if (gameState.money >= upgradeCost) {
            gameState.money -= upgradeCost;
            gameState.selectedTower.upgrade();
            gameState.selectedTower.sellValue = Math.floor(gameState.selectedTower.sellValue * 1.5);
            showTowerInfo(gameState.selectedTower);
            updateUI();
        }
    }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    gameState.paused = !gameState.paused;
    document.getElementById('pauseBtn').textContent = gameState.paused ? '▶ Resume' : '⏸ Pause';
});

document.getElementById('speedBtn').addEventListener('click', () => {
    const speeds = [1, 2, 3];
    const currentIndex = speeds.indexOf(gameState.gameSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    gameState.gameSpeed = speeds[nextIndex];
    document.getElementById('speedBtn').textContent = `Speed: ${gameState.gameSpeed}x`;
});

function updateWavePreview() {
    const nextWave = gameState.wave + 1;
    if (gameState.waveInProgress) {
        document.getElementById('wavePreview').style.display = 'none';
        return;
    }

    let basicCount = Math.floor(5 + nextWave * 1.5);
    let fastCount = Math.floor(nextWave / 2);
    let tankCount = Math.floor(nextWave / 4);
    let healerCount = nextWave >= 3 ? Math.floor(nextWave / 5) : 0;
    let flyingCount = nextWave >= 5 ? Math.floor(nextWave / 6) : 0;
    let armoredCount = nextWave >= 4 ? Math.floor(nextWave / 5) : 0;
    let shieldedCount = nextWave >= 6 ? Math.floor(nextWave / 7) : 0;
    let bossCount = nextWave % 10 === 0 ? 1 : 0;

    let preview = '';
    if (basicCount > 0) preview += `<div class="enemy-preview"><span style="color:#ff4444">● Basic</span><span>${basicCount}</span></div>`;
    if (fastCount > 0) preview += `<div class="enemy-preview"><span style="color:#44ff44">● Fast</span><span>${fastCount}</span></div>`;
    if (tankCount > 0) preview += `<div class="enemy-preview"><span style="color:#4444ff">● Tank</span><span>${tankCount}</span></div>`;
    if (healerCount > 0) preview += `<div class="enemy-preview"><span style="color:#00ffff">● Healer</span><span>${healerCount}</span></div>`;
    if (flyingCount > 0) preview += `<div class="enemy-preview"><span style="color:#ffaa00">● Flying</span><span>${flyingCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Immune: ground towers</div></div>`;
    if (armoredCount > 0) preview += `<div class="enemy-preview"><span style="color:#888888">● Armored</span><span>${armoredCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Weak: pierce/splash</div></div>`;
    if (shieldedCount > 0) preview += `<div class="enemy-preview"><span style="color:#aaaaff">● Shielded</span><span>${shieldedCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Weak: poison</div></div>`;
    if (bossCount > 0) preview += `<div class="enemy-preview"><span style="color:#ff00ff">◆ BOSS</span><span>${bossCount}</span></div>`;

    document.getElementById('wavePreviewContent').innerHTML = preview;
    document.getElementById('wavePreview').style.display = 'block';
}

document.addEventListener('keydown', (e) => {
    if (gameState.gameOver) return;

    const key = e.key.toLowerCase();
    const towerMap = {
        '1': 'basic',
        '2': 'rapid',
        '3': 'sniper',
        '4': 'poison',
        '5': 'splash',
        '6': 'antiair',
        '7': 'freeze',
        '8': 'electric',
        '9': 'laser'
    };

    if (towerMap[key]) {
        const towerType = towerMap[key];
        const tower = new Tower(0, 0, towerType);
        if (gameState.money >= tower.cost) {
            gameState.selectedTowerType = towerType;
            gameState.selectedTower = null;
            towerButtons.forEach(b => b.classList.remove('selected'));
            document.querySelector(`[data-type="${towerType}"]`)?.classList.add('selected');
            document.getElementById('towerInfo').style.display = 'none';
        }
    } else if (key === ' ' || key === 'p') {
        e.preventDefault();
        gameState.paused = !gameState.paused;
        document.getElementById('pauseBtn').textContent = gameState.paused ? '▶ Resume' : '⏸ Pause';
    } else if (key === 'escape' || key === 'esc') {
        gameState.selectedTowerType = null;
        gameState.selectedTower = null;
        towerButtons.forEach(b => b.classList.remove('selected'));
        document.getElementById('towerInfo').style.display = 'none';
    } else if (key === 'enter') {
        if (gameState.waveCountdownActive) {
            gameState.waveCountdown = 0;
        }
    }
});

document.getElementById('submitScore').addEventListener('click', async () => {
    const playerName = document.getElementById('playerName').value.trim();

    if (!playerName) {
        alert('Please enter your name');
        return;
    }

    try {
        document.getElementById('submitScore').disabled = true;
        await submitScore(playerName, gameState.score, gameState.wave);
        alert(`Score submitted! You ranked #${await getPlayerRank()}`);
        document.getElementById('submitScore').style.display = 'none';
    } catch (error) {
        alert('Failed to submit score. Please try again.');
        document.getElementById('submitScore').disabled = false;
    }
});

document.getElementById('playAgain').addEventListener('click', () => {
    resetGame();
});

async function getPlayerRank() {
    try {
        const response = await fetch(`${API_URL}/leaderboard?limit=100`);
        const scores = await response.json();
        return scores.findIndex(s => s.score <= gameState.score) + 1 || scores.length + 1;
    } catch {
        return '?';
    }
}

console.log('Game script loaded');
console.log('Difficulty modal element:', document.getElementById('difficultyModal'));
console.log('Canvas element:', canvas);

updateUI();
gameLoop();
