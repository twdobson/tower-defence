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
    gameStarted: false,
    // Active abilities system
    abilities: {
        airstrike: {
            name: 'Air Strike',
            cost: 100,
            cooldown: 0,
            maxCooldown: 600,  // 10 seconds at 60 FPS
            damage: 100,
            radius: 80
        },
        timeslow: {
            name: 'Time Slow',
            cost: 80,
            cooldown: 0,
            maxCooldown: 900,  // 15 seconds
            duration: 300,  // 5 seconds
            slowAmount: 0.5,
            active: false,
            timer: 0
        },
        towerboost: {
            name: 'Tower Boost',
            cost: 60,
            cooldown: 0,
            maxCooldown: 720,  // 12 seconds
            duration: 360,  // 6 seconds
            boostAmount: 2.0,  // 2x damage
            active: false,
            timer: 0
        }
    },
    particles: []
};

// Particle class for enhanced visual effects
class Particle {
    constructor(x, y, type = 'spark') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 60;
        this.maxLife = 60;
        this.alpha = 1;

        switch(type) {
            case 'spark':
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = (Math.random() - 0.5) * 4;
                this.size = Math.random() * 3 + 1;
                this.color = ['#ffff00', '#ff8800', '#ff0000'][Math.floor(Math.random() * 3)];
                this.gravity = 0.1;
                break;
            case 'smoke':
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = -Math.random() * 1.5 - 0.5;
                this.size = Math.random() * 8 + 4;
                this.color = '#888888';
                this.gravity = -0.02;
                this.life = 40;
                this.maxLife = 40;
                break;
            case 'energy':
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = (Math.random() - 0.5) * 3;
                this.size = Math.random() * 4 + 2;
                this.color = '#00ffff';
                this.gravity = 0;
                break;
            case 'blood':
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = (Math.random() - 0.5) * 3 - 1;
                this.size = Math.random() * 3 + 1;
                this.color = '#ff0000';
                this.gravity = 0.15;
                break;
            case 'magic':
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.size = Math.random() * 3 + 2;
                this.color = ['#ff00ff', '#00ffff', '#ffff00'][Math.floor(Math.random() * 3)];
                this.gravity = -0.05;
                this.spin = Math.random() * 0.2;
                this.angle = 0;
                break;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        this.alpha = this.life / this.maxLife;

        if (this.type === 'smoke') {
            this.size += 0.2;
            this.vx *= 0.98;
            this.vy *= 0.98;
        } else if (this.type === 'magic') {
            this.angle += this.spin;
        } else {
            this.vx *= 0.98;
        }

        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.type === 'smoke') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'magic') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Helper function to create particle bursts
function createParticleBurst(x, y, count, type) {
    for (let i = 0; i < count; i++) {
        gameState.particles.push(new Particle(x, y, type));
    }
}

