import React, { useRef, useState, useEffect } from 'react';
import { Player, Bullet, Boss, AttackObject, Particle, WeaponType, PlayerState } from '../types/cuphead';
import { cupheadAudio } from './CupheadAudio';
import { Sparkles, Play, Award, Volume2, VolumeX, RotateCcw, HelpCircle, Shield, Flame, Swords } from 'lucide-react';

interface CupheadCanvasProps {
  onScoreUpdate: (score: number) => void;
  onHpUpdate: (hp: number) => void;
  onSuperUpdate: (meter: number) => void;
  onBossHpUpdate: (hp: number, max: number) => void;
  onGameStateChange: (state: 'INTRO' | 'PLAYING' | 'GAMEOVER' | 'VICTORY') => void;
}

export const CupheadCanvas: React.FC<CupheadCanvasProps> = ({
  onScoreUpdate,
  onHpUpdate,
  onSuperUpdate,
  onBossHpUpdate,
  onGameStateChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core loop state
  const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('INTRO');
  const [weapon, setWeapon] = useState<WeaponType>('PEASHOOTER');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [parriedCount, setParriedCount] = useState<number>(0);
  const [damageDealt, setDamageDealt] = useState<number>(0);
  const [showTutorial, setShowTutorial] = useState<boolean>(true);

  // Sound Sync
  useEffect(() => {
    cupheadAudio.setMuted(isMuted);
  }, [isMuted]);

  // Keys pressed
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Virtual Game Entities using refs for instant read/write in loop
  const playerRef = useRef<Player>({
    x: 150,
    y: 350,
    width: 48,
    height: 64,
    vx: 0,
    vy: 0,
    hp: 3,
    maxHp: 3,
    state: 'IDLE',
    facing: 'right',
    isGrounded: true,
    dashCooldown: 0,
    dashTimer: 0,
    invincibilityTimer: 0,
    superMeter: 0,
    score: 0,
    parryActiveTimer: 0,
  });

  const bossRef = useRef<Boss>({
    x: 620,
    y: 100,
    width: 140,
    height: 320,
    hp: 1200,
    maxHp: 1200,
    state: 'INTRO',
    attackTimer: 0,
    bobTimer: 0,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const attacksRef = useRef<AttackObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Animation ticks
  const animationFrameId = useRef<number | null>(null);
  const gameTickRef = useRef<number>(0);

  // Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 450;
  const GROUND_Y = 380;
  const GRAVITY = 0.65;
  const JUMP_FORCE = -13;

  // Handle keys setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;

      // Special single press triggers
      if (k === 'c' || k === 'x') {
        // Weapon swap
        setWeapon(prev => {
          const next = prev === 'PEASHOOTER' ? 'SPREAD' : 'PEASHOOTER';
          addLog(`WEAPON SWAPPED: ${next}`);
          return next;
        });
      }

      if (k === 'v' || e.key === 'e' || e.key === 'E') {
        // EX Super beam
        triggerSuperBeam();
      }

      // Mid-air Jump key triggers Parry if you are already jumping
      if (e.key === ' ' || k === 'j') {
        handleJumpKeyPress();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // System status logs console array
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'WELCOME TO INKWELL ISLE!',
    'READY FOR A WALLOP?',
    'AUP! READY? DOWN!'
  ]);

  const addLog = (log: string) => {
    setSystemLogs(prev => [log, ...prev].slice(0, 7));
  };

  // Jump key or mid-air parry handler
  const handleJumpKeyPress = () => {
    const player = playerRef.current;
    if (player.isGrounded) {
      player.vy = JUMP_FORCE;
      player.isGrounded = false;
      player.state = 'JUMPING';
      cupheadAudio.playJump();
      spawnDustParticles(player.x + player.width / 2, GROUND_Y, 'DUST', 6);
    } else {
      // In mid-air, set parryActiveTimer to give a buffered window!
      player.parryActiveTimer = 18; // active for 18 frames! (approx. 300ms)

      // In mid-air, check if close to any PINK (parryable) attack object
      const parried = checkForParry();
      if (parried) {
        // bounce player up
        player.vy = -10;
        player.superMeter = Math.min(100, player.superMeter + 35);
        onSuperUpdate(player.superMeter);
        player.score += 500;
        onScoreUpdate(player.score);
        setParriedCount(c => c + 1);
        cupheadAudio.playParry();
        addLog('★ EXCELLENT PARRY! ★');
        player.parryActiveTimer = 0; // reset on success
      }
    }
  };

  // Trigger air dash
  const triggerDash = () => {
    const player = playerRef.current;
    if (player.dashCooldown <= 0 && player.state !== 'DASHING') {
      player.state = 'DASHING';
      player.dashTimer = 14; // lasts 14 frames
      player.dashCooldown = 45; // cooldown
      player.vy = 0; // stop vertical drop temporarily
      cupheadAudio.playDash();
      spawnDustParticles(
        player.x + (player.facing === 'right' ? 0 : player.width),
        player.y + player.height / 2,
        'DUST',
        8
      );
    }
  };

  // Check and execute pink object parry
  const checkForParry = (): boolean => {
    const player = playerRef.current;
    const attacks = attacksRef.current;

    for (let i = 0; i < attacks.length; i++) {
      const atk = attacks[i];
      if (atk.isParryable) {
        // Calculate distance
        const dx = (player.x + player.width / 2) - (atk.x + atk.width / 2);
        const dy = (player.y + player.height / 2) - (atk.y + atk.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Within 75 pixels radius is parryable range for easier, more reliable parrying!
        if (dist < 75) {
          // Trigger Parry Sparkles
          spawnDustParticles(atk.x + atk.width / 2, atk.y + atk.height / 2, 'PARRY_FX', 15);
          // Remove the pink object
          attacksRef.current = attacks.filter(a => a.id !== atk.id);
          return true;
        }
      }
    }
    return false;
  };

  // Trigger Giant EX Super Beam
  const triggerSuperBeam = () => {
    const player = playerRef.current;
    if (player.superMeter >= 100) {
      player.superMeter = 0;
      onSuperUpdate(0);

      cupheadAudio.playSuperBeam();
      addLog('!! SUPER ENERGY RELEASED !!');

      // Create a super high-damage bullet that slices across screen
      const beamId = `super-${Date.now()}`;
      bulletsRef.current.push({
        id: beamId,
        x: player.x + (player.facing === 'right' ? player.width : -100),
        y: player.y + 10,
        vx: player.facing === 'right' ? 12 : -12,
        vy: 0,
        width: 180,
        height: 60,
        damage: 180,
        isSuper: true,
      });

      // Spawn mega particle effects
      spawnDustParticles(player.x + player.width / 2, player.y + player.height / 2, 'SUPER_FX', 25);
    } else {
      addLog('SUPER METER NOT CHARGED YET!');
    }
  };

  // Particle creator helper
  const spawnDustParticles = (x: number, y: number, type: 'DUST' | 'SPARK' | 'PARRY_FX' | 'EXPLOSION' | 'SUPER_FX', count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (type === 'SUPER_FX' || type === 'PARRY_FX' ? 6 : 3) + 1;
      particlesRef.current.push({
        id: `${type}-${Date.now()}-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'DUST' ? 1 : 0),
        size: Math.random() * (type === 'SUPER_FX' ? 12 : 6) + 3,
        color: type === 'PARRY_FX' ? '#ff00aa' : type === 'SUPER_FX' ? '#00ffcc' : type === 'EXPLOSION' ? '#f59e0b' : '#ffffff',
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 20 + 15,
        type,
      });
    }
  };

  // Initialize and Reset Game
  const startBattle = () => {
    // reset entities
    playerRef.current = {
      x: 150,
      y: GROUND_Y - 64,
      width: 48,
      height: 64,
      vx: 0,
      vy: 0,
      hp: 3,
      maxHp: 3,
      state: 'IDLE',
      facing: 'right',
      isGrounded: true,
      dashCooldown: 0,
      dashTimer: 0,
      invincibilityTimer: 0,
      superMeter: 45, // give head start
      score: 0,
      parryActiveTimer: 0,
    };

    bossRef.current = {
      x: 600,
      y: 80,
      width: 140,
      height: 310,
      hp: 1200,
      maxHp: 1200,
      state: 'INTRO',
      attackTimer: 0,
      bobTimer: 0,
    };

    bulletsRef.current = [];
    attacksRef.current = [];
    particlesRef.current = [];

    onScoreUpdate(0);
    onHpUpdate(3);
    onSuperUpdate(45);
    onBossHpUpdate(1200, 1200);

    setGameState('PLAYING');
    onGameStateChange('PLAYING');
    setParriedCount(0);
    setDamageDealt(0);
    cupheadAudio.stopBGM();
    cupheadAudio.startBGM();
    addLog('AUP! THE BATTLE BEGANS!');
  };

  // Core Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameId: number;

    const updateAndDraw = () => {
      gameTickRef.current++;
      const tick = gameTickRef.current;

      // --- PHYSICS & LOGIC UPDATE ---
      if (gameState === 'PLAYING') {
        const player = playerRef.current;
        const boss = bossRef.current;

        // Decrement timers
        if (player.dashCooldown > 0) player.dashCooldown--;
        if (player.invincibilityTimer > 0) player.invincibilityTimer--;
        if (player.parryActiveTimer && player.parryActiveTimer > 0) {
          player.parryActiveTimer--;
        }

        // 1. Handle Player Air Dash
        if (player.state === 'DASHING') {
          player.dashTimer--;
          player.vx = player.facing === 'right' ? 10 : -10;
          player.vy = 0; // lock gravity

          // Spawn dash dust trail
          if (tick % 3 === 0) {
            particlesRef.current.push({
              id: `dash-trail-${tick}`,
              x: player.x + player.width / 2,
              y: player.y + player.height / 2,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              size: Math.random() * 8 + 4,
              color: '#aaaaaa',
              alpha: 0.6,
              life: 0,
              maxLife: 15,
              type: 'DUST',
            });
          }

          if (player.dashTimer <= 0) {
            player.state = 'IDLE';
            player.vx = 0;
          }
        } else {
          // Regular walking left/right
          let moveSpeed = 4.5;
          if (keysRef.current['a'] || keysRef.current['arrowleft']) {
            player.vx = -moveSpeed;
            player.facing = 'left';
            if (player.isGrounded) player.state = 'RUNNING';
          } else if (keysRef.current['d'] || keysRef.current['arrowright']) {
            player.vx = moveSpeed;
            player.facing = 'right';
            if (player.isGrounded) player.state = 'RUNNING';
          } else {
            player.vx = 0;
            if (player.isGrounded) player.state = 'IDLE';
          }

          // Crouching state
          if (keysRef.current['s'] || keysRef.current['arrowdown']) {
            player.state = 'CROUCHING';
            player.vx *= 0.3; // walk ultra slow when ducking
          }

          // Air Dash trigger key (Shift or K)
          if (keysRef.current['shift'] || keysRef.current['k']) {
            triggerDash();
          }

          // Gravity application
          player.vy += GRAVITY;
          player.y += player.vy;
          player.x += player.vx;

          // Floor boundary check
          const currentHeight = player.state === 'CROUCHING' ? 44 : 64;
          if (player.y + currentHeight >= GROUND_Y) {
            player.y = GROUND_Y - currentHeight;
            player.vy = 0;
            player.isGrounded = true;
            if (player.state === 'JUMPING') {
              player.state = 'IDLE';
            }
          } else {
            player.isGrounded = false;
          }

          // Wall barriers check
          if (player.x < 10) player.x = 10;
          if (player.x + player.width > CANVAS_WIDTH - 10) {
            player.x = CANVAS_WIDTH - player.width - 10;
          }
        }

        // 2. Weapon shooting logic (Hold F or Z key to fire)
        if (keysRef.current['f'] || keysRef.current['z']) {
          const shootInterval = weapon === 'PEASHOOTER' ? 7 : 12;
          if (tick % shootInterval === 0) {
            // Determine aiming orientation
            let aimY = 0;
            let aimX = player.facing === 'right' ? 1 : -1;

            if (keysRef.current['w'] || keysRef.current['arrowup']) {
              aimY = -1;
              if (!(keysRef.current['a'] || keysRef.current['d'] || keysRef.current['arrowleft'] || keysRef.current['arrowright'])) {
                aimX = 0; // straight up
              }
            }

            if (weapon === 'PEASHOOTER') {
              // Standard blue pea shooter
              bulletsRef.current.push({
                id: `peashooter-${tick}-${Math.random()}`,
                x: player.x + (player.facing === 'right' ? player.width : -10),
                y: player.y + (player.state === 'CROUCHING' ? 25 : 18) + (aimY < 0 ? -15 : 0),
                vx: aimX * 9,
                vy: aimY * 9,
                width: 14,
                height: 10,
                damage: 14,
              });
              cupheadAudio.playPeashooter();
            } else {
              // Spreadshot: 3 diverging bullets
              const baseAngle = Math.atan2(aimY, aimX);
              const angles = [baseAngle - 0.25, baseAngle, baseAngle + 0.25];
              angles.forEach((ang, i) => {
                bulletsRef.current.push({
                  id: `spread-${tick}-${i}-${Math.random()}`,
                  x: player.x + (player.facing === 'right' ? player.width : -10),
                  y: player.y + (player.state === 'CROUCHING' ? 25 : 18),
                  vx: Math.cos(ang) * 8.5,
                  vy: Math.sin(ang) * 8.5,
                  width: 12,
                  height: 12,
                  damage: 9, // lower damage but multi-hit potential
                });
              });
              cupheadAudio.playSpread();
            }
          }
        }

        // 3. Boss Artificial Intelligence State Machine (The Psychic Carrot!)
        boss.bobTimer += 0.05;
        const bobOffset = Math.sin(boss.bobTimer) * 12;

        if (boss.state === 'INTRO') {
          boss.x = CANVAS_WIDTH - boss.width - 40;
          boss.y = 70 + bobOffset;
          boss.attackTimer++;
          if (boss.attackTimer > 100) {
            boss.state = 'PHASE1';
            boss.attackTimer = 0;
            addLog('BOSS PHASE 1: BABY CARROTS!');
          }
        } else if (boss.state === 'PHASE1') {
          boss.y = 70 + bobOffset;
          boss.attackTimer++;

          // Every 60 frames, spawn a homing baby crying carrot
          if (boss.attackTimer % 70 === 0) {
            cupheadAudio.playPsywave();
            const cryCarrotId = `baby-${tick}`;
            attacksRef.current.push({
              id: cryCarrotId,
              type: 'CARROT_MISSILE',
              x: boss.x + 20,
              y: boss.y + 120 + (Math.random() * 60 - 30),
              width: 32,
              height: 20,
              vx: -1.8,
              vy: (player.y - (boss.y + 120)) * 0.003, // crude homing
              isParryable: Math.random() < 0.25, // 25% chance of pink parryable!
              hp: 20, // can be shot down
            });
            spawnDustParticles(boss.x + 10, boss.y + 120, 'DUST', 4);
          }

          // Transition to Phase 2 at 75% HP
          if (boss.hp < boss.maxHp * 0.75) {
            boss.state = 'PHASE2';
            boss.attackTimer = 0;
            addLog('★ BOSS PHASE 2: THIRD EYE OPEN! ★');
            spawnDustParticles(boss.x + boss.width / 2, boss.y + 120, 'SUPER_FX', 15);
          }
        } else if (boss.state === 'PHASE2') {
          boss.y = 70 + bobOffset;
          boss.attackTimer++;

          // Open third eye on forehead and fire Expanding Psychic Rings
          // 25% of rings are pink parryable!
          if (boss.attackTimer % 95 === 0) {
            cupheadAudio.playPsywave();
            addLog('BOSS CASTS: PSYCHIC RING ATTACK');
            const isPink = Math.random() < 0.35; // 35% chance of pink parryable

            attacksRef.current.push({
              id: `ring-${tick}`,
              type: 'PSYCHIC_RING',
              x: boss.x - 20,
              y: boss.y + 60, // Forehead region
              width: 45,
              height: 45,
              vx: -3.8,
              vy: (player.y - (boss.y + 60)) * 0.004, // light homing
              isParryable: isPink,
            });
            spawnDustParticles(boss.x - 10, boss.y + 60, 'SPARK', 5);
          }

          // Transition to Phase 3 at 40% HP
          if (boss.hp < boss.maxHp * 0.4) {
            boss.state = 'PHASE3';
            boss.attackTimer = 0;
            addLog('⚡ BOSS FINAL PHASE: PSYCHIC STORM! ⚡');
            spawnDustParticles(boss.x + boss.width / 2, boss.y + 150, 'EXPLOSION', 20);
          }
        } else if (boss.state === 'PHASE3') {
          boss.y = 70 + bobOffset;
          boss.attackTimer++;

          // Mega storm combination attack
          // Spawn rapid psychic tears raining from above (some are Pink!)
          if (boss.attackTimer % 22 === 0) {
            const rx = Math.random() * (CANVAS_WIDTH - 250) + 40;
            attacksRef.current.push({
              id: `tear-${tick}-${Math.random()}`,
              type: 'TEAR_DROP',
              x: rx,
              y: -30,
              width: 16,
              height: 24,
              vx: 0.5,
              vy: 4.5,
              isParryable: Math.random() < 0.22, // pink tears!
            });
          }

          // Occasionally spawn a floating homing carrot
          if (boss.attackTimer % 130 === 0) {
            cupheadAudio.playPsywave();
            attacksRef.current.push({
              id: `stormcar-${tick}`,
              type: 'CARROT_MISSILE',
              x: boss.x,
              y: boss.y + 120,
              width: 32,
              height: 20,
              vx: -3,
              vy: (player.y - (boss.y + 120)) * 0.005,
              isParryable: Math.random() < 0.3,
              hp: 15,
            });
          }
        }

        // 4. Update and check Player's bullets
        const updatedBullets: Bullet[] = [];
        bulletsRef.current.forEach(bullet => {
          bullet.x += bullet.vx;
          bullet.y += bullet.vy;

          let hitBoss = false;

          // Check hit against boss
          if (
            bullet.x + bullet.width > boss.x + 30 &&
            bullet.x < boss.x + boss.width - 20 &&
            bullet.y + bullet.height > boss.y + 20 &&
            bullet.y < boss.y + boss.height - 30 &&
            boss.state !== 'DEFEATED' && boss.state !== 'INTRO'
          ) {
            // Apply damage
            boss.hp = Math.max(0, boss.hp - bullet.damage);
            onBossHpUpdate(boss.hp, boss.maxHp);
            setDamageDealt(d => d + bullet.damage);

            // Charge super meter (1.5% per damage hit)
            player.superMeter = Math.min(100, player.superMeter + 0.9);
            onSuperUpdate(player.superMeter);

            hitBoss = true;

            // Sparks particles
            spawnDustParticles(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 'SPARK', 3);

            // Trigger score
            player.score += 15;
            onScoreUpdate(player.score);

            // Check if defeated
            if (boss.hp <= 0) {
              boss.state = 'DEFEATED';
              setGameState('VICTORY');
              onGameStateChange('VICTORY');
              cupheadAudio.stopBGM();
              cupheadAudio.playKnockout();
              addLog('★★★ KNOCKOUT! ★★★');
              spawnDustParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, 'EXPLOSION', 45);
            }
          }

          // Check bullet hit against shootable baby carrots
          const initialCarrotsCount = attacksRef.current.length;
          attacksRef.current = attacksRef.current.filter(atk => {
            if (atk.type === 'CARROT_MISSILE' && atk.hp !== undefined) {
              const dx = (bullet.x + bullet.width / 2) - (atk.x + atk.width / 2);
              const dy = (bullet.y + bullet.height / 2) - (atk.y + atk.height / 2);
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 32) {
                atk.hp -= bullet.damage;
                hitBoss = true; // destroy bullet
                if (atk.hp <= 0) {
                  spawnDustParticles(atk.x + atk.width / 2, atk.y + atk.height / 2, 'EXPLOSION', 6);
                  player.score += 100;
                  onScoreUpdate(player.score);
                  return false; // remove carrot
                }
              }
            }
            return true;
          });

          // Keep bullet if it didn't hit and is within screen bounds
          if (!hitBoss && bullet.x > -200 && bullet.x < CANVAS_WIDTH + 200 && bullet.y > -200 && bullet.y < CANVAS_HEIGHT + 200) {
            updatedBullets.push(bullet);
          }
        });
        bulletsRef.current = updatedBullets;

        // 5. Update and check Boss Attacks objects
        const updatedAttacks: AttackObject[] = [];
        attacksRef.current.forEach(atk => {
          // simple move physics
          atk.x += atk.vx;
          atk.y += atk.vy;

          let hitPlayer = false;

          // Check collision with player
          if (
            atk.x + atk.width > player.x + 8 &&
            atk.x < player.x + player.width - 8 &&
            atk.y + atk.height > player.y + 5 &&
            atk.y < player.y + player.height - 5
          ) {
            // Priority: Check if this is a pink parryable object, and the player is in mid-air AND either they pressed jump recently or they are holding/pressing the parry key!
            if (atk.isParryable && !player.isGrounded && ((player.parryActiveTimer && player.parryActiveTimer > 0) || keysRef.current[' '] || keysRef.current['j'])) {
              // Trigger Parry Success!
              spawnDustParticles(atk.x + atk.width / 2, atk.y + atk.height / 2, 'PARRY_FX', 15);
              player.vy = -10; // bounce player up
              player.superMeter = Math.min(100, player.superMeter + 35);
              onSuperUpdate(player.superMeter);
              player.score += 500;
              onScoreUpdate(player.score);
              setParriedCount(c => c + 1);
              cupheadAudio.playParry();
              addLog('★ EXCELLENT PARRY! ★');
              
              // Reset parry active timer so they don't automatically parry multiple items instantly
              player.parryActiveTimer = 0;
              hitPlayer = true; // remove the object
            } else if (player.invincibilityTimer <= 0 && player.state !== 'DASHING') {
              // Take damage!
              player.hp = Math.max(0, player.hp - 1);
              onHpUpdate(player.hp);
              player.invincibilityTimer = 65; // temporary invincibility
              cupheadAudio.playHit();
              addLog('OUCH! CUPHEAD TOOK DAMAGE!');
              spawnDustParticles(player.x + player.width / 2, player.y + player.height / 2, 'EXPLOSION', 12);

              if (player.hp <= 0) {
                setGameState('GAMEOVER');
                onGameStateChange('GAMEOVER');
                cupheadAudio.stopBGM();
                cupheadAudio.playDefeat();
                addLog('GAME OVER: YOU DIED');
              }
              hitPlayer = true;
            }
          }

          // Keep attack if it did not hit player and is still on screen
          if (!hitPlayer && atk.x > -100 && atk.x < CANVAS_WIDTH + 100 && atk.y < CANVAS_HEIGHT + 50) {
            updatedAttacks.push(atk);
          }
        });
        attacksRef.current = updatedAttacks;

        // 6. Update visual background particles
        particlesRef.current = particlesRef.current.map(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          p.alpha = Math.max(0, 1.0 - p.life / p.maxLife);
          return p;
        }).filter(p => p.life < p.maxLife);
      }

      // --- CANVAS DRAWING (VINTAGE 1930s STYLING) ---
      ctx.fillStyle = '#1e1c16'; // Sepia tone background
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Simple yellow paper/canvas texture vignette
      ctx.fillStyle = 'rgba(235, 215, 175, 0.08)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw stage background: vintage sketchy mountains, floor line
      ctx.strokeStyle = 'rgba(60, 45, 30, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Ground horizontal line
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Sketchy cartoon bushes/hills in background
      ctx.beginPath();
      ctx.arc(150, GROUND_Y, 80, Math.PI, 0);
      ctx.arc(320, GROUND_Y, 110, Math.PI, 0);
      ctx.arc(500, GROUND_Y, 90, Math.PI, 0);
      ctx.stroke();

      // Ground brick hatching lines
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y);
        ctx.lineTo(i - 10, CANVAS_HEIGHT);
        ctx.stroke();
      }

      const player = playerRef.current;
      const boss = bossRef.current;

      // Draw Boss (Psycarrot!)
      if (boss.state !== 'DEFEATED') {
        ctx.save();
        // Squish and stretch idle animation
        const bossSquishX = 1 + Math.sin(boss.bobTimer) * 0.02;
        const bossSquishY = 1 - Math.sin(boss.bobTimer) * 0.03;

        ctx.translate(boss.x + boss.width / 2, boss.y + boss.height);
        ctx.scale(bossSquishX, bossSquishY);
        ctx.translate(-(boss.x + boss.width / 2), -(boss.y + boss.height));

        // 1. Leafy green stems at top of head
        ctx.fillStyle = '#4c613c'; // sepia dark green
        ctx.strokeStyle = '#232a1d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(boss.x + 30, boss.y + 40);
        ctx.quadraticCurveTo(boss.x - 30, boss.y - 40, boss.x + 10, boss.y - 50);
        ctx.quadraticCurveTo(boss.x + 40, boss.y - 10, boss.x + 50, boss.y + 30);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(boss.x + 70, boss.y + 20);
        ctx.quadraticCurveTo(boss.x + 70, boss.y - 70, boss.x + 90, boss.y - 80);
        ctx.quadraticCurveTo(boss.x + 110, boss.y - 20, boss.x + 90, boss.y + 20);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(boss.x + 110, boss.y + 40);
        ctx.quadraticCurveTo(boss.x + 170, boss.y - 40, boss.x + 130, boss.y - 50);
        ctx.quadraticCurveTo(boss.x + 100, boss.y - 10, boss.x + 90, boss.y + 40);
        ctx.fill();
        ctx.stroke();

        // 2. Carrot tapering body shape
        ctx.fillStyle = '#cc7a3a'; // sepia deep carrot orange
        ctx.strokeStyle = '#3d2210';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(boss.x + 15, boss.y + 40);
        ctx.bezierCurveTo(
          boss.x + 20, boss.y + 350,
          boss.x + 120, boss.y + 350,
          boss.x + boss.width - 15, boss.y + 40
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Horizontal ridge details on body (characteristic of carrots and 1930s hatching)
        ctx.strokeStyle = 'rgba(61, 34, 16, 0.4)';
        ctx.lineWidth = 3;
        for (let yOffset = 100; yOffset < 280; yOffset += 35) {
          ctx.beginPath();
          ctx.moveTo(boss.x + 25, boss.y + yOffset);
          ctx.quadraticCurveTo(boss.x + 60, boss.y + yOffset + 10, boss.x + boss.width - 25, boss.y + yOffset);
          ctx.stroke();
        }

        // 3. Boss Face expressions
        // Furrowed brow / Eyebrows
        ctx.strokeStyle = '#3d2210';
        ctx.lineWidth = 5;
        ctx.fillStyle = '#3d2210';
        ctx.beginPath();
        ctx.moveTo(boss.x + 25, boss.y + 80);
        ctx.lineTo(boss.x + 65, boss.y + 105);
        ctx.moveTo(boss.x + boss.width - 25, boss.y + 80);
        ctx.lineTo(boss.x + boss.width - 65, boss.y + 105);
        ctx.stroke();

        // Angry Eyes
        ctx.fillStyle = '#eae2cd'; // off white eyeball
        ctx.beginPath();
        ctx.arc(boss.x + 45, boss.y + 115, 18, 0, Math.PI * 2);
        ctx.arc(boss.x + boss.width - 45, boss.y + 115, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 1930s Pacman pie-cut pupils!
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(boss.x + 48, boss.y + 115, 8, 0, Math.PI * 2);
        ctx.arc(boss.x + boss.width - 48, boss.y + 115, 8, 0, Math.PI * 2);
        ctx.fill();

        // Giant Laughing / Screaming Mouth
        ctx.fillStyle = '#1a0d05';
        ctx.beginPath();
        ctx.moveTo(boss.x + 35, boss.y + 155);
        ctx.quadraticCurveTo(boss.x + boss.width / 2, boss.y + 245, boss.x + boss.width - 35, boss.y + 155);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Big retro cartoon teeth
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(boss.x + 55, boss.y + 155, 18, 12);
        ctx.strokeRect(boss.x + 55, boss.y + 155, 18, 12);
        ctx.fillRect(boss.x + boss.width - 73, boss.y + 155, 18, 12);
        ctx.strokeRect(boss.x + boss.width - 73, boss.y + 155, 18, 12);

        // Pink/red tongue inside mouth
        ctx.fillStyle = '#cc5c5c';
        ctx.beginPath();
        ctx.arc(boss.x + boss.width / 2, boss.y + 195, 18, Math.PI, 0);
        ctx.fill();

        // 4. Forehead third eye (Open in Phase 2 & 3!)
        if (boss.state === 'PHASE2' || boss.state === 'PHASE3') {
          // Glow effect
          ctx.shadowColor = '#ff00aa';
          ctx.shadowBlur = Math.sin(tick * 0.1) * 15 + 10;

          // Eyelid
          ctx.fillStyle = '#3d2210';
          ctx.beginPath();
          ctx.arc(boss.x + boss.width / 2, boss.y + 55, 18, 0, Math.PI * 2);
          ctx.fill();

          // Sclera (Glowing Pink!)
          ctx.fillStyle = '#ff00aa';
          ctx.beginPath();
          ctx.arc(boss.x + boss.width / 2, boss.y + 55, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Pupil
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(boss.x + boss.width / 2, boss.y + 55, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0; // reset shadow
        }

        ctx.restore();
      }

      // Draw Player (Cuphead!)
      ctx.save();
      // Squish bouncing movement based on running/idle
      const bounceScalar = player.state === 'DASHING' ? 1.0 : 1 + Math.sin(tick * 0.18) * 0.04;
      const bounceX = player.facing === 'right' ? bounceScalar : -bounceScalar;

      ctx.translate(player.x + player.width / 2, player.y + player.height);
      ctx.scale(bounceX, 2 - bounceScalar);
      ctx.translate(-(player.x + player.width / 2), -(player.y + player.height));

      // Invincibility flashing
      if (player.invincibilityTimer <= 0 || Math.floor(tick / 4) % 2 === 0) {
        // Red shorts fill, black body outline
        const outlineColor = '#1d1912';

        // 1. Straw (Striped handle cylinder)
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 3.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(player.x + 24, player.y - 12, 10, Math.PI * 1.3, Math.PI * 0.1);
        ctx.stroke();

        // straw cylinder
        ctx.fillStyle = '#e14d4d'; // Red stripes
        ctx.fillRect(player.x + 20, player.y - 15, 8, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.x + 20, player.y - 8, 8, 4);
        ctx.strokeRect(player.x + 20, player.y - 15, 8, 14);

        // 2. Giant Cup Head
        ctx.fillStyle = '#eae2cd'; // vintage white
        ctx.beginPath();
        ctx.moveTo(player.x + 4, player.y + 5);
        ctx.bezierCurveTo(
          player.x - 2, player.y + 35,
          player.x + 50, player.y + 35,
          player.x + 44, player.y + 5
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rim cup lip
        ctx.beginPath();
        ctx.ellipse(player.x + 24, player.y + 4, 20, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. Black pie eyes & nose
        ctx.fillStyle = outlineColor;
        // left eye
        ctx.beginPath();
        ctx.ellipse(player.x + 16, player.y + 14, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // right eye
        ctx.beginPath();
        ctx.ellipse(player.x + 30, player.y + 14, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // White cut-out pupils pie eyes look
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(player.x + 16, player.y + 14);
        ctx.lineTo(player.x + 19, player.y + 8);
        ctx.lineTo(player.x + 13, player.y + 8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(player.x + 30, player.y + 14);
        ctx.lineTo(player.x + 33, player.y + 8);
        ctx.lineTo(player.x + 27, player.y + 8);
        ctx.closePath();
        ctx.fill();

        // Black oval nose
        ctx.fillStyle = outlineColor;
        ctx.beginPath();
        ctx.ellipse(player.x + 23, player.y + 20, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Laughing Mouth
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x + 23, player.y + 22, 6, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // 4. Black bendy rubber-hose limbs & hands
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 5.5;
        // Legs
        ctx.beginPath();
        ctx.moveTo(player.x + 16, player.y + 42);
        ctx.lineTo(player.x + 14, player.y + 55);
        ctx.moveTo(player.x + 32, player.y + 42);
        ctx.lineTo(player.x + 34, player.y + 55);
        ctx.stroke();

        // 5. High-waisted Red shorts
        ctx.fillStyle = '#e14d4d'; // bright 1930s red
        ctx.beginPath();
        ctx.arc(player.x + 24, player.y + 38, 14, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shorts leg openings (two round ovals)
        ctx.fillRect(player.x + 12, player.y + 38, 10, 8);
        ctx.strokeRect(player.x + 12, player.y + 38, 10, 8);
        ctx.fillRect(player.x + 26, player.y + 38, 10, 8);
        ctx.strokeRect(player.x + 26, player.y + 38, 10, 8);

        // Yellow round cartoon shoes
        ctx.fillStyle = '#e8bc3e'; // yellow-gold
        ctx.beginPath();
        ctx.ellipse(player.x + 12, player.y + 57, 9, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(player.x + 36, player.y + 57, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White gloves/hands
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(player.x + 5, player.y + 35, 6, 0, Math.PI * 2);
        ctx.arc(player.x + 43, player.y + 35, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();

      // Draw Player Bullets
      bulletsRef.current.forEach(bullet => {
        ctx.save();
        if (bullet.isSuper) {
          // Glowing green energy blast wave
          ctx.fillStyle = '#00ffcc';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(bullet.x, bullet.y + bullet.height / 2);
          ctx.bezierCurveTo(
            bullet.x + 60, bullet.y - 20,
            bullet.x + 120, bullet.y - 20,
            bullet.x + bullet.width, bullet.y + bullet.height / 2
          );
          ctx.bezierCurveTo(
            bullet.x + 120, bullet.y + bullet.height + 20,
            bullet.x + 60, bullet.y + bullet.height + 20,
            bullet.x, bullet.y + bullet.height / 2
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // internal lightning streaks
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bullet.x + 10, bullet.y + bullet.height / 2);
          ctx.lineTo(bullet.x + bullet.width - 20, bullet.y + bullet.height / 2);
          ctx.stroke();
        } else {
          // Regular peashooter cyan spheres or yellow spread drops
          ctx.fillStyle = weapon === 'PEASHOOTER' ? '#38bdf8' : '#facc15';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2 + 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });

      // Draw Boss Attack Objects
      attacksRef.current.forEach(atk => {
        ctx.save();

        if (atk.isParryable) {
          // GLOWING PINK color to indicate parryability!
          ctx.shadowColor = '#ff00aa';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ff00aa';
          ctx.strokeStyle = '#ffffff';
        } else {
          ctx.fillStyle = atk.type === 'CARROT_MISSILE' ? '#ea580c' : atk.type === 'TEAR_DROP' ? '#38bdf8' : '#d946ef';
          ctx.strokeStyle = '#23252f';
        }
        ctx.lineWidth = 2.5;

        if (atk.type === 'CARROT_MISSILE') {
          // Small cartoon baby carrot homing missile with crying eyes!
          ctx.beginPath();
          ctx.moveTo(atk.x + atk.width, atk.y + atk.height / 2);
          ctx.lineTo(atk.x, atk.y);
          ctx.lineTo(atk.x, atk.y + atk.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Green leaf tuft at end
          ctx.fillStyle = '#4c613c';
          ctx.fillRect(atk.x - 5, atk.y + atk.height / 2 - 3, 6, 6);

          // Crying eye stream tears
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(atk.x + 5, atk.y + atk.height / 2 + 2, 2, 2);
        } else if (atk.type === 'PSYCHIC_RING') {
          // Concentric magical psychic rings
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(atk.x + atk.width / 2, atk.y + atk.height / 2, atk.width / 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(atk.x + atk.width / 2, atk.y + atk.height / 2, atk.width / 4, 0, Math.PI * 2);
          ctx.stroke();
        } else if (atk.type === 'TEAR_DROP') {
          // Raining tear drops
          ctx.beginPath();
          ctx.moveTo(atk.x + atk.width / 2, atk.y);
          ctx.bezierCurveTo(
            atk.x - atk.width / 2, atk.y + atk.height / 2,
            atk.x - atk.width / 2, atk.y + atk.height,
            atk.x + atk.width / 2, atk.y + atk.height
          );
          ctx.bezierCurveTo(
            atk.x + atk.width * 1.5, atk.y + atk.height,
            atk.x + atk.width * 1.5, atk.y + atk.height / 2,
            atk.x + atk.width / 2, atk.y
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.type === 'PARRY_FX') {
          // Circular rings expanding outward
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife * 3), 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.type === 'EXPLOSION') {
          // Cartoon star-bursts
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            ctx.lineTo(p.x + Math.cos(angle) * p.size, p.y + Math.sin(angle) * p.size);
            ctx.lineTo(p.x + Math.cos(angle + 0.3) * (p.size / 2), p.y + Math.sin(angle + 0.3) * (p.size / 2));
          }
          ctx.closePath();
          ctx.fill();
        } else {
          // Regular dust clouds / specs
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // --- VINTAGE NOISE OVERLAY FILTER ---
      // Adds authentic movie scratches, hairs, and flickering grey scanlines!
      ctx.save();
      // Sepia overlay tint
      ctx.fillStyle = 'rgba(120, 80, 20, 0.04)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Vintage film hair line
      if (Math.random() < 0.12) {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = Math.random() * 1.5;
        ctx.beginPath();
        const rx = Math.random() * CANVAS_WIDTH;
        ctx.moveTo(rx, 0);
        ctx.quadraticCurveTo(rx + Math.random() * 40 - 20, CANVAS_HEIGHT / 2, rx + Math.random() * 20 - 10, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Random film specs dust
      if (Math.random() < 0.35) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, Math.random() * 4 + 2, Math.random() * 4 + 2);
      }

      // Dynamic light flickers
      ctx.fillStyle = `rgba(255,255,255, ${Math.random() * 0.035})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.restore();

      // Continue the frame loop
      localFrameId = requestAnimationFrame(updateAndDraw);
    };

    localFrameId = requestAnimationFrame(updateAndDraw);
    animationFrameId.current = localFrameId;

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState, weapon, isMuted]);

  // Mobile virtual buttons handlers
  const handleVirtualKeyDown = (k: string) => {
    keysRef.current[k] = true;
  };

  const handleVirtualKeyUp = (k: string) => {
    keysRef.current[k] = false;
  };

  const handleVirtualJumpPress = () => {
    handleJumpKeyPress();
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 select-none">
      
      {/* Immersive 1930s Cartoon stage display screen */}
      <div className="w-full relative bg-gray-950/70 rounded-xl border border-yellow-950/45 p-1.5 shadow-[0_0_50px_rgba(204,122,58,0.18)]">
        
        {/* Absolute Ribbon labels */}
        <div className="absolute -top-3.5 left-6 bg-yellow-950/80 text-yellow-100 border border-yellow-700/50 px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest z-20">
          ★ INKWELL ISLE I • BOSS FIGHT ★
        </div>

        {/* Vintage glass reflection gradient container */}
        <div className="relative overflow-hidden rounded-lg">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full max-w-full aspect-[16/9] object-contain block rounded bg-amber-950"
          />

          {/* INTRO SCREEN OVERLAY */}
          {gameState === 'INTRO' && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-30">
              {/* Cuphead stylized banner logo */}
              <div className="space-y-1 mb-6 max-w-md">
                <span className="text-amber-500 font-bold uppercase tracking-widest text-[11px]">THE 1930s RETRO REVIVAL</span>
                <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase font-display filter drop-shadow-[0_4px_8px_rgba(245,158,11,0.5)]">
                  CUPHEAD MINI
                </h2>
                <p className="text-xs text-amber-100/60 leading-relaxed font-mono">
                  Take on the colossal Psychic Carrot! Run, dodge, parry pink elements, and unleash massive EX blasts to secure the victory!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={startBattle}
                  className="px-8 py-3 bg-[#e14d4d] hover:bg-[#ff5555] text-white font-black rounded border-2 border-white shadow-lg text-sm uppercase tracking-wider flex items-center gap-2 transform active:scale-95 transition"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START WALLOP!</span>
                </button>
              </div>
            </div>
          )}

          {/* GAME OVER SCREEN OVERLAY */}
          {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
              <div className="space-y-2 mb-6 max-w-xs">
                <p className="text-red-500 text-xs font-bold uppercase tracking-widest">YOU DIED!</p>
                <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter uppercase font-display italic">
                  YOU FAILED!
                </h3>
                <p className="text-xs text-red-200/60 leading-relaxed">
                  Don't lose your cup! Practice your mid-air parry on the pink rings to survive Psycarrot's attacks!
                </p>
              </div>

              <button
                onClick={startBattle}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded border-2 border-white text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          )}

          {/* VICTORY SCREEN OVERLAY */}
          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 bg-yellow-950/90 flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
              <div className="space-y-2 mb-6 max-w-sm">
                <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">★★★ A KNOCKOUT! ★★★</p>
                <h3 className="text-4xl md:text-5xl font-extrabold text-[#00ffcc] tracking-tighter uppercase font-display italic drop-shadow-[0_2px_10px_rgba(0,255,204,0.4)]">
                  YOU WON!
                </h3>
                <div className="bg-[#111] p-3 rounded border border-yellow-600/30 text-xs text-gray-300 space-y-1 text-left font-mono">
                  <p className="text-yellow-500 font-bold uppercase mb-1">BATTLE REPORT STATS:</p>
                  <p>• PARRY COUNTS: <span className="text-[#00ffcc] font-bold">{parriedCount} / 3</span></p>
                  <p>• FINAL SCORE: <span className="text-[#00ffcc] font-bold">{playerRef.current.score.toLocaleString()} PTS</span></p>
                  <p>• GRADE ACHIEVEMENT: <span className="text-green-400 font-black">{parriedCount >= 3 ? 'A+' : parriedCount >= 1 ? 'A' : 'B-'}</span></p>
                </div>
              </div>

              <button
                onClick={startBattle}
                className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded border-2 border-white text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIRTUAL MOBILE CONTROLLERS overlay (Responsive - shows for touch players but also nice desktop layout!) */}
      <div className="w-full bg-[#05050a] border border-[#1a1a2e] rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1a2e] pb-2 text-xs">
          <span className="text-[#4d4d70] uppercase font-bold tracking-wider">VIRTUAL ARCADE PANEL</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="px-2.5 py-1 bg-[#1a1a2e] hover:bg-purple-950/30 text-gray-400 hover:text-white rounded border border-[#1a1a2e] flex items-center gap-1 text-[11px]"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-green-500" />}
              <span>{isMuted ? '음소거' : '소리 켜짐'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic touch layout controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* DIRECTION pad */}
          <div className="flex items-center justify-center gap-3 bg-[#111] p-3 rounded border border-gray-900/60">
            <button
              onMouseDown={() => handleVirtualKeyDown('a')}
              onMouseUp={() => handleVirtualKeyUp('a')}
              onTouchStart={() => handleVirtualKeyDown('a')}
              onTouchEnd={() => handleVirtualKeyUp('a')}
              className="w-12 h-12 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-300 font-bold rounded flex items-center justify-center active:scale-95 select-none"
            >
              ◀
            </button>
            
            <div className="flex flex-col gap-3">
              <button
                onMouseDown={() => handleVirtualKeyDown('w')}
                onMouseUp={() => handleVirtualKeyUp('w')}
                onTouchStart={() => handleVirtualKeyDown('w')}
                onTouchEnd={() => handleVirtualKeyUp('w')}
                className="w-12 h-12 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-300 font-bold rounded flex items-center justify-center active:scale-95 select-none"
              >
                ▲
              </button>
              <button
                onMouseDown={() => handleVirtualKeyDown('s')}
                onMouseUp={() => handleVirtualKeyUp('s')}
                onTouchStart={() => handleVirtualKeyDown('s')}
                onTouchEnd={() => handleVirtualKeyUp('s')}
                className="w-12 h-12 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-300 font-bold rounded flex items-center justify-center active:scale-95 select-none"
              >
                ▼
              </button>
            </div>

            <button
              onMouseDown={() => handleVirtualKeyDown('d')}
              onMouseUp={() => handleVirtualKeyUp('d')}
              onTouchStart={() => handleVirtualKeyDown('d')}
              onTouchEnd={() => handleVirtualKeyUp('d')}
              className="w-12 h-12 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-300 font-bold rounded flex items-center justify-center active:scale-95 select-none"
            >
              ▶
            </button>
          </div>

          {/* ACTION buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#111] p-3 rounded border border-gray-900/60 text-center">
            
            {/* JUMP / PARRY */}
            <button
              onClick={handleVirtualJumpPress}
              className="py-2.5 bg-[#e8bc3e] hover:bg-amber-400 text-black font-black rounded border border-amber-600 flex flex-col items-center justify-center active:scale-95 transition"
            >
              <span className="text-xs">JUMP / PARRY</span>
              <span className="text-[9px] font-normal opacity-70">(Space / J)</span>
            </button>

            {/* SHOOT weapon (hold trigger toggle) */}
            <button
              onMouseDown={() => handleVirtualKeyDown('f')}
              onMouseUp={() => handleVirtualKeyUp('f')}
              onTouchStart={() => handleVirtualKeyDown('f')}
              onTouchEnd={() => handleVirtualKeyUp('f')}
              className="py-2.5 bg-[#e14d4d] hover:bg-red-500 text-white font-black rounded border border-red-700 flex flex-col items-center justify-center active:scale-95 transition"
            >
              <span className="text-xs">SHOOT FIRE</span>
              <span className="text-[9px] font-normal opacity-70">(Hold F / Z)</span>
            </button>

            {/* DASH air dash */}
            <button
              onClick={triggerDash}
              className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded border border-blue-800 flex flex-col items-center justify-center active:scale-95 transition col-span-2 sm:col-span-1"
            >
              <span className="text-xs">DASH DODGE</span>
              <span className="text-[9px] font-normal opacity-70">(Shift / K)</span>
            </button>

            {/* WEAPON SWITCH */}
            <button
              onClick={() => setWeapon(prev => prev === 'PEASHOOTER' ? 'SPREAD' : 'PEASHOOTER')}
              className="py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-xs border border-gray-700 flex flex-col items-center justify-center active:scale-95 transition"
            >
              <span>기물 교체 (Weapon)</span>
              <span className="text-[9px] font-normal opacity-60">Peashooter ⇆ Spread</span>
            </button>

            {/* EX SUPER BEAM */}
            <button
              onClick={triggerSuperBeam}
              className="py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black font-extrabold rounded text-xs border border-teal-400 flex flex-col items-center justify-center active:scale-95 transition col-span-1"
            >
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-600 fill-red-600 animate-pulse" />
                <span>EX SUPER</span>
              </span>
              <span className="text-[9px] font-normal opacity-80">(Key: V / E)</span>
            </button>

            {/* MANUAL GUIDE BUTTON */}
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className="py-2 bg-gray-900 hover:bg-gray-850 text-cyan-400 rounded text-xs border border-cyan-900/40 flex items-center justify-center font-bold active:scale-95 transition col-span-2 sm:col-span-1"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1" />
              <span>튜토리얼 {showTutorial ? '닫기' : '열기'}</span>
            </button>

          </div>
        </div>

      </div>

      {/* SYSTEM BROADCAST CONSOLE LOGS */}
      <div className="w-full bg-[#05050a] border border-[#1a1a2e] rounded-lg p-4 font-mono">
        <span className="text-xs font-bold text-[#4d4d70] uppercase block border-b border-[#1a1a2e] pb-1.5 mb-2.5">
          SYSTEM BROADCAST CHANNELS
        </span>
        <div className="space-y-1.5 text-[10px] text-[#00ffcc]/70 leading-normal max-h-[140px] overflow-hidden">
          {systemLogs.map((log, index) => (
            <p key={index} className="truncate">
              &gt; {log}
            </p>
          ))}
        </div>
      </div>

      {/* TUTORIAL / INSTRUCTIONS GUIDE PANEL */}
      {showTutorial && (
        <div id="cuphead-tutorial" className="w-full p-5 bg-gray-950 border border-yellow-950/45 rounded-lg text-xs leading-relaxed text-gray-300 space-y-4 shadow-xl">
          <h4 className="font-bold text-sm text-yellow-500 mb-2 flex items-center gap-1.5">
            <Swords className="w-4 h-4" />
            <span>컵헤드 게임 플레이 조작 설명 및 특수 기믹</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="list-disc pl-4 space-y-2">
              <li><strong>좌우 이동</strong>: <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">A</kbd>, <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">D</kbd> 또는 방향키 <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">◀</kbd>, <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">▶</kbd>를 누르면 Cuphead가 좌우로 신나게 뛰며 이동합니다.</li>
              <li><strong>점프 및 공중 패링 (Parry)</strong>: <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">Space</kbd> 혹은 <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">J</kbd> 키를 눌러 점프할 수 있습니다. <strong>중요!</strong> 공중에 떠 있는 동안 보스가 날리는 <span className="text-[#ff00aa] font-bold">분홍색 (Pink)</span> 기물 가까이에서 점프키를 한 번 더 누르면 패링이 성공하며 위로 튕겨 오릅니다!</li>
              <li><strong>대시 회피 (Dash)</strong>: <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">Shift</kbd> 혹은 <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">K</kbd> 키를 눌러 공중 및 지상에서 순간 대시 회피가 가능하며, 대시 상태 중에는 적의 모든 공격에 무적이 됩니다.</li>
              <li><strong>앉기 및 조준</strong>: <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">S</kbd> 혹은 아래 방향키로 엎드려 공격을 피할 수 있고, <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">W</kbd> 혹은 위 방향키와 조합해 하늘 방향으로 대각선 공격이 가능합니다.</li>
            </ul>
            <ul className="list-disc pl-4 space-y-2">
              <li><strong>공격 발사 (Shoot)</strong>: <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">F</kbd> 혹은 <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">Z</kbd> 키를 길게 누르면 총알이 연속해서 자동으로 연사됩니다.</li>
              <li><strong>무기 변경 (Weapon Change)</strong>: <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">C</kbd> 혹은 <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">X</kbd> 키를 누르면 원거리 직선 Peashooter와 부채꼴 Spread 샷 두 무기를 교체해 가며 전술적으로 대항할 수 있습니다.</li>
              <li><strong>EX 필살기 (Super Move)</strong>: 적에게 피해를 입히거나 분홍색 기물 패링에 성공하면 <strong>EX SUPER 게이지가 차오릅니다.</strong> 100% 도달 시 <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">V</kbd> 혹은 <kbd className="bg-gray-950 px-1 py-0.5 rounded border border-gray-800">E</kbd> 키를 누르면 화면 끝까지 관통하는 <strong>초강력 슈퍼 광선 빔</strong>을 발사합니다!</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
};
export default CupheadCanvas;
