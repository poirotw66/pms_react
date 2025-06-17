console.log('index.tsx evaluating as module');
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Get the base path for GitHub Pages deployment
const getBasename = () => {
  // In production (GitHub Pages), use the repository name as basename
  // In development, use empty string
  if (import.meta.env.PROD) {
    return '/pms_react';
  }
  return '';
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={getBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);