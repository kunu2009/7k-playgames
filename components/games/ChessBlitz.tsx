
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSounds } from '../../hooks/useSounds';
import { SOUND_EFFECTS } from '../../utils/sounds';

// --- TYPES & CONSTANTS ---
const ASPECT_RATIO = 1.2; // Game Area Aspect Ratio (Wider to accommodate UI)
const ORIGINAL_WIDTH = 1000;
const INITIAL_TIME = 60; // 60 seconds per player

type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type PieceColor = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type Board = (Piece | null)[][];
type Move = { from: [number, number]; to: [number, number] };
type GameState = 'start' | 'playing' | 'gameOver';

const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  white: { pawn: '♙', rook: '♖', knight: '♘', bishop: '♗', queen: '♕', king: '♔' },
  black: { pawn: '♟', rook: '♜', knight: '♞', bishop: '♝', queen: '♛', king: '♚' },
};

const PIECE_VALUES: Record<PieceType, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };

// --- HELPER FUNCTIONS ---
const generateInitialBoard = (): Board => {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const order: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let i = 0; i < 8; i++) {
    board[1][i] = { type: 'pawn', color: 'black' };
    board[6][i] = { type: 'pawn', color: 'white' };
    board[0][i] = { type: order[i], color: 'black' };
    board[7][i] = { type: order[i], color: 'white' };
  }
  return board;
};