// Make createParticleBurst available globally for projectiles
window.createParticleBurst = createParticleBurst;
window.gameState = gameState;

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

    // New enemy types
    let swarmCount = wave >= 2 ? Math.floor(wave * 2) : 0;  // Lots of swarm enemies
    let teleporterCount = wave >= 7 ? Math.floor(wave / 8) : 0;
    let splitterCount = wave >= 5 ? Math.floor(wave / 6) : 0;
    let spawnerCount = wave >= 8 ? Math.floor(wave / 10) : 0;
    let resistantCount = wave >= 10 ? Math.floor(wave / 12) : 0;

    gameState.enemiesToSpawn = basicCount + fastCount + tankCount + healerCount + flyingCount +
                                armoredCount + shieldedCount + bossCount + swarmCount +
                                teleporterCount + splitterCount + spawnerCount + resistantCount;
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
    for (let i = 0; i < swarmCount; i++) {
        gameState.spawnQueue.push('swarm');
    }
    for (let i = 0; i < teleporterCount; i++) {
        gameState.spawnQueue.push('teleporter');
    }
    for (let i = 0; i < splitterCount; i++) {
        gameState.spawnQueue.push('splitter');
    }
    for (let i = 0; i < spawnerCount; i++) {
        gameState.spawnQueue.push('spawner');
    }
    for (let i = 0; i < resistantCount; i++) {
        gameState.spawnQueue.push('resistant');
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

    // Apply time slow if active
    const timeslow = gameState.abilities.timeslow;
    if (timeslow.active) {
        enemy.originalSpeed = enemy.speed;
        enemy.speed *= timeslow.slowAmount;
        enemy.timeSlowed = true;
    }

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
    // Update particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        if (!gameState.particles[i].update()) {
            gameState.particles.splice(i, 1);
        }
    }

    // Update ability cooldowns
    for (const abilityKey in gameState.abilities) {
        const ability = gameState.abilities[abilityKey];
        if (ability.cooldown > 0) {
            ability.cooldown--;
        }
    }

    // Update Time Slow ability
    const timeslow = gameState.abilities.timeslow;
    if (timeslow.active) {
        timeslow.timer--;
        if (timeslow.timer <= 0) {
            timeslow.active = false;
            // Restore enemy speeds
            for (const enemy of gameState.enemies) {
                if (enemy.timeSlowed) {
                    enemy.speed = enemy.originalSpeed || enemy.speed / timeslow.slowAmount;
                    enemy.timeSlowed = false;
                }
            }
        }
    }

    // Update Tower Boost ability
    const towerboost = gameState.abilities.towerboost;
    if (towerboost.active) {
        towerboost.timer--;
        if (towerboost.timer <= 0) {
            towerboost.active = false;
            // Restore tower damage
            for (const tower of gameState.towers) {
                if (tower.boosted) {
                    tower.damage = tower.originalDamage || tower.damage / towerboost.boostAmount;
                    tower.boosted = false;
                }
            }
        }
    }

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

            // Create death particles based on enemy type
            if (enemy.flying) {
                createParticleBurst(enemy.x, enemy.y, 10, 'energy');
            } else if (enemy.type === 'boss') {
                createParticleBurst(enemy.x, enemy.y, 30, 'spark');
                createParticleBurst(enemy.x, enemy.y, 15, 'smoke');
            } else if (enemy.type === 'splitter') {
                createParticleBurst(enemy.x, enemy.y, 15, 'magic');
            } else if (enemy.type === 'spawner') {
                createParticleBurst(enemy.x, enemy.y, 12, 'magic');
            } else {
                createParticleBurst(enemy.x, enemy.y, 8, 'blood');
            }

            // Handle splitter enemy splitting
            if (enemy.shouldSplit) {
                const difficultyMod = difficultySettings[gameState.difficulty].enemyHealthMultiplier;
                for (let j = 0; j < 2; j++) {
                    const splitEnemy = new Enemy(gamePath, 'splitter', gameState.wave, difficultyMod * 0.5);
                    splitEnemy.pathIndex = enemy.pathIndex;
                    splitEnemy.x = enemy.x + (Math.random() * 30 - 15);
                    splitEnemy.y = enemy.y + (Math.random() * 30 - 15);
                    splitEnemy.splitGeneration = enemy.splitGeneration + 1;
                    gameState.enemies.push(splitEnemy);
                }
            }

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

                // Create hit particles based on projectile type
                if (projectile.splashRadius > 0) {
                    createParticleBurst(result.x, result.y, 12, 'spark');
                    createParticleBurst(result.x, result.y, 6, 'smoke');
                } else if (projectile.special === 'poison') {
                    createParticleBurst(result.x, result.y, 8, 'magic');
                } else if (projectile.special === 'electric') {
                    createParticleBurst(result.x, result.y, 10, 'energy');
                } else if (projectile.special === 'freeze') {
                    createParticleBurst(result.x, result.y, 8, 'energy');
                } else {
                    createParticleBurst(result.x, result.y, 5, 'spark');
                }

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

    // Draw particles
    for (const particle of gameState.particles) {
        particle.draw(ctx);
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
    updateAbilityUI();
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

    // Reset abilities
    for (const abilityKey in gameState.abilities) {
        const ability = gameState.abilities[abilityKey];
        ability.cooldown = 0;
        if (ability.active !== undefined) {
            ability.active = false;
            ability.timer = 0;
        }
    }

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

    // Handle airstrike targeting
    if (airstrikeTargeting) {
        if (activateAirStrike(x, y)) {
            airstrikeTargeting = false;
            canvas.style.cursor = 'default';
            updateAbilityUI();
        }
        return;
    }

    const gridX = Math.floor(x / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const gridY = Math.floor(y / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;

    if (gameState.selectedTowerType) {
        const tower = new Tower(0, 0, gameState.selectedTowerType);

        if (gameState.money >= tower.cost && !isOnPath(gridX, gridY) && !isTooCloseToTower(gridX, gridY)) {
            const newTower = new Tower(gridX, gridY, gameState.selectedTowerType);

            // Apply tower boost if active
            const towerboost = gameState.abilities.towerboost;
            if (towerboost.active) {
                newTower.originalDamage = newTower.damage;
                newTower.damage *= towerboost.boostAmount;
                newTower.boosted = true;
            }

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

    // Get upgrade path info if selected
    let upgradePathInfo = '';
    if (tower.upgradePath) {
        const paths = tower.getUpgradePaths();
        const selectedPath = paths.find(p => p.id === tower.upgradePath);
        if (selectedPath) {
            upgradePathInfo = `
                <div class="tower-upgrade-path-info">
                    <strong>Path:</strong> ${selectedPath.name}<br>
                    <span style="font-size: 0.9em;">${selectedPath.description}</span>
                </div>
            `;
        }
    }

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
        ${upgradePathInfo}
    `;

    const upgradeBtn = document.getElementById('upgradeTowerBtn');
    const sellBtn = document.getElementById('sellTowerBtn');

    // Change button text if tower is level 2 and hasn't chosen a path
    if (tower.level === 2 && !tower.upgradePath) {
        upgradeBtn.textContent = `Upgrade & Choose Path ($${upgradeCost})`;
    } else {
        upgradeBtn.textContent = `Upgrade ($${upgradeCost})`;
    }
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
            // Check if tower is level 2 and hasn't chosen a path yet
            if (gameState.selectedTower.level === 2 && !gameState.selectedTower.upgradePath) {
                // Show upgrade path selection modal
                showUpgradePathModal(gameState.selectedTower, upgradeCost);
            } else {
                // Normal upgrade
                gameState.money -= upgradeCost;
                gameState.selectedTower.upgrade();
                gameState.selectedTower.sellValue = Math.floor(gameState.selectedTower.sellValue * 1.5);
                showTowerInfo(gameState.selectedTower);
                updateUI();
            }
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

// Active Ability Functions
function activateAirStrike(x, y) {
    const ability = gameState.abilities.airstrike;

    if (ability.cooldown > 0 || gameState.money < ability.cost) {
        return false;
    }

    // Deduct cost and start cooldown
    gameState.money -= ability.cost;
    ability.cooldown = ability.maxCooldown;

    // Deal damage to all enemies in radius
    for (const enemy of gameState.enemies) {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= ability.radius) {
            enemy.takeDamage(ability.damage, 'splash');
        }
    }

    // Create large explosion effect
    gameState.explosions.push({
        x: x,
        y: y,
        radius: 20,
        life: 40,
        opacity: 1,
        color: '#ff4500'
    });

    // Create dramatic explosion particles
    createParticleBurst(x, y, 30, 'spark');
    createParticleBurst(x, y, 15, 'smoke');
    createParticleBurst(x, y, 10, 'energy');

    updateUI();
    return true;
}

function activateTimeSlow() {
    const ability = gameState.abilities.timeslow;

    if (ability.cooldown > 0 || gameState.money < ability.cost || ability.active) {
        return false;
    }

    // Deduct cost and start cooldown
    gameState.money -= ability.cost;
    ability.cooldown = ability.maxCooldown;
    ability.active = true;
    ability.timer = ability.duration;

    // Slow all enemies
    for (const enemy of gameState.enemies) {
        if (!enemy.originalSpeed) {
            enemy.originalSpeed = enemy.speed;
        }
        enemy.speed *= ability.slowAmount;
        enemy.timeSlowed = true;
    }

    updateUI();
    return true;
}

function activateTowerBoost() {
    const ability = gameState.abilities.towerboost;

    if (ability.cooldown > 0 || gameState.money < ability.cost || ability.active) {
        return false;
    }

    // Deduct cost and start cooldown
    gameState.money -= ability.cost;
    ability.cooldown = ability.maxCooldown;
    ability.active = true;
    ability.timer = ability.duration;

    // Boost all towers
    for (const tower of gameState.towers) {
        if (!tower.originalDamage) {
            tower.originalDamage = tower.damage;
        }
        tower.damage *= ability.boostAmount;
        tower.boosted = true;
    }

    updateUI();
    return true;
}

// Ability UI State
let airstrikeTargeting = false;

// Update ability UI
function updateAbilityUI() {
    for (const abilityKey in gameState.abilities) {
        const ability = gameState.abilities[abilityKey];
        const btn = document.getElementById(`${abilityKey}Btn`);
        if (!btn) continue;

        const cooldownDiv = btn.querySelector('.ability-cooldown');
        const cooldownBar = btn.querySelector('.cooldown-bar');
        const cooldownText = btn.querySelector('.cooldown-text');

        // Check if ability can be used
        const canUse = ability.cooldown === 0 && gameState.money >= ability.cost && !gameState.gameOver;
        btn.disabled = !canUse;

        // Show cooldown if on cooldown
        if (ability.cooldown > 0) {
            cooldownDiv.style.display = 'block';
            const percentage = (ability.cooldown / ability.maxCooldown) * 100;
            cooldownBar.style.width = percentage + '%';
            cooldownText.textContent = Math.ceil(ability.cooldown / 60) + 's';
        } else {
            cooldownDiv.style.display = 'none';
        }

        // Show active state for timed abilities
        if (ability.active) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    // Handle airstrike targeting mode
    const airstrikeBtn = document.getElementById('airstrikeBtn');
    if (airstrikeTargeting) {
        airstrikeBtn.classList.add('targeting');
    } else {
        airstrikeBtn.classList.remove('targeting');
    }
}

// Setup ability button handlers
document.getElementById('airstrikeBtn').addEventListener('click', () => {
    const ability = gameState.abilities.airstrike;
    if (ability.cooldown === 0 && gameState.money >= ability.cost && !airstrikeTargeting) {
        airstrikeTargeting = true;
        canvas.style.cursor = 'crosshair';
        updateAbilityUI();
    }
});

document.getElementById('timeslowBtn').addEventListener('click', () => {
    if (activateTimeSlow()) {
        updateAbilityUI();
    }
});

document.getElementById('towerboostBtn').addEventListener('click', () => {
    if (activateTowerBoost()) {
        updateAbilityUI();
    }
});

// Upgrade Path Modal Functions
let selectedUpgradePath = null;
let pendingTowerUpgrade = null;
let pendingUpgradeCost = 0;

function showUpgradePathModal(tower, upgradeCost) {
    const modal = document.getElementById('upgradePathModal');
    const optionsContainer = document.getElementById('upgradePathOptions');

    pendingTowerUpgrade = tower;
    pendingUpgradeCost = upgradeCost;
    selectedUpgradePath = null;

    // Get upgrade paths for this tower type
    const paths = tower.getUpgradePaths();

    // Clear existing options
    optionsContainer.innerHTML = '';

    // Create cards for each path
    paths.forEach(path => {
        const card = document.createElement('div');
        card.className = 'upgrade-path-card';
        card.dataset.pathId = path.id;
        card.innerHTML = `
            <h3>${path.name}</h3>
            <div class="path-description">
                <p>${path.description}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            // Remove selection from all cards
            document.querySelectorAll('.upgrade-path-card').forEach(c => {
                c.classList.remove('selected');
            });

            // Select this card
            card.classList.add('selected');
            selectedUpgradePath = path.id;

            // Enable confirm button
            document.getElementById('confirmUpgradePath').disabled = false;
        });

        optionsContainer.appendChild(card);
    });

    // Reset and show modal
    document.getElementById('confirmUpgradePath').disabled = true;
    modal.style.display = 'flex';
}

