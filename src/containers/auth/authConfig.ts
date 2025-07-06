import { Configuration, LogLevel } from '@azure/msal-browser';

const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin,
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
    },
    system: {
        allowPlatformBroker: false,
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (!containsPii) {
                    console.log(`MSAL [${level}]: ${message}`);
                }
            },
            piiLoggingEnabled: false,
            logLevel: LogLevel.Info
        }
    }
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile", 
    "User.Read"
    // Remove the Azure Function URL scope for now - we'll handle this differently
  ],
};

export { msalConfig };