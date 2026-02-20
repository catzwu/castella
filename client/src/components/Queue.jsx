import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SongCard from './SongCard.jsx';
import './Queue.css';

function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const spMatch = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (spMatch) return `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}`;
  return null;
}

function PlayingNow({ song, onMarkPlayed }) {
  const [inputVal, setInputVal] = useState('');
  const embedUrl = getEmbedUrl(inputVal);
  const isSpotify = inputVal.includes('spotify');

  function handleMarkPlayed() {
    onMarkPlayed(song.id);
    setInputVal('');
  }

  return (
    <div className="playing-now-section">
      <div className="playing-now-header">
        <span className="playing-now-dot" />
        <span className="playing-now-label">Playing Now</span>
      </div>
      <div className="playing-now-song">
        {song.thumbnail && (
          <img className="playing-now-thumb" src={song.thumbnail} alt="" draggable={false} />
        )}
        <div className="playing-now-info">
          <div className="playing-now-title">{song.title}</div>
          <div className="playing-now-artist text-sm text-muted">{song.artist}</div>
          <div className="text-xs text-muted">Added by {song.added_by}</div>
        </div>
        {onMarkPlayed && (
          <button className="btn btn-ghost btn-sm" onClick={handleMarkPlayed}>
            ✓ Played
          </button>
        )}
      </div>
      <div className="playing-now-embed-row">
        <input
          className="playing-now-input"
          placeholder="Paste a YouTube or Spotify URL to embed..."
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
        />
        {inputVal && (
          <button className="btn-icon" onClick={() => setInputVal('')} title="Clear">✕</button>
        )}
      </div>
      {embedUrl && (
        <div className={`playing-now-embed ${isSpotify ? 'embed-spotify' : 'embed-youtube'}`}>
          <iframe
            src={embedUrl}
            title="Now playing embed"
            width="100%"
            height={isSpotify ? '152' : '100%'}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

function SortableSong({ song, userId, onVote, onDelete, onMarkPlayed, isFirst }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SongCard
        song={song}
        userId={userId}
        onVote={onVote}
        onDelete={onDelete}
        onMarkPlayed={isFirst ? onMarkPlayed : null}
        isFirst={isFirst}
        isDragging={isDragging}
        dragHandle={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function Queue({ songs, userId, onVote, onDelete, onMarkPlayed, onReorder }) {
  const [items, setItems] = useState(songs);

  // Sync external updates
  if (JSON.stringify(items.map(s => s.id)) !== JSON.stringify(songs.map(s => s.id)) ||
      JSON.stringify(items) !== JSON.stringify(songs)) {
    setItems(songs);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(s => s.id === active.id);
    const newIndex = items.findIndex(s => s.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    onReorder(newItems.map(s => s.id));
  }

  if (songs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎵</div>
        <p>Queue is empty</p>
        <p className="text-muted text-sm">Add songs to get started</p>
      </div>
    );
  }

  return (
    <div className="queue">
      <PlayingNow song={items[0]} onMarkPlayed={onMarkPlayed} />
      <div className="queue-up-next-label text-sm text-muted">Up Next</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="song-list">
            {items.map((song, i) => (
              <SortableSong
                key={song.id}
                song={song}
                userId={userId}
                onVote={onVote}
                onDelete={onDelete}
                onMarkPlayed={onMarkPlayed}
                isFirst={i === 0}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
