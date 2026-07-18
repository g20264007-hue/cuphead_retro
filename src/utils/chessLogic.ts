import { Board, ChessPiece, Position, PieceColor, PieceType, ChessMove } from '../types/chess';

// Initial board layout
export const createInitialBoard = (): Board => {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRow: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  // Black pieces (Rows 0 & 1)
  for (let col = 0; col < 8; col++) {
    board[0][col] = { id: `b-${backRow[col]}-${col}`, type: backRow[col], color: 'b', hasMoved: false };
    board[1][col] = { id: `b-p-${col}`, type: 'p', color: 'b', hasMoved: false };
  }

  // White pieces (Rows 6 & 7)
  for (let col = 0; col < 8; col++) {
    board[6][col] = { id: `w-p-${col}`, type: 'p', color: 'w', hasMoved: false };
    board[7][col] = { id: `w-${backRow[col]}-${col}`, type: backRow[col], color: 'w', hasMoved: false };
  }

  return board;
};

// Deep copy the board state
export const cloneBoard = (board: Board): Board => {
  return board.map(row => row.map(sq => sq ? { ...sq } : null));
};

// Position comparisons
export const isSamePosition = (p1: Position, p2: Position): boolean => {
  return p1.row === p2.row && p1.col === p2.col;
};

// Basic boundary check
export const isWithinBounds = (row: number, col: number): boolean => {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
};

// Generate algebraic notation
export const getAlgebraicNotation = (
  from: Position,
  to: Position,
  piece: ChessPiece,
  captured: ChessPiece | null,
  isCheck: boolean,
  isCheckmate: boolean
): string => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const pieceName = piece.type === 'p' ? '' : piece.type.toUpperCase();
  const captureMarker = captured ? 'x' : '';
  const toSquare = `${files[to.col]}${ranks[to.row]}`;
  const suffix = isCheckmate ? '#' : isCheck ? '+' : '';

  // Pawn capture file indicator
  if (piece.type === 'p' && captured) {
    return `${files[from.col]}x${toSquare}${suffix}`;
  }

  return `${pieceName}${captureMarker}${toSquare}${suffix}`;
};

// Returns raw legal moves for a piece WITHOUT check filters
export const getPseudoLegalMoves = (pos: Position, board: Board): Position[] => {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const moves: Position[] = [];
  const color = piece.color;
  const oppColor = color === 'w' ? 'b' : 'w';

  switch (piece.type) {
    case 'p': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // Single step forward
      const nextRow = pos.row + dir;
      if (isWithinBounds(nextRow, pos.col) && !board[nextRow][pos.col]) {
        moves.push({ row: nextRow, col: pos.col });

        // Double step from start position
        const doubleRow = pos.row + 2 * dir;
        if (pos.row === startRow && isWithinBounds(doubleRow, pos.col) && !board[doubleRow][pos.col]) {
          moves.push({ row: doubleRow, col: pos.col });
        }
      }

      // Diagonal captures
      const diagCols = [pos.col - 1, pos.col + 1];
      diagCols.forEach(c => {
        if (isWithinBounds(nextRow, c)) {
          const target = board[nextRow][c];
          if (target && target.color === oppColor) {
            moves.push({ row: nextRow, col: c });
          }
        }
      });
      break;
    }

    case 'n': {
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      offsets.forEach(([rOff, cOff]) => {
        const r = pos.row + rOff;
        const c = pos.col + cOff;
        if (isWithinBounds(r, c)) {
          const target = board[r][c];
          if (!target || target.color === oppColor) {
            moves.push({ row: r, col: c });
          }
        }
      });
      break;
    }

    case 'b':
    case 'r':
    case 'q': {
      const dirs: [number, number][] = [];
      if (piece.type === 'r' || piece.type === 'q') {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }
      if (piece.type === 'b' || piece.type === 'q') {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }

      dirs.forEach(([rDir, cDir]) => {
        let r = pos.row + rDir;
        let c = pos.col + cDir;
        while (isWithinBounds(r, c)) {
          const target = board[r][c];
          if (!target) {
            moves.push({ row: r, col: c });
          } else {
            if (target.color === oppColor) {
              moves.push({ row: r, col: c });
            }
            break; // Hit any piece, stop searching in this direction
          }
          r += rDir;
          c += cDir;
        }
      });
      break;
    }

    case 'k': {
      const dirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      dirs.forEach(([rDir, cDir]) => {
        const r = pos.row + rDir;
        const c = pos.col + cDir;
        if (isWithinBounds(r, c)) {
          const target = board[r][c];
          if (!target || target.color === oppColor) {
            moves.push({ row: r, col: c });
          }
        }
      });

      // Castling rules: Simplified castling logic checked directly in getLegalMoves
      break;
    }
  }

  return moves;
};

