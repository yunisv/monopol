'use client';

import { BoardCell as BoardCellType, Player, PropertyColor } from '@/lib/types';

const COLOR_HEX: Record<PropertyColor, string> = {
  brown:        '#c2692a',
  'light-blue': '#38bdf8',
  pink:         '#e879a0',
  orange:       '#f97316',
  red:          '#ef4444',
  yellow:       '#eab308',
  green:        '#22c55e',
  'dark-blue':  '#4f83f0',
};

const GROUP_BG: Record<PropertyColor, string> = {
  brown:        '#1c1008',
  'light-blue': '#060f1c',
  pink:         '#1a0815',
  orange:       '#1a0d04',
  red:          '#180505',
  yellow:       '#181200',
  green:        '#061408',
  'dark-blue':  '#040a1e',
};

const SPECIAL_BG: Record<string, string> = {
  start:           '#0c2318',
  jail:            '#12131e',
  free_parking:    '#071a1a',
  go_to_jail:      '#1a0606',
  chance:          '#160a24',
  community_chest: '#1e1004',
  tax:             '#0e1018',
  railroad:        '#0a0f1a',
  utility:         '#080f1c',
  casino:          '#1a0614',
  jackpot:         '#090620',
  duel:            '#1a0508',
};

const ACCENT: Record<string, string> = {
  start:           '#4ade80',
  jail:            '#8899bb',
  free_parking:    '#2dd4bf',
  go_to_jail:      '#f87171',
  chance:          '#c084fc',
  community_chest: '#f59e0b',
  tax:             '#94a3b8',
  railroad:        '#94a3b8',
  utility:         '#38bdf8',
  casino:          '#f472b6',
  jackpot:         '#818cf8',
  duel:            '#fb7185',
};

/* icons for special cells */
const ICONS: Record<string, string> = {
  start:           '▶',
  jail:            '⛓',
  free_parking:    '🌴',
  go_to_jail:      '☠',
  chance:          '?',
  community_chest: '📦',
  tax:             '📋',
  railroad:        '✈',
  utility:         '⚡',
  casino:          '?',
  jackpot:         '💎',
  duel:            '⚔',
};

const UTILITY_ICON: Record<string, string> = {
  'Electric Co.': '⚡',
  'Water Co.':    '💧',
};

const INDUSTRY_ICON: Record<string, string> = {
  it: '💻', oil: '⛽', crypto: '🪙', realestate: '🏢',
};

function getRotation(id: number): string {
  if ([0, 10, 20, 30].includes(id)) return 'rotate(0deg)';
  if (id >= 1  && id <= 9)  return 'rotate(180deg)';
  if (id >= 11 && id <= 19) return 'rotate(270deg)';
  if (id >= 21 && id <= 29) return 'rotate(0deg)';
  return 'rotate(90deg)';
}

interface Props {
  cell: BoardCellType;
  players: Player[];
  properties: Record<number, string>;
  upgrades?: Record<number, number>;
  jackpotPool?: number;
  oilModifier?: number;
  isHighlighted?: boolean;
}

