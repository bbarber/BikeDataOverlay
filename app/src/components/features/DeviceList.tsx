import React from 'react';
import { useDeviceManager } from '../../hooks/useDeviceManager';
import Button from '../ui/Button';
import { BluetoothDevice } from '../../types/CyclingMetrics';

const DeviceList: React.FC = () => {
  const { devices, connectToDevice } = useDeviceManager();

  if (devices.deviceList.length === 0) {
    return (
      <div className="device-list">
        <div className="no-devices">
          No devices found. Click "Scan for Devices" to search for fitness equipment.
        </div>
      </div>
    );
  }

  return (
    <div className="device-list">
      {devices.deviceList.map((device: BluetoothDevice, index: number) => (
        <div key={device.id || index} className="device-item">
          <div className="device-info">
            <div className="device-name">{device.name || 'Unknown Device'}</div>
            <div className="device-id">{device.id}</div>
            {device.rssi && (
              <div className="device-rssi">Signal: {device.rssi} dBm</div>
            )}
          </div>
          <Button 
            className="btn-primary"
            onClick={() => connectToDevice(device.id)}
          >
            Connect
          </Button>
        </div>
      ))}
    </div>
  );
};

export default DeviceList;