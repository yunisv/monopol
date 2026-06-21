'use client';

import { GameState } from '@/lib/types';

const PROPERTY_COLOR_HEX: Record<string, string> = {
  'brown':      '#92400e',
  'light-blue': '#38bdf8',
  'pink':       '#ec4899',
  'orange':     '#f97316',
  'red':        '#ef4444',
  'yellow':     '#eab308',
  'green':      '#22c55e',
  'dark-blue':  '#3b82f6',
};

interface Props {
  gameState: GameState;
  myId: string;
}

export default function PlayerList({ gameState, myId }: Props) {
  const { players, currentPlayerIndex, board, properties, insured } = gameState;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Players</h3>
      {players.map((player, idx) => {
        const isCurrentTurn = idx === currentPlayerIndex;
        const isMe = player.id === myId;
        const isInsured = insured.includes(player.id);

        const myProps = Object.entries(properties)
          .filter(([, oid]) => oid === player.id)
          .map(([cellId]) => board.find(c => c.id === Number(cellId)))
          .filter(Boolean);

        return (
          <div
            key={player.id}
            className={`flex flex-col gap-1.5 rounded-lg px-3 py-2 transition-all ${
              isCurrentTurn ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/5'
            } ${!player.isConnected ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full border-2 border-white/20 flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ backgroundColor: player.color }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm font-medium text-white truncate">{player.name}</span>
                  {isMe && <span className="text-[10px] text-white/30 shrink-0">(you)</span>}
                  {player.isHost && <span className="text-[10px] text-yellow-400 shrink-0">👑</span>}
                  {isInsured && <span className="text-[10px] text-cyan-400 shrink-0" title="Bankruptcy Insurance">🛡</span>}
                  {!player.isConnected && <span className="text-[10px] text-red-400 shrink-0">⚡off</span>}
                </div>
                <div className="text-xs flex items-center gap-1">
                  <span className={player.money < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-semibold'}>
                    ${player.money.toLocaleString()}
                  </span>
                  {player.inJail && <span className="text-red-400">⛓</span>}
                </div>
              </div>

              {isCurrentTurn && (
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
              )}
            </div>

            {/* Property dots */}
            {myProps.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-9">
                {myProps.map(cell => cell && (
                  <div
                    key={cell.id}
                    className="w-3 h-3 rounded-sm border border-white/20"
                    style={{
                      backgroundColor: cell.color
                        ? PROPERTY_COLOR_HEX[cell.color] ?? '#666'
                        : '#0e7490',
                    }}
                    title={cell.name}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
