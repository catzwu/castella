const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const https = require('https');
const db = require('./db');

const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: IS_PROD ? {} : { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.use(cors(IS_PROD ? {} : { origin: 'http://localhost:5173' }));
app.use(express.json());

// Serve built client in production
if (IS_PROD) {
  app.use(express.static(path.join(__dirname, 'client/dist')));
}

// ---------- Helpers ----------

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function broadcastSongs(joinCode, userId) {
  const room = db.getRoom(joinCode);
  if (!room) return;
  const songs = db.getSongs(room.id, userId || '');
  io.to(joinCode).emit('songs:list', songs);
}

function broadcastRoom(joinCode) {
  const room = db.getRoom(joinCode);
  if (room) io.to(joinCode).emit('room:info', sanitizeRoom(room));
}

function sanitizeRoom(room) {
  return {
    joinCode: room.join_code,
    upvoteThreshold: room.upvote_threshold,
    waitingRoomEnabled: room.waiting_room_enabled === 1,
    expiresAt: room.expires_at,
  };
}

// ---------- REST API ----------

// Create room
app.post('/api/rooms', (req, res) => {
  let joinCode;
  let attempts = 0;
  do {
    joinCode = generateJoinCode();
    attempts++;
  } while (db.getRoom(joinCode) && attempts < 10);

  db.createRoom(joinCode);
  const room = db.getRoom(joinCode);
  res.json(sanitizeRoom(room));
});

// Get room
app.get('/api/rooms/:joinCode', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found or expired' });
  res.json(sanitizeRoom(room));
});

// Update room settings
app.patch('/api/rooms/:joinCode/settings', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { upvoteThreshold, waitingRoomEnabled } = req.body;

  // Detect if waiting room is being toggled off
  const wasEnabled = room.waiting_room_enabled === 1;
  const isBeingDisabled = typeof waitingRoomEnabled === 'boolean' && !waitingRoomEnabled && wasEnabled;

  const updates = {};
  if (typeof upvoteThreshold === 'number' && upvoteThreshold >= 1) updates.upvoteThreshold = upvoteThreshold;
  if (typeof waitingRoomEnabled === 'boolean') updates.waitingRoomEnabled = waitingRoomEnabled;
  if (Object.keys(updates).length > 0) db.updateRoomSettings(room.join_code, updates);

  // Move any waiting songs to the bottom of the queue
  if (isBeingDisabled) db.promoteAllWaitingToQueue(room.id);

  broadcastRoom(room.join_code);
  broadcastSongs(room.join_code, '');
  res.json({ ok: true });
});

// Get songs
app.get('/api/rooms/:joinCode/songs', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const userId = req.query.userId || '';
  res.json(db.getSongs(room.id, userId));
});

// Add song
app.post('/api/rooms/:joinCode/songs', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { title, artist, duration, thumbnail, sourceUrl, addedBy, addedById, status } = req.body;
  if (!title || !artist || !addedBy || !addedById) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Server enforces waiting room regardless of what client sends
  const effectiveStatus = room.waiting_room_enabled === 1 ? 'waiting'
    : (status === 'waiting' ? 'waiting' : 'queued');
  db.addSong(room.id, {
    title, artist, duration, thumbnail, sourceUrl,
    addedBy, addedById,
    status: effectiveStatus,
  });
  broadcastSongs(room.join_code, addedById);
  res.json({ ok: true });
});

// Delete song
app.delete('/api/rooms/:joinCode/songs/:songId', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { userId } = req.body;
  db.deleteSong(Number(req.params.songId), room.id);
  broadcastSongs(room.join_code, userId);
  res.json({ ok: true });
});

// Mark song as played
app.post('/api/rooms/:joinCode/songs/:songId/play', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { userId } = req.body;
  db.markPlayed(Number(req.params.songId), room.id);
  broadcastSongs(room.join_code, userId);
  res.json({ ok: true });
});

// Promote from waiting room to queue
app.post('/api/rooms/:joinCode/songs/:songId/promote', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { userId } = req.body;
  db.promoteToQueue(Number(req.params.songId), room.id);
  broadcastSongs(room.join_code, userId);
  res.json({ ok: true });
});

// Reorder queue
app.post('/api/rooms/:joinCode/songs/reorder', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { orderedIds, userId } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be array' });
  db.reorderQueue(room.id, orderedIds);
  broadcastSongs(room.join_code, userId);
  res.json({ ok: true });
});

// Vote on a song
app.post('/api/rooms/:joinCode/songs/:songId/vote', (req, res) => {
  const room = db.getRoom(req.params.joinCode.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { userId, voteType } = req.body; // voteType: 'up' | 'down' | null
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = db.vote(Number(req.params.songId), userId, voteType);
  broadcastSongs(room.join_code, userId);
  res.json({ ok: true, promoted: result.promoted });
});

// iTunes search proxy — avoids CORS failures on mobile browsers
app.get('/api/search', (req, res) => {
  const term = req.query.term;
  if (!term) return res.json({ results: [] });
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=12&media=music`;
  https.get(url, (apiRes) => {
    let raw = '';
    apiRes.on('data', chunk => { raw += chunk; });
    apiRes.on('end', () => {
      try { res.json(JSON.parse(raw)); }
      catch { res.status(502).json({ results: [] }); }
    });
  }).on('error', () => res.status(502).json({ results: [] }));
});

// Fallback for client-side routing in production
if (IS_PROD) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// ---------- Socket.io ----------

io.on('connection', (socket) => {
  socket.on('join-room', ({ joinCode, userId }) => {
    socket.join(joinCode);
    // Send current state to the joining user
    const room = db.getRoom(joinCode);
    if (room) {
      socket.emit('room:info', sanitizeRoom(room));
      socket.emit('songs:list', db.getSongs(room.id, userId || ''));
    }
  });

  socket.on('leave-room', ({ joinCode }) => {
    socket.leave(joinCode);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Castella server running on http://localhost:${PORT}`);
});
