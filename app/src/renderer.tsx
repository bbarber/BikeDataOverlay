/**
 * React-based renderer for Bike Data Overlay
 * This file will be loaded by Vite and run in the Electron renderer context.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './components/App';

console.log('👋 React renderer starting...');

// Wait for the DOM to be loaded and the API to be available
document.addEventListener('DOMContentLoaded', () => {
  if (!window.electronAPI) {
    console.error('Electron API not available');
    return;
  }

  // Create React root and render the app
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element not found');
    return;
  }
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  
  console.log('✅ React app rendered successfully');
});