'use client';

import { GameSettings, GameState } from '@/lib/types';
import { getSocket } from '@/lib/socket';

interface Props {
  gameState: GameState;
  myId: string;
  roomId: string;
  onStart: () => void;
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-0.5 w-10 h-5 rounded-full shrink-0 transition-colors ${
          checked ? 'bg-violet-600' : 'bg-white/20'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default function Lobby({ gameState, myId, roomId, onStart }: Props) {
  const { players, hostId, settings } = gameState;
  const amHost = myId === hostId;
  const canStart = players.length >= 2;
  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomId}`
    : '';

  function patchSettings(patch: Partial<GameSettings>) {
    if (!amHost) return;
    getSocket().emit('update-settings', { roomId, settings: patch });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl flex flex-col gap-4">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-white">MONOPOL</h1>
          <p className="text-white/40 text-sm mt-1">Multiplayer board game</p>
        </div>

        {/* Room link */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Share link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={roomUrl}
              className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none"
            />
            <button
              onClick={() => navigator.clipboard.writeText(roomUrl)}
              className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-white/30 mt-1.5">
            Code: <span className="font-mono text-white/60">{roomId}</span>
          </p>
        </div>

        {/* Players */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-3">
            Players ({players.length}/8)
          </p>
          <div className="flex flex-col gap-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-white font-medium">{p.name}</span>
                {p.id === myId && <span className="text-xs text-white/40">(you)</span>}
                {p.isHost && <span className="text-xs text-yellow-400">👑 Host</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Game settings — visible to all, editable only by host */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-1">
            Game rules {!amHost && <span className="normal-case">(set by host)</span>}
          </p>

          {/* Starting cash */}
          <div className="py-2 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Starting cash</p>
              <p className="text-xs text-white/40 mt-0.5">Each player starts with this amount</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {([1000, 1500, 2000] as const).map(v => (
                <button
                  key={v}
                  disabled={!amHost}
                  onClick={() => patchSettings({ startingCash: v })}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    settings.startingCash === v
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  } disabled:cursor-not-allowed`}
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 my-1" />

          <Toggle
            label="Double rent on monopoly"
            desc="Own all properties of a color → 2× rent"
            checked={settings.doubleRentOnMonopoly}
            onChange={v => patchSettings({ doubleRentOnMonopoly: v })}
            disabled={!amHost}
          />
          <Toggle
            label={`🎰 Casino cell (±$${settings.casinoAmount})`}
            desc="Even dice = win, odd dice = lose a fixed amount"
            checked={settings.casinoEnabled}
            onChange={v => patchSettings({ casinoEnabled: v })}
            disabled={!amHost}
          />
          <Toggle
            label={`💎 Big Roll jackpot (starts at $${settings.jackpotGrowthPerRound})`}
            desc="Visit the cell to enter — winner is drawn at round end"
            checked={settings.jackpotEnabled}
            onChange={v => patchSettings({ jackpotEnabled: v })}
            disabled={!amHost}
          />
          <Toggle
            label={`⚔️ Duel cell (±$${settings.duelAmount})`}
            desc="Land on Duel → roll against a random opponent"
            checked={settings.duelEnabled}
            onChange={v => patchSettings({ duelEnabled: v })}
            disabled={!amHost}
          />
          <Toggle
            label="🏖 Vacation cash"
            desc="Taxes paid to bank accumulate — collected by whoever lands on Vacation"
            checked={settings.vacationCash}
            onChange={v => patchSettings({ vacationCash: v })}
            disabled={!amHost}
          />

          <div className="border-t border-white/5 my-1" />
          <p className="text-[10px] text-white/30 uppercase tracking-wider pt-1">Economy rules</p>

          {/* Inflation */}
          <Toggle
            label="📈 Inflation"
            desc="Rents increase by a fixed % each round"
            checked={settings.inflationEnabled}
            onChange={v => patchSettings({ inflationEnabled: v })}
            disabled={!amHost}
          />
          {settings.inflationEnabled && (
            <div className="flex items-center gap-2 pl-12 pb-1">
              <span className="text-xs text-white/40 w-16 shrink-0">Rate/round</span>
              <div className="flex gap-1">
                {([3, 5, 10] as const).map(v => (
                  <button
                    key={v}
                    disabled={!amHost}
                    onClick={() => patchSettings({ inflationRate: v })}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                      settings.inflationRate === v
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    } disabled:cursor-not-allowed`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wealth tax */}
          <Toggle
            label="💰 Wealth Tax"
            desc={`Players with over $${settings.wealthTaxThreshold} pay a % of their cash each round`}
            checked={settings.wealthTaxEnabled}
            onChange={v => patchSettings({ wealthTaxEnabled: v })}
            disabled={!amHost}
          />
          {settings.wealthTaxEnabled && (
            <div className="flex items-center gap-2 pb-1">
              <span className="text-xs text-white/40 w-16 shrink-0">Tax rate</span>
              <div className="flex gap-1">
                {([3, 5, 10] as const).map(v => (
                  <button
                    key={v}
                    disabled={!amHost}
                    onClick={() => patchSettings({ wealthTaxRate: v })}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                      settings.wealthTaxRate === v
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    } disabled:cursor-not-allowed`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Insurance */}
          <Toggle
            label={`🛡 Bankruptcy Insurance ($${settings.insurancePremium} → $${settings.insurancePayout} bailout)`}
            desc="Players can buy one-time protection against going bankrupt"
            checked={settings.insuranceEnabled}
            onChange={v => patchSettings({ insuranceEnabled: v })}
            disabled={!amHost}
          />
        </div>

        {/* Start button */}
        {amHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="w-full py-4 rounded-xl font-bold text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition text-white shadow-lg"
          >
            {canStart ? '▶ Start Game' : 'Waiting for more players (min 2)...'}
          </button>
        ) : (
          <div className="text-center text-white/40 text-sm py-4">
            Waiting for host to start the game...
          </div>
        )}
      </div>
    </div>
  );
}
