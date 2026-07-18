import React, { useEffect, useRef, useState } from 'react';
import {
  GameStatus,
  PlayerShip,
  Alien,
  Bullet,
  Particle,
  Star,
  FloatingText,
  HighScore,
  AlienType,
} from '../types';
import { gameAudio } from './AudioController';
import { Play, RotateCcw, Volume2, VolumeX, Keyboard, HelpCircle } from 'lucide-react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;

interface GameCanvasProps {
  onScoreUpdate: (score: number) => void;
  onLivesUpdate: (lives: number) => void;
  onStageUpdate: (stage: number) => void;
  onStatusUpdate: (status: GameStatus) => void;
  onHighScoresUpdate: (scores: HighScore[]) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onScoreUpdate,
  onLivesUpdate,
  onStageUpdate,
  onStatusUpdate,
  onHighScoresUpdate,
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core Game State
  const [status, setStatus] = useState<GameStatus>('TITLE');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [stage, setStage] = useState<number>(1);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(false);

  // Refs for Game Loop (to prevent closures in requestAnimationFrame)
  const stateRef = useRef({
    status: 'TITLE' as GameStatus,
    score: 0,
    lives: 3,
    stage: 1,
    player: {
      x: CANVAS_WIDTH / 2 - 20,
      y: CANVAS_HEIGHT - 80,
      width: 40,
      height: 40,
      speed: 9,
      lives: 3,
      score: 0,
      isDead: false,
      respawnTimer: 0,
      shootCooldown: 0,
      doubleShip: false,
    } as PlayerShip,
    aliens: [] as Alien[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    stars: [] as Star[],
    floatingTexts: [] as FloatingText[],
    keys: {
      ArrowLeft: false,
      ArrowRight: false,
      KeyA: false,
      KeyD: false,
      Space: false,
      Enter: false,
    } as Record<string, boolean>,
    formationDirection: 1, // 1 for right, -1 for left
    formationOffset: 0,
    formationMaxOffset: 50,
    diveTimer: 0,
    alienShootTimer: 0,
    lastTime: 0,
    stageClearTimer: 0,
    isMobile: false,
    // Touch controls state
    touchLeft: false,
    touchRight: false,
    touchFire: false,
  });

  // Load and Save High Scores
  useEffect(() => {
    const loadedScores = localStorage.getItem('galaga_high_scores');
    if (loadedScores) {
      try {
        const parsed = JSON.parse(loadedScores) as HighScore[];
        setHighScores(parsed);
        onHighScoresUpdate(parsed);
      } catch (e) {
        initializeDefaultScores();
      }
    } else {
      initializeDefaultScores();
    }

    // Detect mobile touch devices
    const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    stateRef.current.isMobile = isMobileDevice;
  }, []);

  const initializeDefaultScores = () => {
    const defaults: HighScore[] = [
      { name: 'CMD', score: 20000, date: '2026-07-17' },
      { name: 'GLG', score: 12000, date: '2026-07-17' },
      { name: 'PILOT', score: 8000, date: '2026-07-17' },
      { name: 'SOLDIER', score: 5000, date: '2026-07-17' },
      { name: 'CADET', score: 2000, date: '2026-07-17' },
    ];
    localStorage.setItem('galaga_high_scores', JSON.stringify(defaults));
    setHighScores(defaults);
    onHighScoresUpdate(defaults);
  };

  const saveHighScore = (newScore: number) => {
    if (newScore <= 0) return;
    const name = prompt('축하합니다! 이름을 입력하세요 (3글자):', 'AAA') || 'AAA';
    const trimmedName = name.slice(0, 3).toUpperCase();
    
    const newRecord: HighScore = {
      name: trimmedName,
      score: newScore,
      date: new Date().toISOString().split('T')[0],
    };

    const updated = [...highScores, newRecord]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    localStorage.setItem('galaga_high_scores', JSON.stringify(updated));
    setHighScores(updated);
    onHighScoresUpdate(updated);
  };

  // Sync mute to AudioController
  useEffect(() => {
    gameAudio.setMute(isMuted);
  }, [isMuted]);

  // Handle Resize and Key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code in stateRef.current.keys) {
        stateRef.current.keys[code] = true;
        // Prevent scrolling with arrows & space
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
          e.preventDefault();
        }
      }

      if (e.code === 'KeyM') {
        onToggleMute();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code in stateRef.current.keys) {
        stateRef.current.keys[code] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Init Stars
    const stars: Star[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: Math.random() * 1.5 + 0.5,
        size: Math.random() * 2 + 0.5,
        color: getRandomStarColor(),
      });
    }
    stateRef.current.stars = stars;

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [highScores, onToggleMute]);

  const getRandomStarColor = () => {
    const colors = [
      '#ffffff', // white
      '#aae3ff', // light blue
      '#ffb6c1', // light pink
      '#ffe4b5', // moccasin
      '#98fb98', // pale green
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Setup/Start Game
  const startGame = () => {
    stateRef.current.score = 0;
    stateRef.current.lives = 3;
    stateRef.current.stage = 1;
    
    stateRef.current.player = {
      x: CANVAS_WIDTH / 2 - 20,
      y: CANVAS_HEIGHT - 100,
      width: 40,
      height: 40,
      speed: 9,
      lives: 3,
      score: 0,
      isDead: false,
      respawnTimer: 0,
      shootCooldown: 0,
      doubleShip: false,
    };

    stateRef.current.bullets = [];
    stateRef.current.particles = [];
    stateRef.current.floatingTexts = [];
    
    setScore(0);
    setLives(3);
    setStage(1);
    onScoreUpdate(0);
    onLivesUpdate(3);
    onStageUpdate(1);

    initStage(1);
    updateStatus('PLAYING');
    gameAudio.playThemeSong();
  };

  const initStage = (stageNum: number) => {
    stateRef.current.bullets = [];
    const aliens: Alien[] = [];

    // Layout configuration
    // Row 0: Bosses (4)
    // Row 1: Goons (8)
    // Row 2: Bees (8)
    // Row 3: Bees (8)
    const cols = 8;
    const startX = 100;
    const spacingX = 50;
    const startY = 120;
    const spacingY = 40;

    // Row 0 - Bosses (center them)
    for (let c = 2; c < 6; c++) {
      aliens.push(createAlien('BOSS', 0, c, startX + c * spacingX, startY));
    }

    // Row 1 - Goons
    for (let c = 0; c < cols; c++) {
      aliens.push(createAlien('GOON', 1, c, startX + c * spacingX, startY + spacingY));
    }

    // Row 2 & 3 - Bees
    for (let r = 2; r <= 3; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.push(createAlien('BEE', r, c, startX + c * spacingX, startY + r * spacingY));
      }
    }

    stateRef.current.aliens = aliens;
    stateRef.current.diveTimer = 0;
    stateRef.current.alienShootTimer = 0;
    stateRef.current.stageClearTimer = 0;
  };

  const createAlien = (type: AlienType, row: number, col: number, x: number, y: number): Alien => {
    let hp = 1;
    let width = 34;
    let height = 34;
    if (type === 'BOSS') {
      hp = 2;
      width = 38;
      height = 38;
    }

    return {
      id: `${type}-${row}-${col}-${Math.random()}`,
      type,
      gridRow: row,
      gridCol: col,
      x,
      y,
      width,
      height,
      hp,
      maxHp: hp,
      state: 'FORMATION',
      phase: Math.random() * Math.PI * 2,
      diveTimer: 0,
      diveAngle: 0,
      diveSpeed: 3 + stateRef.current.stage * 0.4,
      divePath: [],
      divePathIndex: 0,
      originalGridX: x,
      originalGridY: y,
    };
  };

  const updateStatus = (newStatus: GameStatus) => {
    setStatus(newStatus);
    stateRef.current.status = newStatus;
    onStatusUpdate(newStatus);
  };

  // Main Loop Trigger
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      const state = stateRef.current;
      
      // Calculate delta time
      if (!state.lastTime) state.lastTime = timestamp;
      const dt = timestamp - state.lastTime;
      state.lastTime = timestamp;

      updateGame(dt);
      renderGame();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Update Game Logic
  const updateGame = (dt: number) => {
    const state = stateRef.current;

    // 1. Update Starfield background in all states
    state.stars.forEach((star) => {
      star.y += star.speed;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    });

    if (state.status !== 'PLAYING') {
      // Background explosions and entities update (just stars/particles on title/gameover)
      updateParticles();
      return;
    }

    // 2. Handle Stage Transitions & Clear
    if (state.aliens.length === 0) {
      if (state.stageClearTimer === 0) {
        state.stageClearTimer = 1;
        gameAudio.playStageClearSong();
        state.bullets = [];
      } else {
        state.stageClearTimer += 1;
        if (state.stageClearTimer > 180) { // ~3 seconds at 60fps
          const nextStageNum = state.stage + 1;
          state.stage = nextStageNum;
          setStage(nextStageNum);
          onStageUpdate(nextStageNum);
          initStage(nextStageNum);
          // ShowStageClear Floating Text
          addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, `STAGE ${nextStageNum}`, '#00ffcc', 120);
        }
      }
    }

    // 3. Update Player
    const player = state.player;
    if (player.isDead) {
      player.respawnTimer -= 1;
      if (player.respawnTimer <= 0) {
        if (state.lives > 0) {
          player.isDead = false;
          player.x = CANVAS_WIDTH / 2 - player.width / 2;
          player.y = CANVAS_HEIGHT - 100;
          player.doubleShip = false; // Reset double ship power up on death
        } else {
          updateStatus('GAMEOVER');
          saveHighScore(state.score);
        }
      }
    } else {
      // Movement controls
      let moveLeft = state.keys.ArrowLeft || state.keys.KeyA || state.touchLeft;
      let moveRight = state.keys.ArrowRight || state.keys.KeyD || state.touchRight;

      const currentWidth = player.doubleShip ? player.width * 2 : player.width;

      if (moveLeft) {
        player.x -= player.speed;
        if (player.x < 10) player.x = 10;
      }
      if (moveRight) {
        player.x += player.speed;
        if (player.x > CANVAS_WIDTH - currentWidth - 10) {
          player.x = CANVAS_WIDTH - currentWidth - 10;
        }
      }

      // Shoot cooldown
      if (player.shootCooldown > 0) {
        player.shootCooldown -= 1;
      }

      // Shooting
      let wantToFire = state.keys.Space || state.touchFire;
      if (wantToFire && player.shootCooldown === 0) {
        // Double ship fires 2 parallel bullets!
        if (player.doubleShip) {
          state.bullets.push({
            id: `pbullet-${Math.random()}`,
            x: player.x + 8,
            y: player.y,
            width: 4,
            height: 12,
            vy: -10,
            fromPlayer: true,
          });
          state.bullets.push({
            id: `pbullet-${Math.random()}`,
            x: player.x + player.width * 2 - 12,
            y: player.y,
            width: 4,
            height: 12,
            vy: -10,
            fromPlayer: true,
          });
        } else {
          // Single laser
          state.bullets.push({
            id: `pbullet-${Math.random()}`,
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 12,
            vy: -10,
            fromPlayer: true,
          });
        }
        gameAudio.playLaser();
        player.shootCooldown = 15; // Shoot delay
      }
    }

    // 4. Formation Movement (Swaying Left & Right)
    state.formationOffset += state.formationDirection * 0.5;
    if (Math.abs(state.formationOffset) >= state.formationMaxOffset) {
      state.formationDirection *= -1;
    }

    // 5. Update Aliens
    state.diveTimer += 1;
    // Frequency of dive depends on level
    const diveThreshold = Math.max(100 - state.stage * 8, 45); 
    if (state.diveTimer > diveThreshold && state.aliens.length > 0) {
      state.diveTimer = 0;
      // Start a diving alien
      triggerAlienDive();
    }

    // Alien Shooting
    state.alienShootTimer += 1;
    const alienShootThreshold = Math.max(120 - state.stage * 10, 50);
    if (state.alienShootTimer > alienShootThreshold) {
      state.alienShootTimer = 0;
      triggerAlienShoot();
    }

    state.aliens.forEach((alien) => {
      // Wing flapping phase animation
      alien.phase += 0.12;

      if (alien.state === 'FORMATION') {
        // Swaying along with formation offset
        alien.x = alien.originalGridX + state.formationOffset;
        alien.y = alien.originalGridY;
      } else if (alien.state === 'DIVING') {
        // Follow bezier swooping path
        if (alien.divePathIndex < alien.divePath.length) {
          const pt = alien.divePath[alien.divePathIndex];
          alien.x = pt.x;
          alien.y = pt.y;
          alien.divePathIndex += Math.ceil(alien.diveSpeed / 3);
        } else {
          // Once dive is complete (past the bottom screen), wrap around to top and fly back to formation
          alien.state = 'RETURNING';
          alien.y = -50;
        }
      } else if (alien.state === 'RETURNING') {
        // Linearly fly back to current formation coordinates
        const destX = alien.originalGridX + state.formationOffset;
        const destY = alien.originalGridY;
        const dx = destX - alien.x;
        const dy = destY - alien.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 8) {
          alien.x = destX;
          alien.y = destY;
          alien.state = 'FORMATION';
        } else {
          alien.x += (dx / dist) * (alien.diveSpeed + 1);
          alien.y += (dy / dist) * (alien.diveSpeed + 1);
        }
      }
    });

    // 6. Update Bullets
    state.bullets.forEach((bullet) => {
      bullet.y += bullet.vy;
    });

    // Remove offscreen bullets
    state.bullets = state.bullets.filter(
      (bullet) => bullet.y > -20 && bullet.y < CANVAS_HEIGHT + 20
    );

    // 7. Check Collisions
    checkCollisions();

    // 8. Update Particles, Floating text
    updateParticles();
    updateFloatingTexts();
  };

  const updateParticles = () => {
    const state = stateRef.current;
    state.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
  };

  const updateFloatingTexts = () => {
    const state = stateRef.current;
    state.floatingTexts.forEach((t) => {
      t.y -= 0.6; // slow floating up
      t.life -= 1;
    });
    state.floatingTexts = state.floatingTexts.filter((t) => t.life > 0);
  };

  const triggerAlienDive = () => {
    const state = stateRef.current;
    // Pick a random alien in formation
    const formationAliens = state.aliens.filter((a) => a.state === 'FORMATION');
    if (formationAliens.length === 0) return;

    const chosen = formationAliens[Math.floor(Math.random() * formationAliens.length)];
    chosen.state = 'DIVING';
    chosen.divePathIndex = 0;
    chosen.divePath = [];

    // Generate swooping path down
    const startX = chosen.x;
    const startY = chosen.y;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const playerX = state.player.x + state.player.width / 2;

    // Dynamic S-curve diving towards player
    for (let t = 0; t <= 1; t += 0.01) {
      // Loop loop pattern
      const progressY = startY + t * (CANVAS_HEIGHT - startY + 100);
      
      // S-curve swooping: wave offset plus steering slightly towards player's quadrant
      const sWave = Math.sin(t * Math.PI * 2.5) * 160 * direction;
      const drift = t * (playerX - startX) * 0.6; // steer towards player
      
      chosen.divePath.push({
        x: startX + sWave + drift,
        y: progressY,
      });
    }

    gameAudio.playAlienDive();
  };

  const triggerAlienShoot = () => {
    const state = stateRef.current;
    if (state.aliens.length === 0 || state.player.isDead) return;

    // Diving aliens are much more likely to shoot
    const divingAliens = state.aliens.filter((a) => a.state === 'DIVING');
    let shooter: Alien | null = null;

    if (divingAliens.length > 0 && Math.random() < 0.7) {
      shooter = divingAliens[Math.floor(Math.random() * divingAliens.length)];
    } else {
      // Pick random formation alien
      shooter = state.aliens[Math.floor(Math.random() * state.aliens.length)];
    }

    if (shooter) {
      // Aim at player
      const dx = state.player.x + state.player.width / 2 - (shooter.x + shooter.width / 2);
      const dy = state.player.y - shooter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 4 + state.stage * 0.3;

      state.bullets.push({
        id: `abullet-${Math.random()}`,
        x: shooter.x + shooter.width / 2 - 2,
        y: shooter.y + shooter.height,
        width: 4,
        height: 10,
        vy: (dy / dist) * speed,
        fromPlayer: false,
      });

      gameAudio.playAlienLaser();
    }
  };

  const checkCollisions = () => {
    const state = stateRef.current;
    const player = state.player;

    // 1. Player Bullets vs Aliens
    state.bullets.forEach((bullet) => {
      if (!bullet.fromPlayer) return;

      for (let i = 0; i < state.aliens.length; i++) {
        const alien = state.aliens[i];
        
        // Simple AABB Box Collision
        if (
          bullet.x < alien.x + alien.width &&
          bullet.x + bullet.width > alien.x &&
          bullet.y < alien.y + alien.height &&
          bullet.y + bullet.height > alien.y
        ) {
          // Bullet Hit!
          bullet.y = -100; // mark bullet for removal
          alien.hp -= 1;

          if (alien.hp <= 0) {
            // Destroy Alien!
            state.aliens.splice(i, 1);
            i--;

            // Award scores based on alien type and state
            let points = 0;
            const isDiving = alien.state === 'DIVING';

            if (alien.type === 'BOSS') points = isDiving ? 400 : 150;
            else if (alien.type === 'GOON') points = isDiving ? 160 : 80;
            else points = isDiving ? 100 : 50;

            state.score += points;
            setScore(state.score);
            onScoreUpdate(state.score);

            // Explode particles
            createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.type);
            gameAudio.playAlienExplosion();

            // Floating Score text
            addFloatingText(alien.x, alien.y, `+${points}`, isDiving ? '#ffdd00' : '#ffffff');

            // 10% chance of Double Ship Power Up drop from Boss Alien!
            if (alien.type === 'BOSS' && !player.doubleShip && Math.random() < 0.4) {
              addPowerUpDrop(alien.x, alien.y);
            }
          } else {
            // Boss hit once - flash effect and hit sound
            gameAudio.playHit();
            createFlashParticles(alien.x + alien.width / 2, alien.y + alien.height / 2);
          }
          break; // bullet spent
        }
      }
    });

    // 2. Alien Bullets or Aliens vs Player (if player alive)
    if (!player.isDead) {
      const playerWidth = player.doubleShip ? player.width * 2 : player.width;

      // Alien Bullets vs Player
      state.bullets.forEach((bullet) => {
        if (bullet.fromPlayer) return;

        if (
          bullet.x < player.x + playerWidth &&
          bullet.x + bullet.width > player.x &&
          bullet.y < player.y + player.height &&
          bullet.y + bullet.height > player.y
        ) {
          // Player Hit!
          bullet.y = CANVAS_HEIGHT + 100; // spent
          destroyPlayer();
        }
      });

      // Aliens colliding with Player Ship directly
      for (let i = 0; i < state.aliens.length; i++) {
        const alien = state.aliens[i];
        if (
          alien.x < player.x + playerWidth &&
          alien.x + alien.width > player.x &&
          alien.y < player.y + player.height &&
          alien.y + alien.height > player.y
        ) {
          // Alien Crash!
          state.aliens.splice(i, 1);
          i--;

          createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, alien.type);
          gameAudio.playAlienExplosion();
          destroyPlayer();
          break;
        }
      }
    }
  };

  const destroyPlayer = () => {
    const state = stateRef.current;
    const player = state.player;

    player.isDead = true;
    player.respawnTimer = 100; // frame delay to respawn
    state.lives -= 1;
    setLives(state.lives);
    onLivesUpdate(state.lives);

    // Huge particle explosion
    createExplosion(player.x + player.width / 2, player.y + player.height / 2, 'PLAYER');
    gameAudio.playPlayerExplosion();
  };

  // Helper particle generation
  const createExplosion = (x: number, y: number, type: string) => {
    const state = stateRef.current;
    let count = 15;
    let colors = ['#ff3300', '#ff9900', '#ffff00', '#ffffff'];

    if (type === 'BOSS') {
      count = 25;
      colors = ['#33cc33', '#00ffcc', '#ffffff', '#0033cc'];
    } else if (type === 'GOON') {
      count = 18;
      colors = ['#ff3333', '#ff6666', '#ffffff', '#990000'];
    } else if (type === 'PLAYER') {
      count = 40;
      colors = ['#ffffff', '#00ffff', '#3366ff', '#000066', '#ff0055'];
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      state.particles.push({
        id: `p-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3.5 + 1.5,
        life: Math.random() * 30 + 15,
        maxLife: 45,
      });
    }
  };

  const createFlashParticles = (x: number, y: number) => {
    const state = stateRef.current;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      state.particles.push({
        id: `p-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#ffffff',
        size: 2,
        life: Math.random() * 10 + 5,
        maxLife: 15,
      });
    }
  };

  const addPowerUpDrop = (x: number, y: number) => {
    // Treat the power-up drop as a special bullet moving downwards!
    stateRef.current.bullets.push({
      id: `powerup-${Math.random()}`,
      x: x + 10,
      y: y,
      width: 16,
      height: 16,
      vy: 2.2, // slow falling
      fromPlayer: false, // so player can intercept it! Wait, we will check interception in bullet vs player
    });
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, duration: number = 60) => {
    stateRef.current.floatingTexts.push({
      id: `txt-${Math.random()}`,
      x,
      y,
      text,
      color,
      life: duration,
      maxLife: duration,
    });
  };

  // Render HTML5 Canvas
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;

    // Clear Canvas
    ctx.fillStyle = '#02000a'; // ultra-dark space navy
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Draw Starfield (Twinkling background)
    state.stars.forEach((star) => {
      ctx.fillStyle = star.color;
      // Add a slight twinkle animation (modulate opacity based on coordinates)
      const alpha = 0.4 + Math.sin(star.x + star.y + Date.now() * 0.005) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;

    // 2. Draw Floating Texts
    state.floatingTexts.forEach((t) => {
      ctx.fillStyle = t.color;
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = t.life / t.maxLife;
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1.0;

    // 3. Draw Player
    const player = state.player;
    if (!player.isDead) {
      if (player.doubleShip) {
        // Draw Double Ship (Two parallel fighters)
        drawFighter(ctx, player.x, player.y, player.width);
        drawFighter(ctx, player.x + player.width, player.y, player.width);
      } else {
        // Single Ship
        drawFighter(ctx, player.x, player.y, player.width);
      }
    }

    // 4. Draw Aliens
    state.aliens.forEach((alien) => {
      drawAlienShip(ctx, alien);
    });

    // 5. Draw Bullets & PowerUps
    state.bullets.forEach((bullet) => {
      if (bullet.id.startsWith('powerup-')) {
        // Draw a shiny, rotating retro fighter core power-up!
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        
        // draw glowing diamond shape core
        ctx.beginPath();
        ctx.moveTo(bullet.x + bullet.width / 2, bullet.y);
        ctx.lineTo(bullet.x + bullet.width, bullet.y + bullet.height / 2);
        ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height);
        ctx.lineTo(bullet.x, bullet.y + bullet.height / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bullet.x + 5, bullet.y + 5, 6, 6);

        ctx.shadowBlur = 0; // reset shadow
        
        // Check power-up collision here (bullet vs player)
        if (!player.isDead) {
          const playerWidth = player.doubleShip ? player.width * 2 : player.width;
          if (
            bullet.x < player.x + playerWidth &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y
          ) {
            // Picked up! Upgrade to Double Ship!
            bullet.y = CANVAS_HEIGHT + 100; // spend powerup
            player.doubleShip = true;
            addFloatingText(player.x + playerWidth / 2, player.y - 20, 'DUAL FIGHTER ACTIVATED!', '#00ffff', 90);
            gameAudio.playStageClearSong();
          }
        }
      } else {
        // Regular lasers
        ctx.fillStyle = bullet.fromPlayer ? '#ff0055' : '#00ffff';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        // glowing head
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height / 3);
      }
    });

    // 6. Draw Particles
    state.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    // 7. Draw Screen Messages (If state not PLAYING)
    if (state.status === 'TITLE') {
      drawTitleScreen(ctx);
    } else if (state.status === 'GAMEOVER') {
      drawGameOverScreen(ctx);
    } else if (state.status === 'STAGE_CLEAR') {
      drawStageClearScreen(ctx);
    }
  };

  // Canvas Vector Drawing Helpers

  const drawFighter = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    // Classical Galaga fighter shape (white wings, red trim, blue/cyan nozzle, booster fire)
    ctx.save();
    ctx.translate(x, y);

    // Booster Fire (Flickers dynamically!)
    if (Math.random() < 0.6) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ff3300' : '#ff9900';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 4, size - 4);
      ctx.lineTo(size / 2, size + 10 + Math.random() * 6);
      ctx.lineTo(size / 2 + 4, size - 4);
      ctx.closePath();
      ctx.fill();
    }

    // Wing Fins (Outer Red Trim)
    ctx.fillStyle = '#e60000'; // Retro red
    ctx.beginPath();
    ctx.moveTo(2, size - 6);
    ctx.lineTo(8, size - 20);
    ctx.lineTo(8, size - 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size - 2, size - 6);
    ctx.lineTo(size - 8, size - 20);
    ctx.lineTo(size - 8, size - 2);
    ctx.closePath();
    ctx.fill();

    // Main Body & Wings (White)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    // left wing
    ctx.moveTo(8, size - 4);
    ctx.lineTo(4, size - 14);
    ctx.lineTo(12, size - 16);
    // nose cone
    ctx.lineTo(size / 2 - 3, 6);
    ctx.lineTo(size / 2, 0); // sharp peak
    ctx.lineTo(size / 2 + 3, 6);
    // right wing
    ctx.lineTo(size - 12, size - 16);
    ctx.lineTo(size - 4, size - 14);
    ctx.lineTo(size - 8, size - 4);
    // tail
    ctx.lineTo(size / 2, size - 8);
    ctx.closePath();
    ctx.fill();

    // Center Cockpit/Nozzle (Blue Accent)
    ctx.fillStyle = '#33ccff';
    ctx.fillRect(size / 2 - 2, size - 24, 4, 10);
    ctx.beginPath();
    ctx.arc(size / 2, size - 14, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawAlienShip = (ctx: CanvasRenderingContext2D, alien: Alien) => {
    ctx.save();
    ctx.translate(alien.x, alien.y);

    const size = alien.width;
    const flap = Math.sin(alien.phase) > 0; // Wing flap toggle

    if (alien.type === 'BEE') {
      // BEE: Yellow core, Blue wings, Red antennas
      // Antennas
      ctx.fillStyle = '#ff3300';
      ctx.fillRect(size / 2 - 4, 0, 2, 6);
      ctx.fillRect(size / 2 + 2, 0, 2, 6);

      // Wings (flapping)
      ctx.fillStyle = '#3366ff';
      if (flap) {
        // Wings out
        ctx.fillRect(0, 8, 8, 14);
        ctx.fillRect(size - 8, 8, 8, 14);
      } else {
        // Wings up
        ctx.fillRect(2, 4, 6, 14);
        ctx.fillRect(size - 8, 4, 6, 14);
      }

      // Main yellow body
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();

      // Bee stripes (Black)
      ctx.fillStyle = '#000000';
      ctx.fillRect(size / 2 - 6, size / 2 - 2, 12, 3);
      ctx.fillRect(size / 2 - 4, size / 2 + 4, 8, 3);

    } else if (alien.type === 'GOON') {
      // GOON: Red core, White claws, Blue eyes
      // Claws/Wings
      ctx.fillStyle = '#ffffff';
      if (flap) {
        ctx.fillRect(0, 6, 6, 16);
        ctx.fillRect(size - 6, 6, 6, 16);
      } else {
        ctx.fillRect(2, 10, 6, 12);
        ctx.fillRect(size - 8, 10, 6, 12);
      }

      // Red body
      ctx.fillStyle = '#ff1a1a';
      ctx.beginPath();
      ctx.moveTo(size / 2, 2);
      ctx.lineTo(size - 6, size / 2);
      ctx.lineTo(size - 8, size - 2);
      ctx.lineTo(8, size - 2);
      ctx.lineTo(6, size / 2);
      ctx.closePath();
      ctx.fill();

      // Cyan retro eyes
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(size / 2 - 5, size / 2 - 4, 3, 3);
      ctx.fillRect(size / 2 + 2, size / 2 - 4, 3, 3);

    } else if (alien.type === 'BOSS') {
      // BOSS: Green body, Blue wings. If hit (hp == 1), turns yellow/red
      const isDamaged = alien.hp === 1;
      
      // Purple/blue wing-caps
      ctx.fillStyle = isDamaged ? '#ff9900' : '#9900cc';
      if (flap) {
        ctx.fillRect(0, 4, 8, 20);
        ctx.fillRect(size - 8, 4, 8, 20);
      } else {
        ctx.fillRect(2, 8, 6, 16);
        ctx.fillRect(size - 8, 8, 6, 16);
      }

      // Green body (or yellow if hit)
      ctx.fillStyle = isDamaged ? '#ff3300' : '#00e676';
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size - 6, size / 3);
      ctx.lineTo(size - 6, (size * 2) / 3);
      ctx.lineTo(size / 2, size - 2);
      ctx.lineTo(6, (size * 2) / 3);
      ctx.lineTo(6, size / 3);
      ctx.closePath();
      ctx.fill();

      // Yellow core crest
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(size / 2 - 3, size / 2 - 4, 6, 6);
    }

    ctx.restore();
  };

  const drawTitleScreen = (ctx: CanvasRenderingContext2D) => {
    // 1. Galaga style large Logo
    ctx.textAlign = 'center';

    // Shadow logo
    ctx.fillStyle = '#e60000';
    ctx.font = '900 64px "Space Grotesk", sans-serif';
    ctx.fillText('GALAGA', CANVAS_WIDTH / 2 + 4, CANVAS_HEIGHT / 3 + 4);

    // Front yellow logo
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('GALAGA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);

    // Retro "CLASSIC EDITION"
    ctx.fillStyle = '#00ffff';
    ctx.font = '500 14px "JetBrains Mono", monospace';
    ctx.fillText('RETRO REVIVAL ARCADE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3 + 45);

    // 2. Play Instruction (Flashing dynamically)
    if (Math.floor(Date.now() / 400) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      const startText = stateRef.current.isMobile ? 'START GAME (눌러서 시작)' : 'PRESS ENTER / SPACE TO START';
      ctx.fillText(startText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    }

    // 3. Key instructions info
    ctx.fillStyle = '#8888aa';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('화살표 키 [◀ ▶] 또는 [A] [D]로 이동', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 210);
    ctx.fillText('[스페이스바]로 미사일 발사', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 185);
    ctx.fillText('보스 격파 시 일정한 확률로 듀얼 파이터 파워업 드랍!', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 150);

    // 4. High score listing
    ctx.fillStyle = '#ff5500';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText('=== HIGH SCORES ===', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 90);

    highScores.slice(0, 3).forEach((hs, idx) => {
      ctx.fillStyle = idx === 0 ? '#ffd700' : '#dddddd';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText(
        `${idx + 1}. ${hs.name}  ......  ${hs.score.toLocaleString()} PTS`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT - 65 + idx * 20
      );
    });
  };

  const drawGameOverScreen = (ctx: CanvasRenderingContext2D) => {
    ctx.textAlign = 'center';

    // Game Over red title
    ctx.fillStyle = '#ff1a1a';
    ctx.font = '900 50px "Space Grotesk", sans-serif';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3);

    // Score earned
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(`FINAL SCORE: ${score.toLocaleString()} PTS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.fillText(`STAGE REACHED: ${stage}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);

    // Subtitle instruction
    ctx.fillStyle = '#00ffcc';
    ctx.font = '16px "JetBrains Mono", monospace';
    const restartText = stateRef.current.isMobile ? '다시 시작하려면 화면을 탭하세요' : 'PRESS ENTER / SPACE TO RESTART';
    ctx.fillText(restartText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
  };

  const drawStageClearScreen = (ctx: CanvasRenderingContext2D) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffcc';
    ctx.font = '900 45px "Space Grotesk", sans-serif';
    ctx.fillText('STAGE CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillText(`GET READY FOR STAGE ${stage + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
  };

  // Click on Title or GameOver to trigger state transitions (especially useful for Mobile Touch)
  const handleCanvasClick = () => {
    const state = stateRef.current;
    if (state.status === 'TITLE') {
      startGame();
    } else if (state.status === 'GAMEOVER') {
      startGame();
    }
  };

  // Keyboard activation on Title/GameOver screens
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      if (stateRef.current.status === 'TITLE' || stateRef.current.status === 'GAMEOVER') {
        if (e.code === 'Enter' || e.code === 'Space') {
          startGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [highScores]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Canvas Frame Wrapper */}
      <div className="relative w-full max-w-[480px] aspect-[3/4] bg-black rounded-lg border-4 border-gray-800 shadow-2xl overflow-hidden">
        {/* Actual HTML5 Canvas */}
        <canvas
          id="galaga-canvas"
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain cursor-pointer"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Mobile Virtual Controller Overlay (only rendered on touch devices or toggled) */}
        {stateRef.current.isMobile && status === 'PLAYING' && (
          <div className="absolute bottom-4 left-0 right-0 px-6 flex justify-between items-end select-none pointer-events-none z-10">
            {/* Direction keys (Left / Right) */}
            <div className="flex gap-4 pointer-events-auto">
              <button
                id="touch-btn-left"
                onTouchStart={() => { stateRef.current.touchLeft = true; }}
                onTouchEnd={() => { stateRef.current.touchLeft = false; }}
                className="w-16 h-16 bg-white/20 active:bg-white/40 border border-white/40 text-white font-extrabold text-2xl rounded-full flex items-center justify-center backdrop-blur-sm shadow-md cursor-pointer touch-none"
              >
                ◀
              </button>
              <button
                id="touch-btn-right"
                onTouchStart={() => { stateRef.current.touchRight = true; }}
                onTouchEnd={() => { stateRef.current.touchRight = false; }}
                className="w-16 h-16 bg-white/20 active:bg-white/40 border border-white/40 text-white font-extrabold text-2xl rounded-full flex items-center justify-center backdrop-blur-sm shadow-md cursor-pointer touch-none"
              >
                ▶
              </button>
            </div>

            {/* Fire Button */}
            <div className="pointer-events-auto">
              <button
                id="touch-btn-fire"
                onTouchStart={() => { stateRef.current.touchFire = true; }}
                onTouchEnd={() => { stateRef.current.touchFire = false; }}
                className="w-20 h-20 bg-red-600/75 active:bg-red-500/90 active:scale-95 border-2 border-red-400 text-white font-extrabold text-lg rounded-full flex items-center justify-center shadow-lg cursor-pointer touch-none uppercase tracking-wider"
              >
                FIRE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Retro Console Controller Instruction Footer */}
      <div id="retro-footer" className="mt-4 flex flex-wrap gap-4 items-center justify-center text-sm text-gray-400">
        <button
          id="btn-controls-guide"
          onClick={() => setShowControlsGuide(!showControlsGuide)}
          className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700 transition"
        >
          <Keyboard className="w-4 h-4" />
          <span>조작법 {showControlsGuide ? '닫기' : '보기'}</span>
        </button>

        <button
          id="btn-toggle-sound"
          onClick={onToggleMute}
          className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700 transition"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
          <span>{isMuted ? '음소거 해제 (M)' : '음소거 (M)'}</span>
        </button>

        {status === 'PLAYING' && (
          <button
            id="btn-suicide"
            onClick={destroyPlayer}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded border border-red-800/60 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>자가 파괴 (디버그)</span>
          </button>
        )}
      </div>

      {showControlsGuide && (
        <div id="controls-popup" className="mt-4 p-4 w-full max-w-[480px] bg-gray-900 border border-gray-800 rounded-lg text-xs leading-relaxed text-gray-300 shadow-xl">
          <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-1">
            <HelpCircle className="w-4 h-4 text-yellow-500" />
            <span>상세 게임 설명 및 룰</span>
          </h4>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>이동</strong>: 키보드 방향키 <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-[10px]">◀</kbd> <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-[10px]">▶</kbd> 또는 <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-[10px]">A</kbd> <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-[10px]">D</kbd> 키</li>
            <li><strong>미사일 발사</strong>: <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-[10px]">스페이스바</kbd></li>
            <li><strong>게임 시작/재시작</strong>: <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-[10px]">엔터</kbd> 또는 <kbd className="bg-gray-800 px-1 py-0.5 rounded border border-gray-700 text-[10px]">스페이스바</kbd></li>
            <li><strong>모바일 환경</strong>: 가로 스크롤 걱정 없이 화면 하단에 가상의 ◀, ▶ 터치 컨트롤과 발사(FIRE) 버튼이 자동으로 생성됩니다.</li>
            <li><strong>더블 파이터 파워업 (Galaga Dual-Fighter)</strong>: 최상단의 녹색 보스(BOSS) 외계인을 쓰러뜨렸을 때 일정 확률로 푸른 빛의 다이아몬드 코어 파워업이 드랍됩니다. 이것을 먹으면 2대의 비행기가 합체하여 <strong>듀얼 미사일</strong>을 발사하는 강력한 형태로 업그레이드됩니다! (피격당하면 싱글 파이터로 돌아갑니다.)</li>
            <li><strong>득점 배율</strong>: 공격 대형에 배치되어 있을 때 외계인을 쓰러뜨리는 것보다, 대형을 이탈해 돌진(DIVING)하고 있는 외계인을 격추했을 때 <strong>2배 이상의 고득점</strong>을 획득할 수 있습니다!</li>
          </ul>
        </div>
      )}
    </div>
  );
};
