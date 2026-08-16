import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Server, RefreshCw, Clock, Terminal } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function HealthStatus() {
  const [status, setStatus] = useState('checking'); // checking | online | offline
  const [latency, setLatency] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    setStatus('checking');
    const startTime = performance.now();

    try {
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 5000 // 5 seconds timeout
      });
      const endTime = performance.now();
      
      setLatency(Math.round(endTime - startTime));
      setHealthData(response.data);
      setStatus('online');
    } catch (error) {
      console.error('Healthcheck failed:', error);
      setStatus('offline');
      setLatency(null);
      setHealthData(null);
    } finally {
      setIsRefreshing(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card health-panel">
      <div className="panel-title">
        <Server size={18} style={{ color: 'var(--text-secondary)' }} />
        <span>System Status</span>
      </div>

      <div className="status-indicator">
        <div className={`status-dot ${status}`}></div>
        <div className="status-text">
          {status === 'online' && <span style={{ color: 'var(--text-primary)' }}>Connected</span>}
          {status === 'offline' && <span style={{ color: 'var(--danger)' }}>Offline</span>}
          {status === 'checking' && <span style={{ color: 'var(--text-muted)' }}>Checking...</span>}
        </div>
      </div>

      <div className="stats-list">
        <div className="stat-item">
          <div className="stat-label">API Endpoint</div>
          <div className="stat-value">{API_URL}/health</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Latency
            </span>
          </div>
          <div className="stat-value">
            {latency !== null ? `${latency} ms` : '--'}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Last Checked</div>
          <div className="stat-value">{lastChecked || '--'}</div>
        </div>
      </div>

      <button 
        className="btn btn-outline" 
        onClick={checkHealth}
        disabled={isRefreshing}
        style={{ width: '100%', marginTop: '0.5rem' }}
      >
        <RefreshCw size={14} className={isRefreshing ? 'spin-animation' : ''} />
        {isRefreshing ? 'Checking...' : 'Check Status'}
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
