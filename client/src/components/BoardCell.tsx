'use client';

import { BoardCell as BoardCellType, Player, PropertyColor } from '@/lib/types';

/* ── Color strip colours – tuned to match richup.io ── */
const COLOR_HEX: Record<PropertyColor, string> = {
  brown:        '#c4783a',
  'light-blue': '#4ec8e0',
  pink:         '#e060a4',
  orange:       '#e07828',
  red:          '#e83030',
  yellow:       '#d4b020',
  green:        '#28b838',
  'dark-blue':  '#3858d8',
};

/* Very subtle per-group dark background tint */
const GROUP_BG: Record<PropertyColor, string> = {
  brown:        '#171008',
  'light-blue': '#070f18',
  pink:         '#180810',
  orange:       '#180e04',
  red:          '#180606',
  yellow:       '#181400',
  green:        '#061408',
  'dark-blue':  '#040818',
};

const SPECIAL_BG: Record<string, string> = {
  start:           '#0a1e10',
  jail:            '#0e1018',
  free_parking:    '#061618',
  go_to_jail:      '#180606',
  chance:          '#120820',
  community_chest: '#1c1006',
  tax:             '#0c1018',
  railroad:        '#0c1018',
  utility:         '#080e18',
  casino:          '#140820',
  jackpot:         '#08061e',
  duel:            '#180608',
};

/* Accent colour for special cells */
const ACCENT: Record<string, string> = {
  start:           '#4ade80',
  jail:            '#7a8caa',
  free_parking:    '#2dd4bf',
  go_to_jail:      '#f87171',
  chance:          '#d080f0',
  community_chest: '#f59e0b',
  tax:             '#94a3b8',
  railroad:        '#94a3b8',
  utility:         '#38bdf8',
  casino:          '#d080f0',
  jackpot:         '#818cf8',
  duel:            '#fb7185',
};

/* Rotation: content rotates so that
   – colour strip ends up at INNER board edge
   – price badge ends up at OUTER board edge           */
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
  const rotation   = getRotation(cell.id);
  const colorHex   = cell.color ? COLOR_HEX[cell.color] : null;
  const ownerId    = properties[cell.id];
  const owner      = ownerId ? players.find(p => p.id === ownerId) : undefined;
  const here       = players.filter(p => p.position === cell.id);
  const isCorner   = [0, 10, 20, 30].includes(cell.id);
  const itLevel    = upgrades && cell.industry === 'it' ? (upgrades[cell.id] ?? 0) : 0;
  const isOilCrash = cell.industry === 'oil' && oilModifier === 0;
  const isOilBoom  = cell.industry === 'oil' && oilModifier === 2;
  const bg         = colorHex ? GROUP_BG[cell.color!] : (SPECIAL_BG[cell.type] ?? '#0e0c1e');
  const accent     = ACCENT[cell.type];

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      style={{
        backgroundColor: bg,
        borderRight:  '1px solid #000',
        borderBottom: '1px solid #000',
        outline: isHighlighted ? '2px solid rgba(250,204,21,0.85)' : 'none',
        outlineOffset: '-2px',
        opacity: isOilCrash ? 0.5 : 1,
      }}
    >
      {/* Prison bar overlay */}
      {cell.type === 'jail' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.055) 0px,rgba(255,255,255,0.055) 2px,transparent 2px,transparent 11px)',
            zIndex: 0,
          }}
        />
      )}

      {/* Rotated content wrapper */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ transform: rotation, transformOrigin: 'center center', zIndex: 1 }}
      >
        {colorHex ? (
          <PropertyContent
            cell={cell}
            colorHex={colorHex}
            itLevel={itLevel}
            isOilBoom={isOilBoom}
            isOilCrash={isOilCrash}
            owner={owner}
          />
        ) : isCorner ? (
          <CornerContent cell={cell} accent={accent} />
        ) : (
          <SpecialContent cell={cell} accent={accent} jackpotPool={jackpotPool} />
        )}
      </div>

      {/* Player tokens – always upright, always on top */}
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
                width: 20, height: 20,
                backgroundColor: '#06041a',
                border: `2.5px solid ${p.color}`,
                boxShadow: `0 0 10px ${p.color}80, 0 2px 6px rgba(0,0,0,0.9)`,
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

