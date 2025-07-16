import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import '../Styles/AIServiceManager.css';

interface ServiceStatus {
  is_running: boolean;
  is_healthy: boolean;
  endpoint: string;
}

interface ServiceResponse {
  status: string;
  message: string;
}

const AIServiceManager: React.FC = () => {
  const [status, setStatus] = useState<ServiceStatus>({
    is_running: false,
    is_healthy: false,
    endpoint: 'http://localhost:8000'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [startupStatus, setStartupStatus] = useState<string>('');
  
  // Check if user has Azure sync enabled
  const isAzureEnabled = () => {
    const enableAzureSync = localStorage.getItem('enableAzureSync');
    return enableAzureSync ? JSON.parse(enableAzureSync) : false;
  };

  const getServiceEndpoint = () => {
    return isAzureEnabled() ? 
      'https://stackscribe-ai-service-prod.azurecontainerapps.io' : 
      'http://localhost:8000';
  };

  const checkStatus = async () => {
    try {
      if (isAzureEnabled()) {
        // For Azure service, check health directly
        const endpoint = getServiceEndpoint();
        const response = await fetch(`${endpoint}/health`);
        const isHealthy = response.ok;
        setStatus({
          is_running: isHealthy,
          is_healthy: isHealthy,
          endpoint: endpoint
        });
      } else {
        // For local service, use the Tauri command
        const response = await invoke<ServiceStatus>('python_service_status');
        setStatus(response);
      }
    } catch (error) {
      console.error('Error checking service status:', error);
      setStatus({
        is_running: false,
        is_healthy: false,
        endpoint: getServiceEndpoint()
      });
    }
  };

  const startService = async () => {
    setLoading(true);
    setMessage('Starting AI service...');
    try {
      const response = await invoke<ServiceResponse>('start_python_service');
      setMessage(response.message);
      // Wait a bit for service to start, then check status
      setTimeout(checkStatus, 2000);
    } catch (error) {
      setMessage(`Error starting service: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const stopService = async () => {
    setLoading(true);
    setMessage('Stopping AI service...');
    try {
      const response = await invoke<ServiceResponse>('stop_python_service');
      setMessage(response.message);
      checkStatus();
    } catch (error) {
      setMessage(`Error stopping service: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds

    // Listen for startup events
    const setupEventListener = async () => {
      const unlisten = await listen('ai-service-startup', (event: any) => {
        const startupResult = event.payload;
        console.log('AI service startup event:', startupResult);
        
        if (startupResult.status === 'success') {
          setStartupStatus('AI service started automatically on app launch');
          setMessage('AI service containers are starting up...');
          // Check status more frequently during startup
          const startupInterval = setInterval(checkStatus, 2000);
          setTimeout(() => clearInterval(startupInterval), 30000); // Stop after 30s
        } else if (startupResult.status === 'error') {
          setStartupStatus(`Startup failed: ${startupResult.message}`);
          setMessage(startupResult.message);
        } else if (startupResult.status === 'skipped') {
          setStartupStatus('Auto-start skipped: Docker not available');
          setMessage(startupResult.message);
        }
      });
      
      return unlisten;
    };

    let unlistenPromise = setupEventListener();

    return () => {
      clearInterval(interval);
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  const getStatusIcon = () => {
    if (status.is_healthy) return '🟢';
    if (status.is_running) return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (status.is_healthy) return 'Healthy';
    if (status.is_running) return 'Starting...';
    return 'Stopped';
  };

  return (
    <div className="ai-service-manager">
      <div className="service-header">
        <h3>AI Link Service</h3>
        <div className="service-status">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>
      
      <div className="service-info">
        <div className="info-item">
          <span className="label">Endpoint:</span>
          <span className="value">{status.endpoint}</span>
        </div>
        <div className="info-item">
          <span className="label">Features:</span>
          <span className="value">Vector similarity, Cross-encoder reranking, NER matching</span>
        </div>
        <div className="info-item">
          <span className="label">Deployment:</span>
          <span className="value">
            {isAzureEnabled() ? 
              'Azure Container Apps' : 
              'Docker Compose (Qdrant + AI Service)'
            }
          </span>
        </div>
      </div>

      <div className="service-controls">
        {!isAzureEnabled() && (
          <>
            <button 
              className="btn btn-primary" 
              onClick={startService}
              disabled={loading || status.is_running}
            >
              {loading ? 'Starting...' : 'Start Service'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={stopService}
              disabled={loading || !status.is_running}
            >
              {loading ? 'Stopping...' : 'Stop Service'}
            </button>
          </>
        )}
        <button 
          className="btn btn-outline" 
          onClick={checkStatus}
          disabled={loading}
        >
          Refresh Status
        </button>
        {isAzureEnabled() && (
          <div className="azure-service-info">
            <p>Service managed by Azure Container Apps</p>
            <p>Automatically scales based on demand</p>
            <p>Use Azure Portal for advanced configuration</p>
          </div>
        )}
      </div>

      {startupStatus && (
        <div className="startup-status">
          <h4>Startup Status:</h4>
          <div className={`message ${startupStatus.includes('failed') || startupStatus.includes('skipped') ? 'error' : 'info'}`}>
            {startupStatus}
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('Error') || message.includes('failed') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}

      <div className="service-requirements">
        {isAzureEnabled() ? (
          <>
            <h4>Azure Configuration:</h4>
            <ul>
              <li>Service hosted on Azure Container Apps</li>
              <li>Automatic scaling based on demand</li>
              <li>Persistent vector database with Azure Storage</li>
              <li>HTTPS endpoint with SSL certificates</li>
              <li>Automatic fallback to local service if Azure is unavailable</li>
            </ul>
            <h4>Services:</h4>
            <ul>
              <li><strong>Qdrant:</strong> Vector database (Azure internal)</li>
              <li><strong>AI Service:</strong> Link suggestions API ({status.endpoint})</li>
            </ul>
          </>
        ) : (
          <>
            <h4>Requirements:</h4>
            <ul>
              <li>Docker & Docker Compose installed</li>
              <li>Sufficient disk space for AI models (~2-3GB)</li>
              <li>Available ports: 6333 (Qdrant), 8000 (AI Service)</li>
              <li>Internet connection for initial model download</li>
            </ul>
            <h4>Services:</h4>
            <ul>
              <li><strong>Qdrant:</strong> Vector database (localhost:6333)</li>
              <li><strong>AI Service:</strong> Link suggestions API (localhost:8000)</li>
            </ul>
            <p><em>Tip: Enable Azure Sync in preferences to use cloud AI service</em></p>
          </>
        )}
      </div>
    </div>
  );
};

export default AIServiceManager; 