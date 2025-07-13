import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { useEffect } from 'react';

import App from '../../App';
import { initializeSyncManager } from '../../lib/sync';

import classes from './Auth.module.css';
import { loginRequest } from './authConfig'; // see authConfig.ts code bellow

const Auth: React.FC = () => {
  const { instance, accounts } = useMsal();

  // Check user preference for Azure Sync
  const azureSyncEnabled = localStorage.getItem('enableAzureSync') === 'true';

  // If Azure Sync is disabled, skip authentication and render the app directly
  if (!azureSyncEnabled) {
    return <App />;
  }

  useEffect(() => {
    if (accounts.length > 0 && azureSyncEnabled) {
      try {
        // Initialize the sync manager only if preference is enabled
        const syncManager = initializeSyncManager(instance, accounts[0]);
        console.log('✅ Sync manager initialized for user:', accounts[0].username);
      } catch (error) {
        console.error('❌ Failed to initialize sync manager:', error);
      }
    } else if (accounts.length > 0 && !azureSyncEnabled) {
      console.log('ℹ️ Azure Sync is disabled. Skipping sync manager initialization.');
    }
  }, [instance, accounts]);

  const handleLogin = async () => {
    try {
      console.log('🔐 Starting login process...');
      
      // Try silent token acquisition first
      if (accounts.length > 0) {
        const silentRequest = {
          scopes: loginRequest.scopes,
          account: accounts[0]
        };
        
        try {
          const response = await instance.acquireTokenSilent(silentRequest);
          console.log('✅ Silent login successful');
          return;
        } catch (silentError) {
          console.log('🔄 Silent login failed, trying interactive login');
        }
      }
      
      // Try redirect instead of popup
      await instance.loginRedirect({
        ...loginRequest,
        redirectUri: window.location.origin
      });
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      // Disable Azure Sync preference since login failed
      localStorage.setItem('enableAzureSync', 'false');
      // Optionally inform the user (toast/alert) and reload to reflect state
      alert('Azure login failed. Sync has been disabled.');
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin
      });
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  return (
    <>
      <AuthenticatedTemplate>
        <div>
          <App />
        </div>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div className={classes.authCont}>
          <div className={classes.loginInfo}>
            <h1 className={classes.title}>Stackscribe</h1>
            <button onClick={handleLogin} className={classes.loginBtn}>
              Login with Microsoft
            </button>
          </div>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
};

export default Auth;