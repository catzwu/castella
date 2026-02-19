import { useState, useEffect } from 'react';
import './Settings.css';

export default function Settings({ roomInfo, onSave }) {
  const [threshold, setThreshold] = useState(roomInfo?.upvoteThreshold ?? 3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roomInfo?.upvoteThreshold != null) setThreshold(roomInfo.upvoteThreshold);
  }, [roomInfo?.upvoteThreshold]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({ upvoteThreshold: Number(threshold) });
    setSaving(false);
  }

  function expiresIn() {
    if (!roomInfo?.expiresAt) return null;
    const ms = roomInfo.expiresAt - Date.now();
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  return (
    <div className="settings">
      <div className="settings-section card">
        <h3 className="settings-title">Room</h3>
        <div className="settings-row">
          <span className="text-muted text-sm">Room code</span>
          <span className="settings-value">{roomInfo?.joinCode ?? '—'}</span>
        </div>
        <div className="settings-row">
          <span className="text-muted text-sm">Expires in</span>
          <span className="settings-value">{expiresIn() ?? '—'}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="settings-section card">
        <h3 className="settings-title">Waiting Room</h3>
        <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
          Songs in the waiting room are automatically promoted to the queue when they reach the upvote threshold.
        </p>
        <div className="input-group">
          <label>Upvote threshold to auto-promote</label>
          <div className="threshold-row">
            <input
              type="range"
              min="1"
              max="20"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="threshold-slider"
            />
            <span className="threshold-value">{threshold}</span>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : 'Save Settings'}
        </button>
      </form>

      <div className="settings-section card">
        <h3 className="settings-title">Coming Soon</h3>
        <div className="coming-soon-list">
          <div className="coming-soon-item">
            <span className="coming-soon-icon">▶</span>
            <div>
              <div className="text-sm">YouTube Playback</div>
              <div className="text-xs text-muted">Auto-play karaoke videos when songs reach the top</div>
            </div>
          </div>
          <div className="coming-soon-item">
            <span className="coming-soon-icon">✨</span>
            <div>
              <div className="text-sm">Song Recommendations</div>
              <div className="text-xs text-muted">Get song suggestions based on your queue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
