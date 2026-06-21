'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { GameState } from '@/lib/types';
import Board from '@/components/Board';
import Lobby from '@/components/Lobby';
import PlayerList from '@/components/PlayerList';
import GameControls from '@/components/GameControls';
import MyProperties from '@/components/MyProperties';
import Toast, { ToastItem } from '@/components/Toast';

function logColor(entry: string): string {
  if (entry.startsWith('═══') || entry.startsWith('---')) return 'text-blue-400/50 font-semibold';
  if (entry.includes('🏆')) return 'text-yellow-400 font-bold';
  if (entry.includes('💀')) return 'text-red-400/80';
  if (entry.includes('🛡')) return 'text-cyan-400/80';
  if (entry.includes('📈')) return 'text-orange-400/70';
  if (entry.includes('CRASH') || entry.includes('💥')) return 'text-red-400/70';
  if (entry.includes('BOOM')) return 'text-emerald-400/70';
  if (entry.includes('💎')) return 'text-indigo-300/80';
  if (entry.includes('🔨')) return 'text-amber-300/80';
  if (entry.includes('⚔️')) return 'text-rose-400/80';
  if (entry.includes('🎰')) return 'text-pink-400/80';
  if (
    entry.includes('collected') || entry.includes('+$') ||
    entry.includes('wins') || entry.includes('won') ||
    entry.includes('received') || entry.includes('refund') ||
    entry.includes('dividend') || entry.includes('birthday')
  ) return 'text-emerald-400/80';
  if (
    entry.includes('paid') || entry.includes('fine') ||
    entry.includes('fee') || entry.includes('tax') ||
    entry.includes('owes') || entry.includes('loses') ||
    entry.includes('-$')
  ) return 'text-red-400/60';
  return 'text-white/40';
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState('');
  const [rolling, setRolling] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const joinedRef = useRef(false);
  const prevState = useRef<GameState | null>(null);
  const toastIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  function addToast(text: string, emoji: string, color: string) {
    const id = ++toastIdRef.current;
    setToasts(p => [...p, { id, text, emoji, color }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }

  const handleStateUpdate = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  // Detect game state changes → toasts
  useEffect(() => {
    if (!gameState || !myId) return;

    if (!prevState.current) {
      prevState.current = gameState;
      return;
    }

    const prev = prevState.current;
    prevState.current = gameState;

    // My money change
    const prevMe = prev.players.find(p => p.id === myId);
    const me = gameState.players.find(p => p.id === myId);
    if (prevMe && me) {
      const delta = me.money - prevMe.money;
      if (delta > 0)  addToast(`+$${delta}`, '💰', 'text-emerald-400');
      if (delta < 0)  addToast(`-$${Math.abs(delta)}`, '💸', 'text-red-400');
    }

    // Round advance
    if (gameState.roundNumber > prev.roundNumber) {
      addToast(`Round ${gameState.roundNumber}`, '🎮', 'text-blue-300');
    }

    // Oil modifier changed
    if (gameState.oilModifier !== prev.oilModifier) {
      if (gameState.oilModifier === 0) addToast('Oil CRASH!',  '💥', 'text-red-400');
      if (gameState.oilModifier === 2) addToast('Oil BOOM!',   '⛽', 'text-emerald-400');
      if (gameState.oilModifier === 1 && prev.oilModifier !== 1)
        addToast('Oil back to normal', '⛽', 'text-white/50');
    }

    // Jackpot paid out (pool dropped)
    if (gameState.jackpotPool < prev.jackpotPool - 50) {
      addToast(`Jackpot paid $${prev.jackpotPool}!`, '💎', 'text-indigo-400');
    }

    // Insurance saved me (I'm still in game, was insured, no longer insured)
    const wasInsured = prev.insured.includes(myId);
    const isInsured  = gameState.insured.includes(myId);
    const stillAlive = gameState.players.some(p => p.id === myId);
    if (wasInsured && !isInsured && stillAlive) {
      addToast('Insurance saved you!', '🛡', 'text-cyan-400');
    }
  }, [gameState, myId]);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.log.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!gameState || !myId) return;
    function handleKey(e: KeyboardEvent) {
      if (!gameState) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const me = gameState.players[gameState.currentPlayerIndex];
      if (!me || me.id !== myId) return;
      const noPending = !gameState.pendingAction;

      if (e.code === 'Space' && gameState.canRoll && noPending && !rolling) {
        e.preventDefault();
        handleRoll();
      }
      if (e.code === 'Enter' && gameState.diceRolled && !gameState.canRoll && noPending) {
        e.preventDefault();
        handleEndTurn();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, myId, rolling]);

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;

    const playerName = localStorage.getItem('playerName');
    if (!playerName) { router.replace('/'); return; }

    const savedPlayerId = localStorage.getItem(`room_${roomId}_playerId`) ?? undefined;
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function doJoin() {
      socket.emit(
        'join-room',
        { roomId, playerName, savedPlayerId },
        (res: { success: boolean; playerId?: string; gameState?: GameState; error?: string }) => {
          if (!res.success) { setConnectionError(res.error ?? 'Failed to join room'); return; }
          setMyId(res.playerId!);
          localStorage.setItem(`room_${roomId}_playerId`, res.playerId!);
          setGameState(res.gameState!);
        }
      );
    }

    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }

    socket.on('room-updated',  handleStateUpdate);
    socket.on('game-started',  handleStateUpdate);
    socket.on('state-updated', handleStateUpdate);
    socket.on('connect_error', () =>
      setConnectionError('Cannot connect to server. Is the server running on :3001?')
    );

    return () => {
      socket.off('room-updated',  handleStateUpdate);
      socket.off('game-started',  handleStateUpdate);
      socket.off('state-updated', handleStateUpdate);
    };
  }, [roomId, router, handleStateUpdate]);

  function handleStart()   { getSocket().emit('start-game',       { roomId }); }
  function handleEndTurn() { getSocket().emit('end-turn',         { roomId }); }
  function handleBuy()     { getSocket().emit('buy-property',     { roomId }); }
  function handleDecline() { getSocket().emit('decline-property', { roomId }); }
  function handleUpgrade(cellId: number) { getSocket().emit('upgrade-property', { roomId, cellId }); }
  function handleBuyInsurance()          { getSocket().emit('buy-insurance',     { roomId }); }
  function handleChooseCard(optionId: string) { getSocket().emit('choose-card-option', { roomId, optionId }); }
  function handleBid(amount: number)    { getSocket().emit('submit-bid', { roomId, amount }); }
  function handlePassBid()              { getSocket().emit('pass-bid',   { roomId }); }

  function handleRoll() {
    if (rolling) return;
    setRolling(true);
    getSocket().emit('roll-dice', { roomId });
    setTimeout(() => setRolling(false), 600);
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-red-400 text-lg font-semibold mb-2">{connectionError}</p>
          <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition">
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40 text-sm animate-pulse">Connecting...</div>
      </div>
    );
  }

  if (gameState.status === 'lobby') {
    return <Lobby gameState={gameState} myId={myId} roomId={roomId} onStart={handleStart} />;
  }

  const winner = gameState.status === 'finished' ? gameState.players[0] : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Win screen overlay */}
      {winner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center flex flex-col items-center gap-6 p-8 rounded-2xl border border-white/10 bg-white/5 max-w-sm w-full mx-4">
            <div className="text-7xl win-pulse">🏆</div>
            <div>
              <div className="text-white/50 text-sm mb-1 uppercase tracking-widest">Winner</div>
              <div
                className="text-4xl font-black win-pulse"
                style={{ color: winner.color }}
              >
                {winner.name}
              </div>
            </div>
            <div className="text-white/30 text-sm">
              Final balance: <span className="text-emerald-400 font-semibold">${winner.money.toLocaleString()}</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-2 w-full py-3 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-500 text-white transition"
            >
              ← Back to home
            </button>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />

      <header className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
        <span className="font-black text-white text-lg tracking-tight">MONOPOL</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/20 hidden sm:block">Space=Roll · Enter=End turn</span>
          <span className="text-xs text-white/30 font-mono">{roomId}</span>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/60 transition"
          >
            Copy link
          </button>
        </div>
      </header>

      {/* Responsive layout: stacked on mobile, side-by-side on lg+ */}
      <main className="flex-1 flex flex-col lg:flex-row gap-2 p-2 overflow-y-auto lg:overflow-hidden lg:min-h-0">
        {/* Board — fills available height, stays square */}
        <div className="flex-shrink-0 lg:flex-1 lg:min-w-0 lg:min-h-0 flex items-center justify-center p-1 overflow-hidden">
          <div style={{ width: 'min(100%, calc(100vh - 56px))', aspectRatio: '1 / 1' }}>
            <Board gameState={gameState} currentPlayerId={myId} rolling={rolling} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-2 lg:overflow-y-auto">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 shrink-0">
            <GameControls
              gameState={gameState}
              myId={myId}
              rolling={rolling}
              onRoll={handleRoll}
              onEndTurn={handleEndTurn}
              onBuy={handleBuy}
              onDecline={handleDecline}
              onChooseCard={handleChooseCard}
              onBid={handleBid}
              onPassBid={handlePassBid}
              onBuyInsurance={handleBuyInsurance}
            />
          </div>

          <MyProperties gameState={gameState} myId={myId} onUpgrade={handleUpgrade} />

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 shrink-0">
            <PlayerList gameState={gameState} myId={myId} />
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 shrink-0">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-white/25">
              <span>💻 IT — upgrades ×2/level</span>
              <span>⛽ Oil — boom/crash per round</span>
              <span>🪙 Crypto — ±50% rent</span>
              <span>🏢 Real Estate — classic</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col min-h-0 lg:flex-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 shrink-0">
              Game log
            </h3>
            <div className="flex flex-col gap-0.5 overflow-y-auto max-h-48 lg:max-h-none">
              {gameState.log.map((entry, i) => (
                <p key={i} className={`text-[11px] leading-relaxed ${logColor(entry)}`}>
                  {entry}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
