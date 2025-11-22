class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = 1;
        this.target = null;
        this.shootCooldown = 0;

        switch(type) {
            case 'basic':
                this.damage = 12;
                this.range = 110;
                this.fireRate = 50;
                this.cost = 50;
                this.color = '#888888';
                this.projectileColor = '#ffff00';
                this.splashRadius = 0;
                this.special = null;
                this.damageType = 'normal';
                break;
            case 'sniper':
                this.damage = 40;
                this.range = 220;
                this.fireRate = 100;
                this.cost = 120;
                this.color = '#8b4513';
                this.projectileColor = '#ff6600';
                this.splashRadius = 0;
                this.special = null;
                this.damageType = 'pierce';
                break;
            case 'splash':
                this.damage = 18;
                this.range = 120;
                this.fireRate = 80;
                this.cost = 150;
                this.color = '#ff6600';
                this.projectileColor = '#ff0000';
                this.splashRadius = 60;
                this.special = null;
                this.damageType = 'splash';
                break;
            case 'rapid':
                this.damage = 6;
                this.range = 100;
                this.fireRate = 15;
                this.cost = 100;
                this.color = '#00ff00';
                this.projectileColor = '#00ffff';
                this.splashRadius = 0;
                this.special = null;
                this.damageType = 'rapid';
                break;
            case 'freeze':
                this.damage = 8;
                this.range = 130;
                this.fireRate = 70;
                this.cost = 180;
                this.color = '#00d4ff';
                this.projectileColor = '#a8e6ff';
                this.splashRadius = 0;
                this.special = 'freeze';
                this.freezeDuration = 90;
                this.damageType = 'freeze';
                break;
            case 'poison':
                this.damage = 10;
                this.range = 110;
                this.fireRate = 60;
                this.cost = 140;
                this.color = '#9b59b6';
                this.projectileColor = '#8e44ad';
                this.splashRadius = 0;
                this.special = 'poison';
                this.poisonDamage = 2;
                this.poisonDuration = 120;
                this.damageType = 'poison';
                break;
            case 'electric':
                this.damage = 15;
                this.range = 140;
                this.fireRate = 90;
                this.cost = 200;
                this.color = '#3498db';
                this.projectileColor = '#2980b9';
                this.splashRadius = 0;
                this.special = 'electric';
                this.chainCount = 3;
                this.chainRange = 80;
                this.damageType = 'electric';
                break;
            case 'laser':
                this.damage = 25;
                this.range = 180;
                this.fireRate = 5;
                this.cost = 250;
                this.color = '#e74c3c';
                this.projectileColor = '#c0392b';
                this.splashRadius = 0;
                this.special = 'laser';
                this.damageType = 'pierce';
                break;
            case 'antiair':
                this.damage = 20;
                this.range = 200;
                this.fireRate = 40;
                this.cost = 160;
                this.color = '#16a085';
                this.projectileColor = '#1abc9c';
                this.splashRadius = 0;
                this.special = 'antiair';
                this.damageType = 'pierce';
                break;
        }

        this.kills = 0;
        this.totalDamageDealt = 0;
        this.shotsFired = 0;
        this.sellValue = Math.floor(this.cost * 0.7);
        this.upgradePath = null;  // Will be set when tower reaches level 3
        this.angle = 0;  // Current rotation angle
        this.targetAngle = 0;  // Angle to face target
    }

    getUpgradePaths() {
        // Define upgrade paths for each tower type
        const paths = {
            basic: [
                { id: 'fortress', name: 'Fortress', description: '+50% damage, +30% range, splash damage' },
                { id: 'rapid', name: 'Gatling', description: '3x fire rate, projectiles pierce' },
                { id: 'support', name: 'Command', description: 'Boosts nearby towers +25% damage' }
            ],
            sniper: [
                { id: 'marksman', name: 'Marksman', description: '+100% range, pierce 3 enemies' },
                { id: 'assassin', name: 'Assassin', description: '30% crit (5x damage), reveal flying' },
                { id: 'explosive', name: 'Explosive', description: 'Shots explode on impact' }
            ],
            rapid: [
                { id: 'minigun', name: 'Minigun', description: '2x fire rate, +50% damage' },
                { id: 'shredder', name: 'Shredder', description: 'Armor shred (-50% enemy resistance)' },
                { id: 'suppressor', name: 'Suppressor', description: 'Slows enemies 40%' }
            ],
            splash: [
                { id: 'nuke', name: 'Nuclear', description: '2x splash radius, +100% damage' },
                { id: 'cluster', name: 'Cluster', description: 'Shoots 3 projectiles' },
                { id: 'napalm', name: 'Napalm', description: 'Burning ground DoT' }
            ],
            poison: [
                { id: 'plague', name: 'Plague', description: 'Poison spreads to nearby enemies' },
                { id: 'venom', name: 'Venom', description: '3x poison damage, instant damage' },
                { id: 'corrosive', name: 'Corrosive', description: 'Melts shields and armor' }
            ],
            freeze: [
                { id: 'blizzard', name: 'Blizzard', description: 'AoE freeze, permanent slow' },
                { id: 'permafrost', name: 'Permafrost', description: '2x freeze duration, shatters frozen' },
                { id: 'icewall', name: 'Ice Wall', description: 'Blocks enemy movement temporarily' }
            ],
            electric: [
                { id: 'tesla', name: 'Tesla', description: '+3 chain targets, +100% chain damage' },
                { id: 'overload', name: 'Overload', description: 'Stun enemies, EMP shields' },
                { id: 'conductor', name: 'Conductor', description: 'Chains back to original target' }
            ],
            laser: [
                { id: 'beam', name: 'Beam', description: 'Constant beam, hits all in line' },
                { id: 'focused', name: 'Focused', description: '+200% damage, melts armor' },
                { id: 'prismatic', name: 'Prismatic', description: 'Splits into 5 beams' }
            ],
            antiair: [
                { id: 'flak', name: 'Flak Cannon', description: 'Splash damage, grounds flying' },
                { id: 'homing', name: 'Homing', description: 'Missiles never miss, +range' },
                { id: 'radar', name: 'Radar', description: 'Reveals all flying, boosts AA towers' }
            ]
        };

        return paths[this.type] || [];
    }

    chooseUpgradePath(pathId) {
        if (this.level < 3) return false;
        if (this.upgradePath) return false;  // Already chosen

        const paths = this.getUpgradePaths();
        const chosenPath = paths.find(p => p.id === pathId);
        if (!chosenPath) return false;

        this.upgradePath = pathId;
        this.applyUpgradePathBonuses();
        return true;
    }

    applyUpgradePathBonuses() {
        if (!this.upgradePath) return;

        // Apply permanent bonuses based on chosen path
        const bonuses = {
            // Basic tower paths
            fortress: () => {
                this.damage *= 1.5;
                this.range *= 1.3;
                this.splashRadius = 40;
            },
            rapid: () => {
                this.fireRate = Math.floor(this.fireRate / 3);
                this.piercing = true;
            },
            support: () => {
                this.supportRadius = 120;
                this.supportBoost = 0.25;
            },

            // Sniper paths
            marksman: () => {
                this.range *= 2;
                this.pierceCount = 3;
            },
            assassin: () => {
                this.critChance = 0.3;
                this.critMultiplier = 5;
                this.revealFlying = true;
            },
            explosive: () => {
                this.splashRadius = 50;
                this.damageType = 'splash';
            },

            // Rapid paths
            minigun: () => {
                this.fireRate = Math.floor(this.fireRate / 2);
                this.damage *= 1.5;
            },
            shredder: () => {
                this.armorShred = 0.5;
            },
            suppressor: () => {
                this.slowAmount = 0.4;
                this.slowDuration = 60;
            },

            // Splash paths
            nuke: () => {
                this.splashRadius *= 2;
                this.damage *= 2;
            },
            cluster: () => {
                this.projectileCount = 3;
            },
            napalm: () => {
                this.burningDamage = 5;
                this.burningDuration = 180;
            },

            // Poison paths
            plague: () => {
                this.plagueRadius = 60;
            },
            venom: () => {
                this.poisonDamage *= 3;
                this.damage *= 1.5;
            },
            corrosive: () => {
                this.shieldBreaker = true;
                this.armorMelt = 0.3;
            },

            // Freeze paths
            blizzard: () => {
                this.freezeRadius = 80;
                this.permanentSlow = 0.3;
            },
            permafrost: () => {
                this.freezeDuration *= 2;
                this.shatterDamage = this.damage * 2;
            },
            icewall: () => {
                this.wallDuration = 120;
            },

            // Electric paths
            tesla: () => {
                this.chainCount += 3;
                this.chainDamageMultiplier = 1.0;  // Full damage on chain
            },
            overload: () => {
                this.stunDuration = 60;
                this.empShields = true;
            },
            conductor: () => {
                this.chainBack = true;
            },

            // Laser paths
            beam: () => {
                this.beamMode = true;
                this.beamWidth = 20;
            },
            focused: () => {
                this.damage *= 3;
                this.armorMelt = 0.5;
            },
            prismatic: () => {
                this.splitBeams = 5;
            },

            // Antiair paths
            flak: () => {
                this.splashRadius = 60;
                this.groundFlying = true;
            },
            homing: () => {
                this.alwaysHit = true;
                this.range *= 1.5;
            },
            radar: () => {
                this.revealRadius = 400;
                this.aaBoost = 0.3;
            }
        };

        const applyBonus = bonuses[this.upgradePath];
        if (applyBonus) {
            applyBonus();
        }
    }

    update(enemies) {
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        if (!this.target || !this.target.alive || !this.isInRange(this.target)) {
            this.target = this.findTarget(enemies);
        }

        // Update rotation to face target
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.targetAngle = Math.atan2(dy, dx);

            // Smooth rotation interpolation
            let angleDiff = this.targetAngle - this.angle;
            // Normalize angle difference to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Rotate smoothly towards target (10% per frame)
            this.angle += angleDiff * 0.15;
        }

        if (this.target && this.shootCooldown === 0) {
            this.shootCooldown = this.fireRate;
            return this.shoot();
        }

        return null;
    }

    findTarget(enemies) {
        let closestEnemy = null;
        let maxProgress = -1;

        for (const enemy of enemies) {
            if (enemy.alive && this.isInRange(enemy)) {
                if (this.special === 'antiair' && !enemy.flying) {
                    continue;
                }

                if (enemy.pathIndex > maxProgress) {
                    maxProgress = enemy.pathIndex;
                    closestEnemy = enemy;
                }
            }
        }

        return closestEnemy;
    }

    isInRange(enemy) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.range;
    }

    shoot() {
        if (!this.target) return null;

        this.shotsFired++;

        // Calculate barrel tip position for muzzle flash
        const barrelLength = 20;
        const barrelX = this.x + Math.cos(this.angle) * barrelLength;
        const barrelY = this.y + Math.sin(this.angle) * barrelLength;

        // Create muzzle flash particles
        if (window.createParticleBurst) {
            if (this.special === 'laser') {
                window.createParticleBurst(barrelX, barrelY, 3, 'energy');
            } else if (this.special === 'electric') {
                window.createParticleBurst(barrelX, barrelY, 4, 'energy');
            } else if (this.special === 'poison') {
                window.createParticleBurst(barrelX, barrelY, 3, 'magic');
            } else {
                window.createParticleBurst(barrelX, barrelY, 3, 'spark');
            }
        }

        const projectile = new Projectile(
            this.x,
            this.y,
            this.target,
            this.damage,
            this.projectileColor,
            this.splashRadius
        );

        projectile.special = this.special;
        projectile.damageType = this.damageType;
        projectile.tower = this;  // Track which tower fired this
        if (this.special === 'freeze') {
            projectile.freezeDuration = this.freezeDuration;
        } else if (this.special === 'poison') {
            projectile.poisonDamage = this.poisonDamage;
            projectile.poisonDuration = this.poisonDuration;
        } else if (this.special === 'electric') {
            projectile.chainCount = this.chainCount;
            projectile.chainRange = this.chainRange;
        }

        return projectile;
    }

    draw(ctx, isSelected = false) {
        // Draw base (non-rotating part)
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw rotating tower body
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Tower body (rotates)
        ctx.fillStyle = this.color;
        ctx.fillRect(-12, -10, 24, 20);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-12, -10, 24, 20);

        // Tower barrel (points forward)
        ctx.fillStyle = '#666666';
        ctx.fillRect(8, -5, 12, 10);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, -5, 12, 10);

        ctx.restore();

        if (isSelected) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 18, this.y - 18, 36, 36);

            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.target) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.target.x, this.target.y);
            ctx.stroke();
        }
    }

    upgrade() {
        this.level++;
        this.damage = Math.floor(this.damage * 1.5);
        this.range = Math.floor(this.range * 1.1);
        return Math.floor(this.cost * 0.5);
    }

    getUpgradeCost() {
        return Math.floor(this.cost * 0.5);
    }
}
