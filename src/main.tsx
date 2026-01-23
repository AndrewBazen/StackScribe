import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

console.log('🖥️ DESKTOP MAIN.TSX LOADED - Desktop UI is starting!');
console.log('Current URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
