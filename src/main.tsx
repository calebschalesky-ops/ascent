import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-sans-symbols/400.css';
import './styles.css';
import './styles-glass.css';
import './opening.css';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
