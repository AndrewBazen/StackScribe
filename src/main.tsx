import React from "react";
import ReactDOM from "react-dom/client";

console.log('🖥️ DESKTOP MAIN.TSX LOADED - Desktop UI is starting!');
console.log('Current URL:', window.location.href);
console.log('User Agent:', navigator.userAgent);

// TEMPORARILY DISABLED AUTHENTICATION
// TO RE-ENABLE: Uncomment the section below and comment out the "DIRECT APP RENDERING" section
/*
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import Auth from "./containers/auth/Auth";
import { msalConfig } from "./containers/auth/authConfig"

export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      const account = payload.account;
      msalInstance.setActiveAccount(account);
    }
  })

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    // Temporarily disable StrictMode to prevent duplicate sync operations
    // <React.StrictMode>
      <MsalProvider instance={msalInstance}>
            <Auth />
      </MsalProvider>
    // </React.StrictMode>,
  ); 
})
*/

// DIRECT APP RENDERING (NO AUTHENTICATION)
// TO RE-ENABLE AUTH: Comment out this section and uncomment the section above
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);

