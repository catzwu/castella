import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Queue from './Queue.jsx';
import WaitingRoom from './WaitingRoom.jsx';
import PlayedSongs from './PlayedSongs.jsx';
import SongSearch from './SongSearch.jsx';
import Settings from './Settings.jsx';
import './Room.css';

const TABS = ['Queue', 'Waiting', 'Played', 'Settings'];

export default function Room({ joinCode, username, userId, onLeave }) {
  const [tab, setTab] = useState('Queue');
  const [songs, setSongs] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const socketRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  // API helper
  const api = useCallback(async (method, path, body) => {
    const res = await fetch(`/api/rooms/${joinCode}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  }, [joinCode]);

  // Fetch songs directly (for initial load)
  const fetchSongs = useCallback(async () => {
    try {
      const data = await fetch(`/api/rooms/${joinCode}/songs?userId=${userId}`).then(r => r.json());
      setSongs(Array.isArray(data) ? data : []);
    } catch { /* socket will sync */ }
  }, [joinCode, userId]);

  // Socket setup
  useEffect(() => {
    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { joinCode, userId });
    });

    socket.on('songs:list', (data) => {
      setSongs(Array.isArray(data) ? data : []);
    });

    socket.on('room:info', (data) => {
      setRoomInfo(data);
    });

    return () => {
      socket.emit('leave-room', { joinCode });
      socket.disconnect();
    };
  }, [joinCode, userId]);

  // Initial fetch
  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  // ── Actions ──

  async function addSong(song, destination) {
    try {
      await api('POST', '/songs', {
        ...song,
        addedBy: username,
        addedById: userId,
        status: destination === 'waiting' ? 'waiting' : 'queued',
      });
      setSearchOpen(false);
      showToast(`Added "${song.title}" to ${destination === 'waiting' ? 'waiting room' : 'queue'}`);
    } catch (e) { showToast('Failed to add song'); }
  }

  async function deleteSong(songId) {
    try {
      await api('DELETE', `/songs/${songId}`, { userId });
    } catch { showToast('Failed to delete song'); }
  }

  async function voteSong(songId, voteType) {
    try {
      const res = await api('POST', `/songs/${songId}/vote`, { userId, voteType });
      if (res.promoted) showToast('Song promoted to queue!');
    } catch { showToast('Failed to vote'); }
  }

  async function markPlayed(songId) {
    try {
      await api('POST', `/songs/${songId}/play`, { userId });
      showToast('Song marked as played');
    } catch { showToast('Failed to update'); }
  }

  async function promoteSong(songId) {
    try {
      await api('POST', `/songs/${songId}/promote`, { userId });
      showToast('Song added to queue');
    } catch { showToast('Failed to promote'); }
  }

  async function reorderQueue(orderedIds) {
    try {
      await api('POST', '/songs/reorder', { orderedIds, userId });
    } catch { showToast('Failed to reorder'); }
  }

  async function updateSettings(settings) {
    try {
      await api('PATCH', '/settings', settings);
      showToast('Settings saved');
    } catch { showToast('Failed to save settings'); }
  }

  const queued = songs.filter(s => s.status === 'queued');
  const waiting = songs.filter(s => s.status === 'waiting');
  const played = songs.filter(s => s.status === 'played');

  function copyCode() {
    navigator.clipboard.writeText(joinCode).then(() => showToast('Room code copied!'));
  }

  return (
    <div className="room-page">
      {/* Header */}
      <header className="room-header">
        <div className="container">
          <div className="room-header-inner">
            <div className="room-brand">
              <span className="logo-small">🎤 castella</span>
              <button className="room-code-btn" onClick={copyCode} title="Copy room code">
                <span className="room-code">{joinCode}</span>
                <span className="copy-icon">⎘</span>
              </button>
            </div>
            <div className="room-user">
              <span className="text-muted text-sm">{username}</span>
              <button className="btn btn-ghost btn-sm" onClick={onLeave}>Leave</button>
            </div>
          </div>
        </div>
      </header>

      <main className="room-main">
        <div className="container">
          {/* Tabs */}
          <div className="room-tabs-row">
            <div className="tabs">
              {TABS.map(t => (
                <button
                  key={t}
                  className={`tab-btn ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t === 'Queue' && <span>{queued.length > 0 ? `${queued.length}` : ''}</span>}
                  {t === 'Waiting' && <span>{waiting.length > 0 ? `${waiting.length}` : ''}</span>}
                  {t}
                </button>
              ))}
            </div>
            {tab !== 'Settings' && (
              <button className="btn btn-primary" onClick={() => setSearchOpen(true)}>
                + Add Song
              </button>
            )}
          </div>

          {/* Tab Content */}
          {tab === 'Queue' && (
            <Queue
              songs={queued}
              userId={userId}
              onVote={voteSong}
              onDelete={deleteSong}
              onMarkPlayed={markPlayed}
              onReorder={reorderQueue}
            />
          )}
          {tab === 'Waiting' && (
            <WaitingRoom
              songs={waiting}
              userId={userId}
              threshold={roomInfo?.upvoteThreshold ?? 3}
              onVote={voteSong}
              onDelete={deleteSong}
              onPromote={promoteSong}
            />
          )}
          {tab === 'Played' && <PlayedSongs songs={played} />}
          {tab === 'Settings' && (
            <Settings
              roomInfo={roomInfo}
              onSave={updateSettings}
            />
          )}
        </div>
      </main>

      {/* Song Search Modal */}
      {searchOpen && (
        <SongSearch
          onAdd={addSong}
          onClose={() => setSearchOpen(false)}
          hasWaitingRoom={true}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
