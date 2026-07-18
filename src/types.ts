export type GameStatus = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'STAGE_CLEAR' | 'HOW_TO_PLAY';

export type AlienType = 'BEE' | 'GOON' | 'BOSS';

export interface PlayerShip {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  lives: number;
  score: number;
  isDead: boolean;
  respawnTimer: number;
  shootCooldown: number;
  doubleShip: boolean; // Classic Galaga dual-fighter capability!
}

export interface Alien {
  id: string;
  type: AlienType;
  gridRow: number; // Row in the grid
  gridCol: number; // Column in the grid
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  state: 'FORMATION' | 'DIVING' | 'RETURNING';
  phase: number; // Flapping wing animation timing
  diveTimer: number;
  diveAngle: number;
  diveSpeed: number;
  divePath: { x: number; y: number }[];
  divePathIndex: number;
  originalGridX: number;
  originalGridY: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  fromPlayer: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
}