// Locate king of target color
export const findKing = (color: PieceColor, board: Board): Position | null => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
};

// Check if a color's king is currently under attack
export const isKingInCheck = (color: PieceColor, board: Board): boolean => {
  const kingPos = findKing(color, board);
  if (!kingPos) return false;

  const oppColor = color === 'w' ? 'b' : 'w';

  // Check all opponent pieces' pseudo-legal moves
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === oppColor) {
        const moves = getPseudoLegalMoves({ row: r, col: c }, board);
        if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
          return true;
        }
      }
    }
  }

  return false;
};

// Checks if a move is fully legal (doesn't cause/leave self-check)
export const getLegalMoves = (pos: Position, board: Board): Position[] => {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const pseudoMoves = getPseudoLegalMoves(pos, board);
  const legalMoves: Position[] = [];

  pseudoMoves.forEach(target => {
    // Simulate move
    const tempBoard = cloneBoard(board);
    tempBoard[target.row][target.col] = tempBoard[pos.row][pos.col];
    tempBoard[pos.row][pos.col] = null;

    if (!isKingInCheck(piece.color, tempBoard)) {
      legalMoves.push(target);
    }
  });

  // Dynamic Castling checks for King
  if (piece.type === 'k' && !piece.hasMoved && !isKingInCheck(piece.color, board)) {
    const r = pos.row;
    
    // King side castle (h rook)
    const hRook = board[r][7];
    if (hRook && hRook.type === 'r' && hRook.color === piece.color && !hRook.hasMoved) {
      if (!board[r][5] && !board[r][6]) {
        // Squares must not be under attack
        const test1 = cloneBoard(board);
        test1[r][5] = test1[r][4]; test1[r][4] = null;
        const test2 = cloneBoard(board);
        test2[r][6] = test2[r][4]; test2[r][4] = null;

        if (!isKingInCheck(piece.color, test1) && !isKingInCheck(piece.color, test2)) {
          legalMoves.push({ row: r, col: 6 });
        }
      }
    }

    // Queen side castle (a rook)
    const aRook = board[r][0];
    if (aRook && aRook.type === 'r' && aRook.color === piece.color && !aRook.hasMoved) {
      if (!board[r][1] && !board[r][2] && !board[r][3]) {
        const test1 = cloneBoard(board);
        test1[r][3] = test1[r][4]; test1[r][4] = null;
        const test2 = cloneBoard(board);
        test2[r][2] = test2[r][4]; test2[r][4] = null;

        if (!isKingInCheck(piece.color, test1) && !isKingInCheck(piece.color, test2)) {
          legalMoves.push({ row: r, col: 2 });
        }
      }
    }
  }

  return legalMoves;
};

// Check if player of color has any legal moves left
export const hasAnyLegalMoves = (color: PieceColor, board: Board): boolean => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const moves = getLegalMoves({ row: r, col: c }, board);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
};

// Evaluate the board value for AI
const PIECE_VALUES: Record<PieceType, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 1000
};

