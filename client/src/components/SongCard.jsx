import './SongCard.css';

export default function SongCard({
  song,
  userId,
  onVote,
  onDelete,
  onMarkPlayed,
  onPromote,
  isFirst,
  dragHandle,
  isDragging,
}) {
  const net = (song.upvotes ?? 0) - (song.downvotes ?? 0);
  const userVote = song.user_vote;

  function handleVote(type) {
    // Toggle off if same vote, otherwise set new vote
    onVote(song.id, userVote === type ? null : type);
  }

  function formatDuration(ms) {
    if (!ms) return '';
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' ' + song.artist + ' karaoke')}`;

  return (
    <div className={`song-card card ${isDragging ? 'dragging' : ''} ${isFirst ? 'song-card--first' : ''}`}>
      {/* Drag handle (only in queue) */}
      {dragHandle && (
        <div className="drag-handle" {...dragHandle}>
          <DragIcon />
        </div>
      )}

      {/* Thumbnail */}
      <div className="song-thumb">
        {song.thumbnail ? (
          <img src={song.thumbnail} alt="" draggable={false} />
        ) : (
          <div className="song-thumb-placeholder">♪</div>
        )}
        {isFirst && <div className="now-playing-badge">Now</div>}
      </div>

      {/* Info */}
      <div className="song-info">
        <div className="song-title">{song.title}</div>
        <div className="song-meta">
          <span className="text-muted text-sm">{song.artist}</span>
          {song.duration && (
            <span className="song-duration text-muted text-xs">{formatDuration(song.duration)}</span>
          )}
        </div>
        <div className="song-added text-xs text-muted">
          Added by <span className="song-added-name">{song.added_by}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="song-actions">
        {/* Votes */}
        <div className="vote-group">
          <button
            className={`vote-btn vote-up ${userVote === 'up' ? 'active' : ''}`}
            onClick={() => handleVote('up')}
            title="Upvote"
          >
            ▲
          </button>
          <span className={`vote-count ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}`}>
            {net > 0 ? '+' : ''}{net}
          </span>
          <button
            className={`vote-btn vote-down ${userVote === 'down' ? 'active' : ''}`}
            onClick={() => handleVote('down')}
            title="Downvote"
          >
            ▼
          </button>
        </div>

        {/* Mark played (only on first queued song) */}
        {isFirst && onMarkPlayed && (
          <button
            className="btn btn-ghost btn-sm play-btn"
            onClick={() => onMarkPlayed(song.id)}
            title="Mark as played"
          >
            ✓ Played
          </button>
        )}

        {/* Promote (waiting room) */}
        {onPromote && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onPromote(song.id)}
            title="Add to queue"
          >
            → Queue
          </button>
        )}

        {/* YouTube link */}
        <a
          href={youtubeSearch}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-icon yt-link"
          title="Search on YouTube"
        >
          ▶
        </a>

        {/* Delete */}
        <button className="btn-icon delete-btn" onClick={() => onDelete(song.id)} title="Remove">
          ✕
        </button>
      </div>
    </div>
  );
}

function DragIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="3" width="10" height="2" rx="1" />
      <rect x="3" y="7" width="10" height="2" rx="1" />
      <rect x="3" y="11" width="10" height="2" rx="1" />
    </svg>
  );
}
