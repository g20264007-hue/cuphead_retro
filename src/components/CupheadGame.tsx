import React, { useState } from 'react';
import { CupheadCanvas } from './CupheadCanvas';
import { Heart, Trophy, ShieldAlert, Award, Star, Zap, Volume2, VolumeX, Sparkles, Flame, Swords } from 'lucide-react';

export const CupheadGame: React.FC = () => {
  const [score, setScore] = useState<number>(0);
  const [hp, setHp] = useState<number>(3);
  const [superMeter, setSuperMeter] = useState<number>(45);
  const [bossHp, setBossHp] = useState<number>(1200);
  const [bossMaxHp, setBossMaxHp] = useState<number>(1200);
  const [gameState, setGameState] = useState<'INTRO' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('INTRO');

  // Calculate Boss health percentage
  const bossPercentage = Math.round((bossHp / bossMaxHp) * 100);

  // Determine current boss phase text
  const getBossPhaseText = () => {
    if (bossPercentage > 75) return 'PHASE 1: CRYING BABY CARROTS';
    if (bossPercentage > 40) return 'PHASE 2: THIRD EYE TELEKINESIS';
    if (bossPercentage > 0) return 'FINAL PHASE: PSYCHIC TEAR STORM';
    return 'DEFEATED';
  };

  return (
    <div className="min-h-screen bg-[#11100d] text-amber-100 font-sans p-3 sm:p-6 flex flex-col items-center justify-start gap-6">
      
      {/* 1930s style vintage grain header */}
      <header className="w-full max-w-4xl text-center space-y-1 border-b-2 border-dashed border-amber-900/30 pb-4">
        <div className="inline-flex items-center gap-1.5 bg-[#e14d4d] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded shadow">
          <Sparkles className="w-3.5 h-3.5" />
          <span>VINTAGE RUBBER-HOSE ACTION GAME</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-amber-500 font-display filter drop-shadow-md">
          CUPHEAD MINI
        </h1>
        <p className="text-xs sm:text-sm text-amber-100/60 font-mono tracking-wide max-w-md mx-auto">
          &ldquo;Don&apos;t Deal With The Devil!&rdquo; Battle the giant psychic carrot in the classic rubber-hose style!
        </p>
      </header>

      {/* Main HUD container */}
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* PLAYER STATUS PANEL */}
        <div className="bg-[#1a1815] border-2 border-amber-900/40 rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-600/5 rounded-full blur-xl pointer-events-none" />
          <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest block mb-1">
            PLAYER CUPHEAD HUD
          </span>
          
          <div className="flex items-center justify-between">
            {/* HP Hearts */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-gray-500">HEALTH POINTS</span>
              <div className="flex gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-6 h-6 ${
                      i < hp
                        ? 'text-[#e14d4d] fill-[#e14d4d] animate-pulse'
                        : 'text-gray-800 fill-gray-900'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Live Score */}
            <div className="text-right">
              <span className="text-[10px] font-mono text-gray-500 block">SCORE TICKER</span>
              <span className="text-lg font-black font-mono text-yellow-500">
                {score.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* BOSS STATUS PANEL */}
        <div className="bg-[#1a1815] border-2 border-amber-900/40 rounded-xl p-3 flex flex-col justify-between shadow-lg sm:col-span-1 relative overflow-hidden">
          <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest block mb-1">
            BOSS: THE PSYCARROT
          </span>
          
          {gameState === 'PLAYING' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-orange-500 font-bold truncate max-w-[130px]">{getBossPhaseText()}</span>
                <span className="text-amber-100/80">{bossHp} / {bossMaxHp} HP</span>
              </div>
              
              {/* Dynamic segmented progress health bar */}
              <div className="w-full h-3.5 bg-gray-950 rounded-full overflow-hidden border border-amber-950 p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-orange-600 via-yellow-500 to-green-500"
                  style={{ width: `${bossPercentage}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <span className="text-xs font-mono text-amber-100/40 italic">Waiting for battle start...</span>
            </div>
          )}
        </div>

        {/* EX SUPER SPECIAL METER */}
        <div className="bg-[#1a1815] border-2 border-amber-900/40 rounded-xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest block mb-1">
            EX SUPER CHARGE METER
          </span>
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="w-full h-2.5 bg-gray-950 rounded-full overflow-hidden border border-amber-950 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-teal-400 transition-all duration-200"
                  style={{ width: `${superMeter}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-gray-500">CHARGE: {Math.round(superMeter)}%</span>
            </div>

            <div className="flex flex-col items-center">
              {superMeter >= 100 ? (
                <div className="animate-bounce bg-teal-500 text-black font-black text-[9px] px-2 py-0.5 rounded shadow border border-white flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-current animate-pulse" />
                  <span>READY!</span>
                </div>
              ) : (
                <span className="text-[10px] font-mono text-gray-600">CHARGING</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Main interactive Arcade Canvas screen */}
      <main className="w-full max-w-4xl">
        <CupheadCanvas
          onScoreUpdate={setScore}
          onHpUpdate={setHp}
          onSuperUpdate={setSuperMeter}
          onBossHpUpdate={(hp, max) => {
            setBossHp(hp);
            setBossMaxHp(max);
          }}
          onGameStateChange={setGameState}
        />
      </main>

      {/* Vintage decorative Footer credit note */}
      <footer className="w-full max-w-4xl text-center text-[11px] font-mono text-amber-100/30 border-t border-amber-950/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>&copy; 1930s CARTOON STUDIOS • ALL RIGHTS RESERVED.</p>
        <div className="flex gap-3">
          <span>DESKTOP KEYBOARD CONTROLS ENHANCED</span>
          <span>•</span>
          <span>TOUCH SCREEN ENABLED</span>
        </div>
      </footer>

    </div>
  );
};
export default CupheadGame;
