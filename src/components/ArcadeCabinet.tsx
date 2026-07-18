import React, { useState, useEffect } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameStatus, HighScore } from '../types';
import { Sparkles, Trophy, Gamepad2, ShieldAlert, Cpu, Terminal } from 'lucide-react';

export const ArcadeCabinet: React.FC = () => {
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [stage, setStage] = useState<number>(1);
  const [status, setStatus] = useState<GameStatus>('TITLE');
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'SYSTEM INITIALIZED',
    'SCANNING SECTOR 7G...',
    'READY FOR MISSION DEPLOYMENT'
  ]);

  const topScore = highScores.length > 0 ? highScores[0].score : 20000;

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Add system logs based on game status changes or score milestones
  useEffect(() => {
    const logs: string[] = [];
    if (status === 'TITLE') {
      logs.push('CORE ENGINE ONLINE', 'AWAITING USER COMMANDS', '> WEAPONS CALIBRATED');
    } else if (status === 'PLAYING') {
      logs.push(
        'MISSION ACTIVE',
        `STAGE ${stage} FORMATION DETECTED`,
        '> ENEMY SQUADRONS ARRIVING',
        'WEAPONS: HOT'
      );
    } else if (status === 'GAMEOVER') {
      logs.push(
        'CRITICAL: SHIP DESTROYED',
        `MISSION TERMINATED AT STAGE ${stage}`,
        `TOTAL SCORE: ${score.toLocaleString()}`
      );
    } else if (status === 'STAGE_CLEAR') {
      logs.push(`WAVE ${stage} NEUTRALIZED`, 'PREPARING HYPERSPACE JUMP');
    }
    setSystemLogs((prev) => [...logs, ...prev].slice(0, 8));
  }, [status, stage]);

  // Log score milestones
  useEffect(() => {
    if (score > 0 && score % 1000 === 0) {
      setSystemLogs((prev) => [
        `MILESTONE REACHED: ${score.toLocaleString()} PTS`,
        ...prev
      ].slice(0, 8));
    }
  }, [score]);

  return (
    <div className="min-h-screen bg-[#020205] text-[#00ffcc] flex flex-col items-center justify-center p-3 md:p-6 font-mono select-none relative overflow-hidden">
      
      {/* Neo-Galaxian Main Interactive Frame */}
      <div className="w-full max-w-6xl bg-[#020205] border-4 md:border-8 border-[#1a1a2e] rounded-xl p-4 md:p-6 shadow-[0_0_60px_rgba(0,255,204,0.15)] relative overflow-hidden flex flex-col gap-6">
        
        {/* Subtle top neon laser bar line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00ffcc] to-transparent opacity-60"></div>
        
        {/* Header Branding */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1a1a2e] pb-4 mb-2 z-10">
          <div className="text-left mb-2 md:mb-0">
            <p className="text-[10px] text-[#4d4d70] uppercase tracking-widest">MISSION STATUS UNIT</p>
            <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase font-display">
              NEO-GALAXIAN
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a1a2e] border border-[#00ffcc]/30 rounded text-[#00ffcc] font-mono tracking-wider uppercase">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>STABILITY: SECURE</span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a1a2e] border border-red-500/30 rounded text-red-400 font-mono tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>LIVE CORE</span>
            </div>
          </div>
        </header>

        {/* Cabinet Layout GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          
          {/* LEFT SIDE PANEL (Score Board & Integrity) */}
          <div className="lg:col-span-1 bg-[#05050a] border border-[#1a1a2e] rounded-lg p-5 flex flex-col justify-between gap-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-[#00ffcc] border-b border-[#1a1a2e] pb-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#4d4d70]">COMMAND DECKS</h2>
              </div>

              {/* HIGH SCORE */}
              <div>
                <p className="text-[10px] text-[#4d4d70] uppercase tracking-wider">ALL-TIME RECORD</p>
                <p className="text-2xl font-bold text-white tracking-wider opacity-90">
                  {topScore.toLocaleString()}
                </p>
              </div>

              {/* CURRENT SCORE */}
              <div>
                <p className="text-[10px] text-[#4d4d70] uppercase tracking-wider">CURRENT SCORE</p>
                <p className="text-3xl font-black text-[#ff0055] drop-shadow-[0_0_8px_rgba(255,0,85,0.55)] tracking-wider">
                  {score.toLocaleString()}
                </p>
              </div>

              {/* LEVEL/STAGE */}
              <div>
                <p className="text-[10px] text-[#4d4d70] uppercase tracking-wider">SECTOR LOCATION</p>
                <p className="text-xl font-bold text-[#00ffcc] tracking-wider">
                  STAGE {stage}
                </p>
              </div>
            </div>

            {/* INTEGRITY: Dynamic Diamond Grid (Rotating Squares) matches Artistic Flair theme! */}
            <div className="border-t border-[#1a1a2e] pt-4 mt-auto">
              <p className="text-[10px] text-[#4d4d70] uppercase tracking-widest mb-3">INTEGRITY CORRES</p>
              <div className="flex items-center gap-4">
                {Array.from({ length: 3 }).map((_, i) => {
                  const isActive = i < lives;
                  return (
                    <div
                      key={i}
                      className={`w-6 h-6 rotate-45 transition-all duration-300 ${
                        isActive
                          ? 'bg-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.5)]'
                          : 'bg-[#1a1a2e] border border-[#00ffcc]/30'
                      }`}
                      title={isActive ? "Active Integrity Core" : "Lost Integrity Core"}
                    />
                  );
                })}
              </div>
              {lives === 0 && (
                <p className="text-red-500 text-[10px] mt-2 uppercase tracking-wide animate-pulse">
                  ! POWER CORES DEPLETED !
                </p>
              )}
            </div>
          </div>

          {/* MAIN GAME STAGE (Center Canvas with elegant decorative corners) */}
          <div className="lg:col-span-2 flex flex-col justify-center items-center relative bg-black/60 rounded-lg p-2 border border-[#1a1a2e] overflow-hidden">
            
            {/* Absolute Decorative Corner Frame Lines (Artistic Flair requirement) */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#1a1a2e] pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#1a1a2e] pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#1a1a2e] pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#1a1a2e] pointer-events-none"></div>

            <div className="w-full relative z-10">
              <GameCanvas
                onScoreUpdate={setScore}
                onLivesUpdate={setLives}
                onStageUpdate={setStage}
                onStatusUpdate={setStatus}
                onHighScoresUpdate={setHighScores}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
              />
            </div>
          </div>

          {/* RIGHT SIDE PANEL (Console Log list & Control deck visual) */}
          <div className="lg:col-span-1 bg-[#05050a] border border-[#1a1a2e] rounded-lg p-5 flex flex-col justify-between gap-6">
            
            {/* SYSTEM LOGS */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-[#00ffcc] border-b border-[#1a1a2e] pb-2 mb-4">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#4d4d70]">SYSTEM LOGS</h2>
              </div>

              <div className="space-y-2.5 font-mono text-[10px] text-[#00ffcc]/80 leading-relaxed overflow-hidden max-h-[220px]">
                {systemLogs.map((log, index) => {
                  const isWarning = log.includes('WARNING') || log.includes('CRITICAL') || log.includes('DESTROYED');
                  return (
                    <p
                      key={index}
                      className={`transition-all duration-300 transform translate-y-0 ${
                        isWarning ? 'text-[#ff0055] font-semibold animate-pulse' : 'text-[#00ffcc]/70'
                      }`}
                    >
                      &gt; {log}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* CONTROL DECK BUTTON DECORATOR */}
            <div className="mt-auto">
              <div className="bg-[#1a1a2e] p-4 rounded-md border border-[#00ffcc]/10">
                <p className="text-[9px] text-[#00ffcc] uppercase mb-3 font-bold tracking-wider">Control Deck</p>
                
                {/* Visual Arrow key layout */}
                <div className="grid grid-cols-3 gap-1.5 w-full max-w-[140px] mx-auto mb-4">
                  <div className="col-start-2 border border-[#4d4d70] text-gray-500 p-1 text-center text-xs rounded font-bold">▲</div>
                  <div className="border border-[#00ffcc]/60 text-[#00ffcc] p-1 text-center text-xs rounded font-bold bg-[#11222d] shadow-[0_0_5px_rgba(0,255,204,0.15)]">◀</div>
                  <div className="border border-[#4d4d70] text-gray-500 p-1 text-center text-xs rounded font-bold">▼</div>
                  <div className="border border-[#00ffcc]/60 text-[#00ffcc] p-1 text-center text-xs rounded font-bold bg-[#11222d] shadow-[0_0_5px_rgba(0,255,204,0.15)]">▶</div>
                </div>

                <div className="border border-[#00ffcc]/40 text-[#00ffcc] p-1.5 text-center text-[10px] rounded bg-[#11222d]/60 font-bold uppercase tracking-wider">
                  SPACEBAR: FIRE WEAPON
                </div>
              </div>
            </div>
            
          </div>

        </div>

        {/* Dynamic High Scores Board bottom section */}
        <div className="border-t border-[#1a1a2e] pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span className="font-semibold text-gray-400">GITHUB PAGES HOSTER CHANNELS READY</span>
          </div>
          <div className="flex items-center gap-4">
            <span>SOUND SYNTHESIZER: {isMuted ? 'MUTED' : 'ONLINE'}</span>
            <span>BUILD: v1.4.0-REVIVAL</span>
          </div>
        </div>

      </div>

      {/* Decorative Outer Margin Footer */}
      <footer className="mt-6 text-center text-gray-600 text-xs font-mono select-none uppercase tracking-widest">
        <span>© 1981-2026 NEO-GALAXIAN ENTERPRISES • ARTISTIC ARCADE DESIGN</span>
      </footer>

    </div>
  );
};

