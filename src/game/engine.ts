import {
  BULLET_HEIGHT,
  BULLET_SPEED,
  BULLET_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  EXPLOSION_TIME,
  WING_SHOTS,
  INVADER_HEIGHT,
  INVADER_WIDTH,
  LASER_COOLDOWN,
  LASER_DURATION,
  LASER_MAX,
  LASER_WIDTH,
  PICKUP_SIZE,
  PICKUP_SPEED,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_Y,
  SHIELD_MAX,
  SHIELD_OVERFLOW_POINTS,
  SHOT_COOLDOWN,
  TWIN_SPREAD,
  UFO_HEIGHT,
  UFO_WIDTH,
  WING_COOLDOWN,
  WING_HEIGHT,
  WING_LEFT,
  WING_RIGHT,
  WING_WIDTH,
} from './constants';
import { bombBlastRadius } from './bombFx';
import { prefersReducedMotion } from './motion';
import { drawWorld } from './draw';
import { createSky, updateSky } from './sky';
import { rollPickup, ufoPoints } from './drops';
import { alienLook, shipLean } from './alienMotion';
import { levelTuning } from './difficulty';
import { ALIEN_PALETTES } from './sprites';
import type { Bomb, Bullet, Entity, HudSnapshot, Invader, PickupKind, Ufo, WingCannon, World } from './types';
import { soundService } from '../services/soundService';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlap(a: Entity, b: Entity): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export class GameEngine {
  readonly world: World;
  private keys: Record<string, boolean> = {};
  private shotCooldown = 0;
  private laserCooldown = 0;
  private stepTimer = 0;
  private dir = 1;
  private nextUfoAt = 12;
  private trailAcc = 0;
  /** Last UFO power-up. Survives later saucers and later waves. A new run clears it. */
  private lastPickup: PickupKind | null = null;
  private diveTimer = 5.2;
  private shotTimer = 0.4;
  private wingCooldown = WING_COOLDOWN;

  constructor() {
    this.world = {
      player: { x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2, y: PLAYER_Y, lean: 0 },
      invaders: [],
      bullets: [],
      enemyBullets: [],
      bombs: [],
      beams: [],
      ufo: null,
      pickups: [],
      wings: [],
      particles: [],
      blasts: [],
      floaters: [],
      sky: createSky(1),
      score: 0,
      level: 1,
      lasers: 1,
      shield: 3,
      twin: 0,
      wingShots: 0,
      flash: 0,
      shake: 0,
      time: 0,
      anim: 0,
      camera: 0,
      iframe: 0,
      over: false,
      bannerLevel: null,
    };
  }

  setKey(code: string, down: boolean): void {
    this.keys[code] = down;
  }

  isKeyDown(code: string): boolean {
    return Boolean(this.keys[code]);
  }

  clearKeys(): void {
    this.keys = {};
  }

  /** Resets a run and opens on the first sky. */
  start(): void {
    const world = this.world;
    world.player.x = (CANVAS_WIDTH - PLAYER_WIDTH) / 2;
    world.player.y = PLAYER_Y;
    world.player.lean = 0;
    world.bullets = [];
    world.enemyBullets = [];
    world.bombs = [];
    world.beams = [];
    world.ufo = null;
    world.pickups = [];
    world.wings = [];
    world.wingShots = 0;
    world.particles = [];
    world.blasts = [];
    world.floaters = [];
    world.score = 0;
    world.level = 1;
    world.lasers = 1;
    world.shield = 3;
    world.twin = 0;
    world.wingShots = 0;
    world.flash = 0;
    world.shake = 0;
    world.time = 0;
    world.anim = 0;
    world.camera = 0;
    world.sky = createSky(1);
    world.iframe = 0;
    world.over = false;
    world.bannerLevel = null;
    this.shotCooldown = 0;
    this.laserCooldown = 0;
    this.wingCooldown = WING_COOLDOWN;
    this.lastPickup = null;
    this.trailAcc = 0;
    this.nextUfoAt = 10 + Math.random() * 10;
    this.spawnInvaders();
    soundService.stopUfo();
    soundService.playLevelUp();
  }

  snapshot(): HudSnapshot {
    return {
      score: this.world.score,
      level: this.world.level,
      lasers: this.world.lasers,
      shield: this.world.shield,
      twin: this.world.twin > 0,
      wings: this.world.wings.length,
      wingShots: this.world.wingShots,
      over: this.world.over,
      bannerLevel: this.world.bannerLevel,
    };
  }

  /** One fixed step. The caller passes 1/60 and caps catch-up. */
  update(dt: number): HudSnapshot {
    if (this.world.over || this.world.bannerLevel !== null) return this.snapshot();
    const world = this.world;
    world.time += dt;
    world.flash = Math.max(0, world.flash - dt / 0.5);
    world.shake = Math.max(0, world.shake - dt * 28);
    world.iframe = Math.max(0, world.iframe - dt);

    this.movePlayer(dt);
    this.tryFire(dt);
    this.tryLaser(dt);
    this.moveFriendly(dt);
    this.updateBeams(dt);
    this.updateUfo(dt);
    this.updateEnemyBullets(dt);
    this.updateBombs(dt);
    if (world.over) return this.snapshot();

    this.updatePickups(dt);
    this.updateWings(dt);
    this.marchInvaders(dt);
    this.updateEnemyFire(dt);
    if (world.over) return this.snapshot();
    this.updateDives(dt);
    if (world.over) return this.snapshot();
    this.hitInvaders();

    if (world.invaders.length > 0 && world.invaders.every((inv) => !inv.alive)) {
      this.openBanner();
      return this.snapshot();
    }

    this.updateDecor(dt);
    this.compact();
    return this.snapshot();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWorld(ctx, this.world);
  }

  private spawnInvaders(): void {
    const invaders: Invader[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const type = row === 0 ? 0 : row < 3 ? 1 : 2;
        const gapX = 14;
        const gapY = 10;
        const formW = 10 * INVADER_WIDTH + 9 * gapX;
        const x = Math.round((CANVAS_WIDTH - formW) / 2) + col * (INVADER_WIDTH + gapX);
        const y = 58 + row * (INVADER_HEIGHT + gapY);
        invaders.push({
          x,
          y,
          width: INVADER_WIDTH,
          height: INVADER_HEIGHT,
          type,
          look: alienLook(this.world.level, row, col),
          points: (3 - type) * 10,
          alive: true,
          homeX: x,
          homeY: y,
          dive: null,
        });
      }
    }
    this.world.invaders = invaders;
    this.dir = 1;
    this.stepTimer = 0;
    this.diveTimer = levelTuning(this.world.level).diveInterval;
    this.shotTimer = 0.4;
    this.world.anim = 0;
  }

  /** Leaves the interval and builds the next wave. Wing and twin stay. */
  advance(): void {
    if (this.world.bannerLevel === null) return;
    this.world.bannerLevel = null;
    this.nextLevel();
  }

  private openBanner(): void {
    if (this.world.bannerLevel !== null) return;
    this.world.bannerLevel = this.world.level;
    this.world.bullets = [];
    this.world.enemyBullets = [];
    this.world.bombs = [];
    this.world.beams = [];
    this.world.blasts = [];
    this.world.ufo = null;
    soundService.stopUfo();
    soundService.playLevelUp();
  }

  private nextLevel(): void {
    const world = this.world;
    world.level += 1;
    world.lasers = Math.min(LASER_MAX, world.lasers + 1);
    if (world.level % 5 === 0) world.shield = Math.min(SHIELD_MAX, world.shield + 1);
    world.bullets = [];
    world.enemyBullets = [];
    world.bombs = [];
    world.beams = [];
    world.ufo = null;
    world.floaters = [];
    world.blasts = [];
    soundService.stopUfo();
    world.sky = createSky(world.level);
    this.spawnInvaders();
  }

  /** Each wave shortens the step and lengthens the stride, from the difficulty file. */
  private marchPace(): { interval: number; step: number; drop: number } {
    const tune = levelTuning(this.world.level);
    return { interval: tune.marchInterval, step: tune.marchStep, drop: tune.marchDrop };
  }

  private playerBox(): Entity {
    return {
      x: this.world.player.x,
      y: this.world.player.y,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    };
  }

  private movePlayer(dt: number): void {
    const left = this.keys['ArrowLeft'] || this.keys['KeyA'];
    const right = this.keys['ArrowRight'] || this.keys['KeyD'];
    if (left) this.world.player.x -= PLAYER_SPEED * dt;
    if (right) this.world.player.x += PLAYER_SPEED * dt;
    this.world.player.x = clamp(this.world.player.x, 0, CANVAS_WIDTH - PLAYER_WIDTH);
    this.world.player.lean = shipLean(Boolean(left), Boolean(right));
  }

  private tryFire(dt: number): void {
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    if (!this.keys['Space'] || this.shotCooldown > 0) return;
    this.shotCooldown = SHOT_COOLDOWN;
    const cx = this.world.player.x + PLAYER_WIDTH / 2;
    const y = this.world.player.y;
    if (this.world.twin > 0) {
      this.spawnBullet(cx - TWIN_SPREAD / 2, y, BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, 'player');
      this.spawnBullet(cx + TWIN_SPREAD / 2, y, BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, 'player');
      soundService.playTwin();
      return;
    }
    this.spawnBullet(cx, y, BULLET_WIDTH, BULLET_HEIGHT, BULLET_SPEED, 'player');
    soundService.playShoot();
  }

  private tryLaser(dt: number): void {
    this.laserCooldown = Math.max(0, this.laserCooldown - dt);
    const pressed = this.keys['KeyX'] || this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    if (!pressed || this.laserCooldown > 0 || this.world.lasers <= 0) return;
    this.laserCooldown = LASER_COOLDOWN;
    this.world.lasers -= 1;
    this.world.beams.push({
      x: this.world.player.x + PLAYER_WIDTH / 2 - LASER_WIDTH / 2,
      width: LASER_WIDTH,
      life: LASER_DURATION,
      active: true,
    });
    soundService.playLaser();
  }

  private spawnBullet(
    cx: number,
    y: number,
    width: number,
    height: number,
    speed: number,
    owner: Bullet['owner']
  ): void {
    this.world.bullets.push({
      x: cx - width / 2,
      y,
      width,
      height,
      active: true,
      speed,
      owner,
    });
  }

  private moveFriendly(dt: number): void {
    for (const bullet of this.world.bullets) {
      if (!bullet.active) continue;
      bullet.y -= bullet.speed * dt;
      if (bullet.y + bullet.height < 0) bullet.active = false;
    }
  }

  private updateBeams(dt: number): void {
    for (const beam of this.world.beams) {
      if (!beam.active) continue;
      for (const inv of this.world.invaders) {
        if (!inv.alive) continue;
        if (inv.x + inv.width > beam.x && inv.x < beam.x + beam.width) this.killInvader(inv);
      }
      const ufo = this.world.ufo;
      if (ufo && ufo.active && ufo.x + ufo.width > beam.x && ufo.x < beam.x + beam.width) {
        this.destroyUfo(ufo);
      }
      beam.life -= dt;
      if (beam.life <= 0) beam.active = false;
    }
  }

  private updateUfo(dt: number): void {
    const world = this.world;
    if (!world.ufo && world.time >= this.nextUfoAt) {
      world.ufo = {
        x: -UFO_WIDTH,
        y: 36,
        width: UFO_WIDTH,
        height: UFO_HEIGHT,
        active: true,
        speed: levelTuning(world.level).ufoSpeed,
        points: ufoPoints(Math.random()),
        trail: [],
        phase: Math.random() * Math.PI * 2,
        bob: 36,
        age: 0,
      };
      this.nextUfoAt = world.time + 10 + Math.random() * 10;
    }

    const ufo = world.ufo;
    if (!ufo || !ufo.active) {
      soundService.stopUfo();
      return;
    }
    soundService.startUfo();
    ufo.age += dt;
    const wave = 1 + 0.55 * Math.sin(ufo.age * 2.7 + ufo.phase);
    const flutter = 1 + 0.2 * Math.sin(ufo.age * 5.5 + ufo.phase * 1.7);
    const factor = Math.max(0.3, wave * flutter);
    ufo.x += ufo.speed * factor * dt;
    ufo.y = ufo.bob + Math.sin(ufo.age * 3.4 + ufo.phase) * 14;
    this.trailAcc += dt;
    if (this.trailAcc >= 0.04) {
      this.trailAcc = 0;
      ufo.trail.push({ x: ufo.x + 8, y: ufo.y + ufo.height / 2, life: 0.4 });
    }
    for (const bit of ufo.trail) bit.life -= dt;
    ufo.trail = ufo.trail.filter((bit) => bit.life > 0);
    if (ufo.x > CANVAS_WIDTH) {
      world.ufo = null;
      soundService.stopUfo();
      return;
    }

    const chance = levelTuning(world.level).ufoBombPerSecond * dt;
    if (Math.random() < chance) {
      const bombX = ufo.x + UFO_WIDTH / 2;
      const playerX = world.player.x + PLAYER_WIDTH / 2;
      if (Math.abs(bombX - playerX) < 100 || Math.random() < 0.05) {
        this.spawnBomb(bombX, ufo.y + UFO_HEIGHT, 'enemy');
      }
    }
  }

  private updateEnemyBullets(dt: number): void {
    const wave = this.world.enemyBullets;
    const body = this.playerBox();
    for (const bullet of wave) {
      if (this.world.enemyBullets !== wave || this.world.over) break;
      if (!bullet.active) continue;
      bullet.y += bullet.speed * dt;
      if (bullet.y > CANVAS_HEIGHT) {
        bullet.active = false;
        continue;
      }
      if (overlap(bullet, body)) {
        bullet.active = false;
        this.hurt();
      }
    }
  }

  private updateBombs(dt: number): void {
    const bombs = this.world.bombs;
    for (const bomb of bombs) {
      if (this.world.bombs !== bombs || this.world.over) break;
      if (!bomb.active) continue;
      const friendly = bomb.owner === 'player';
      if (!bomb.exploding) {
        bomb.y += bomb.speed * dt;
        if (friendly) {
          if (bomb.y + bomb.height < 0) {
            bomb.active = false;
            continue;
          }
          if (this.friendlyBombHit(bomb)) this.armBomb(bomb);
        } else {
          for (const bullet of this.world.bullets) {
            if (!bullet.active || bullet.owner !== 'player' || !overlap(bullet, bomb)) continue;
            bullet.active = false;
            this.armBomb(bomb);
            break;
          }
          if (!bomb.exploding && bomb.y > this.world.player.y) this.armBomb(bomb);
        }
      }
      if (!bomb.exploding) continue;

      const radius = bombBlastRadius(bomb.explosionTimer);
      const cx = bomb.x + bomb.width / 2;
      const cy = bomb.y + bomb.height / 2;
      if (radius > 0) {
        if (!friendly) {
          const body = this.playerBox();
          const dist = Math.hypot(cx - (body.x + body.width / 2), cy - (body.y + body.height / 2));
          if (dist < radius) {
            bomb.active = false;
            this.hurt();
          }
        }
        for (const inv of this.world.invaders) {
          if (!inv.alive) continue;
          const hit = Math.hypot(cx - (inv.x + inv.width / 2), cy - (inv.y + inv.height / 2));
          if (hit < radius) this.killInvader(inv);
        }
        const ufo = this.world.ufo;
        if (friendly && ufo?.active) {
          const hit = Math.hypot(cx - (ufo.x + ufo.width / 2), cy - (ufo.y + ufo.height / 2));
          if (hit < radius) this.destroyUfo(ufo);
        }
      }
      bomb.explosionTimer -= dt;
      if (bomb.explosionTimer <= 0) bomb.active = false;
    }
  }

  private friendlyBombHit(bomb: Bomb): boolean {
    for (const inv of this.world.invaders) {
      if (inv.alive && overlap(bomb, inv)) return true;
    }
    const ufo = this.world.ufo;
    return Boolean(ufo?.active && overlap(bomb, ufo));
  }

  private updatePickups(dt: number): void {
    const body = this.playerBox();
    for (const pickup of this.world.pickups) {
      if (!pickup.active) continue;
      pickup.y += pickup.vy * dt;
      if (pickup.y > CANVAS_HEIGHT) {
        pickup.active = false;
        continue;
      }
      if (overlap(pickup, body)) {
        pickup.active = false;
        this.collect(pickup.kind);
      }
    }
  }

  private collect(kind: PickupKind): void {
    const world = this.world;
    this.burst(world.player.x + PLAYER_WIDTH / 2, world.player.y, '#e2e8f0', 12);
    if (kind === 'wing') {
      this.addWing();
      soundService.playPickup();
      return;
    }
    if (kind === 'twin') {
      world.twin = 1;
      soundService.playPickup();
      return;
    }
    if (world.shield >= SHIELD_MAX) {
      world.score += SHIELD_OVERFLOW_POINTS;
      this.floater(world.player.x, world.player.y - 12, SHIELD_OVERFLOW_POINTS, '#fde68a');
      soundService.playPickup();
      return;
    }
    world.shield += 1;
    soundService.playShieldUp();
  }

  /**
   * Side cannons share one pool of WING_SHOTS volleys.
   * The first module mounts the left cannon and loads 6.
   * The second mounts the right cannon and keeps the same pool.
   * A later module, with both already mounted, refills that pool to 6.
   * One volley spends one charge even when both cannons fire.
   */
  private addWing(): void {
    const world = this.world;
    const left = world.wings.find((wing) => wing.offsetX < 0);
    const right = world.wings.find((wing) => wing.offsetX > 0);
    if (!left) {
      world.wings.push(this.makeWing(WING_LEFT));
      if (world.wingShots <= 0) {
        world.wingShots = WING_SHOTS;
        this.wingCooldown = WING_COOLDOWN;
      }
      return;
    }
    if (!right) {
      world.wings.push(this.makeWing(WING_RIGHT));
      if (world.wingShots <= 0) world.wingShots = WING_SHOTS;
      return;
    }
    world.wingShots = WING_SHOTS;
  }

  private makeWing(offsetX: number): WingCannon {
    return {
      offsetX,
      x: this.world.player.x + offsetX,
      y: this.world.player.y + 6,
      width: WING_WIDTH,
      height: WING_HEIGHT,
    };
  }

  private updateWings(dt: number): void {
    const world = this.world;
    if (world.wings.length === 0 || world.wingShots <= 0) {
      if (world.wingShots <= 0) world.wings = [];
      return;
    }
    for (const wing of world.wings) {
      wing.x = clamp(world.player.x + wing.offsetX, 0, CANVAS_WIDTH - wing.width);
      wing.y = world.player.y + 6;
    }
    this.wingCooldown -= dt;
    if (this.wingCooldown > 0) return;
    this.wingCooldown = WING_COOLDOWN;
    world.wingShots -= 1;
    for (const wing of world.wings) {
      this.spawnBomb(wing.x + wing.width / 2, wing.y - 20, 'player');
    }
    soundService.playWingShot();
    if (world.wingShots <= 0) {
      world.wingShots = 0;
      world.wings = [];
    }
  }

  /**
   * The saucer, the diving alien, and the side cannons share this projectile.
   * Enemy bombs fall. Cannon bombs use the same body with the speed reversed,
   * so they climb and never use the "passed the ship" detonation.
   */
  private spawnBomb(centerX: number, y: number, owner: Bomb['owner']): void {
    const speed = (4 + this.world.level * 0.3) * 60;
    this.world.bombs.push({
      x: centerX - 10,
      y,
      width: 20,
      height: 20,
      active: true,
      speed: owner === 'player' ? -speed : speed,
      exploding: false,
      explosionTimer: 0,
      owner,
    });
  }

  private armBomb(bomb: World['bombs'][number]): void {
    if (bomb.exploding) return;
    bomb.exploding = true;
    bomb.explosionTimer = EXPLOSION_TIME;
    soundService.playBomb();
    this.spawnBombBlast(bomb.x + bomb.width / 2, bomb.y + bomb.height / 2);
  }

  private hitInvaders(): void {
    for (const bullet of this.world.bullets) {
      if (!bullet.active) continue;
      for (const inv of this.world.invaders) {
        if (!inv.alive || !overlap(bullet, inv)) continue;
        bullet.active = false;
        this.killInvader(inv);
        break;
      }
      if (!bullet.active) continue;
      const ufo = this.world.ufo;
      if (ufo && ufo.active && overlap(bullet, ufo)) {
        bullet.active = false;
        this.destroyUfo(ufo);
      }
    }
  }

  private updateDives(dt: number): void {
    this.diveTimer -= dt;
    if (this.diveTimer <= 0) {
      this.diveTimer += levelTuning(this.world.level).diveInterval;
      this.tryStartDive();
    }

    for (const inv of this.world.invaders) {
      const dive = inv.dive;
      if (!inv.alive || !dive) continue;
      dive.t += dt / dive.duration;
      if (dive.t >= 1) {
        inv.dive = null;
        inv.x = inv.homeX;
        inv.y = inv.homeY;
        continue;
      }
      const eased = dive.t * dive.t * (3 - 2 * dive.t);
      const theta = -Math.PI / 2 + eased * Math.PI * 2;
      const dx = dive.side * dive.rx * Math.cos(theta);
      const dy = dive.ry * (1 + Math.sin(theta));
      inv.x = inv.homeX + dx;
      inv.y = inv.homeY + dy;
      if (!dive.dropped && dive.prevDy < dive.dropOffset && dy >= dive.dropOffset) {
        dive.dropped = true;
        this.releaseDiveBomb(inv);
      }
      dive.prevDy = dy;
      if (!dive.hitPlayer && overlap(inv, this.playerBox())) {
        dive.hitPlayer = true;
        this.hurt();
      }
    }
  }

  private tryStartDive(): void {
    if (this.world.invaders.some((inv) => inv.alive && inv.dive)) return;
    const candidates = this.world.invaders.filter((inv) => inv.alive && this.diveFit(inv));
    if (candidates.length === 0) return;
    const inv = candidates[Math.floor(Math.random() * candidates.length)];
    if (!inv) return;
    const playerCenter = this.world.player.y + PLAYER_HEIGHT / 2;
    const homeCenter = inv.homeY + inv.height / 2;
    const gap = playerCenter - homeCenter;
    const ryMax = (this.world.player.y - inv.homeY - inv.height - 20) / 2;
    const ry = Math.min(ryMax, Math.max(gap / 4 + 8, gap * 0.36));
    const homeCenterX = inv.homeX + inv.width / 2;
    const playerCenterX = this.world.player.x + PLAYER_WIDTH / 2;
    const side = playerCenterX >= homeCenterX ? 1 : -1;
    const room = side > 0 ? CANVAS_WIDTH - 8 - inv.width - inv.homeX : inv.homeX - 8;
    const rx = Math.min(110, Math.max(0, room));
    inv.dive = {
      t: 0,
      duration: levelTuning(this.world.level).diveDuration,
      rx,
      ry,
      side,
      dropOffset: gap / 2,
      prevDy: 0,
      dropped: false,
      hitPlayer: false,
    };
    soundService.playDive();
  }

  /** The ellipse has to reach halfway to the ship and still turn above it. */
  private diveFit(inv: Invader): boolean {
    const gap = this.world.player.y + PLAYER_HEIGHT / 2 - (inv.homeY + inv.height / 2);
    const ryMax = (this.world.player.y - inv.homeY - inv.height - 20) / 2;
    return gap > 120 && ryMax > gap / 4 + 4;
  }

  private releaseDiveBomb(inv: Invader): void {
    this.spawnBomb(inv.x + inv.width / 2, inv.y + inv.height - 4, 'enemy');
  }

  private marchInvaders(dt: number): void {
    this.stepTimer += dt;
    const pace = this.marchPace();
    if (this.stepTimer < pace.interval) return;
    this.stepTimer = 0;
    this.world.anim = this.world.anim === 0 ? 1 : 0;

    let turn = false;
    for (const inv of this.world.invaders) {
      if (!inv.alive) continue;
      inv.homeX += pace.step * this.dir;
      if (!inv.dive) inv.x = inv.homeX;
      if (inv.homeX > CANVAS_WIDTH - INVADER_WIDTH - 20 || inv.homeX < 20) turn = true;
    }
    if (turn) {
      this.dir *= -1;
      for (const inv of this.world.invaders) {
        if (!inv.alive) continue;
        inv.homeY += pace.drop;
        if (!inv.dive) inv.y = inv.homeY;
        if (inv.homeY > this.world.player.y - 20) this.fail();
      }
    }
  }

  /**
   * One shooter at a time, on its own clock, so a march step is not a volley.
   * extra shots wait until the number on screen is under the level cap.
   */
  private updateEnemyFire(dt: number): void {
    if (this.world.over) return;
    const tune = levelTuning(this.world.level);
    const alive = this.world.enemyBullets.filter((bullet) => bullet.active).length;
    if (alive >= tune.maxAlive) return;
    this.shotTimer -= dt;
    if (this.shotTimer > 0) return;
    const candidates = this.world.invaders.filter((inv) => inv.alive && !inv.dive);
    if (candidates.length === 0) {
      this.shotTimer = 0.25;
      return;
    }
    const period = 1 / Math.max(0.05, tune.shotRate);
    this.shotTimer = period;
    const count = Math.min(tune.volley, tune.maxAlive - alive, candidates.length);
    for (let n = 0; n < count; n += 1) {
      const inv = candidates[Math.floor(Math.random() * candidates.length)];
      if (!inv) continue;
      this.world.enemyBullets.push({
        x: inv.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
        y: inv.y + INVADER_HEIGHT,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        active: true,
        speed: tune.shotSpeed,
        owner: 'enemy',
      });
    }
  }

  /** Skips the previous drop when another kind is still available. */
  private choosePickup(roll: number): PickupKind {
    const kind = rollPickup(roll, this.lastPickup);
    this.lastPickup = kind;
    return kind;
  }

  private killInvader(inv: Invader): void {
    if (!inv.alive) return;
    inv.alive = false;
    inv.dive = null;
    this.world.score += inv.points;
    this.floater(inv.x, inv.y, inv.points, '#ffffff');
    const palette = ALIEN_PALETTES[inv.type % ALIEN_PALETTES.length];
    this.burst(inv.x + inv.width / 2, inv.y + inv.height / 2, palette?.burst ?? '#fff', 8);
    soundService.playExplosion();
  }

  private destroyUfo(ufo: Ufo): void {
    if (!ufo.active) return;
    ufo.active = false;
    this.world.score += ufo.points;
    this.floater(ufo.x, ufo.y, ufo.points, '#fde68a');
    this.world.pickups.push({
      x: ufo.x + ufo.width / 2 - PICKUP_SIZE / 2,
      y: ufo.y + ufo.height / 2 - PICKUP_SIZE / 2,
      width: PICKUP_SIZE,
      height: PICKUP_SIZE,
      active: true,
      kind: this.choosePickup(Math.random()),
      vy: PICKUP_SPEED,
    });
    this.burst(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, '#fb7185', 22);
    this.world.shake = Math.max(this.world.shake, 6);
    this.world.ufo = null;
    soundService.stopUfo();
    soundService.playExplosion();
  }

  private hurt(): void {
    const world = this.world;
    if (world.over || world.iframe > 0) return;
    if (world.shield > 0) {
      world.shield -= 1;
      world.iframe = 0.55;
      world.flash = 1;
      world.shake = Math.max(world.shake, 8);
      world.wings = [];
      world.wingShots = 0;
      world.twin = 0;
      world.enemyBullets = [];
      world.bombs = [];
      soundService.playShieldHit();
      return;
    }
    this.fail();
  }

  private fail(): void {
    if (this.world.over) return;
    this.world.over = true;
    this.world.shake = 14;
    soundService.stopUfo();
    soundService.stopMusic();
    soundService.playGameOver();
  }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 140;
      const life = 0.25 + Math.random() * 0.35;
      this.world.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        max: life,
        color,
        size: 2 + Math.random() * 2,
      });
    }
    if (this.world.particles.length > 240) {
      this.world.particles.splice(0, this.world.particles.length - 240);
    }
  }

  private floater(x: number, y: number, value: number, color: string): void {
    this.world.floaters.push({ x, y, value, life: 0.7, max: 0.7, color });
  }

  private spawnBombBlast(x: number, y: number): void {
    const reduced = prefersReducedMotion();
    this.world.blasts.push({ x, y, age: 0, life: reduced ? 0.7 : 1.15, reduced });
    if (!reduced) this.world.shake = Math.max(this.world.shake, 4.5);
    const embers = reduced ? 8 : 18;
    const debris = reduced ? 0 : 10;
    const smoke = reduced ? 4 : 8;
    for (let i = 0; i < embers; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      const life = 0.35 + Math.random() * 0.4;
      this.world.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, max: life,
        color: i % 3 === 0 ? '#fff7ed' : i % 3 === 1 ? '#fb923c' : '#fde68a',
        size: 2 + Math.random() * 2,
        kind: 'ember', rot: 0, vr: 0, drag: 1.3, gravity: 28,
      });
    }
    for (let i = 0; i < debris; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      const life = 0.45 + Math.random() * 0.45;
      this.world.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life, max: life,
        color: i % 2 ? '#1c1917' : '#57534e',
        size: 3 + Math.random() * 2,
        kind: 'debris',
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        drag: 0.7,
        gravity: 260,
      });
    }
    for (let i = 0; i < smoke; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 12 + Math.random() * 36;
      const life = reduced ? 0.4 : 0.7 + Math.random() * 0.45;
      this.world.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, max: life,
        color: i % 2 ? '#57534e' : '#292524',
        size: reduced ? 7 : 9 + Math.random() * 8,
        kind: 'smoke', rot: 0, vr: 0, drag: 1.5, gravity: -16,
      });
    }
    if (this.world.particles.length > 360) {
      this.world.particles.splice(0, this.world.particles.length - 360);
    }
  }

  private updateDecor(dt: number): void {
    const world = this.world;
    for (const floater of world.floaters) {
      floater.y -= 60 * dt;
      floater.life -= dt;
    }
    for (const blast of world.blasts) blast.age += dt;
    for (const particle of world.particles) {
      const drag = particle.drag ?? 0;
      const gravity = particle.gravity ?? 0;
      particle.vy += gravity * dt;
      if (drag) {
        const damp = Math.exp(-drag * dt);
        particle.vx *= damp;
        particle.vy *= damp;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rot = (particle.rot ?? 0) + (particle.vr ?? 0) * dt;
      particle.life -= dt;
    }
    updateSky(world.sky, dt);
    const target = (world.player.x + PLAYER_WIDTH / 2 - CANVAS_WIDTH / 2) / (CANVAS_WIDTH / 2);
    world.camera += (target - world.camera) * Math.min(1, dt * 3);
  }

  private compact(): void {
    const world = this.world;
    world.bullets = world.bullets.filter((bullet) => bullet.active);
    world.enemyBullets = world.enemyBullets.filter((bullet) => bullet.active);
    world.bombs = world.bombs.filter((bomb) => bomb.active);
    world.blasts = world.blasts.filter((blast) => blast.age < blast.life);
    world.beams = world.beams.filter((beam) => beam.active);
    world.pickups = world.pickups.filter((pickup) => pickup.active);
    world.floaters = world.floaters.filter((floater) => floater.life > 0);
    world.particles = world.particles.filter((particle) => particle.life > 0);
  }
}
