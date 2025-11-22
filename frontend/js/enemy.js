class Enemy {
    constructor(path, type = 'basic', wave = 1, difficultyMultiplier = 1.0) {
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.type = type;
        this.wave = wave;

        // Harder scaling: 15% per wave instead of 10%
        const scaleMultiplier = (1 + (wave - 1) * 0.15) * difficultyMultiplier;

        // Damage type resistances: 0 = immune, 0.5 = resistant, 1 = normal, 1.5 = weak
        this.resistances = {
            normal: 1,
            rapid: 1,
            splash: 1,
            pierce: 1,
            freeze: 1,
            poison: 1,
            electric: 1
        };

        switch(type) {
            case 'basic':
                this.maxHealth = 50 * scaleMultiplier;  // Increased from 40
                this.speed = 1;
                this.reward = 12;  // Reduced rewards
                this.damage = 1;
                this.color = '#ff4444';
                this.size = 8;
                this.flying = false;
                break;
            case 'fast':
                this.maxHealth = 30 * scaleMultiplier;  // Increased from 25
                this.speed = 3;  // Faster!
                this.reward = 15;  // Reduced from 20
                this.damage = 1;
                this.color = '#44ff44';
                this.size = 6;
                this.flying = false;
                // Resistant to slow-firing towers
                this.resistances.normal = 0.7;
                this.resistances.pierce = 0.7;
                break;
            case 'tank':
                this.maxHealth = 180 * scaleMultiplier;  // Increased from 120
                this.speed = 0.4;  // Slower
                this.reward = 28;  // Reduced from 35
                this.damage = 2;
                this.color = '#4444ff';
                this.size = 12;
                this.flying = false;
                // Resistant to rapid fire, weak to splash
                this.resistances.rapid = 0.5;
                this.resistances.splash = 1.5;
                break;
            case 'healer':
                this.maxHealth = 70 * scaleMultiplier;  // Increased
                this.speed = 0.9;
                this.reward = 32;  // Reduced from 40
                this.damage = 1;
                this.color = '#00ffff';
                this.size = 9;
                this.healRange = 100;  // Increased range
                this.healAmount = 8;  // Heals more
                this.healCooldown = 0;
                this.flying = false;
                // Resistant to poison
                this.resistances.poison = 0.3;
                break;
            case 'flying':
                this.maxHealth = 45 * scaleMultiplier;  // Increased from 35
                this.speed = 2.2;  // Faster
                this.reward = 25;  // Reduced from 30
                this.damage = 1;
                this.color = '#ffaa00';
                this.size = 7;
                this.flying = true;
                // Only antiair and electric are fully effective
                this.resistances.normal = 0;  // Immune
                this.resistances.rapid = 0;  // Immune
                this.resistances.splash = 0.3;  // Mostly resistant
                break;
            case 'armored':
                // NEW: Heavy armor, resistant to most damage
                this.maxHealth = 150 * scaleMultiplier;
                this.speed = 0.6;
                this.reward = 35;
                this.damage = 2;
                this.color = '#888888';
                this.size = 11;
                this.flying = false;
                // Heavily armored - resistant to normal/rapid, weak to pierce/splash
                this.resistances.normal = 0.4;
                this.resistances.rapid = 0.3;
                this.resistances.pierce = 1.5;
                this.resistances.splash = 1.3;
                this.resistances.electric = 1.2;
                break;
            case 'shielded':
                // NEW: Has shields, regenerates quickly
                this.maxHealth = 80 * scaleMultiplier;
                this.speed = 1.0;
                this.reward = 30;
                this.damage = 1;
                this.color = '#00ccff';
                this.size = 9;
                this.flying = false;
                this.shield = 40 * scaleMultiplier;
                this.maxShield = this.shield;
                this.shieldRegenCooldown = 0;
                // Shields resist normal damage
                this.resistances.normal = 0.6;
                this.resistances.rapid = 0.7;
                this.resistances.poison = 1.5;  // Weak to poison
                break;
            case 'boss':
                this.maxHealth = 600 * scaleMultiplier;  // Increased from 400
                this.speed = 0.5;  // Slower
                this.reward = 120;  // Reduced from 150
                this.damage = 8;  // Increased from 5
                this.color = '#ff00ff';
                this.size = 18;  // Bigger
                this.flying = false;
                // Boss has some resistances
                this.resistances.normal = 0.8;
                this.resistances.rapid = 0.6;
                this.resistances.freeze = 0.5;
                break;
            case 'swarm':
                // NEW: Tiny fast enemies that come in groups
                this.maxHealth = 20 * scaleMultiplier;
                this.speed = 2.5;
                this.reward = 8;
                this.damage = 1;
                this.color = '#ff69b4';
                this.size = 5;
                this.flying = false;
                // Weak to splash damage
                this.resistances.splash = 2.0;
                this.resistances.pierce = 1.5;
                break;
            case 'teleporter':
                // NEW: Can teleport forward on the path
                this.maxHealth = 60 * scaleMultiplier;
                this.speed = 0.8;
                this.reward = 40;
                this.damage = 1;
                this.color = '#00ffff';
                this.size = 9;
                this.flying = false;
                this.teleportCooldown = 180;  // 3 seconds
                this.teleportTimer = this.teleportCooldown;
                this.teleportDistance = 5;  // Jump 5 path points ahead
                // Resistant to normal damage
                this.resistances.normal = 0.5;
                break;
            case 'splitter':
                // NEW: Splits into 2 smaller enemies when killed
                this.maxHealth = 90 * scaleMultiplier;
                this.speed = 1.2;
                this.reward = 35;
                this.damage = 2;
                this.color = '#9370db';
                this.size = 10;
                this.flying = false;
                this.canSplit = true;
                this.splitGeneration = 0;  // Track split generation
                // Weak to pierce damage
                this.resistances.pierce = 1.5;
                break;
            case 'spawner':
                // NEW: Periodically spawns basic enemies
                this.maxHealth = 120 * scaleMultiplier;
                this.speed = 0.7;
                this.reward = 50;
                this.damage = 1;
                this.color = '#ff1493';
                this.size = 12;
                this.flying = false;
                this.spawnCooldown = 240;  // 4 seconds
                this.spawnTimer = this.spawnCooldown;
                // Resistant to rapid fire
                this.resistances.rapid = 0.4;
                this.resistances.splash = 1.3;
                break;
            case 'resistant':
                // NEW: Highly resistant to all damage
                this.maxHealth = 200 * scaleMultiplier;
                this.speed = 0.5;
                this.reward = 60;
                this.damage = 3;
                this.color = '#696969';
                this.size = 13;
                this.flying = false;
                // Resistant to everything!
                this.resistances.normal = 0.3;
                this.resistances.rapid = 0.3;
                this.resistances.splash = 0.3;
                this.resistances.pierce = 0.4;
                this.resistances.freeze = 0.3;
                this.resistances.poison = 0.3;
                this.resistances.electric = 0.4;
                break;
        }

        this.health = this.maxHealth;
        this.alive = true;
        this.frozenTimer = 0;
        this.originalSpeed = this.speed;
        this.poisoned = false;
        this.poisonDamage = 0;
        this.poisonTimer = 0;
    }

    update(enemies) {
        if (this.frozenTimer > 0) {
            this.frozenTimer--;
            if (this.frozenTimer === 0) {
                this.speed = this.originalSpeed;
            }
        }

        if (this.poisoned && this.poisonTimer > 0) {
            if (this.poisonTimer % 30 === 0) {
                this.takeDamage(this.poisonDamage);
            }
            this.poisonTimer--;
            if (this.poisonTimer === 0) {
                this.poisoned = false;
            }
        }

        if (this.pathIndex >= this.path.length - 1) {
            return 'reached_end';
        }

        const target = this.path[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.pathIndex++;
            if (this.pathIndex >= this.path.length - 1) {
                return 'reached_end';
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        if (this.type === 'healer' && this.healCooldown <= 0 && enemies) {
            for (const enemy of enemies) {
                if (enemy !== this && enemy.alive && enemy.health < enemy.maxHealth) {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist <= this.healRange) {
                        enemy.health = Math.min(enemy.health + this.healAmount, enemy.maxHealth);
                        this.healCooldown = 60;
                        break;
                    }
                }
            }
        }

        if (this.healCooldown > 0) {
            this.healCooldown--;
        }

        // Shield regeneration for shielded enemies
        if (this.type === 'shielded') {
            if (this.shieldRegenCooldown > 0) {
                this.shieldRegenCooldown--;
            } else if (this.shield < this.maxShield) {
                this.shield = Math.min(this.shield + 0.5, this.maxShield);
            }
        }

        // Teleporter ability
        if (this.type === 'teleporter' && this.teleportTimer > 0) {
            this.teleportTimer--;
            if (this.teleportTimer === 0) {
                // Teleport forward on path
                const newIndex = Math.min(this.pathIndex + this.teleportDistance, this.path.length - 1);
                if (newIndex !== this.pathIndex) {
                    this.pathIndex = newIndex;
                    this.x = this.path[this.pathIndex].x;
                    this.y = this.path[this.pathIndex].y;
                    this.teleportTimer = this.teleportCooldown;  // Reset cooldown
                }
            }
        }

        // Spawner ability
        if (this.type === 'spawner' && this.spawnTimer > 0 && enemies) {
            this.spawnTimer--;
            if (this.spawnTimer === 0) {
                // Spawn a swarm enemy at current position
                const spawnedEnemy = new Enemy(this.path, 'swarm', this.wave, 1.0);
                spawnedEnemy.pathIndex = this.pathIndex;
                spawnedEnemy.x = this.x + (Math.random() * 40 - 20);  // Random offset
                spawnedEnemy.y = this.y + (Math.random() * 40 - 20);
                enemies.push(spawnedEnemy);
                this.spawnTimer = this.spawnCooldown;  // Reset cooldown
            }
        }

        return 'moving';
    }

    takeDamage(damage, damageType = 'normal') {
        // Apply resistance
        const resistance = this.resistances[damageType] || 1;
        const actualDamage = damage * resistance;

        // Shields absorb damage first
        if (this.shield && this.shield > 0) {
            this.shield -= actualDamage;
            if (this.shield < 0) {
                this.health += this.shield;  // Overflow damage to health
                this.shield = 0;
            }
            this.shieldRegenCooldown = 180;  // 3 seconds before shield regens
        } else {
            this.health -= actualDamage;
        }

        if (this.health <= 0) {
            this.alive = false;
            this.shouldSplit = this.canSplit && this.splitGeneration < 2;  // Max 2 generations of splits
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;

        if (this.frozenTimer > 0) {
            ctx.fillStyle = '#a8e6ff';
        } else if (this.poisoned) {
            ctx.fillStyle = '#8e44ad';
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Armored enemies get thick gray outline
        if (this.type === 'armored') {
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Shielded enemies get blue shield outline
        if (this.type === 'shielded' && this.shield > 0) {
            ctx.strokeStyle = `rgba(0, 200, 255, ${this.shield / this.maxShield})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.type === 'boss') {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (this.type === 'flying') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x - 3, this.y - 3, this.size * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(this.x + 3, this.y - 3, this.size * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.type === 'healer' && this.healCooldown === 0) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.healRange, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Teleporter visual effect (glowing aura)
        if (this.type === 'teleporter') {
            const glowIntensity = Math.sin(Date.now() / 200) * 0.3 + 0.5;
            ctx.strokeStyle = `rgba(0, 255, 255, ${glowIntensity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Splitter visual effect (multiple circles)
        if (this.type === 'splitter' || this.canSplit) {
            ctx.strokeStyle = 'rgba(147, 112, 219, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size - 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Spawner visual effect (pulsing ring)
        if (this.type === 'spawner') {
            const pulse = Math.sin(Date.now() / 300) * 3;
            ctx.strokeStyle = 'rgba(255, 20, 147, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + pulse, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Resistant visual effect (armored layers)
        if (this.type === 'resistant') {
            for (let i = 0; i < 2; i++) {
                ctx.strokeStyle = `rgba(105, 105, 105, ${0.4 - i * 0.1})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size + i * 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Swarm visual effect (smaller cluster indicator)
        if (this.type === 'swarm') {
            ctx.fillStyle = 'rgba(255, 105, 180, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
            ctx.fill();
        }

        const healthBarWidth = this.size * 2;
        const healthBarHeight = 3;
        const healthPercentage = this.health / this.maxHealth;

        // Shield bar (above health bar)
        if (this.shield && this.maxShield) {
            const shieldPercentage = this.shield / this.maxShield;
            ctx.fillStyle = '#0088ff';
            ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - 12, healthBarWidth * shieldPercentage, 2);
        }

        // Health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - 8, healthBarWidth, healthBarHeight);

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - 8, healthBarWidth * healthPercentage, healthBarHeight);
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }
}
