export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type Square = ChessPiece | null;
export type Board = Square[][]; // 8x8 matrix

export interface Position {
  row: number;
  col: number;
}

export interface ChessMove {
  from: Position;
  to: Position;
  piece: ChessPiece;
  captured: ChessPiece | null;
  notation: string;
  isCastling?: boolean;
  isEnPassant?: boolean;
  isPromotion?: boolean;
}

export type GameState = 'PLAYING' | 'CHECK' | 'CHECKMATE' | 'STALEMATE' | 'DRAW';

export type ChessTheme = 'emerald' | 'wood' | 'slate' | 'midnight';

export type GameMode = 'PASS_AND_PLAY' | 'VS_AI';

export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
