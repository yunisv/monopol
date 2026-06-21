'use client';

import { useState } from 'react';
import { GameState } from '@/lib/types';

interface Props {
  gameState: GameState;
  myId: string;
  rolling: boolean;
  onRoll: () => void;
  onEndTurn: () => void;
  onBuy: () => void;
  onDecline: () => void;
  onChooseCard: (optionId: string) => void;
  onBid: (amount: number) => void;
  onPassBid: () => void;
  onBuyInsurance: () => void;
}

export default function GameControls({
  gameState, myId, rolling,
  onRoll, onEndTurn, onBuy, onDecline, onChooseCard, onBid, onPassBid, onBuyInsurance,
}: Props) {
  const { players, currentPlayerIndex, canRoll, diceRolled, lastDice, pendingAction, settings, insured } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const me = players.find(p => p.id === myId);
  const [bidAmount, setBidAmount] = useState('');

  const sum = lastDice ? lastDice[0] + lastDice[1] : null;
  const isDouble = lastDice ? lastDice[0] === lastDice[1] : false;

  return (
    <div className="flex flex-col gap-3">
      {/* Turn indicator */}
      <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
        {isMyTurn ? (
          <p className="text-sm font-semibold text-yellow-400">Your turn!</p>
        ) : (
          <p className="text-sm text-white/50">
            Waiting for{' '}
            <span className="font-medium" style={{ color: currentPlayer?.color }}>
              {currentPlayer?.name ?? '...'}
            </span>
          </p>
        )}
      </div>

      {/* My balance */}
      {me && (
        <div className="rounded-lg bg-white/5 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-white/40">Your balance</span>
          <span className={`text-sm font-bold ${me.money < 100 ? 'text-red-400' : 'text-emerald-400'}`}>
            ${me.money.toLocaleString()}
          </span>
        </div>
      )}

      {/* Dice result */}
      {lastDice && (
        <div className="text-center text-sm text-white/60">
          🎲 {lastDice[0]} + {lastDice[1]} ={' '}
          <span className="font-bold text-white">{sum}</span>
          {isDouble && <span className="ml-1 text-yellow-400 font-semibold"> DOUBLES!</span>}
        </div>
      )}

      {/* ── Buy property ── */}
      {isMyTurn && pendingAction?.type === 'buy-property' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 flex flex-col gap-2">
          <p className="text-xs text-yellow-300/70 text-center">Property available</p>
          <p className="text-sm font-semibold text-white text-center">{pendingAction.cellName}</p>
          <p className="text-xs text-white/50 text-center">
            Price: <span className="text-yellow-400 font-bold">${pendingAction.price}</span>
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={onBuy}
              disabled={!me || me.money < pendingAction.price}
              className="flex-1 py-2 rounded-lg font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition text-white"
            >
              Buy ${pendingAction.price}
            </button>
            <button
              onClick={onDecline}
              className="flex-1 py-2 rounded-lg font-bold text-sm bg-slate-600 hover:bg-slate-500 transition text-white"
            >
              Pass
            </button>
          </div>
        </div>
      )}

      {/* ── Choice card ── */}
      {isMyTurn && pendingAction?.type === 'choose-card' && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 flex flex-col gap-2">
          <p className="text-xs text-purple-300/70 text-center font-medium">
            {pendingAction.label} — Make a choice
          </p>
          {pendingAction.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onChooseCard(opt.id)}
              className="w-full py-2 px-3 rounded-lg text-xs text-left font-medium bg-purple-600/30 hover:bg-purple-600/60 text-white border border-purple-500/20 hover:border-purple-400/40 transition leading-snug"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {/* ── Auction ── */}
      {pendingAction?.type === 'auction' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col gap-2">
          <div className="text-center">
            <p className="text-xs text-amber-300/70 font-medium">🔨 AUCTION</p>
            <p className="text-sm font-bold text-white">{pendingAction.cellName}</p>
          </div>

          {pendingAction.highestBidder ? (
            <div className="text-center text-xs text-white/60">
              Highest:{' '}
              <span className="text-amber-400 font-bold">${pendingAction.highestBid}</span>
              {' '}by <span className="text-white/80">{pendingAction.highestBidderName}</span>
            </div>
          ) : (
            <p className="text-center text-xs text-white/40">
              Min bid: <span className="text-amber-400 font-semibold">${pendingAction.minPrice}</span>
            </p>
          )}

          {pendingAction.activeBidder === myId ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-amber-300 text-center font-medium">Your turn to bid!</p>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  placeholder={`Min $${pendingAction.highestBid > 0 ? pendingAction.highestBid + 1 : pendingAction.minPrice}`}
                  className="flex-1 rounded-lg bg-white/10 text-white text-sm px-2 py-1.5 outline-none placeholder-white/20 min-w-0"
                  min={pendingAction.highestBid > 0 ? pendingAction.highestBid + 1 : pendingAction.minPrice}
                />
                <button
                  onClick={() => { if (bidAmount) { onBid(Number(bidAmount)); setBidAmount(''); } }}
                  disabled={
                    !bidAmount ||
                    Number(bidAmount) < (pendingAction.highestBid > 0 ? pendingAction.highestBid + 1 : pendingAction.minPrice) ||
                    Number(bidAmount) > (me?.money ?? 0)
                  }
                  className="px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shrink-0"
                >
                  Bid
                </button>
              </div>
              <button
                onClick={onPassBid}
                className="w-full py-1 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition"
              >
                Pass
              </button>
            </div>
          ) : (
            <p className="text-xs text-center text-white/40">
              Waiting for{' '}
              <span className="text-amber-300 font-medium">{pendingAction.activeBidderName}</span>
              {' '}to bid...
            </p>
          )}
        </div>
      )}

      {/* Roll button */}
      {isMyTurn && canRoll && !pendingAction && (
        <button
          onClick={onRoll}
          disabled={rolling}
          className="w-full py-3 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-white shadow-lg"
        >
          {rolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
        </button>
      )}

      {/* End turn button */}
      {isMyTurn && diceRolled && !canRoll && !pendingAction && (
        <button
          onClick={onEndTurn}
          className="w-full py-3 rounded-xl font-bold text-sm bg-slate-600 hover:bg-slate-500 transition text-white shadow-lg"
        >
          ✓ End Turn
        </button>
      )}

      {/* Buy Insurance */}
      {settings.insuranceEnabled && me && !insured.includes(myId) && me.money >= settings.insurancePremium && (
        <button
          onClick={onBuyInsurance}
          className="w-full py-2 rounded-lg text-xs font-medium bg-cyan-900/50 hover:bg-cyan-800/60 border border-cyan-700/30 hover:border-cyan-600/50 text-cyan-300 transition"
          title={`Pay $${settings.insurancePremium} → get $${settings.insurancePayout} bailout if bankrupt`}
        >
          🛡 Buy Insurance ${settings.insurancePremium}
        </button>
      )}
      {settings.insuranceEnabled && insured.includes(myId) && (
        <div className="text-center text-xs text-cyan-400/70 py-1">
          🛡 You are insured
        </div>
      )}
    </div>
  );
}
