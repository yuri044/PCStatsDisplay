// React entry point.
// Mounts the root App component and imports global styles.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dotgothic16';
import './styles/globals.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
