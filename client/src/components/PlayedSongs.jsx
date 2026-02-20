import './PlayedSongs.css';

export default function PlayedSongs({ songs }) {
  // Reverse chronological order
  const sorted = [...songs].sort((a, b) => (b.played_at ?? 0) - (a.played_at ?? 0));

  if (songs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎤</div>
        <p>Nothing played yet</p>
        <p className="text-muted text-sm">Songs marked as played will appear here</p>
      </div>
    );
  }

  function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="played-songs">
      <div className="song-list">
        {sorted.map(song => (
          <div key={song.id} className="played-card card">
            <div className="played-thumb">
              {song.thumbnail
                ? <img src={song.thumbnail} alt="" />
                : <div className="thumb-placeholder">♪</div>
              }
              <div className="played-check">✓</div>
            </div>
            <div className="played-info">
              <div className="song-title">{song.title}</div>
              <div className="song-meta text-muted text-sm">{song.artist}</div>
              <div className="song-added text-xs text-muted">
                Added by <span className="song-added-name">{song.added_by}</span>
                {song.played_at && <span> · {formatTime(song.played_at)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
