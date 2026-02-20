import { useState } from 'react';
import './Home.css';

export default function Home({ onEnterRoom }) {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [username, setUsername] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!username.trim()) return setError('Enter a username');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const room = await res.json();
      onEnterRoom({ joinCode: room.joinCode, username: username.trim() });
    } catch {
      setError('Failed to create room. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!username.trim()) return setError('Enter a username');
    if (!joinCode.trim()) return setError('Enter a room code');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${joinCode.trim().toUpperCase()}`);
      if (!res.ok) {
        const data = await res.json();
        return setError(data.error || 'Room not found');
      }
      onEnterRoom({ joinCode: joinCode.trim().toUpperCase(), username: username.trim() });
    } catch {
      setError('Failed to join room. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-logo">
          <span className="logo-icon">🎤</span>
          <span className="logo-text">castella</span>
        </div>
        <p className="home-tagline">Queue songs, vote on what's next, sing together.</p>
      </div>

      <div className="home-card card">
        {!mode && (
          <div className="home-actions">
            <button className="btn btn-primary home-btn" onClick={() => setMode('create')}>
              Create a Room
            </button>
            <button className="btn btn-ghost home-btn" onClick={() => setMode('join')}>
              Join a Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="home-form">
            <div className="form-header">
              <button type="button" className="btn-icon back-btn" onClick={() => { setMode(null); setError(''); }}>←</button>
              <h2 className="title-md">Create a Room</h2>
            </div>
            <div className="input-group">
              <label>Your name</label>
              <input
                className="input"
                placeholder="e.g. Alex"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={32}
                autoFocus
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Room'}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="home-form">
            <div className="form-header">
              <button type="button" className="btn-icon back-btn" onClick={() => { setMode(null); setError(''); }}>←</button>
              <h2 className="title-md">Join a Room</h2>
            </div>
            <div className="input-group">
              <label>Room code</label>
              <input
                className="input input-code"
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="input-group">
              <label>Your name</label>
              <input
                className="input"
                placeholder="e.g. Alex"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={32}
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Join Room'}
            </button>
          </form>
        )}
      </div>

      <p className="home-footer text-muted text-sm">
        Rooms last 24 hours · No account needed
      </p>
    </div>
  );
}