// --- GAME COMPONENT ---
const ChessBlitz: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState>('start');
  const [winner, setWinner] = useState<string | null>(null);
  const [board, setBoard] = useState<Board>(generateInitialBoard);
  const [timers, setTimers] = useState({ white: INITIAL_TIME, black: INITIAL_TIME });
  const [turn, setTurn] = useState<PieceColor>('white');
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const moveHistory = useRef<Board[]>([]);
  const sounds = useSounds(SOUND_EFFECTS);

  const [powerUps, setPowerUps] = useState({
      white: { undo: 1, doubleMove: 1, freeze: 1 },
      black: { undo: 1, doubleMove: 1, freeze: 1 }
  });
  const isDoubleMoveActive = useRef(false);
  const isOpponentFrozen = useRef(false);

  // Scalable dimensions
  const c = useRef({
    width: 1000, height: 833, scale: 1,
    boardSize: 0, cellSize: 0, boardX: 0, boardY: 0,
    pieceFontSize: 0, uiFontSize: 0,
  });

  const updateConstants = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const scale = containerWidth / ORIGINAL_WIDTH;
    const width = containerWidth;
    const height = containerWidth / ASPECT_RATIO;
    
    const boardSize = Math.min(width * 0.7, height * 0.9);
    c.current = {
      width, height, scale,
      boardSize,
      cellSize: boardSize / 8,
      boardX: (width - boardSize) / 2,
      boardY: (height - boardSize) / 2,
      pieceFontSize: boardSize / 9,
      uiFontSize: Math.max(14, 20 * scale),
    };
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }, []);

  const resetGame = useCallback(() => {
    setBoard(generateInitialBoard());
    setTimers({ white: INITIAL_TIME, black: INITIAL_TIME });
    setTurn('white');
    setSelectedPiece(null);
    setValidMoves([]);
    setWinner(null);
    moveHistory.current = [generateInitialBoard()];
    isDoubleMoveActive.current = false;
    isOpponentFrozen.current = false;
    setPowerUps({
      white: { undo: 1, doubleMove: 1, freeze: 1 },
      black: { undo: 1, doubleMove: 1, freeze: 1 }
    });
    setGameState('start');
  }, []);
  
  const getValidMoves = useCallback((r: number, c_in: number, b: Board, checkKingSafety: boolean): [number, number][] => {
    const piece = b[r][c_in];
    if (!piece) return [];
    const moves: [number, number][] = [];
    const { type, color } = piece;
    const dir = color === 'white' ? -1 : 1;

    const checkMove = (nr: number, nc: number, canCapture: boolean, mustCapture: boolean) => {
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return false;
        const target = b[nr][nc];
        if (target && target.color === color) return false;
        if (mustCapture && !target) return false;
        if (!canCapture && target) return false;
        moves.push([nr, nc]);
        return !target; // Return true if square is empty to continue sliding
    };

    const checkPawn = () => {
        if(checkMove(r+dir, c_in, false, false)) {
            if ((color === 'white' && r === 6) || (color === 'black' && r === 1)) {
                checkMove(r+2*dir, c_in, false, false);
            }
        }
        checkMove(r+dir, c_in-1, true, true);
        checkMove(r+dir, c_in+1, true, true);
    }

    const checkSliding = (dirs: number[][]) => {
        dirs.forEach(([dr, dc]) => {
            let nr = r + dr, nc = c_in + dc;
            while(checkMove(nr, nc, true, false)) {
                nr += dr; nc += dc;
            }
        });
    }
    
    const checkKnight = () => [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => checkMove(r+dr, c_in+dc, true, false));
    const checkKing = () => [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => checkMove(r+dr, c_in+dc, true, false));

    if (type === 'pawn') checkPawn();
    else if (type === 'rook') checkSliding([[-1,0], [1,0], [0,-1], [0,1]]);
    else if (type === 'knight') checkKnight();
    else if (type === 'bishop') checkSliding([[-1,-1], [-1,1], [1,-1], [1,1]]);
    else if (type === 'queen') checkSliding([[-1,-1], [-1,1], [1,-1], [1,1], [-1,0], [1,0], [0,-1], [0,1]]);
    else if (type === 'king') checkKing();

    if (!checkKingSafety) return moves;

    return moves.filter(([nr, nc]) => {
        const testBoard = b.map(row => [...row]);
        testBoard[nr][nc] = piece;
        testBoard[r][c_in] = null;
        return !isKingInCheck(color, testBoard);
    });
  }, []);
  
  const isKingInCheck = useCallback((kingColor: PieceColor, b: Board): boolean => {
    let kingPos: [number, number] | null = null;
    for (let r_find = 0; r_find < 8; r_find++) {
        for (let c_find = 0; c_find < 8; c_find++) {
            if (b[r_find][c_find]?.type === 'king' && b[r_find][c_find]?.color === kingColor) {
                kingPos = [r_find, c_find]; break;
            }
        }
        if (kingPos) break;
    }
    if (!kingPos) return true;

    const opponentColor = kingColor === 'white' ? 'black' : 'white';
    for (let r_check = 0; r_check < 8; r_check++) {
        for (let c_check = 0; c_check < 8; c_check++) {
            if (b[r_check][c_check]?.color === opponentColor) {
                const moves = getValidMoves(r_check, c_check, b, false);
                if (moves.some(([nr, nc]) => nr === kingPos![0] && nc === kingPos![1])) {
                    return true;
                }
            }
        }
    }
    return false;
  }, [getValidMoves]);
  
  const checkForMate = useCallback((playerColor: PieceColor, b: Board) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.color === playerColor) {
          if (getValidMoves(r, c, b, true).length > 0) return false;
        }
      }
    }
    return true; // No legal moves
  }, [getValidMoves]);

  const makeMove = useCallback((from: [number, number], to: [number, number]) => {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from[0]][from[1]];
    if (!piece) return;

    if (newBoard[to[0]][to[1]]) {
      sounds.favorite(); // Capture sound
    } else {
      sounds.hover(); // Move sound
    }
    
    if (piece.type === 'pawn' && (to[0] === 0 || to[0] === 7)) {
        piece.type = 'queen';
    }

    newBoard[to[0]][to[1]] = piece;
    newBoard[from[0]][from[1]] = null;
    setBoard(newBoard);
    setSelectedPiece(null);
    setValidMoves([]);
    moveHistory.current.push(newBoard.map(row => [...row]));
    
    const opponentColor = turn === 'white' ? 'black' : 'white';

    if (checkForMate(opponentColor, newBoard)) {
        setGameState('gameOver');
        setWinner(isKingInCheck(opponentColor, newBoard) ? turn.charAt(0).toUpperCase() + turn.slice(1) : 'Stalemate');
    } else {
        if (isDoubleMoveActive.current) {
            isDoubleMoveActive.current = false;
        } else {
            setTurn(opponentColor);
        }
    }
  }, [board, turn, checkForMate, isKingInCheck, sounds]);

  const handleUndo = () => {
      if (turn !== 'white' || powerUps.white.undo < 1 || moveHistory.current.length < 3) return;
      sounds.filter();
      moveHistory.current.pop(); // AI move
      moveHistory.current.pop(); // Player move
      setBoard(moveHistory.current[moveHistory.current.length-1]);
      setPowerUps(p => ({ ...p, white: { ...p.white, undo: p.white.undo - 1 } }));
  };

  const handleDoubleMove = () => {
    if (turn !== 'white' || powerUps.white.doubleMove < 1) return;
    sounds.filter();
    isDoubleMoveActive.current = true;
    setPowerUps(p => ({ ...p, white: { ...p.white, doubleMove: p.white.doubleMove - 1 } }));
  };

  const handleFreeze = () => {
    if (turn !== 'white' || powerUps.white.freeze < 1) return;
    sounds.filter();
    isOpponentFrozen.current = true;
    setPowerUps(p => ({ ...p, white: { ...p.white, freeze: p.white.freeze - 1 } }));
  };

  useEffect(() => {
    if (gameState === 'playing' && turn === 'black') {
        if(isOpponentFrozen.current) {
            isOpponentFrozen.current = false;
            setTurn('white');
            return;
        }

        const timeout = setTimeout(() => {
            const possibleMoves: { move: Move; score: number }[] = [];
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (board[r][c]?.color === 'black') {
                        getValidMoves(r, c, board, true).forEach(to => {
                            const captured = board[to[0]][to[1]];
                            let score = captured ? PIECE_VALUES[captured.type] : 0;
                            possibleMoves.push({ move: { from: [r, c], to }, score });
                        });
                    }
                }
            }
            if (possibleMoves.length > 0) {
                possibleMoves.sort((a, b) => b.score - a.score);
                makeMove(possibleMoves[0].move.from, possibleMoves[0].move.to);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }
  }, [turn, board, gameState, getValidMoves, makeMove]);

  useEffect(() => {
    if (gameState !== 'playing' || winner) return;
    const interval = setInterval(() => {
      setTimers(t => {
        const newTime = t[turn] - 1;
        if (newTime <= 0) {
          setGameState('gameOver');
          setWinner((turn === 'white' ? 'Black' : 'White') + ' (Time)');
          return { ...t, [turn]: 0 };
        }
        return { ...t, [turn]: newTime };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, turn, winner]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animFrameId: number;
    const draw = () => {
      const { width, height, scale, boardSize, cellSize, boardX, boardY, pieceFontSize, uiFontSize } = c.current;
      ctx.clearRect(0,0,width,height);
      ctx.fillStyle = '#13262f'; ctx.fillRect(0,0,width,height);
      for (let r = 0; r < 8; r++) for (let c_ = 0; c_ < 8; c_++) {
        ctx.fillStyle = (r + c_) % 2 === 0 ? '#d3d0cb' : '#366e8d';
        ctx.fillRect(boardX + c_ * cellSize, boardY + r * cellSize, cellSize, cellSize);
      }
      if (selectedPiece) {
        ctx.fillStyle = 'rgba(54, 215, 183, 0.5)';
        ctx.fillRect(boardX + selectedPiece[1] * cellSize, boardY + selectedPiece[0] * cellSize, cellSize, cellSize);
      }
      validMoves.forEach(([r, c_]) => {
        ctx.beginPath(); ctx.arc(boardX + c_ * cellSize + cellSize / 2, boardY + r * cellSize + cellSize / 2, cellSize / 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(54, 215, 183, 0.4)'; ctx.fill();
      });
      ctx.font = `${pieceFontSize}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let r = 0; r < 8; r++) for (let c_ = 0; c_ < 8; c_++) {
        const piece = board[r][c_];
        if (piece) {
            ctx.fillStyle = piece.color === 'white' ? '#f0f0f0' : '#101010';
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5 * scale;
            // FIX: Added the missing y-coordinate argument to fillText.
            ctx.fillText(PIECE_UNICODE[piece.color][piece.type], boardX + c_ * cellSize + cellSize / 2, boardY + r * cellSize + cellSize / 2);
        }
      }
      ctx.shadowBlur = 0;
      const drawTimer = (player: PieceColor, x: number, y: number) => {
          ctx.fillStyle = '#d3d0cb'; ctx.font = `700 ${uiFontSize * 1.5}px Orbitron`; ctx.textAlign = 'center';
          const minutes = Math.floor(timers[player] / 60);
          const seconds = timers[player] % 60;
          ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, x, y);
      }
      drawTimer('black', boardX + boardSize / 2, boardY - 30 * scale);
      drawTimer('white', boardX + boardSize / 2, boardY + boardSize + 50 * scale);
      if(gameState === 'playing') {
          const activeTimerY = turn === 'black' ? boardY - 10 * scale : boardY + boardSize + 10 * scale;
          ctx.fillStyle = '#36d7b7'; ctx.fillRect(boardX, activeTimerY, boardSize, 4 * scale);
      }
      if (gameState !== 'playing') {
        ctx.fillStyle = 'rgba(19, 38, 47, 0.8)'; ctx.fillRect(0,0,width,height);
        ctx.textAlign = 'center'; ctx.fillStyle = '#d3d0cb';
        const message = gameState === 'start' ? '7K Chess Blitz' : `Game Over`;
        ctx.font = `700 ${50 * scale}px Orbitron`; ctx.fillText(message, width/2, height/2 - 40 * scale);
        if (winner) {
          ctx.font = `400 ${30 * scale}px Poppins`;
          ctx.fillText(`${winner} wins!`, width/2, height/2 + 10*scale);
        }
        ctx.font = `400 ${25 * scale}px Poppins`;
        ctx.fillText('Tap screen to start', width/2, height/2 + 60 * scale);
      }
      animFrameId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrameId);
  }, [board, timers, turn, selectedPiece, validMoves, gameState, winner]);

  useEffect(() => {
    window.addEventListener('resize', updateConstants);
    updateConstants();
    return () => window.removeEventListener('resize', updateConstants);
  }, [updateConstants]);
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState === 'start' || gameState === 'gameOver') {
      sounds.click(); resetGame(); setGameState('playing'); return;
    }
    if (turn !== 'white' || gameState !== 'playing') return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left; const y = clientY - rect.top;
    const col = Math.floor((x - c.current.boardX) / c.current.cellSize);
    const row = Math.floor((y - c.current.boardY) / c.current.cellSize);
    if (row < 0 || row > 7 || col < 0 || col > 7) return;

    if (selectedPiece) {
      if (validMoves.some(([r, c_]) => r === row && c_ === col)) {
        makeMove(selectedPiece, [row, col]);
      } else {
        sounds.filter();
        setSelectedPiece(null); setValidMoves([]);
      }
    } else if (board[row][col]?.color === 'white') {
        sounds.click();
        setSelectedPiece([row, col]);
        setValidMoves(getValidMoves(row, col, board, true));
    }
  };

  const PowerUpButton: React.FC<{ onClick: () => void, text: string, count: number }> = ({ onClick, text, count }) => {
    const disabled = count < 1 || gameState !== 'playing' || turn !== 'white' || isDoubleMoveActive.current;
    return (
      <button 
        onClick={onClick} 
        disabled={disabled}
        className={`px-3 py-2 text-sm font-semibold rounded-lg shadow-md transition-all duration-200 w-full md:w-auto
          ${disabled ? 'bg-regent-gray/30 text-bali-hai/50 cursor-not-allowed' : 'bg-calypso text-white hover:bg-calypso/80'}`}
      >
        {text} ({count})
      </button>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4">
      <canvas ref={canvasRef} onMouseDown={handleCanvasClick} onTouchStart={handleCanvasClick} className="cursor-pointer max-w-full max-h-full" />
      <div className="flex flex-row md:flex-col gap-3 p-4 bg-gable-green/50 rounded-lg">
        <h3 className="text-lg font-orbitron text-center hidden md:block">Power-Ups</h3>
        <PowerUpButton onClick={handleUndo} text="Undo" count={powerUps.white.undo} />
        <PowerUpButton onClick={handleDoubleMove} text="Double Move" count={powerUps.white.doubleMove} />
        <PowerUpButton onClick={handleFreeze} text="Freeze" count={powerUps.white.freeze} />
      </div>
    </div>
  );
};

export default ChessBlitz;