/* ─────────────────────────────────────────────────────────
   PROPERTY CELL
   Layout (code order = visual order after rotation):
     [color strip]  ← ends up at INNER board edge
     [flag circle]
     [city name]
     [price badge]  ← ends up at OUTER board edge
   ───────────────────────────────────────────────────────── */
function PropertyContent({
  cell, colorHex, itLevel, isOilBoom, isOilCrash, owner,
}: {
  cell: BoardCellType;
  colorHex: string;
  itLevel: number;
  isOilBoom: boolean;
  isOilCrash: boolean;
  owner?: Player;
}) {
  return (
    <>
      {/* ── Color strip at code-top (→ inner board edge after rotation) ── */}
      <div
        className="shrink-0 relative flex items-center justify-center"
        style={{ backgroundColor: colorHex, height: '28%', minHeight: 8 }}
      >
        {/* IT upgrade dots */}
        {itLevel > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: itLevel }).map((_, i) => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.95)' }} />
            ))}
          </div>
        )}
        {isOilBoom && <div className="absolute inset-0 ring-2 ring-inset ring-emerald-300 pointer-events-none" />}
        {/* Owner dot */}
        {owner && (
          <div style={{
            position: 'absolute', right: 3, bottom: 3,
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: owner.color,
            boxShadow: `0 0 5px ${owner.color}`,
          }} />
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center justify-evenly min-h-0" style={{ padding: '2px 2px' }}>
        {/* Flag circle */}
        {cell.flag ? (
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.25)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, lineHeight: 1, flexShrink: 0,
          }}>
            {cell.flag}
          </div>
        ) : (
          <span style={{ fontSize: 10, opacity: 0.3 }}>
            {cell.industry ? ({ it: '💻', oil: '⛽', crypto: '🪙', realestate: '🏢' } as Record<string, string>)[cell.industry] ?? '' : ''}
          </span>
        )}

        {/* City name */}
        <span style={{
          fontSize: 7.5, fontWeight: 700, lineHeight: 1.2,
          color: 'rgba(255,255,255,0.95)', textAlign: 'center',
          wordBreak: 'break-word', maxWidth: '100%', padding: '0 1px',
        }}>
          {cell.name}
        </span>

        {isOilCrash && <span style={{ fontSize: 5.5, color: '#f87171', fontWeight: 800 }}>CRASH</span>}
        {isOilBoom  && <span style={{ fontSize: 5.5, color: '#4ade80', fontWeight: 800 }}>BOOM</span>}

        {/* Price badge at code-bottom (→ outer board edge after rotation) */}
        {cell.price !== undefined && (
          <div style={{
            fontSize: 7.5, fontWeight: 800, lineHeight: 1,
            padding: '1.5px 5px', borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {cell.price} $
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   CORNER CELL  (START / JAIL / VACATION / GO TO JAIL)
   ───────────────────────────────────────────────────────── */
function CornerContent({ cell, accent }: { cell: BoardCellType; accent?: string }) {
  type CornerCfg = { icon: string; label: string; sublabel?: string; iconSize: number };
  const cfgMap: Record<string, CornerCfg> = {
    start:        { icon: '▶',  label: 'START',         iconSize: 26 },
    jail:         { icon: '⛓',  label: 'Passing by',    sublabel: 'In Prison', iconSize: 20 },
    free_parking: { icon: '🌴', label: 'Vacation',      iconSize: 28 },
    go_to_jail:   { icon: '☠',  label: 'Go to prison',  iconSize: 26 },
  };
  const cfg = cfgMap[cell.type] ?? { icon: '?', label: cell.name, iconSize: 20 };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0" style={{ gap: 5, padding: '5px 4px' }}>
      {cell.type === 'jail' && (
        <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.4)', lineHeight: 1, textAlign: 'center', letterSpacing: '0.05em' }}>
          {cfg.label}
        </span>
      )}
      <span style={{ fontSize: cfg.iconSize, lineHeight: 1 }}>{cfg.icon}</span>
      <span style={{
        fontSize: 8.5, fontWeight: 800, lineHeight: 1.2, textAlign: 'center',
        color: accent ?? 'rgba(255,255,255,0.9)', wordBreak: 'break-word',
      }}>
        {cell.type === 'jail' ? cfg.sublabel : cfg.label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SPECIAL NON-CORNER CELL
   (Treasure, Surprise, Tax, Airport, Utility, Jackpot, Duel)
   ───────────────────────────────────────────────────────── */
function SpecialContent({ cell, accent, jackpotPool }: {
  cell: BoardCellType;
  accent?: string;
  jackpotPool?: number;
}) {
  const isTreasure = cell.type === 'community_chest';
  const isSurprise = cell.type === 'chance' || cell.type === 'casino';
  const isAirport  = cell.type === 'railroad';
  const isUtility  = cell.type === 'utility';
  const isTax      = cell.type === 'tax';
  const isDuel     = cell.type === 'duel';
  const isJackpot  = cell.type === 'jackpot';

  const utilIcon = cell.name.includes('Water') ? '💧' : '⚡';

  const iconEl = isTreasure ? (
    <span style={{ fontSize: 18, lineHeight: 1 }}>📦</span>
  ) : isSurprise ? (
    /* Pink circle with "?" – richup.io style */
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      backgroundColor: `${accent ?? '#d080f0'}22`,
      border: `2px solid ${accent ?? '#d080f0'}80`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 900, color: accent ?? '#d080f0', lineHeight: 1,
    }}>?</div>
  ) : isAirport ? (
    <span style={{ fontSize: 16, lineHeight: 1 }}>✈️</span>
  ) : isUtility ? (
    <span style={{ fontSize: 18, lineHeight: 1 }}>{utilIcon}</span>
  ) : isTax ? (
    <span style={{ fontSize: 15, lineHeight: 1 }}>📋</span>
  ) : isDuel ? (
    <span style={{ fontSize: 15, lineHeight: 1 }}>⚔️</span>
  ) : isJackpot ? (
    <span style={{ fontSize: 15, lineHeight: 1 }}>💎</span>
  ) : null;

  const nameColor = isTreasure ? '#f59e0b'
    : isSurprise              ? (accent ?? '#d080f0')
    : isDuel                  ? '#fb7185'
    : 'rgba(255,255,255,0.8)';

  return (
    <>
      {/* Top accent bar */}
      <div style={{ height: 3, backgroundColor: accent ?? '#4a5568', flexShrink: 0 }} />

      <div className="flex-1 flex flex-col items-center justify-center min-h-0" style={{ gap: 3, padding: '3px 2px' }}>
        {iconEl}

        <span style={{
          fontSize: 7.5, fontWeight: 700, lineHeight: 1.2, textAlign: 'center',
          color: nameColor, wordBreak: 'break-word', maxWidth: '100%',
        }}>
          {cell.name}
        </span>

        {cell.taxPercent !== undefined && (
          <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>%{cell.taxPercent}</span>
        )}
        {cell.taxAmount !== undefined && (
          <span style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>${cell.taxAmount}</span>
        )}
        {cell.price !== undefined && (
          <div style={{
            fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
            backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {cell.price} $
          </div>
        )}
        {isJackpot && jackpotPool !== undefined && jackpotPool > 0 && (
          <span style={{ fontSize: 7.5, color: '#818cf8', fontWeight: 800 }}>${jackpotPool}</span>
        )}
      </div>
    </>
  );
}
