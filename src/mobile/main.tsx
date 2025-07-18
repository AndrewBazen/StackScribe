import React from 'react';
import ReactDOM from 'react-dom/client';
import MobileApp from './App';

import '../Styles/App.css'; // reuse base styles if desired

console.log('🚀 MOBILE MAIN.TSX LOADED - Mobile UI is starting!');
console.log('Current URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MobileApp />
  </React.StrictMode>
); 