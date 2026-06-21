'use client';

import { BoardCell as BoardCellType, Player, PropertyColor } from '@/lib/types';

const COLOR_HEX: Record<PropertyColor, string> = {
  brown:        '#92400e',
  'light-blue': '#0891b2',
  pink:         '#be185d',
  orange:       '#c2410c',
  red:          '#b91c1c',
  yellow:       '#a16207',
  green:        '#15803d',
  'dark-blue':  '#1d4ed8',
};

/* subtle background tint per property group */
const GROUP_BG: Record<PropertyColor, string> = {
  brown:        '#180d04',
  'light-blue': '#040f1a',
  pink:         '#180412',
  orange:       '#180a02',
  red:          '#180404',
  yellow:       '#181200',
  green:        '#041206',
  'dark-blue':  '#020618',
};

const SPECIAL_BG: Record<string, string> = {
  start:           '#14532d',
  jail:            '#1a2235',
  free_parking:    '#0c2a26',
  go_to_jail:      '#200a0a',
  chance:          '#150720',
  community_chest: '#251400',
  tax:             '#131720',
  railroad:        '#061a2c',
  utility:         '#071e2c',
  casino:          '#1e0410',
  jackpot:         '#0c082e',
  duel:            '#1c0406',
};

const ACCENT: Record<string, string> = {
  start:           '#4ade80',
  jail:            '#64748b',
  free_parking:    '#2dd4bf',
  go_to_jail:      '#f87171',
  chance:          '#c084fc',
  community_chest: '#fbbf24',
  tax:             '#94a3b8',
  railroad:        '#38bdf8',
  utility:         '#38bdf8',
  casino:          '#f472b6',
  jackpot:         '#818cf8',
  duel:            '#f87171',
};

const ICONS: Record<string, string> = {
  start:           '▶',
  jail:            '⛓',
  free_parking:    '🏖',
  go_to_jail:      '👮',
  chance:          '?',
  community_chest: '📦',
  tax:             '💰',
  railroad:        '✈',
  utility:         '⚡',
  casino:          '🎰',
  jackpot:         '💎',
  duel:            '⚔️',
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

  const bg = colorHex
    ? GROUP_BG[cell.color!]
    : (SPECIAL_BG[cell.type] ?? '#18133e');

  const accent = ACCENT[cell.type];
  const icon   = ICONS[cell.type];

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
            background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.07) 0px,rgba(255,255,255,0.07) 2px,transparent 2px,transparent 13px)',
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
              className="shrink-0 relative flex items-center justify-center"
              style={{ backgroundColor: colorHex, height: '25%', minHeight: 6 }}
            >
              {cell.industry === 'it' && itLevel > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: itLevel }).map((_, i) => (
                    <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)' }} />
                  ))}
                </div>
              )}
              {isOilBoom && (
                <div className="absolute inset-0 ring-2 ring-inset ring-emerald-400 pointer-events-none" />
              )}
              {owner && (
                <div
                  className="absolute rounded-full border border-white/40"
                  style={{ width: 6, height: 6, right: 2, bottom: 2, backgroundColor: owner.color }}
                />
              )}
            </div>

            {/* Body: [flag] [name] [status?] [price] */}
            <div
              className="flex-1 flex flex-col items-center justify-evenly min-h-0"
              style={{ padding: '2px 2px' }}
            >
              {/* Flag */}
              {cell.flag
                ? <span style={{ fontSize: 13, lineHeight: 1 }}>{cell.flag}</span>
                : cell.industry
                  ? <span style={{ fontSize: 9, lineHeight: 1, opacity: 0.5 }}>{INDUSTRY_ICON[cell.industry]}</span>
                  : null
              }

              {/* Name */}
              <span style={{
                fontSize: 7.5, fontWeight: 600, lineHeight: 1.2,
                color: 'rgba(255,255,255,0.95)', textAlign: 'center',
                wordBreak: 'break-word', maxWidth: '100%',
              }}>
                {cell.name}
              </span>

              {/* Oil indicator */}
              {isOilCrash && <span style={{ fontSize: 5.5, color: '#f87171', fontWeight: 700 }}>CRASH</span>}
              {isOilBoom  && <span style={{ fontSize: 5.5, color: '#4ade80', fontWeight: 700 }}>BOOM</span>}

              {/* Price badge */}
              {cell.price !== undefined && (
                <span style={{
                  fontSize: 7, fontWeight: 700, lineHeight: 1,
                  padding: '1px 5px', borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  {cell.price}$
                </span>
              )}
            </div>
          </>
        ) : (
          /* ── SPECIAL / CORNER CELL ── */
          <>
            {/* Accent bar on inner edge */}
            {accent && !isCorner && (
              <div style={{ height: 3, backgroundColor: accent, flexShrink: 0, opacity: 0.85 }} />
            )}
            {/* Corner top accent */}
            {isCorner && accent && cell.id !== 10 && (
              <div style={{ height: 5, backgroundColor: accent, flexShrink: 0 }} />
            )}

            <div
              className="flex-1 flex flex-col items-center justify-center min-h-0"
              style={{ gap: isCorner ? 4 : 2, padding: '3px 2px' }}
            >
              {/* Icon */}
              {icon && (
                <span style={{ fontSize: isCorner ? 20 : 14, lineHeight: 1 }}>{icon}</span>
              )}

              {/* Name */}
              <span style={{
                fontSize: isCorner ? 8 : 7.5,
                fontWeight: 700,
                color: isCorner && accent ? accent : 'rgba(255,255,255,0.9)',
                textAlign: 'center', lineHeight: 1.2,
                wordBreak: 'break-word', maxWidth: '100%',
              }}>
                {cell.name}
              </span>

              {/* Tax */}
              {cell.taxPercent !== undefined && (
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                  {cell.taxPercent}%
                </span>
              )}
              {cell.taxAmount !== undefined && (
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                  ${cell.taxAmount}
                </span>
              )}

              {/* Price */}
              {cell.price !== undefined && (
                <span style={{
                  fontSize: 7, fontWeight: 700, lineHeight: 1,
                  padding: '1px 4px', borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)',
                }}>
                  {cell.price}$
                </span>
              )}

              {/* Jackpot pool */}
              {cell.type === 'jackpot' && jackpotPool !== undefined && jackpotPool > 0 && (
                <span style={{ fontSize: 7, color: '#818cf8', fontWeight: 700, lineHeight: 1 }}>
                  ${jackpotPool}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Player tokens — always upright, always on top */}
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
                backgroundColor: '#0a0718',
                border: `2.5px solid ${p.color}`,
                boxShadow: `0 0 8px ${p.color}90, 0 2px 5px rgba(0,0,0,0.9)`,
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
