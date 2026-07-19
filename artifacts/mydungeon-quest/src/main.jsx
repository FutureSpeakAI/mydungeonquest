import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { PatronShell } from './patron/door.jsx';
import './styles.css';

// THE DOOR wraps the house only when a publishable key was built in (see
// src/patron/door.jsx); a keyless build renders the game exactly as before.
createRoot(document.getElementById('root')).render(<React.StrictMode><PatronShell><App /></PatronShell></React.StrictMode>);
