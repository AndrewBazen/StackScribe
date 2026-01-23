import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import '../../styles/AIServiceManager.css';

interface ServiceInfo {
  running: boolean;
  healthy: boolean;
  endpoint: string | null;
}

interface ServiceStatus {
  is_running: boolean;
  is_healthy: boolean;
  error?: string;
  services: {
    qdrant: ServiceInfo;
    ai_service: ServiceInfo;
  };
}

interface AIServiceConfig {
  ai_service_url: string | null;
  qdrant_url: string | null;
  configured: boolean;
}

const AIServiceManager: React.FC = () => {
  const [status, setStatus] = useState<ServiceStatus>({
    is_running: false,
    is_healthy: false,
    services: {
      qdrant: { running: false, healthy: false, endpoint: null },
      ai_service: { running: false, healthy: false, endpoint: null }
    }
  });
  const [config, setConfig] = useState<AIServiceConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [startupStatus, setStartupStatus] = useState<string>('');

  const checkStatus = async () => {
    try {
      const response = await invoke<ServiceStatus>('python_service_status');
      setStatus(response);
    } catch (error) {
      console.error('Error checking service status:', error);
      setStatus({
        is_running: false,
        is_healthy: false,
        error: String(error),
        services: {
          qdrant: { running: false, healthy: false, endpoint: null },
          ai_service: { running: false, healthy: false, endpoint: null }
        }
      });
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await invoke<AIServiceConfig>('get_ai_service_config');
      setConfig(cfg);
    } catch (error) {
      console.error('Error loading AI service config:', error);
    }
  };

  useEffect(() => {
    loadConfig();
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

    // Listen for startup events
    const setupEventListener = async () => {
      const unlisten = await listen('ai-service-startup', (event: any) => {
        const startupResult = event.payload;
        console.log('AI service startup event:', startupResult);

        if (startupResult.status === 'connected') {
          setStartupStatus(`Connected to AI service at ${startupResult.endpoint}`);
          setMessage('');
        } else if (startupResult.status === 'not_configured') {
          setStartupStatus('AI service not configured');
          setMessage(startupResult.message);
        } else if (startupResult.status === 'unreachable') {
          setStartupStatus('Cannot reach AI service');
          setMessage(startupResult.message);
        } else if (startupResult.status === 'unhealthy') {
          setStartupStatus('AI service is unhealthy');
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
    if (!config?.configured) return '⚙️';
    if (status.is_healthy) return '🟢';
    if (status.is_running) return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (!config?.configured) return 'Not Configured';
    if (status.is_healthy) return 'Connected';
    if (status.is_running) return 'Connecting...';
    return 'Disconnected';
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
          <span className="label">AI Service:</span>
          <span className="value">
            {status.services.ai_service.endpoint || config?.ai_service_url || 'Not configured'}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Qdrant:</span>
          <span className="value">
            {status.services.qdrant.endpoint || config?.qdrant_url || 'Not configured'}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Features:</span>
          <span className="value">Vector similarity, Cross-encoder reranking, GPU acceleration</span>
        </div>
      </div>

      <div className="service-controls">
        <button
          className="btn btn-outline"
          onClick={checkStatus}
          disabled={loading}
        >
          Refresh Status
        </button>
      </div>

      {!config?.configured && (
        <div className="config-warning">
          <h4>⚠️ Configuration Required</h4>
          <p>Set the <code>AI_SERVICE_URL</code> environment variable to connect to your AI server.</p>
          <p>Example: <code>AI_SERVICE_URL=http://192.168.1.197:8000</code></p>
        </div>
      )}

      {startupStatus && (
        <div className="startup-status">
          <div className={`message ${startupStatus.includes('Cannot') || startupStatus.includes('not configured') ? 'error' : 'info'}`}>
            {startupStatus}
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('Error') || message.includes('Cannot') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}

      {status.error && (
        <div className="message error">
          {status.error}
        </div>
      )}

      <div className="service-requirements">
        <h4>Server Configuration:</h4>
        <ul>
          <li>AI service runs on a remote server</li>
          <li>Set <code>AI_SERVICE_URL</code> environment variable</li>
          <li>Optionally set <code>QDRANT_URL</code> (auto-derived if not set)</li>
        </ul>
        <h4>Services:</h4>
        <ul>
          <li><strong>Qdrant:</strong> Vector database {status.services.qdrant.healthy ? '✅' : '❌'}</li>
          <li><strong>AI Service:</strong> Link suggestions API {status.services.ai_service.healthy ? '✅' : '❌'}</li>
          <li><strong>Ollama:</strong> LLM inference (CPU)</li>
          <li><strong>Redis:</strong> Caching layer</li>
        </ul>
      </div>
    </div>
  );
};

export default AIServiceManager;
