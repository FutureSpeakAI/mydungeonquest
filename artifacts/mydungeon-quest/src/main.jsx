import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { PatronShell } from './patron/doorFrame.jsx';
import { watchErrata } from './lib/errata.js';
import './styles.css';

// THE ERRATA LEDGER (beta doors) — uncaught mishaps fold into a small
// on-device ring that feeds the beta report and nothing else.
watchErrata();

// THE LEAN DOOR (XX, Law V) — the table loads first: the commons' reading
// room is not the turn pipeline, so its timber is cut only when a tale
// link is actually walked.
const PublicTale = lazy(() => import('./components/PublicTale.jsx'));

// THE COMMONS' reading room (Directive XV §III): /t/<id> renders the
// public tale page BARE — no door, no Clerk, no game shell. A visitor is
// asked for nothing, and the id must answer to its own alphabet at this
// boundary (the strict-door law) before any fetch is made.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const path = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : window.location.pathname;
const tale = path.match(/^\/t\/([A-Za-z0-9_-]{16,64})\/?$/);

// THE DOOR wraps the house only when a publishable key was built in (see
// src/patron/door.jsx, hung lazily through its frame in doorFrame.jsx); a
// keyless build renders the game exactly as before.
createRoot(document.getElementById('root')).render(<React.StrictMode>{
  tale ? <Suspense fallback={<div className="lean-veil">The page is being cut…</div>}><PublicTale publishId={tale[1]} /></Suspense> : <PatronShell><App /></PatronShell>
}</React.StrictMode>);
