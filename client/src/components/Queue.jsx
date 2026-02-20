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
