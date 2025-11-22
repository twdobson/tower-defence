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
                break;
        }

        this.sellValue = Math.floor(this.cost * 0.7);
    }

    update(enemies) {
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        if (!this.target || !this.target.alive || !this.isInRange(this.target)) {
            this.target = this.findTarget(enemies);
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

        const projectile = new Projectile(
            this.x,
            this.y,
            this.target,
            this.damage,
            this.projectileColor,
            this.splashRadius
        );

        projectile.special = this.special;
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 15, this.y - 15, 30, 30);

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
