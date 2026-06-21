import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { customAlphabet } from 'nanoid';
import { GameRoom } from './gameRoom';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const rooms = new Map<string, GameRoom>();
const nanoid = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 6);

// Map socket.id -> { roomId, playerId (original socket id at join time) }
const socketRoomMap = new Map<string, { roomId: string; originalId: string }>();

app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  console.log('[connect]', socket.id);

  socket.on('create-room', ({ playerName }: { playerName: string }, callback) => {
    const roomId = nanoid();
    const room = new GameRoom(roomId);
    room.addPlayer(socket.id, playerName, true);
    rooms.set(roomId, room);

    socket.join(roomId);
    socketRoomMap.set(socket.id, { roomId, originalId: socket.id });

    console.log(`[create-room] ${roomId} by ${playerName}`);
    callback({ roomId, playerId: socket.id, gameState: room.getState() });
  });

  socket.on('join-room', (
    { roomId, playerName, savedPlayerId }: { roomId: string; playerName: string; savedPlayerId?: string },
    callback: (res: { success: boolean; playerId?: string; gameState?: ReturnType<GameRoom['getState']>; error?: string }) => void
  ) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    // Attempt reconnect if the player was previously in this room
    if (savedPlayerId) {
      const reconnected = room.reconnectPlayer(savedPlayerId, socket.id);
      if (reconnected) {
        socket.join(roomId);
        socketRoomMap.set(socket.id, { roomId, originalId: socket.id });
        io.to(roomId).emit('room-updated', room.getState());
        callback({ success: true, playerId: socket.id, gameState: room.getState() });
        return;
      }
    }

    const state = room.getState();
    if (state.status !== 'lobby') {
      callback({ success: false, error: 'Game already in progress' });
      return;
    }

    if (state.players.length >= 8) {
      callback({ success: false, error: 'Room is full (max 8 players)' });
      return;
    }

    room.addPlayer(socket.id, playerName, false);
    socket.join(roomId);
    socketRoomMap.set(socket.id, { roomId, originalId: socket.id });

    console.log(`[join-room] ${playerName} joined ${roomId}`);
    io.to(roomId).emit('room-updated', room.getState());
    callback({ success: true, playerId: socket.id, gameState: room.getState() });
  });

  socket.on('start-game', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const state = room.getState();
    if (state.hostId !== socket.id) return;

    const started = room.startGame();
    if (started) {
      io.to(roomId).emit('game-started', room.getState());
    }
  });

  socket.on('roll-dice', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.rollDice(socket.id);
    io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('end-turn', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.endTurn(socket.id);
    io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('update-settings', (
    { roomId, settings }: { roomId: string; settings: Record<string, unknown> }
  ) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.updateSettings(socket.id, settings as never);
    io.to(roomId).emit('room-updated', room.getState());
  });

  socket.on('choose-card-option', ({ roomId, optionId }: { roomId: string; optionId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.chooseCardOption(socket.id, optionId);
    io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('submit-bid', ({ roomId, amount }: { roomId: string; amount: number }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.submitBid(socket.id, amount);
    io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('pass-bid', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.passBid(socket.id);
    io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('buy-insurance', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const error = room.buyInsurance(socket.id);
    if (!error) io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('upgrade-property', ({ roomId, cellId }: { roomId: string; cellId: number }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const error = room.upgradeProperty(socket.id, cellId);
    if (!error) io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('buy-property', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.buyProperty(socket.id);
    io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('decline-property', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.declineProperty(socket.id);
    io.to(roomId).emit('state-updated', room.getState());
  });

  socket.on('disconnect', () => {
    console.log('[disconnect]', socket.id);
    const info = socketRoomMap.get(socket.id);
    if (!info) return;

    socketRoomMap.delete(socket.id);
    const room = rooms.get(info.roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player) return;

    player.isConnected = false;
    io.to(info.roomId).emit('room-updated', room.getState());

    // Give 60 seconds to reconnect before removing
    setTimeout(() => {
      const currentRoom = rooms.get(info.roomId);
      if (!currentRoom) return;
      const p = currentRoom.getPlayer(socket.id);
      if (p && !p.isConnected) {
        currentRoom.removePlayer(socket.id);
        io.to(info.roomId).emit('room-updated', currentRoom.getState());
        if (currentRoom.getState().players.length === 0) {
          rooms.delete(info.roomId);
          console.log(`[cleanup] room ${info.roomId} deleted (empty)`);
        }
      }
    }, 60_000);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