export default function BoardCell({
  cell, players, properties, upgrades, jackpotPool, oilModifier, isHighlighted,
}: Props) {
  const rotation  = getRotation(cell.id);
  const colorHex  = cell.color ? COLOR_HEX[cell.color] : null;
  const ownerId   = properties[cell.id];
  const owner     = ownerId ? players.find(p => p.id === ownerId) : undefined;
  const here      = players.filter(p => p.position === cell.id);
  const isCorner  = [0, 10, 20, 30].includes(cell.id);
  const itLevel   = upgrades && cell.industry === 'it' ? (upgrades[cell.id] ?? 0) : 0;
  const isOilCrash = cell.industry === 'oil' && oilModifier === 0;
  const isOilBoom  = cell.industry === 'oil' && oilModifier === 2;

  const bg = colorHex ? GROUP_BG[cell.color!] : (SPECIAL_BG[cell.type] ?? '#111827');
  const accent = ACCENT[cell.type];

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      style={{
        backgroundColor: bg,
        borderRight:  '1px solid #000',
        borderBottom: '1px solid #000',
        outline: isHighlighted ? '2px solid rgba(250,204,21,0.9)' : 'none',
        outlineOffset: '-2px',
        opacity: isOilCrash ? 0.55 : 1,
      }}
    >
      {/* Jail prison-bar overlay */}
      {cell.type === 'jail' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.06) 0px,rgba(255,255,255,0.06) 2px,transparent 2px,transparent 12px)',
            zIndex: 0,
          }}
        />
      )}

      {/* Rotated content */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ transform: rotation, transformOrigin: 'center center', zIndex: 1 }}
      >
        {colorHex ? (
          /* ── PROPERTY CELL ── */
          <>
            {/* Color strip */}
            <div
              className="shrink-0 relative flex items-center justify-center gap-0.5"
              style={{ backgroundColor: colorHex, height: '30%', minHeight: 7 }}
            >
              {/* IT upgrade dots */}
              {cell.industry === 'it' && itLevel > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: itLevel }).map((_, i) => (
                    <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.95)' }} />
                  ))}
                </div>
              )}
              {isOilBoom && (
                <div className="absolute inset-0 ring-2 ring-inset ring-emerald-300 pointer-events-none" />
              )}
              {/* Owner dot */}
              {owner && (
                <div
                  className="absolute rounded-full"
                  style={{ width: 7, height: 7, right: 2, bottom: 2, backgroundColor: owner.color, boxShadow: `0 0 4px ${owner.color}` }}
                />
              )}
            </div>

            {/* Body */}
            <div
              className="flex-1 flex flex-col items-center justify-evenly min-h-0"
              style={{ padding: '2px 1px' }}
            >
              {/* Flag as circular badge */}
              {cell.flag ? (
                <div style={{
                  width: 16, height: 16,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, lineHeight: 1, flexShrink: 0,
                }}>
                  {cell.flag}
                </div>
              ) : cell.industry ? (
                <span style={{ fontSize: 9, lineHeight: 1, opacity: 0.4 }}>{INDUSTRY_ICON[cell.industry]}</span>
              ) : null}

              {/* Name */}
              <span style={{
                fontSize: 7, fontWeight: 700, lineHeight: 1.15,
                color: 'rgba(255,255,255,0.95)', textAlign: 'center',
                wordBreak: 'break-word', maxWidth: '100%', padding: '0 1px',
              }}>
                {cell.name}
              </span>

              {/* Oil indicator */}
              {isOilCrash && <span style={{ fontSize: 5, color: '#f87171', fontWeight: 800 }}>CRASH</span>}
              {isOilBoom  && <span style={{ fontSize: 5, color: '#4ade80', fontWeight: 800 }}>BOOM</span>}

              {/* Price badge */}
              {cell.price !== undefined && (
                <div style={{
                  fontSize: 6.5, fontWeight: 800, lineHeight: 1,
                  padding: '1px 4px', borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {cell.price} $
                </div>
              )}
            </div>
          </>
        ) : isCorner ? (
          /* ── CORNER CELL ── */
          <CornerCell cell={cell} accent={accent} />
        ) : (
          /* ── SPECIAL NON-CORNER CELL ── */
          <SpecialCell cell={cell} accent={accent} jackpotPool={jackpotPool} />
        )}
      </div>

      {/* Player tokens — always upright */}
      {here.length > 0 && (
        <div
          className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 pointer-events-none"
          style={{ padding: 2, zIndex: 10 }}
        >
          {here.map(p => (
            <div
              key={p.id}
              className="player-token flex items-center justify-center rounded-full shrink-0 font-black"
              title={p.name}
              style={{
                width: 18, height: 18,
                backgroundColor: '#080616',
                border: `2.5px solid ${p.color}`,
                boxShadow: `0 0 8px ${p.color}80, 0 2px 4px rgba(0,0,0,0.9)`,
                fontSize: 7,
                color: p.color,
              }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CornerCell({ cell, accent }: { cell: BoardCellType; accent?: string }) {
  /* Corner-specific styling to match richup.io */
  const cornerConfig: Record<string, { icon: string; label?: string; sublabel?: string; iconSize: number }> = {
    start:       { icon: '▶', label: 'START', iconSize: 22 },
    jail:        { icon: '⛓', label: 'Passing by', sublabel: 'In Prison', iconSize: 18 },
    free_parking:{ icon: '🌴', label: 'Vacation', iconSize: 24 },
    go_to_jail:  { icon: '☠', label: 'Go to prison', iconSize: 22 },
  };
  const cfg = cornerConfig[cell.type] ?? { icon: '?', label: cell.name, iconSize: 18 };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-1" style={{ padding: '4px 3px' }}>
      {cell.type === 'jail' && (
        <span style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', lineHeight: 1, textAlign: 'center' }}>
          {cfg.label}
        </span>
      )}
      <span style={{ fontSize: cfg.iconSize, lineHeight: 1 }}>{cfg.icon}</span>
      <span style={{
        fontSize: 7.5, fontWeight: 800, lineHeight: 1.2,
        color: accent ?? 'rgba(255,255,255,0.9)',
        textAlign: 'center', wordBreak: 'break-word',
      }}>
        {cell.type === 'jail' ? cfg.sublabel : cfg.label}
      </span>
    </div>
  );
}

function SpecialCell({ cell, accent, jackpotPool }: { cell: BoardCellType; accent?: string; jackpotPool?: number }) {
  const isChance    = cell.type === 'chance' || cell.type === 'casino';
  const isTreasure  = cell.type === 'community_chest';
  const isAirport   = cell.type === 'railroad';
  const isUtility   = cell.type === 'utility';
  const isTax       = cell.type === 'tax';
  const isDuel      = cell.type === 'duel';
  const isJackpot   = cell.type === 'jackpot';

  const utilityIcon = cell.name.includes('Electric') ? '⚡' : cell.name.includes('Water') ? '💧' : '⚡';

  return (
    <>
      {/* Top accent bar */}
      <div style={{ height: 3, backgroundColor: accent ?? '#4a5568', flexShrink: 0, opacity: 0.9 }} />

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-0.5" style={{ padding: '3px 2px' }}>

        {/* Big icon */}
        {isChance && (
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            backgroundColor: `${accent}25`,
            border: `1.5px solid ${accent}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, color: accent, lineHeight: 1,
          }}>?</div>
        )}
        {isTreasure && (
          <span style={{ fontSize: 16, lineHeight: 1 }}>📦</span>
        )}
        {isAirport && (
          <span style={{ fontSize: 14, lineHeight: 1 }}>✈️</span>
        )}
        {isUtility && (
          <span style={{ fontSize: 16, lineHeight: 1 }}>{utilityIcon}</span>
        )}
        {isTax && (
          <span style={{ fontSize: 14, lineHeight: 1 }}>📋</span>
        )}
        {isDuel && (
          <span style={{ fontSize: 14, lineHeight: 1 }}>⚔️</span>
        )}
        {isJackpot && (
          <span style={{ fontSize: 14, lineHeight: 1 }}>💎</span>
        )}

        {/* Name */}
        <span style={{
          fontSize: 7, fontWeight: 700, lineHeight: 1.2,
          color: isTreasure ? '#f59e0b'
               : isChance   ? (accent ?? '#c084fc')
               : isDuel     ? '#fb7185'
               : 'rgba(255,255,255,0.85)',
          textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%',
        }}>
          {cell.name}
        </span>

        {/* Tax amount/percent */}
        {cell.taxPercent !== undefined && (
          <span style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>%{cell.taxPercent}</span>
        )}
        {cell.taxAmount !== undefined && (
          <span style={{ fontSize: 7.5, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>${cell.taxAmount}</span>
        )}

        {/* Price for airports/utilities */}
        {cell.price !== undefined && (
          <div style={{
            fontSize: 6.5, fontWeight: 700, lineHeight: 1,
            padding: '1px 4px', borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {cell.price} $
          </div>
        )}

        {/* Jackpot pool */}
        {isJackpot && jackpotPool !== undefined && jackpotPool > 0 && (
          <span style={{ fontSize: 7, color: '#818cf8', fontWeight: 800, lineHeight: 1 }}>${jackpotPool}</span>
        )}
      </div>
    </>
  );
}
