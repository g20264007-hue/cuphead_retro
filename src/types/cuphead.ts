export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export type PlayerState = 'IDLE' | 'RUNNING' | 'JUMPING' | 'CROUCHING' | 'DASHING' | 'HIT';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  state: PlayerState;
  facing: 'left' | 'right';
  isGrounded: boolean;
  dashCooldown: number;
  dashTimer: number;
  invincibilityTimer: number;
  superMeter: number; // 0 to 100
  score: number;
  parryActiveTimer?: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  isSuper?: boolean;
}

export type BossState = 'INTRO' | 'PHASE1' | 'PHASE2' | 'PHASE3' | 'DEFEATED';

export interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  state: BossState;
  attackTimer: number;
  bobTimer: number;
}

export interface AttackObject {
  id: string;
  type: 'CARROT_MISSILE' | 'PSYCHIC_RING' | 'TEAR_DROP' | 'BEAM';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isParryable: boolean; // Pink objects can be parried!
  hp?: number; // For shootable baby carrots
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'DUST' | 'SPARK' | 'PARRY_FX' | 'EXPLOSION' | 'SUPER_FX' | 'GRAIN';
}

export type WeaponType = 'PEASHOOTER' | 'SPREAD';