document.getElementById('confirmUpgradePath').addEventListener('click', () => {
    if (selectedUpgradePath && pendingTowerUpgrade) {
        // Apply the upgrade
        gameState.money -= pendingUpgradeCost;
        pendingTowerUpgrade.upgrade();
        pendingTowerUpgrade.chooseUpgradePath(selectedUpgradePath);
        pendingTowerUpgrade.sellValue = Math.floor(pendingTowerUpgrade.sellValue * 1.5);

        // Close modal
        document.getElementById('upgradePathModal').style.display = 'none';

        // Update UI
        showTowerInfo(pendingTowerUpgrade);
        updateUI();

        // Clear pending data
        selectedUpgradePath = null;
        pendingTowerUpgrade = null;
        pendingUpgradeCost = 0;
    }
});

document.getElementById('cancelUpgradePath').addEventListener('click', () => {
    // Close modal without upgrading
    document.getElementById('upgradePathModal').style.display = 'none';

    // Clear pending data
    selectedUpgradePath = null;
    pendingTowerUpgrade = null;
    pendingUpgradeCost = 0;
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

    // New enemy types
    let swarmCount = nextWave >= 2 ? Math.floor(nextWave * 2) : 0;
    let teleporterCount = nextWave >= 7 ? Math.floor(nextWave / 8) : 0;
    let splitterCount = nextWave >= 5 ? Math.floor(nextWave / 6) : 0;
    let spawnerCount = nextWave >= 8 ? Math.floor(nextWave / 10) : 0;
    let resistantCount = nextWave >= 10 ? Math.floor(nextWave / 12) : 0;

    let preview = '';
    if (basicCount > 0) preview += `<div class="enemy-preview"><span style="color:#ff4444">● Basic</span><span>${basicCount}</span></div>`;
    if (fastCount > 0) preview += `<div class="enemy-preview"><span style="color:#44ff44">● Fast</span><span>${fastCount}</span></div>`;
    if (tankCount > 0) preview += `<div class="enemy-preview"><span style="color:#4444ff">● Tank</span><span>${tankCount}</span></div>`;
    if (healerCount > 0) preview += `<div class="enemy-preview"><span style="color:#00ffff">● Healer</span><span>${healerCount}</span></div>`;
    if (flyingCount > 0) preview += `<div class="enemy-preview"><span style="color:#ffaa00">● Flying</span><span>${flyingCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Immune: ground towers</div></div>`;
    if (armoredCount > 0) preview += `<div class="enemy-preview"><span style="color:#888888">● Armored</span><span>${armoredCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Weak: pierce/splash</div></div>`;
    if (shieldedCount > 0) preview += `<div class="enemy-preview"><span style="color:#aaaaff">● Shielded</span><span>${shieldedCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Weak: poison</div></div>`;
    if (swarmCount > 0) preview += `<div class="enemy-preview"><span style="color:#ff69b4">● Swarm</span><span>${swarmCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Weak: splash</div></div>`;
    if (teleporterCount > 0) preview += `<div class="enemy-preview"><span style="color:#00ffff">● Teleporter</span><span>${teleporterCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Jumps forward!</div></div>`;
    if (splitterCount > 0) preview += `<div class="enemy-preview"><span style="color:#9370db">● Splitter</span><span>${splitterCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Splits on death</div></div>`;
    if (spawnerCount > 0) preview += `<div class="enemy-preview"><span style="color:#ff1493">● Spawner</span><span>${spawnerCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Spawns swarms</div></div>`;
    if (resistantCount > 0) preview += `<div class="enemy-preview"><span style="color:#696969">● Resistant</span><span>${resistantCount}</span><div style="font-size:10px;color:#888;margin-top:2px">Resists all damage</div></div>`;
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
