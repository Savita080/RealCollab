// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Global app-loading style (before CSS modules load)
const style = document.createElement('style');
style.textContent = `
  .app-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #05050f;
  }
  .app-loading span {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, #00d4ff, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
