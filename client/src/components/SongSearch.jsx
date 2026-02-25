import { useState, useRef, useEffect } from 'react';
import './SongSearch.css';

export default function SongSearch({ onAdd, onClose, waitingRoomEnabled }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setError('');
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => search(val.trim()), 420);
  }

  async function search(term) {
    setLoading(true);
    try {
      const url = `/api/search?term=${encodeURIComponent(term)}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setError('Search failed. Check your connection.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(track, destination) {
    const key = `${track.trackId}-${destination}`;
    setAddingId(key);
    await onAdd({
      title: track.trackName,
      artist: track.artistName,
      duration: track.trackTimeMillis,
      thumbnail: track.artworkUrl100,
      sourceUrl: track.trackViewUrl,
    }, destination);
    setAddingId(null);
  }

  function formatDuration(ms) {
    if (!ms) return '';
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  return (
    <div className="search-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="search-modal card">
        <div className="search-header">
          <h2 className="title-md">Add a Song</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search for a song or artist..."
            value={query}
            onChange={handleQueryChange}
          />
          {loading && <span className="spinner" />}
        </div>

        {error && <p className="search-error">{error}</p>}

        <div className="search-results">
          {results.length === 0 && !loading && query && (
            <div className="search-empty">No results for "{query}"</div>
          )}
          {results.length === 0 && !query && (
            <div className="search-hint">
              <p className="text-muted text-sm">Search powered by iTunes</p>
            </div>
          )}
          {results.map(track => (
            <div key={track.trackId} className="search-result">
              <img
                className="result-thumb"
                src={track.artworkUrl60 || track.artworkUrl100}
                alt=""
                loading="lazy"
              />
              <div className="result-info">
                <div className="result-title">{track.trackName}</div>
                <div className="result-meta text-sm text-muted">
                  {track.artistName}
                  {track.trackTimeMillis && (
                    <span> · {formatDuration(track.trackTimeMillis)}</span>
                  )}
                </div>
              </div>
              <div className="result-actions">
                {waitingRoomEnabled ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAdd(track, 'waiting')}
                    disabled={addingId === `${track.trackId}-waiting`}
                  >
                    {addingId === `${track.trackId}-waiting` ? <span className="spinner spinner-sm" /> : '+ Waiting'}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAdd(track, 'queued')}
                    disabled={addingId === `${track.trackId}-queued`}
                  >
                    {addingId === `${track.trackId}-queued` ? <span className="spinner spinner-sm" /> : '+ Queue'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
