'use client';

import { GameState } from '@/lib/types';

const COLOR_HEX: Record<string, string> = {
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
  onUpgrade: (cellId: number) => void;
}

export default function MyProperties({ gameState, myId, onUpgrade }: Props) {
  const { board, properties, upgrades, players, currentPlayerIndex, pendingAction } = gameState;
  const me = players.find(p => p.id === myId);
  const isMyTurn = players[currentPlayerIndex]?.id === myId;

  // Find IT properties I own
  const myItProps = board.filter(
    c => c.type === 'property' && c.industry === 'it' && properties[c.id] === myId,
  );

  if (myItProps.length === 0) return null;

  // Only show sets where I have the full monopoly
  const upgradeableColors = new Set(
    myItProps
      .filter(cell => {
        const colorCells = board.filter(c => c.color === cell.color && c.type === 'property');
        return colorCells.every(c => properties[c.id] === myId);
      })
      .map(c => c.color),
  );

  const upgradeable = myItProps.filter(c => upgradeableColors.has(c.color));
  if (upgradeable.length === 0) return null;

  function canUpgrade(cellId: number, upgradePrice: number): boolean {
    if (!isMyTurn || pendingAction) return false;
    const level = upgrades[cellId] ?? 0;
    if (level >= 4) return false;
    return (me?.money ?? 0) >= upgradePrice;
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 shrink-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
        💻 IT Upgrades
      </h3>
      <div className="flex flex-col gap-1.5">
        {upgradeable.map(cell => {
          const level = upgrades[cell.id] ?? 0;
          const price = cell.upgradePrice ?? Math.floor((cell.price ?? 100) * 0.5);
          const eligible = canUpgrade(cell.id, price);
          const nextRent = level < 4
            ? Math.floor((cell.rent ?? 0) * Math.pow(2, level + 1))
            : null;

          return (
            <div key={cell.id} className="flex items-center gap-2">
              {/* Color bar */}
              <div
                className="w-1.5 h-8 rounded-sm shrink-0"
                style={{ backgroundColor: COLOR_HEX[cell.color ?? ''] ?? '#666' }}
              />

              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/80 truncate">{cell.name}</div>
                {/* Level dots */}
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i < level ? 'bg-violet-400' : 'bg-white/10'}`}
                    />
                  ))}
                  {level >= 4 && (
                    <span className="text-[9px] text-yellow-400 font-bold ml-1">MAX</span>
                  )}
                </div>
              </div>

              {level < 4 ? (
                <button
                  onClick={() => eligible && onUpgrade(cell.id)}
                  disabled={!eligible}
                  title={eligible ? `Upgrade → Lv.${level + 1} (rent $${nextRent})` : !isMyTurn ? 'Not your turn' : `Need $${price}`}
                  className={`shrink-0 text-[10px] px-2 py-1 rounded font-semibold transition leading-none ${
                    eligible
                      ? 'bg-violet-600 hover:bg-violet-500 text-white'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  ↑ ${price}
                </button>
              ) : (
                <span className="text-[9px] text-yellow-400 font-bold shrink-0">MAX</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
