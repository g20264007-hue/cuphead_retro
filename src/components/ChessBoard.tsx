import React, { useState } from 'react';
import { Board, ChessPiece, Position, ChessTheme } from '../types/chess';
import { ChessPieceIcon as PiecesIcon } from './ChessPieces';
import { getLegalMoves, isSamePosition, isKingInCheck, findKing } from '../utils/chessLogic';

interface ChessBoardProps {
  board: Board;
  turn: 'w' | 'b';
  theme: ChessTheme;
  flipped: boolean;
  onMove: (from: Position, to: Position) => void;
  interactive: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  turn,
  theme,
  flipped,
  onMove,
  interactive,
}) => {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validDestinations, setValidDestinations] = useState<Position[]>([]);

  // Find standard colors based on chosen ChessTheme
  const getThemeClasses = (isDark: boolean) => {
    switch (theme) {
      case 'wood':
        return isDark ? 'bg-[#b58863] text-[#f0d9b5]' : 'bg-[#f0d9b5] text-[#b58863]';
      case 'slate':
        return isDark ? 'bg-[#64748b] text-[#cbd5e1]' : 'bg-[#e2e8f0] text-[#64748b]';
      case 'midnight':
        return isDark ? 'bg-[#1e1b4b] text-[#6366f1]' : 'bg-[#312e81] text-[#a5b4fc]';
      case 'emerald':
      default:
        return isDark ? 'bg-[#769656] text-[#eeeed2]' : 'bg-[#eeeed2] text-[#769656]';
    }
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!interactive) return;

    const clickedPiece = board[row][col];
    const clickPos: Position = { row, col };

    // If we click on a destination highlighting, execute the move!
    const isDestination = validDestinations.some(d => isSamePosition(d, clickPos));
    if (selectedPos && isDestination) {
      onMove(selectedPos, clickPos);
      setSelectedPos(null);
      setValidDestinations([]);
      return;
    }

    // Select new piece (must belong to active turn player)
    if (clickedPiece && clickedPiece.color === turn) {
      setSelectedPos(clickPos);
      const moves = getLegalMoves(clickPos, board);
      setValidDestinations(moves);
    } else {
      // Clear selection if clicking empty square or opponent piece
      setSelectedPos(null);
      setValidDestinations([]);
    }
  };

  // Pre-calculate King positions in check to highlight them red
  const whiteKingCheck = isKingInCheck('w', board) ? findKing('w', board) : null;
  const blackKingCheck = isKingInCheck('b', board) ? findKing('b', board) : null;

  // Build rows array based on flipped view
  const rowIndices = Array.from({ length: 8 }, (_, i) => i);
  const colIndices = Array.from({ length: 8 }, (_, i) => i);

  const displayRows = flipped ? [...rowIndices].reverse() : rowIndices;
  const displayCols = flipped ? [...colIndices].reverse() : colIndices;

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="w-full max-w-[512px] aspect-square bg-[#111] rounded-lg shadow-2xl border-4 border-[#1e1b4b]/80 p-1 md:p-2 relative overflow-hidden select-none">
      
      {/* 8x8 grid layout */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded overflow-hidden">
        {displayRows.map(row => {
          return displayCols.map(col => {
            const piece = board[row][col];
            const isDark = (row + col) % 2 === 1;
            const pos = { row, col };
            
            const isSelected = selectedPos ? isSamePosition(selectedPos, pos) : false;
            const isValidDest = validDestinations.some(d => isSamePosition(d, pos));
            
            const isKingCheck = (whiteKingCheck && isSamePosition(whiteKingCheck, pos)) || 
                                (blackKingCheck && isSamePosition(blackKingCheck, pos));

            // Grid background class based on current state
            let squareColorClass = getThemeClasses(isDark);
            if (isSelected) {
              squareColorClass = 'bg-[#facc15]/80 text-[#1e1b4b]'; // gold selection highlight
            } else if (isKingCheck) {
              squareColorClass = 'bg-red-600 animate-pulse text-white'; // red threat pulse
            }

            return (
              <div
                key={`${row}-${col}`}
                id={`square-${row}-${col}`}
                onClick={() => handleSquareClick(row, col)}
                className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all duration-200 ${squareColorClass}`}
              >
                {/* Board Rank Coordinates (1-8) along left edge */}
                {((!flipped && col === 0) || (flipped && col === 7)) && (
                  <span className="absolute top-1 left-1.5 text-[9px] md:text-[10px] font-bold opacity-45 pointer-events-none">
                    {ranks[row]}
                  </span>
                )}

                {/* Board File Coordinates (a-h) along bottom edge */}
                {((!flipped && row === 7) || (flipped && row === 0)) && (
                  <span className="absolute bottom-1 right-1.5 text-[9px] md:text-[10px] font-bold opacity-45 pointer-events-none">
                    {files[col]}
                  </span>
                )}

                {/* Draw Piece if present */}
                {piece && (
                  <div className={`w-[82%] h-[82%] z-10 transition-transform duration-200 hover:scale-105 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]`}>
                    <PiecesIcon type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Destination Indicator (translucent helper dot / circle) */}
                {isValidDest && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    {piece ? (
                      // Capture target indicator: Ring around piece
                      <div className="w-[84%] h-[84%] rounded-full border-4 border-red-500/70" />
                    ) : (
                      // Plain empty target: Centered dots
                      <div className="w-3.5 h-3.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    )}
                  </div>
                )}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};
