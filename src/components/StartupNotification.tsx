import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import '../Styles/StartupNotification.css';

interface StartupNotificationProps {
  onDismiss?: () => void;
}

const StartupNotification: React.FC<StartupNotificationProps> = ({ onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const setupEventListener = async () => {
      const unlisten = await listen('ai-service-startup', (event: any) => {
        const startupResult = event.payload;
        console.log('Startup notification received:', startupResult);
        
        setVisible(true);
        setStatus(startupResult.status);
        setMessage(startupResult.message);
        setIsError(startupResult.status === 'error' || startupResult.status === 'skipped');
        
        // Auto-dismiss success notifications after 5 seconds
        if (startupResult.status === 'success') {
          setTimeout(() => {
            setVisible(false);
          }, 5000);
        }
      });
      
      return unlisten;
    };

    let unlistenPromise = setupEventListener();

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (status) {
      case 'success':
        return '🤖';
      case 'error':
        return '❌';
      case 'skipped':
        return '⚠️';
      default:
        return '🔄';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'AI Service Starting';
      case 'error':
        return 'AI Service Error';
      case 'skipped':
        return 'AI Service Skipped';
      default:
        return 'AI Service Status';
    }
  };

  return (
    <div className={`startup-notification ${isError ? 'error' : 'success'}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {getIcon()}
        </div>
        <div className="notification-text">
          <div className="notification-title">{getTitle()}</div>
          <div className="notification-message">{message}</div>
        </div>
        <button 
          className="notification-close"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default StartupNotification; 