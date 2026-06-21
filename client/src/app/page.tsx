'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('playerName');
    if (saved) setPlayerName(saved);
  }, []);

  function saveAndGo(roomId: string, playerId: string, name: string) {
    localStorage.setItem('playerName', name);
    localStorage.setItem(`room_${roomId}_playerId`, playerId);
    router.push(`/room/${roomId}`);
  }

  async function handleCreate() {
    if (!playerName.trim()) { setError('Enter your name first'); return; }
    setError('');
    setLoading(true);
    const socket = getSocket();
    socket.connect();
    socket.emit(
      'create-room',
      { playerName: playerName.trim() },
      (res: { roomId: string; playerId: string }) => {
        setLoading(false);
        saveAndGo(res.roomId, res.playerId, playerName.trim());
      }
    );
  }

  async function handleJoin() {
    if (!playerName.trim()) { setError('Enter your name first'); return; }
    if (!joinRoomId.trim()) { setError('Enter a room code'); return; }
    setError('');
    setLoading(true);
    const socket = getSocket();
    socket.connect();
    const savedPlayerId = localStorage.getItem(`room_${joinRoomId.trim()}_playerId`) ?? undefined;
    socket.emit(
      'join-room',
      { roomId: joinRoomId.trim().toLowerCase(), playerName: playerName.trim(), savedPlayerId },
      (res: { success: boolean; playerId?: string; error?: string }) => {
        setLoading(false);
        if (!res.success) { setError(res.error ?? 'Failed to join'); return; }
        saveAndGo(joinRoomId.trim().toLowerCase(), res.playerId!, playerName.trim());
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-white tracking-tight">
            MONOPOL
          </h1>
          <p className="text-white/40 mt-2 text-sm">
            Multiplayer real-time board game
          </p>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
            Your name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Enter your nickname..."
            maxLength={20}
            className="w-full bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition placeholder:text-white/20"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Create room */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-base bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition text-white shadow-lg mb-4"
        >
          {loading ? '...' : '+ Create new room'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30 uppercase">or join</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Join room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinRoomId}
            onChange={e => setJoinRoomId(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Room code..."
            maxLength={8}
            className="flex-1 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition placeholder:text-white/20 font-mono"
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            className="px-5 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition text-white"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
