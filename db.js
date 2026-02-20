const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'castella.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    join_code TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    upvote_threshold INTEGER DEFAULT 3,
    waiting_room_enabled INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration INTEGER,
    thumbnail TEXT,
    source_url TEXT,
    added_by TEXT NOT NULL,
    added_by_id TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    queue_order REAL DEFAULT 0,
    played_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    UNIQUE(song_id, user_id),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  );
`);

function cleanupExpiredRooms() {
  const now = Date.now();
  db.prepare('DELETE FROM rooms WHERE expires_at < ?').run(now);
}

// Migration: add waiting_room_enabled for existing databases
try {
  db.exec('ALTER TABLE rooms ADD COLUMN waiting_room_enabled INTEGER DEFAULT 0');
} catch {}

cleanupExpiredRooms();
setInterval(cleanupExpiredRooms, 60 * 60 * 1000);

// --- Rooms ---

function createRoom(joinCode) {
  const now = Date.now();
  const expires = now + 24 * 60 * 60 * 1000;
  return db.prepare(
    'INSERT INTO rooms (join_code, created_at, expires_at) VALUES (?, ?, ?)'
  ).run(joinCode, now, expires);
}

function getRoom(joinCode) {
  return db.prepare('SELECT * FROM rooms WHERE join_code = ? AND expires_at > ?')
    .get(joinCode, Date.now());
}

function updateRoomSettings(joinCode, { upvoteThreshold, waitingRoomEnabled } = {}) {
  const sets = [];
  const params = [];
  if (upvoteThreshold != null) {
    sets.push('upvote_threshold = ?');
    params.push(Number(upvoteThreshold));
  }
  if (waitingRoomEnabled != null) {
    sets.push('waiting_room_enabled = ?');
    params.push(waitingRoomEnabled ? 1 : 0);
  }
  if (sets.length === 0) return;
  params.push(joinCode);
  return db.prepare(`UPDATE rooms SET ${sets.join(', ')} WHERE join_code = ?`).run(...params);
}

// --- Songs ---

function getSongs(roomId, userId) {
  const songs = db.prepare(`
    SELECT s.*,
      COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes,
      COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downvotes,
      (SELECT vote_type FROM votes WHERE song_id = s.id AND user_id = ?) AS user_vote
    FROM songs s
    LEFT JOIN votes v ON v.song_id = s.id
    WHERE s.room_id = ?
    GROUP BY s.id
    ORDER BY s.queue_order ASC, s.created_at ASC
  `).all(userId, roomId);
  return songs;
}

function addSong(roomId, { title, artist, duration, thumbnail, sourceUrl, addedBy, addedById, status }) {
  const now = Date.now();
  // Place at end of current queue/waiting list
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(queue_order), 0) FROM songs WHERE room_id = ? AND status = ?'
  ).pluck().get(roomId, status);

  return db.prepare(`
    INSERT INTO songs (room_id, title, artist, duration, thumbnail, source_url, added_by, added_by_id, status, queue_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(roomId, title, artist, duration, thumbnail, sourceUrl, addedBy, addedById, status, maxOrder + 1, now);
}

function deleteSong(songId, roomId) {
  return db.prepare('DELETE FROM songs WHERE id = ? AND room_id = ?').run(songId, roomId);
}

function markPlayed(songId, roomId) {
  return db.prepare(
    "UPDATE songs SET status = 'played', played_at = ? WHERE id = ? AND room_id = ?"
  ).run(Date.now(), songId, roomId);
}

function promoteToQueue(songId, roomId) {
  const maxOrder = db.prepare(
    "SELECT COALESCE(MAX(queue_order), 0) FROM songs WHERE room_id = ? AND status = 'queued'"
  ).pluck().get(roomId);
  return db.prepare(
    "UPDATE songs SET status = 'queued', queue_order = ? WHERE id = ? AND room_id = ?"
  ).run(maxOrder + 1, songId, roomId);
}

function promoteAllWaitingToQueue(roomId) {
  const maxOrder = db.prepare(
    "SELECT COALESCE(MAX(queue_order), 0) FROM songs WHERE room_id = ? AND status = 'queued'"
  ).pluck().get(roomId);
  const waitingSongs = db.prepare(
    "SELECT id FROM songs WHERE room_id = ? AND status = 'waiting' ORDER BY queue_order ASC, created_at ASC"
  ).all(roomId);
  const update = db.prepare(
    "UPDATE songs SET status = 'queued', queue_order = ? WHERE id = ?"
  );
  const tx = db.transaction(() => {
    waitingSongs.forEach((song, i) => {
      update.run(maxOrder + i + 1, song.id);
    });
  });
  tx();
}

function reorderQueue(roomId, orderedIds) {
  const update = db.prepare('UPDATE songs SET queue_order = ? WHERE id = ? AND room_id = ?');
  const tx = db.transaction((ids) => {
    ids.forEach((id, index) => update.run(index, id, roomId));
  });
  tx(orderedIds);
}

// --- Votes ---

function vote(songId, userId, voteType) {
  if (voteType === null) {
    db.prepare('DELETE FROM votes WHERE song_id = ? AND user_id = ?').run(songId, userId);
  } else {
    db.prepare(`
      INSERT INTO votes (song_id, user_id, vote_type)
      VALUES (?, ?, ?)
      ON CONFLICT(song_id, user_id) DO UPDATE SET vote_type = excluded.vote_type
    `).run(songId, userId, voteType);
  }

  // Auto-promote from waiting room if upvotes meet threshold
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
  if (song && song.status === 'waiting') {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(song.room_id);
    const upvotes = db.prepare(
      "SELECT COUNT(*) FROM votes WHERE song_id = ? AND vote_type = 'up'"
    ).pluck().get(songId);
    if (room && upvotes >= room.upvote_threshold) {
      promoteToQueue(songId, song.room_id);
      return { promoted: true };
    }
  }
  return { promoted: false };
}

module.exports = {
  getRoom, createRoom, updateRoomSettings,
  getSongs, addSong, deleteSong, markPlayed, promoteToQueue, promoteAllWaitingToQueue, reorderQueue,
  vote,
};
