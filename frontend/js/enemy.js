class Enemy {
    constructor(path, type = 'basic', wave = 1, difficultyMultiplier = 1.0) {
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.type = type;
        this.wave = wave;

        const scaleMultiplier = (1 + (wave - 1) * 0.1) * difficultyMultiplier;

        switch(type) {
            case 'basic':
                this.maxHealth = 40 * scaleMultiplier;
                this.speed = 1;
                this.reward = 15;
                this.damage = 1;
                this.color = '#ff4444';
                this.size = 8;
                this.flying = false;
                break;
            case 'fast':
                this.maxHealth = 25 * scaleMultiplier;
                this.speed = 2.5;
                this.reward = 20;
                this.damage = 1;
                this.color = '#44ff44';
                this.size = 6;
                this.flying = false;
                break;
            case 'tank':
                this.maxHealth = 120 * scaleMultiplier;
                this.speed = 0.5;
                this.reward = 35;
                this.damage = 2;
                this.color = '#4444ff';
                this.size = 12;
                this.flying = false;
                break;
            case 'healer':
                this.maxHealth = 60 * scaleMultiplier;
                this.speed = 0.8;
                this.reward = 40;
                this.damage = 1;
                this.color = '#00ffff';
                this.size = 9;
                this.healRange = 80;
                this.healAmount = 5;
                this.healCooldown = 0;
                this.flying = false;
                break;
            case 'flying':
                this.maxHealth = 35 * scaleMultiplier;
                this.speed = 1.8;
                this.reward = 30;
                this.damage = 1;
                this.color = '#ffaa00';
                this.size = 7;
                this.flying = true;
                break;
            case 'boss':
                this.maxHealth = 400 * scaleMultiplier;
                this.speed = 0.6;
                this.reward = 150;
                this.damage = 5;
                this.color = '#ff00ff';
                this.size = 16;
                this.flying = false;
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

        return 'moving';
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.alive = false;
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

        const healthBarWidth = this.size * 2;
        const healthBarHeight = 3;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - 8, healthBarWidth, healthBarHeight);

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - healthBarWidth / 2, this.y - this.size - 8, healthBarWidth * healthPercentage, healthBarHeight);
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }
}
