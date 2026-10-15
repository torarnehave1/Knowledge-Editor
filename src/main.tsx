import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadBranding } from './branding';

// A World's look, when served on its own host. Non-blocking: the editor renders at once.
loadBranding();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
