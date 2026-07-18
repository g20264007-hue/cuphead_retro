import React from 'react';
import { PieceType, PieceColor } from '../types/chess';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

export const ChessPieceIcon: React.FC<ChessPieceProps> = ({ type, color, className = "w-full h-full" }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#ffffff' : '#1e1b4b'; // white vs deep slate
  const stroke = isWhite ? '#1e1b4b' : '#ffffff';
  const accent = isWhite ? '#cbd5e1' : '#475569'; // shading accent

  switch (type) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round">
            <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83.62-1.41 1.61-1.41 2.72 0 .55.45 1 1 1h9c.55 0 1-.45 1-1 0-1.11-.58-2.1-1.41-2.72C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
            <path d="M15.5 33.5c0 .55.45 1 1 1h12c5.5 0 1-.45 1-1 0-1.38-1.12-2.5-2.5-2.5h-9c-1.38 0-2.5 1.12-2.5 2.5z" />
          </g>
        </svg>
      );

    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 39h27v-3H9v3zm3-3h21v-4H12v4zm2.5-4l1.5-12h18l1.5 12h-21z" />
            <path d="M12 12v8h21v-8H12zm1.5-3v3h4V9h-4zm6 0v3h4V9h-4zm6 0v3h4V9h-4zm6 0v3h4V9h-4z" />
          </g>
        </svg>
      );

    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,20 18,20 C 18,20 17,21 15,24 C 13,27 13,31 15,31 C 17,31 19,27 19,27 C 19,27 18,29 21,31 C 24,33 28,31 28,31 C 28,31 29,26 27,22 C 25,18 22,10 22,10 z" />
            <path d="M 9.5 39.5 L 35.5 39.5 L 32.5 34.5 L 12.5 34.5 Z" />
            <circle cx="17.5" cy="15.5" r="1.5" fill={isWhite ? '#1e1b4b' : '#ffffff'} />
          </g>
        </svg>
      );

    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 36h27v-3H9v3zm13.5-32C19.5 7.5 15 13 15 18c0 4.5 3.5 8 7.5 8s7.5-3.5 7.5-8c0-5-4.5-10.5-7.5-14z" />
            <circle cx="22.5" cy="5" r="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
            <path d="M17.5 18h10M22.5 13v10" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm10-3a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm10 3a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
            <path d="M9 37h27v-3H9v3zm3.5-3l3-22 7 13 7-13 3 22h-20z" />
            <circle cx="22.5" cy="9" r="2" />
          </g>
        </svg>
      );

    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8.5h5" strokeWidth="2" />
            <path d="M11.5 37h22v-3h-22v3zm4-3l2.5-18 4.5 8 4.5-8 2.5 18H15.5z" />
            <path d="M11.5 16c2.5 4 8 3 11 8 3-5 8.5-4 11-8" fill="none" stroke={stroke} strokeWidth="1.5" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