// Positional bonuses to help AI place pieces smartly (center control, developing etc)
const PAWN_POSITION_BONUS = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5,  5,  5,  5,  5,  5,  5,  5],
  [1,  1,  2,  3,  3,  2,  1,  1],
  [0.5,0.5,  1,2.5,2.5,  1,0.5,0.5],
  [0,  0,  0,  2,  2,  0,  0,  0],
  [0.5, -0.5,-1,  0,  0,-1, -0.5,0.5],
  [0.5,  1, 1, -2, -2, 1,  1,0.5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_POSITION_BONUS = [
  [-5, -4, -3, -3, -3, -3, -4, -5],
  [-4, -2,  0,  0,  0,  0, -2, -4],
  [-3,  0,  1,  1.5, 1.5,  1,  0, -3],
  [-3,  0.5, 1.5,  2,  2, 1.5,  0.5, -3],
  [-3,  0, 1.5,  2,  2, 1.5,  0, -3],
  [-3,  0.5,  1,  1.5, 1.5,  1,  0.5, -3],
  [-4, -2,  0,  0.5, 0.5,  0, -2, -4],
  [-5, -4, -3, -3, -3, -3, -4, -5]
];

export const evaluateBoard = (board: Board, aiColor: PieceColor): number => {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type];

      // Add positional adjustments
      if (piece.type === 'p') {
        const bonusRow = piece.color === 'w' ? 7 - r : r;
        value += PAWN_POSITION_BONUS[bonusRow][c];
      } else if (piece.type === 'n') {
        const bonusRow = piece.color === 'w' ? 7 - r : r;
        value += KNIGHT_POSITION_BONUS[bonusRow][c];
      }

      if (piece.color === aiColor) {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  return score;
};

// Find all legal moves for a color
export interface EvaluatedMove {
  from: Position;
  to: Position;
  score: number;
}

export const getAllLegalMoves = (color: PieceColor, board: Board): { from: Position; to: Position }[] => {
  const allMoves: { from: Position; to: Position }[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const from = { row: r, col: c };
        const moves = getLegalMoves(from, board);
        moves.forEach(to => {
          allMoves.push({ from, to });
        });
      }
    }
  }

  return allMoves;
};

// Simple Minimax search for Chess AI
export const getBestMove = (
  board: Board,
  aiColor: PieceColor,
  depth: number = 2
): { from: Position; to: Position } | null => {
  const moves = getAllLegalMoves(aiColor, board);
  if (moves.length === 0) return null;

  let bestMove: { from: Position; to: Position } | null = null;
  let bestScore = -Infinity;

  // Shuffle moves to add variation/organic feel to gameplay
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffledMoves) {
    const tempBoard = cloneBoard(board);
    // Simulate move
    tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
    tempBoard[move.from.row][move.from.col] = null;

    const score = minimax(tempBoard, depth - 1, -Infinity, Infinity, false, aiColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

// Alpha-Beta Minimax search
const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number => {
  const oppColor = aiColor === 'w' ? 'b' : 'w';

  if (depth === 0) {
    return evaluateBoard(board, aiColor);
  }

  const activeColor = isMaximizing ? aiColor : oppColor;
  const moves = getAllLegalMoves(activeColor, board);

  if (moves.length === 0) {
    // Check if checkmate or draw/stalemate
    if (isKingInCheck(activeColor, board)) {
      return isMaximizing ? -10000 - depth : 10000 + depth; // Favor faster checkmates
    }
    return 0; // Stalemate / Draw
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const tempBoard = cloneBoard(board);
      tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
      tempBoard[move.from.row][move.from.col] = null;

      const score = minimax(tempBoard, depth - 1, alpha, beta, false, aiColor);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // pruning
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const tempBoard = cloneBoard(board);
      tempBoard[move.to.row][move.to.col] = tempBoard[move.from.row][move.from.col];
      tempBoard[move.from.row][move.from.col] = null;

      const score = minimax(tempBoard, depth - 1, alpha, beta, true, aiColor);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // pruning
    }
    return minScore;
  }
};
