class Projectile {
    constructor(x, y, target, damage, color, splashRadius = 0) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.color = color;
        this.speed = 5;
        this.alive = true;
        this.splashRadius = splashRadius;
        this.special = null;
        this.trailCounter = 0;
    }

    update(enemies) {
        if (!this.target || !this.target.alive) {
            this.alive = false;
            return { hit: false };
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.alive = false;
            this.applyEffects(this.target, enemies);
            return { hit: true, x: this.target.x, y: this.target.y, special: this.special, damageType: this.damageType };
        }

        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;

        // Create trail particles (not for laser beams)
        this.trailCounter++;
        if (this.special !== 'laser' && this.trailCounter % 2 === 0 && window.gameState) {
            let trailType = 'spark';
            let trailCount = 1;

            if (this.special === 'poison') {
                trailType = 'magic';
                trailCount = 1;
            } else if (this.special === 'electric') {
                trailType = 'energy';
                trailCount = 2;
            } else if (this.special === 'freeze') {
                trailType = 'energy';
                trailCount = 1;
            } else if (this.splashRadius > 0) {
                trailType = 'smoke';
                trailCount = 1;
            }

            if (window.createParticleBurst) {
                window.createParticleBurst(this.x, this.y, trailCount, trailType);
            }
        }

        return { hit: false };
    }

    applyEffects(target, enemies) {
        if (this.special === 'freeze') {
            target.frozenTimer = this.freezeDuration;
            target.originalSpeed = target.speed;
            target.speed *= 0.3;
        } else if (this.special === 'poison') {
            target.poisoned = true;
            target.poisonDamage = this.poisonDamage;
            target.poisonTimer = this.poisonDuration;
        } else if (this.special === 'electric' && enemies) {
            const chainTargets = [target];
            let currentTarget = target;

            for (let i = 0; i < this.chainCount - 1; i++) {
                let nextTarget = null;
                let minDist = this.chainRange;

                for (const enemy of enemies) {
                    if (enemy.alive && !chainTargets.includes(enemy)) {
                        const dx = enemy.x - currentTarget.x;
                        const dy = enemy.y - currentTarget.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < minDist) {
                            minDist = dist;
                            nextTarget = enemy;
                        }
                    }
                }

                if (nextTarget) {
                    chainTargets.push(nextTarget);
                    nextTarget.takeDamage(this.damage * 0.5, this.damageType);
                    currentTarget = nextTarget;
                } else {
                    break;
                }
            }

            this.chainTargets = chainTargets;
        }
    }

    draw(ctx) {
        if (this.special === 'laser') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            if (this.target) {
                ctx.lineTo(this.target.x, this.target.y);
            }
            ctx.stroke();
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();

            if (this.special === 'electric') {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
}
