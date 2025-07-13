import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

  const checkStatus = async () => {
    try {
      const response = await invoke<ServiceStatus>('python_service_status');
      setStatus(response);
    } catch (error) {
      console.error('Error checking service status:', error);
      setStatus({
        is_running: false,
        is_healthy: false,
        endpoint: 'http://localhost:8000'
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
    return () => clearInterval(interval);
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
      </div>

      <div className="service-controls">
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
        <button 
          className="btn btn-outline" 
          onClick={checkStatus}
          disabled={loading}
        >
          Refresh Status
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}

      <div className="service-requirements">
        <h4>Requirements:</h4>
        <ul>
          <li>Python 3.8+ installed</li>
          <li>AI service dependencies installed (<code>pip install -r requirements.txt</code>)</li>
          <li>Qdrant running on localhost:6333</li>
          <li>spaCy model downloaded (<code>python -m spacy download en_core_web_sm</code>)</li>
        </ul>
      </div>
    </div>
  );
};

export default AIServiceManager; 