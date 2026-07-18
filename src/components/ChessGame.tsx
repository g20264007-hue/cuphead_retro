import React, { useState, useEffect, useRef } from 'react';
import { Board, ChessPiece, Position, ChessTheme, GameMode, AIDifficulty, GameState, ChessMove } from '../types/chess';
import { ChessBoard } from './ChessBoard';
import { chessAudio } from './ChessAudio';
import {
  createInitialBoard,
  cloneBoard,
  getAlgebraicNotation,
  isKingInCheck,
  hasAnyLegalMoves,
  getBestMove,
  isSamePosition
} from '../utils/chessLogic';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  User,
  Cpu,
  History,
  Timer,
  Play,
  Award,
  BookOpen,
  ChevronRight,
  Shield,
  HelpCircle,
  Clock
} from 'lucide-react';

export const ChessGame: React.FC = () => {
  // Game Setup State
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [theme, setTheme] = useState<ChessTheme>('emerald');
  const [gameMode, setGameMode] = useState<GameMode>('VS_AI');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('MEDIUM');
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  
  // History & Captured Pieces
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<ChessPiece[]>([]); // captured by Black
  const [capturedBlack, setCapturedBlack] = useState<ChessPiece[]>([]); // captured by White

  // UI States
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [promotionPending, setPromotionPending] = useState<{ from: Position; to: Position } | null>(null);

  // Timers (in seconds)
  const [whiteTime, setWhiteTime] = useState<number>(600); // 10 minutes default
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  // System status messages matching the logs aesthetic
  const [systemLogs, setSystemLogs] = useState<string[]>([
    'CHESS MASTER INITIALIZED',
    'SELECT MODE AND START BATTLE'
  ]);

  const addLog = (log: string) => {
    setSystemLogs(prev => [log, ...prev].slice(0, 10));
  };

  // Sound sync
  useEffect(() => {
    chessAudio.setMuted(isMuted);
  }, [isMuted]);

  // Handle Game Timer count-down
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && gameState === 'PLAYING') {
      interval = setInterval(() => {
        if (turn === 'w') {
          setWhiteTime(t => {
            if (t <= 1) {
              setGameState('DRAW'); // Or time forfeit
              addLog('WHITE RAN OUT OF TIME');
              chessAudio.playDefeat();
              return 0;
            }
            return t - 1;
          });
        } else {
          setBlackTime(t => {
            if (t <= 1) {
              setGameState('DRAW');
              addLog('BLACK RAN OUT OF TIME');
              chessAudio.playVictory();
              return 0;
            }
            return t - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, turn, gameState]);

  // AI moves trigger
  useEffect(() => {
    if (gameMode === 'VS_AI' && turn === 'b' && gameState === 'PLAYING' && !aiThinking) {
      setAiThinking(true);
      addLog('AI THINKING PRE-PLANNING...');

      const timer = setTimeout(() => {
        // AI depth based on difficulty
        const depth = aiDifficulty === 'EASY' ? 1 : aiDifficulty === 'MEDIUM' ? 2 : 3;
        const bestMove = getBestMove(board, 'b', depth);

        if (bestMove) {
          executeMove(bestMove.from, bestMove.to);
        } else {
          // If AI has absolutely no moves, determine checkmate/stalemate
          checkGameEndState('b', board);
        }
        setAiThinking(false);
      }, 600); // realistic delay so it feels natural

      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, gameState, board]);

  // Helper formatting for clocks
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Perform a legal chess move
  const executeMove = (from: Position, to: Position, promoType: 'q' | 'r' | 'b' | 'n' = 'q') => {
    const movingPiece = board[from.row][from.col];
    if (!movingPiece) return;

    const targetPiece = board[to.row][to.col];
    const newBoard = cloneBoard(board);

    // Track special status
    let isCastling = false;
    let isPromotion = false;

    // Handle Castling moves
    if (movingPiece.type === 'k' && Math.abs(from.col - to.col) === 2) {
      isCastling = true;
      const r = from.row;
      if (to.col === 6) {
        // King side castling: Move rook from h to f
        newBoard[r][5] = newBoard[r][7];
        newBoard[r][7] = null;
        if (newBoard[r][5]) newBoard[r][5]!.hasMoved = true;
      } else if (to.col === 2) {
        // Queen side castling: Move rook from a to d
        newBoard[r][3] = newBoard[r][0];
        newBoard[r][0] = null;
        if (newBoard[r][3]) newBoard[r][3]!.hasMoved = true;
      }
    }

    // Pawn Promotion check
    const isPawn = movingPiece.type === 'p';
    const promotionRow = movingPiece.color === 'w' ? 0 : 7;
    if (isPawn && to.row === promotionRow) {
      isPromotion = true;
      // Replace with promoted piece
      newBoard[to.row][to.col] = {
        id: `${movingPiece.color}-${promoType}-${Date.now()}`,
        type: promoType,
        color: movingPiece.color,
        hasMoved: true,
      };
    } else {
      // Regular move
      newBoard[to.row][to.col] = { ...movingPiece, hasMoved: true };
    }

    newBoard[from.row][from.col] = null;

    // Manage captured pieces
    if (targetPiece) {
      if (targetPiece.color === 'w') {
        setCapturedWhite(prev => [...prev, targetPiece]);
      } else {
        setCapturedBlack(prev => [...prev, targetPiece]);
      }
      chessAudio.playCapture();
      addLog(`CAPTURED: ${targetPiece.type.toUpperCase()}`);
    } else {
      chessAudio.playMove();
    }

    // Calculate notations
    const nextTurn = movingPiece.color === 'w' ? 'b' : 'w';
    const isOppCheck = isKingInCheck(nextTurn, newBoard);
    const hasNextLegal = hasAnyLegalMoves(nextTurn, newBoard);
    const isMate = isOppCheck && !hasNextLegal;

    const notation = getAlgebraicNotation(from, to, movingPiece, targetPiece, isOppCheck, isMate);

    const newMove: ChessMove = {
      from,
      to,
      piece: movingPiece,
      captured: targetPiece,
      notation,
      isCastling,
      isPromotion,
    };

    setMoveHistory(prev => [...prev, newMove]);
    setBoard(newBoard);
    setTurn(nextTurn);
    
    // Check game condition
    if (isOppCheck) {
      if (isMate) {
        setGameState('CHECKMATE');
        addLog(`CHECKMATE! ${movingPiece.color === 'w' ? 'WHITE' : 'BLACK'} WINS!`);
        if (movingPiece.color === 'w') chessAudio.playVictory();
        else chessAudio.playDefeat();
      } else {
        setGameState('CHECK');
        chessAudio.playCheck();
        addLog(`CHECK TO KING!`);
      }
    } else if (!hasNextLegal) {
      setGameState('STALEMATE');
      addLog('STALEMATE - DRAW CONCLUDED');
    } else {
      setGameState('PLAYING');
    }

    // Start timer on first move
    if (!isTimerActive) setIsTimerActive(true);
  };

  // Handle a user move selection
  const handleBoardMove = (from: Position, to: Position) => {
    const piece = board[from.row][from.col];
    if (!piece) return;

    // Trigger pawn promotion popup choice if pawn is moving to back rank
    const isPawn = piece.type === 'p';
    const promotionRow = piece.color === 'w' ? 0 : 7;
    if (isPawn && to.row === promotionRow) {
      setPromotionPending({ from, to });
    } else {
      executeMove(from, to);
    }
  };

  const handlePromotionSelection = (type: 'q' | 'r' | 'b' | 'n') => {
    if (promotionPending) {
      executeMove(promotionPending.from, promotionPending.to, type);
      setPromotionPending(null);
    }
  };

  const checkGameEndState = (color: 'w' | 'b', currentBoard: Board) => {
    const isCheck = isKingInCheck(color, currentBoard);
    const hasLegal = hasAnyLegalMoves(color, currentBoard);

    if (!hasLegal) {
      if (isCheck) {
        setGameState('CHECKMATE');
        addLog('CHECKMATE DETECTED');
      } else {
        setGameState('STALEMATE');
        addLog('STALEMATE');
      }
    }
  };

  // Undo Last Move
  const handleUndo = () => {
    if (moveHistory.length === 0) return;

    const isAIPresent = gameMode === 'VS_AI';
    // If AI is present, undo both user and AI's turn
    const undosCount = isAIPresent && moveHistory.length >= 2 ? 2 : 1;

    let updatedHistory = [...moveHistory];
    let tempBoard = cloneBoard(board);
    let lastMove: ChessMove | null = null;

    for (let u = 0; u < undosCount; u++) {
      lastMove = updatedHistory.pop() || null;
      if (!lastMove) break;

      // Restore piece positions
      const originalPiece = { ...lastMove.piece };
      tempBoard[lastMove.from.row][lastMove.from.col] = originalPiece;
      tempBoard[lastMove.to.row][lastMove.to.col] = lastMove.captured;

      // Untrack captured piece from inventories
      if (lastMove.captured) {
        if (lastMove.captured.color === 'w') {
          setCapturedWhite(prev => prev.slice(0, -1));
        } else {
          setCapturedBlack(prev => prev.slice(0, -1));
        }
      }
    }

    if (lastMove) {
      setBoard(tempBoard);
      setMoveHistory(updatedHistory);
      setTurn(lastMove.piece.color);
      setGameState('PLAYING');
      addLog(`REVERTED LAST MOVE`);
      chessAudio.playMove();
    }
  };

  // Restart Board
  const handleRestart = () => {
    setBoard(createInitialBoard());
    setTurn('w');
    setGameState('PLAYING');
    setMoveHistory([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWhiteTime(600);
    setBlackTime(600);
    setIsTimerActive(false);
    setSystemLogs(['NEW BATTLE STARTED', 'WHITE FIRST MOVE CHOSEN']);
    chessAudio.playVictory();
  };

  return (
    <div className="min-h-screen bg-[#020205] text-[#00ffcc] flex flex-col items-center justify-center p-3 md:p-6 font-mono select-none relative overflow-hidden">
      
      {/* Immersive glass container matching Artistic Flair styling */}
      <div className="w-full max-w-6xl bg-[#020205] border-4 md:border-8 border-[#1a1a2e] rounded-xl p-4 md:p-6 shadow-[0_0_60px_rgba(0,255,204,0.15)] relative overflow-hidden flex flex-col gap-6">
        
        {/* top neon strip */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00ffcc] to-transparent opacity-60"></div>
        
        {/* Header Branding */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1a1a2e] pb-4 mb-2 z-10">
          <div className="text-left mb-2 md:mb-0">
            <p className="text-[10px] text-[#4d4d70] uppercase tracking-widest">ARTISTIC TACTICAL SIMULATOR</p>
            <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase font-display flex items-center gap-2">
              <Shield className="w-8 h-8 text-cyan-400" />
              <span>CHESS MASTER</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs">
            {/* Play audio toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1a2e] hover:bg-purple-950/40 text-[#00ffcc] rounded border border-[#00ffcc]/20 transition"
              title="Toggle Game Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
              <span>{isMuted ? '음소거 해제' : '음소거'}</span>
            </button>

            {/* Instruction Toggle */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1a2e] hover:bg-purple-950/40 text-cyan-400 rounded border border-cyan-400/20 transition"
            >
              <HelpCircle className="w-4 h-4" />
              <span>가이드 {showGuide ? '닫기' : '보기'}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Game Modes Controller Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#05050a] border border-[#1a1a2e] rounded-lg p-3 text-xs leading-relaxed">
          <div className="flex flex-col gap-1.5 justify-center">
            <span className="text-[#4d4d70] text-[10px] uppercase font-bold tracking-widest">SELECT GAME MODE</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setGameMode('VS_AI'); handleRestart(); }}
                className={`flex-1 py-1.5 rounded border text-center transition font-bold uppercase tracking-wider ${
                  gameMode === 'VS_AI'
                    ? 'bg-[#11222d] border-[#00ffcc] text-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.15)]'
                    : 'bg-[#1a1a2e] border-transparent text-[#4d4d70] hover:text-[#00ffcc]/60'
                }`}
              >
                vs Computer AI
              </button>
              <button
                onClick={() => { setGameMode('PASS_AND_PLAY'); handleRestart(); }}
                className={`flex-1 py-1.5 rounded border text-center transition font-bold uppercase tracking-wider ${
                  gameMode === 'PASS_AND_PLAY'
                    ? 'bg-[#11222d] border-[#00ffcc] text-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.15)]'
                    : 'bg-[#1a1a2e] border-transparent text-[#4d4d70] hover:text-[#00ffcc]/60'
                }`}
              >
                Pass & Play
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 justify-center">
            <span className="text-[#4d4d70] text-[10px] uppercase font-bold tracking-widest">COMPUTER DIFFICULTY</span>
            <div className="flex gap-1.5">
              {(['EASY', 'MEDIUM', 'HARD'] as AIDifficulty[]).map(diff => (
                <button
                  key={diff}
                  disabled={gameMode !== 'VS_AI'}
                  onClick={() => setAiDifficulty(diff)}
                  className={`flex-1 py-1.5 rounded border text-center text-[10px] transition font-bold uppercase tracking-wider ${
                    gameMode === 'VS_AI' && aiDifficulty === diff
                      ? 'bg-[#ff0055]/15 border-[#ff0055] text-[#ff0055] shadow-[0_0_5px_rgba(255,0,85,0.15)]'
                      : 'bg-[#1a1a2e] border-transparent text-[#4d4d70] disabled:opacity-30 disabled:pointer-events-none hover:text-[#00ffcc]/60'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 justify-center">
            <span className="text-[#4d4d70] text-[10px] uppercase font-bold tracking-widest">CHESSBOARD THEME</span>
            <div className="flex gap-1.5">
              {(['emerald', 'wood', 'slate', 'midnight'] as ChessTheme[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-1.5 rounded border text-center text-[10px] transition font-bold uppercase tracking-wider ${
                    theme === t
                      ? 'bg-purple-950/40 border-[#00ffcc]/60 text-white'
                      : 'bg-[#1a1a2e] border-transparent text-[#4d4d70] hover:text-[#00ffcc]/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Master Chess layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          
          {/* Left Panel: Taken pieces & Timer stats */}
          <div className="lg:col-span-1 bg-[#05050a] border border-[#1a1a2e] rounded-lg p-5 flex flex-col justify-between gap-6 font-mono">
            
            {/* Clocks display */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-cyan-400 border-b border-[#1a1a2e] pb-2 mb-4">
                <Clock className="w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#4d4d70]">MATCH CLOCKS</h2>
              </div>

              {/* White clock */}
              <div className="bg-[#11222d]/40 p-3 rounded border border-cyan-500/10 flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-[#4d4d70] uppercase">WHITE TURN</p>
                  <p className="text-xl font-bold text-white opacity-95">WHITE PLAYER</p>
                </div>
                <div className={`text-2xl font-black font-mono tracking-wider ${turn === 'w' ? 'text-[#00ffcc] neon-glow-cyan animate-pulse' : 'text-gray-500'}`}>
                  {formatTime(whiteTime)}
                </div>
              </div>

              {/* Black clock */}
              <div className="bg-[#ff0055]/5 p-3 rounded border border-[#ff0055]/10 flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-[#4d4d70] uppercase">BLACK TURN</p>
                  <p className="text-xl font-bold text-white opacity-95">BLACK {gameMode === 'VS_AI' ? 'COMP AI' : 'PLAYER'}</p>
                </div>
                <div className={`text-2xl font-black font-mono tracking-wider ${turn === 'b' ? 'text-[#ff0055] neon-glow-red animate-pulse' : 'text-gray-500'}`}>
                  {formatTime(blackTime)}
                </div>
              </div>
            </div>

            {/* Taken Pieces Racks */}
            <div className="border-t border-[#1a1a2e] pt-4 space-y-4">
              <div>
                <p className="text-[10px] text-[#4d4d70] uppercase tracking-widest mb-2">BLACK CAPTURES</p>
                <div className="flex flex-wrap gap-1 bg-[#1a1a2e]/30 p-2 rounded min-h-[40px] border border-[#1a1a2e]">
                  {capturedBlack.map((piece, idx) => (
                    <span key={idx} className="text-lg bg-black/40 px-1 py-0.5 rounded font-bold text-white shadow-sm" title={piece.type}>
                      {piece.type.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[#4d4d70] uppercase tracking-widest mb-2">WHITE CAPTURES</p>
                <div className="flex flex-wrap gap-1 bg-[#1a1a2e]/30 p-2 rounded min-h-[40px] border border-[#1a1a2e]">
                  {capturedWhite.map((piece, idx) => (
                    <span key={idx} className="text-lg bg-black/40 px-1 py-0.5 rounded font-bold text-[#475569]" title={piece.type}>
                      {piece.type.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Center Column: Interactive ChessBoard */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center relative bg-black/50 border border-[#1a1a2e] rounded-lg p-4 overflow-hidden">
            
            {/* Absolute Decorative Corner Frame Lines (Artistic Flair design theme) */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#1a1a2e] pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#1a1a2e] pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#1a1a2e] pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#1a1a2e] pointer-events-none"></div>

            {/* Current Game Alert Header Banner */}
            <div className="mb-4 z-10 text-center">
              {gameState === 'CHECK' && (
                <div className="bg-red-950/60 border border-red-500 text-red-400 font-bold px-4 py-1.5 rounded animate-bounce shadow-md uppercase text-xs tracking-widest">
                  ⚠️ WARNING: KING IN CHECK!
                </div>
              )}
              {gameState === 'CHECKMATE' && (
                <div className="bg-green-950/80 border border-[#00ffcc] text-white font-bold px-6 py-2 rounded text-sm tracking-widest animate-pulse shadow-lg uppercase">
                  🏆 CHECKMATE: VICTORY ACHIEVED!
                </div>
              )}
              {gameState === 'STALEMATE' && (
                <div className="bg-gray-900 border border-gray-600 text-gray-300 font-bold px-4 py-1.5 rounded text-xs tracking-widest shadow-md uppercase">
                  🤝 STALEMATE DRAW CONCLUDED
                </div>
              )}
              {gameState === 'PLAYING' && (
                <div className="text-[11px] uppercase tracking-widest font-semibold text-gray-400">
                  {turn === 'w' ? "⚪ WHITE'S TURN TO COMMENCE" : "⚫ BLACK'S TURN TO COMMENCE"}
                </div>
              )}
            </div>

            <div className="w-full max-w-[480px] z-10 flex justify-center">
              <ChessBoard
                board={board}
                turn={turn}
                theme={theme}
                flipped={isFlipped}
                onMove={handleBoardMove}
                interactive={gameState !== 'CHECKMATE' && gameState !== 'STALEMATE' && !aiThinking}
              />
            </div>

            {/* Promotion choices popup trigger modal overlay */}
            {promotionPending && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-50 p-4 rounded-lg">
                <div className="bg-[#111] border-2 border-[#00ffcc] p-6 rounded-lg max-w-xs text-center space-y-4 shadow-2xl">
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">PAWN PROMOTION OPTION</h3>
                  <p className="text-xs text-gray-400">Choose upgrade for your reaching Pawn:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handlePromotionSelection('q')}
                      className="py-2.5 bg-[#1a1a2e] hover:bg-cyan-950 text-[#00ffcc] border border-[#00ffcc]/30 rounded text-xs font-bold uppercase transition"
                    >
                      👑 Queen
                    </button>
                    <button
                      onClick={() => handlePromotionSelection('r')}
                      className="py-2.5 bg-[#1a1a2e] hover:bg-cyan-950 text-[#00ffcc] border border-[#00ffcc]/30 rounded text-xs font-bold uppercase transition"
                    >
                      🏰 Rook
                    </button>
                    <button
                      onClick={() => handlePromotionSelection('b')}
                      className="py-2.5 bg-[#1a1a2e] hover:bg-cyan-950 text-[#00ffcc] border border-[#00ffcc]/30 rounded text-xs font-bold uppercase transition"
                    >
                      ⛪ Bishop
                    </button>
                    <button
                      onClick={() => handlePromotionSelection('n')}
                      className="py-2.5 bg-[#1a1a2e] hover:bg-cyan-950 text-[#00ffcc] border border-[#00ffcc]/30 rounded text-xs font-bold uppercase transition"
                    >
                      🐴 Knight
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tactical actions bottom bar */}
            <div className="mt-4 flex flex-wrap gap-3 items-center justify-center text-xs relative z-10">
              <button
                onClick={handleUndo}
                disabled={moveHistory.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] hover:bg-purple-950/30 text-gray-300 border border-gray-800 rounded transition disabled:opacity-30 disabled:pointer-events-none"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>한 수 물리기 (Undo)</span>
              </button>

              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] hover:bg-purple-950/30 text-gray-300 border border-gray-800 rounded transition"
              >
                <RotateCcw className="w-3.5 h-3.5 rotate-90" />
                <span>보드 돌리기 (Flip)</span>
              </button>

              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 rounded transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>게임 재시작</span>
              </button>
            </div>

          </div>

          {/* Right Panel: Move history log & Interactive Guide */}
          <div className="lg:col-span-1 bg-[#05050a] border border-[#1a1a2e] rounded-lg p-5 flex flex-col justify-between gap-6 font-mono">
            
            {/* MOVE LOGS */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-cyan-400 border-b border-[#1a1a2e] pb-2 mb-3">
                <History className="w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#4d4d70]">TACTICAL HISTORY</h2>
              </div>

              {moveHistory.length === 0 ? (
                <p className="text-[10px] text-gray-600 uppercase italic">No moves recorded yet</p>
              ) : (
                <div className="space-y-1 overflow-y-auto max-h-[160px] text-[11px] leading-relaxed pr-2">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, stepIdx) => {
                    const whiteMove = moveHistory[stepIdx * 2];
                    const blackMove = moveHistory[stepIdx * 2 + 1];
                    return (
                      <div key={stepIdx} className="grid grid-cols-12 gap-1 py-0.5 border-b border-gray-900/45">
                        <span className="col-span-3 text-gray-500 font-bold">{stepIdx + 1}.</span>
                        <span className="col-span-4 text-white font-semibold">{whiteMove?.notation}</span>
                        <span className="col-span-5 text-[#ff0055] font-semibold">{blackMove?.notation || ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SYSTEM LOGS CONSOLE */}
            <div className="border-t border-[#1a1a2e] pt-4 flex-1">
              <p className="text-[10px] text-[#4d4d70] uppercase mb-3 font-bold">SYSTEM BROADCASTS</p>
              <div className="space-y-1.5 text-[10px] text-[#00ffcc]/70 leading-normal max-h-[120px] overflow-hidden">
                {systemLogs.map((log, index) => (
                  <p key={index} className="truncate">
                    &gt; {log}
                  </p>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Detailed Chess rules & instructions Guide */}
        {showGuide && (
          <div id="chess-guide" className="p-4 bg-gray-950 border border-[#1a1a2e] rounded-lg text-xs leading-relaxed text-gray-300 space-y-3 shadow-xl max-w-full">
            <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-1">
              <BookOpen className="w-4 h-4 text-yellow-500" />
              <span>체스 기본 규칙 및 특수 행마법</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>체스 기물 이동</strong>: 원하는 기물을 선택하면 이동 가능한 유효 경로에 <strong>푸른 도트</strong>가 나타나 터치/클릭을 통해 쉽게 기물을 이동시킬 수 있습니다.</li>
                <li><strong>체크 (Check)</strong>: 상대방이 나의 킹을 직접적으로 위협하는 상태이며, 체크가 발동하면 킹 자리가 <strong>붉은색으로 깜빡이며 경고</strong>를 알립니다.</li>
                <li><strong>체크메이트 (Checkmate)</strong>: 체크 상태를 어떠한 수로도 방어할 수 없을 때 게임이 종료되며, 공격한 플레이어가 최종 승리하게 됩니다.</li>
                <li><strong>스테일메이트 (Stalemate)</strong>: 체크가 아니지만 기물을 이동할 수 있는 법적인 수(Legal Moves)가 완전히 소멸된 상황으로 자동으로 무승부 처리됩니다.</li>
              </ul>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>캐슬링 (Castling)</strong>: 킹과 룩이 한 번도 움직이지 않았고 그 사이의 경로가 비어있을 때, 체크 상황이 아니라면 킹을 두 칸 움직여 룩과 동시에 자리를 교환할 수 있는 특수 행마법입니다. (조건 충족 시 자동 도트 표시)</li>
                <li><strong>프로모션 (Pawn Promotion)</strong>: 나의 폰(Pawn) 기물이 상대방 진영 최후방 가로줄(Back Rank)에 도달하면 원하는 <strong>퀸, 룩, 비숍, 나이트</strong> 중 하나로 자동 승급을 요구하는 팝업 창이 열립니다.</li>
                <li><strong>AI 대전 팁</strong>: 인공지능 Computer AI 대전 모드에서는 <strong>Easy, Medium, Hard</strong> 총 3개의 난이도를 선택해 기력을 측정할 수 있습니다.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer info line */}
        <div className="border-t border-[#1a1a2e] pt-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-500 gap-2 uppercase">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span className="font-semibold text-gray-400">HOST READY: BUILD COMPLETED FOR GITHUB PAGES</span>
          </div>
          <div className="flex items-center gap-4">
            <span>SOUND SYNTHESIZER: {isMuted ? 'OFFLINE' : 'ONLINE'}</span>
            <span>SYSTEM CORRES: OK</span>
          </div>
        </div>

      </div>

      <footer className="mt-6 text-center text-gray-600 text-xs font-mono select-none uppercase tracking-widest">
        <span>© 1981-2026 CHESS MASTER SIMULATION • ARTISTIC ARCADE WORKSPACE</span>
      </footer>

    </div>
  );
};
export default ChessGame;
