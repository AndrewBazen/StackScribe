import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { useEffect } from 'react';

import App from '../../App';
import { initializeSyncManager } from '../../lib/sync';

import classes from './Auth.module.css';
import { loginRequest } from './authConfig'; // see authConfig.ts code bellow

const Auth: React.FC = () => {
  const { instance, accounts } = useMsal();

  useEffect(() => {
    if (accounts.length > 0) {
      try {
        // Initialize the sync manager when user is authenticated
        const syncManager = initializeSyncManager(instance, accounts[0]);
        console.log('✅ Sync manager initialized for user:', accounts[0].username);
        
        // Note: Sync will be handled by the main App.tsx initialization
        // to avoid duplicate sync operations
      } catch (error) {
        console.error('❌ Failed to initialize sync manager:', error);
      }
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
          <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
            <button onClick={handleLogout} style={{ 
              padding: '8px 16px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Logout
            </button>
          </div>
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