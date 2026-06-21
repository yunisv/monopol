'use client';

import { useEffect, useState } from 'react';
import { BoardCell as BoardCellType, GameState } from '@/lib/types';
import BoardCell from './BoardCell';

function getCellGridPos(id: number): { row: number; col: number } {
  if (id === 0)  return { row: 0, col: 0 };
  if (id <= 9)   return { row: 0, col: id };
  if (id === 10) return { row: 0, col: 10 };
  if (id <= 19)  return { row: id - 10, col: 10 };
  if (id === 20) return { row: 10, col: 10 };
  if (id <= 29)  return { row: 10, col: 10 - (id - 20) };
  if (id === 30) return { row: 10, col: 0 };
  return { row: 10 - (id - 30), col: 0 };
}

interface Props {
  gameState: GameState;
  currentPlayerId: string;
  rolling?: boolean;
}

export default function Board({ gameState, rolling }: Props) {
  const {
    board, players, currentPlayerIndex, properties, upgrades,
    jackpotPool, roundNumber, settings, oilModifier, inflationMultiplier,
  } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  const [displayDice, setDisplayDice] = useState<[number, number]>(gameState.lastDice ?? [1, 1]);

  useEffect(() => {
    if (!rolling) {
      if (gameState.lastDice) setDisplayDice(gameState.lastDice);
      return;
    }
    const interval = setInterval(() => {
      setDisplayDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 80);
    return () => clearInterval(interval);
  }, [rolling, gameState.lastDice]);

  const cellGrid = new Map<string, BoardCellType>();
  board.forEach(cell => {
    const { row, col } = getCellGridPos(cell.id);
    cellGrid.set(`${row},${col}`, cell);
  });

  const slots = Array.from({ length: 121 }, (_, i) => ({
    row: Math.floor(i / 11),
    col: i % 11,
    cell: cellGrid.get(`${Math.floor(i / 11)},${i % 11}`) ?? null,
  }));

  const oilLabel =
    oilModifier === 0 ? { text: '⛽ CRASH', cls: 'text-red-400' } :
    oilModifier === 2 ? { text: '⛽ BOOM',  cls: 'text-emerald-400' } :
    null;

  return (
    <div
      className="w-full aspect-square rounded-xl overflow-hidden"
      style={{
        display: 'grid',
        /* Corners are 2× the size of regular edge cells — matches richup.io */
        gridTemplateColumns: '2fr repeat(9, 1fr) 2fr',
        gridTemplateRows:    '2fr repeat(9, 1fr) 2fr',
        backgroundColor: '#000',
        gap: '1px',
        border: '2px solid rgba(255,255,255,0.06)',
        boxShadow: '0 0 60px rgba(0,0,0,0.9)',
      }}
    >
      {slots.map(({ row, col, cell }) => {
        const isInterior = row >= 1 && row <= 9 && col >= 1 && col <= 9;

        if (isInterior) {
          if (row === 1 && col === 1) {
            return (
              <div
                key={`${row}-${col}`}
                style={{ gridRow: '2 / 11', gridColumn: '2 / 11', backgroundColor: '#0c0a1e' }}
                className="flex flex-col items-center justify-center gap-3 p-4"
              >
                <div className="text-3xl font-black tracking-widest select-none" style={{ color: 'rgba(255,255,255,0.05)' }}>
                  MONOPOL
                </div>

                {gameState.status === 'playing' && (
                  <div className="flex items-center gap-3 text-[11px] text-white/30 flex-wrap justify-center">
                    <span>Round {roundNumber}</span>
                    {settings.jackpotEnabled && jackpotPool > 0 && (
                      <span className="text-indigo-400 font-semibold">💎 ${jackpotPool}</span>
                    )}
                    {settings.vacationCash && gameState.vacationPool > 0 && (
                      <span className="text-teal-400 font-semibold">🏖 ${gameState.vacationPool}</span>
                    )}
                    {oilLabel && (
                      <span className={`font-bold ${oilLabel.cls}`}>{oilLabel.text}</span>
                    )}
                    {settings.inflationEnabled && inflationMultiplier > 1.001 && (
                      <span className="text-orange-400 font-semibold">📈 ×{inflationMultiplier.toFixed(2)}</span>
                    )}
                  </div>
                )}

                {(rolling || gameState.lastDice) && (
                  <div className={`flex gap-6 ${rolling ? 'opacity-60' : ''}`}>
                    {displayDice.map((d, i) => (
                      <DiceFace key={i} value={d} spinning={rolling} />
                    ))}
                  </div>
                )}

                {gameState.status === 'playing' && currentPlayer && (
                  <div className="text-center">
                    <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Turn</div>
                    <div
                      className="text-sm font-bold px-4 py-1 rounded-full"
                      style={{ color: currentPlayer.color, backgroundColor: `${currentPlayer.color}20`, border: `1px solid ${currentPlayer.color}40` }}
                    >
                      {currentPlayer.name}
                    </div>
                  </div>
                )}

                {gameState.status === 'finished' && (
                  <div className="text-yellow-400 text-xl font-black win-pulse">🏆 GAME OVER</div>
                )}
              </div>
            );
          }
          return null;
        }

        if (!cell) return <div key={`${row}-${col}`} style={{ backgroundColor: '#0c0a1e' }} />;

        return (
          <div key={`${row}-${col}`} style={{ gridRow: row + 1, gridColumn: col + 1 }} className="h-full w-full">
            <BoardCell
              cell={cell}
              players={players}
              properties={properties}
              upgrades={upgrades}
              jackpotPool={jackpotPool}
              oilModifier={oilModifier}
              isHighlighted={currentPlayer?.position === cell.id}
            />
          </div>
        );
      })}
    </div>
  );
}

function DiceFace({ value, spinning }: { value: number; spinning?: boolean }) {
  const dots: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 22], [70, 22], [30, 50], [70, 50], [30, 78], [70, 78]],
  };
  const S = 64; // face size
  const D = 8;  // depth size
  return (
    <div className={spinning ? 'dice-rolling' : ''} style={{ position: 'relative', width: S + D, height: S + D }}>
      {/* Right face (depth) */}
      <div style={{
        position: 'absolute', top: D, right: 0, width: D, height: S,
        background: 'linear-gradient(to right, #c8c8c8, #a0a0a0)',
        borderRadius: '0 10px 10px 0',
      }} />
      {/* Bottom face (depth) */}
      <div style={{
        position: 'absolute', bottom: 0, left: D, width: S, height: D,
        background: 'linear-gradient(to bottom, #b8b8b8, #909090)',
        borderRadius: '0 0 10px 10px',
      }} />
      {/* Front face */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: S, height: S,
        background: 'linear-gradient(145deg, #ffffff 0%, #eeecec 100%)',
        borderRadius: 14,
        boxShadow: 'inset -2px -2px 5px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.55)',
      }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', padding: 8 }}>
          {(dots[value] ?? []).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={9} fill="#1a1231" />
          ))}
        </svg>
      </div>
    </div>
  );
}
