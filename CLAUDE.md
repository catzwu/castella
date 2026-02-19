# CLAUDE.md — Castella Project Guide

This file provides guidance for AI assistants working in this repository.

---

## Project Overview

**Castella** is a web application for karaoke song queueing and voting. It is currently in the **planning/greenfield phase** — no implementation exists yet. The full feature specification lives in `TODO.md`.

### Core Concept

- Users create or join a room via a share code (no login required, just a username)
- Rooms persist for 24 hours at the same join code
- Anyone in a room can search for songs, add them to the queue, vote on songs, reorder the queue, or delete entries
- Voting: one upvote or downvote per person per song; votes can be changed or retracted
- Each song displays who added it
- An "already played" section is shown for reference

### Additional Features (planned)

- Song recommendations based on current queue content
- Automatic YouTube/Spotify lyric video playback when a song reaches the top of the queue (with a "display mode")
- A "waiting room" sorted by upvotes, with configurable auto-promote thresholds
- Room settings panel (e.g. upvote threshold for auto-queue)

### Design Direction

Modern, minimalist UI.

---

## Repository State

This project has a single commit and contains only:

```
castella/
├── TODO.md       # Feature specification
└── CLAUDE.md     # This file
```

No tech stack has been selected yet. The sections below document **expected conventions** to follow once implementation begins.

---

## Tech Stack Decisions (To Be Made)

Before writing code, choose and document:

| Concern | Options to consider |
|---|---|
| Frontend | React, Vue, Svelte, SolidJS |
| Backend | Node/Express, FastAPI, Go, Bun |
| Realtime | WebSockets, SSE, polling |
| Database | SQLite, PostgreSQL, Redis |
| External APIs | YouTube Data API v3, Spotify Web API |
| Hosting | Vercel, Railway, Fly.io, self-hosted |

Update this file once decisions are made.

---

## Development Workflow

### Branch Convention

- Main branch: `main` (or `master`)
- Feature branches: `feature/<description>`
- AI-generated branches: `claude/<description>-<session-id>`

Always develop on the designated branch and push when complete.

### Commits

- Use clear, descriptive commit messages in the imperative mood
- Reference the feature area in the message (e.g. `feat: add room creation endpoint`)
- Do not amend already-pushed commits; create new ones instead

### Git Push

```bash
git push -u origin <branch-name>
```

If push fails due to network errors, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s).

---

## Development Commands

> These will be populated once the tech stack is selected. Placeholders:

```bash
# Install dependencies
<package-manager> install

# Run development server
<package-manager> run dev

# Run tests
<package-manager> run test

# Lint
<package-manager> run lint

# Build for production
<package-manager> run build
```

---

## Environment Variables

> Populate this section once external services are integrated.

Expected variables (names TBD):

```
# YouTube Data API
YOUTUBE_API_KEY=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Database
DATABASE_URL=

# Session / app
SESSION_SECRET=
PORT=
```

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

---

## Architecture Notes

### Room Lifecycle

- A room is created with a randomly generated join code
- Rooms expire after 24 hours (store a `created_at` / `expires_at` timestamp)
- Multiple simultaneous users must see consistent queue state — use real-time sync (WebSockets or SSE)

### Queue Logic

- Songs live in an ordered list
- Anyone can reorder (drag-and-drop or up/down arrows) or delete entries
- Moving a song to "already played" is a one-way action (soft-delete with a `played` flag)

### Voting

- Track votes in a `votes` relation: `(user_id/username, song_id, value: +1 | -1)`
- Enforce one vote per user per song server-side
- Users can change or retract their vote

### Waiting Room (optional feature)

- Songs can be added to a "waiting room" list instead of the main queue
- Songs auto-promote to the main queue when their vote count reaches the configured threshold
- Threshold is a per-room setting, defaulting to a sensible value (e.g. 3)

### Recommendations (optional feature)

- Analyze genres/artists of songs already in the queue
- Use YouTube or Spotify's recommendation APIs to suggest related tracks
- Display suggestions inline; users can add them directly

---

## Code Conventions

> Enforce these once a language/framework is chosen.

- **No dead code**: remove unused variables, imports, and functions immediately
- **No backwards-compat shims**: change callers when you change an interface
- **Minimal abstraction**: don't create helpers for single-use operations
- **Validate at boundaries**: user input and external API responses; trust internal code
- **No speculative features**: implement only what is in `TODO.md` or explicitly requested

---

## Testing

> Populate once a test framework is chosen.

- Unit tests for business logic (voting rules, room expiry, queue ordering)
- Integration tests for API endpoints
- No tests required for trivial getters/setters
- Run the full test suite before pushing

---

## Security Considerations

- Rooms use short alphanumeric join codes — ensure they are unguessable (random, not sequential)
- No authentication, but track users by username + a session token stored client-side to prevent vote manipulation
- Sanitize all user-supplied strings (song titles, usernames) before storing or rendering
- Keep API keys server-side only; never expose them to the frontend
- Rate-limit song search and room creation endpoints

---

## External Service Integration

### YouTube Data API v3

- Used for searching lyric videos and embedding playback
- Requires a server-side API key (quota-limited; cache search results when possible)
- Embed videos using the YouTube IFrame Player API

### Spotify Web API

- Alternative or complement to YouTube for song search/metadata
- Requires OAuth client credentials flow for server-to-server search
- Playback requires Spotify Premium and the Playback SDK (browser)

---

## Key Files (once implementation begins)

| Path | Purpose |
|---|---|
| `TODO.md` | Full feature specification |
| `CLAUDE.md` | This guide |
| `.env.example` | Environment variable template |
| `src/` or `app/` | Application source code |
| `tests/` | Test suite |
| `docs/` | Additional documentation (if needed) |
