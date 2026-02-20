import SongCard from './SongCard.jsx';
import './WaitingRoom.css';

export default function WaitingRoom({ songs, userId, threshold, onVote, onDelete, onPromote }) {
  // Sort by net votes descending
  const sorted = [...songs].sort((a, b) => {
    const netA = (a.upvotes ?? 0) - (a.downvotes ?? 0);
    const netB = (b.upvotes ?? 0) - (b.downvotes ?? 0);
    return netB - netA;
  });

  if (songs.length === 0) {
    return (
      <div className="waiting-room">
        <div className="waiting-info">
          <span className="badge badge-muted">Threshold: {threshold} upvotes to auto-promote</span>
        </div>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>Waiting room is empty</p>
          <p className="text-muted text-sm">Add songs here — top-voted ones get promoted automatically</p>
        </div>
      </div>
    );
  }

  return (
    <div className="waiting-room">
      <div className="waiting-info">
        <span className="badge badge-muted">Auto-promote at {threshold} upvotes</span>
      </div>
      <div className="song-list">
        {sorted.map(song => {
          const net = (song.upvotes ?? 0) - (song.downvotes ?? 0);
          const pct = Math.min(100, Math.max(0, (net / threshold) * 100));
          return (
            <div key={song.id} className="waiting-song-wrap">
              <SongCard
                song={song}
                userId={userId}
                onVote={onVote}
                onDelete={onDelete}
                onPromote={onPromote}
              />
              {threshold > 0 && (
                <div className="vote-progress">
                  <div className="vote-progress-bar" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
