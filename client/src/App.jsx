import { useState, useEffect } from 'react';
import Home from './components/Home.jsx';
import Room from './components/Room.jsx';

const SESSION_KEY = 'castella_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function generateUserId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());

  function handleEnterRoom({ joinCode, username }) {
    const existing = loadSession();
    const userId = existing?.userId || generateUserId();
    const newSession = { joinCode, username, userId };
    saveSession(newSession);
    setSession(newSession);
  }

  function handleLeaveRoom() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  if (session?.joinCode) {
    return (
      <Room
        joinCode={session.joinCode}
        username={session.username}
        userId={session.userId}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return <Home onEnterRoom={handleEnterRoom} />;
}
