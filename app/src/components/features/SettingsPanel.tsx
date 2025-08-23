import React, { useState, useCallback } from 'react';
import { useAppState } from '../../store/AppContext';
import { useDeviceManager } from '../../hooks/useDeviceManager';
import Button from '../ui/Button';
import Toggle from '../ui/Toggle';
import ZoneSelector from './ZoneSelector';
import DeviceList from './DeviceList';

const SettingsPanel: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { devices, scanForDevices, refreshDeviceList, toggleShowAllDevices, toggleTestMode } = useDeviceManager();
  
  const [deviceStatus, setDeviceStatus] = useState('Ready to scan');

  const handleClosePanel = useCallback(() => {
    dispatch({ type: 'CLOSE_SETTINGS_PANEL' });
  }, [dispatch]);

  const handleTabSwitch = useCallback((tabName: string) => {
    dispatch({ type: 'SWITCH_TAB', payload: tabName });
  }, [dispatch]);

  const handleScanDevices = useCallback(async () => {
    setDeviceStatus('Scanning for devices...');
    try {
      await scanForDevices();
      setTimeout(() => {
        setDeviceStatus('Scan completed');
        refreshDeviceList();
      }, 3000);
    } catch (error) {
      setDeviceStatus('Scan failed');
    }
  }, [scanForDevices, refreshDeviceList]);

  const handleAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const age = parseInt(e.target.value);
    if (age && age >= 18 && age <= 100) {
      dispatch({ type: 'UPDATE_HR_CONFIG', payload: { age } });
    }
  }, [dispatch]);

  const handleRestingHRChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const restingHR = parseInt(e.target.value);
    if (restingHR && restingHR >= 40 && restingHR <= 100) {
      dispatch({ type: 'UPDATE_HR_CONFIG', payload: { restingHR } });
    }
  }, [dispatch]);

  if (!state.ui.settingsPanelVisible) {
    return null;
  }

  return (
    <div className="settings-panel visible">
      <div className="settings-panel-header">
        <h3>Settings</h3>
        <Button className="close-btn" onClick={handleClosePanel}>
          ×
        </Button>
      </div>
      
      <div className="settings-tabs">
        <Button 
          className={`tab-button ${state.ui.activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('devices')}
        >
          Devices
        </Button>
        <Button 
          className={`tab-button ${state.ui.activeTab === 'hr-zones' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('hr-zones')}
        >
          HR Zones
        </Button>
      </div>
      
      <div className="settings-panel-content">
        {/* Devices Tab */}
        {state.ui.activeTab === 'devices' && (
          <div className="tab-content active">
            <div className="device-controls">
              <Button 
                className="btn-primary" 
                onClick={handleScanDevices}
                disabled={devices.isScanning}
              >
                {devices.isScanning ? 'Scanning...' : 'Scan for Devices'}
              </Button>
              <Button 
                className="btn-secondary" 
                onClick={refreshDeviceList}
              >
                Refresh
              </Button>
            </div>
            
            <div className="device-filter-controls">
              <Toggle
                id="showAllDevicesToggle"
                label="Show all BLE devices"
                checked={devices.showAllDevices}
                onChange={toggleShowAllDevices}
              />
              <Toggle
                id="testModeToggle"
                label="Test mode"
                checked={devices.testMode}
                onChange={toggleTestMode}
                className="mt-2"
              />
            </div>
            
            <div className="device-status">
              <span className="status-text">{deviceStatus}</span>
            </div>
            
            <DeviceList />
          </div>
        )}

        {/* HR Zones Tab */}
        {state.ui.activeTab === 'hr-zones' && (
          <div className="tab-content active">
            <div className="hr-zone-config">
              <div className="zone-input-group">
                <label htmlFor="userAge">Your Age:</label>
                <input 
                  type="number" 
                  id="userAge" 
                  min="18" 
                  max="100" 
                  value={state.hrConfig.age}
                  onChange={handleAgeChange}
                />
              </div>
              <div className="zone-input-group">
                <label htmlFor="restingHR">Resting HR (optional):</label>
                <input 
                  type="number" 
                  id="restingHR" 
                  min="40" 
                  max="100" 
                  value={state.hrConfig.restingHR}
                  onChange={handleRestingHRChange}
                  placeholder="60"
                />
              </div>
            </div>
            
            <div className="hr-zone-display">
              <h4>Select Target Zone:</h4>
              <ZoneSelector />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;