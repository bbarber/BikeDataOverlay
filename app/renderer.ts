import {
  DeviceInfo,
  BluetoothData,
  CurrentMetrics,
  HeartRateZone,
  HeartRateConfig,
  TimerState,
  DevicePanelState,
  MouseEventMessage
} from './types';

// Global state
let currentMetrics: CurrentMetrics = {
  watts: 0,
  heartRate: 0,
  cadence: 0,
  speed: 0
};

let devicePanelVisible = false;
// isScanning is now part of devicePanelState
let devicePanelState: DevicePanelState = {
  visible: false,
  isScanning: false,
  devices: []
};

// Timer variables
let timerInterval: NodeJS.Timeout | null = null;
let timerState: TimerState = {
  isRunning: false,
  startTime: null,
  elapsedTime: 0,
  totalTime: 0
};

// HR Zone variables
let hrZonePanelVisible = false;
let hrConfig: HeartRateConfig = {
  age: 30,
  restingHR: 60,
  targetZone: 2
};
let hrZones: HeartRateZone[] = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Note: lucide icons are loaded via CDN in HTML
  // They will be available globally
  
  // Initialize Bluetooth service
  initializeBluetooth();
  
  // Initialize UI event listeners
  initializeEventListeners();
  
  // Initialize HR zones
  initializeHRZones();
  
  // Set up message listener for mouse events
  window.addEventListener('message', handleWindowMessage);
});

// Initialize Bluetooth service
function initializeBluetooth(): void {
  try {
    // Check if we're in Electron context
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      console.log('Initializing IPC BLE');
      
      // Listen for devices and data
      ipcRenderer.on('ble:device', (_e: unknown, device: DeviceInfo) => {
        appendOrUpdateDevice(device);
      });
      
      ipcRenderer.on('ble:scan-started', () => {
        setStatus('Scanning for Bluetooth devices...');
        devicePanelState.isScanning = true;
        updateScanButton();
      });
      
      ipcRenderer.on('ble:scan-stopped', (_e: unknown, devices: DeviceInfo[]) => {
        setStatus(`Found ${devices.length} device(s)`);
        devicePanelState.isScanning = false;
        devicePanelState.devices = devices;
        displayDevices(devices);
        updateScanButton();
      });
      
      ipcRenderer.on('ble:connected', (_e: unknown, device: DeviceInfo) => {
        handleDeviceConnected(device);
      });
      
      ipcRenderer.on('ble:disconnected', (_e: unknown, device: DeviceInfo) => {
        handleDeviceDisconnected(device);
      });
      
      ipcRenderer.on('ble:data', (_e: unknown, payload: BluetoothData) => {
        handleBluetoothData(payload);
      });
      
      console.log('IPC BLE initialized');
    } else {
      console.warn('Electron IPC not available, falling back to Web Bluetooth');
    }
  } catch (error) {
    console.error('Failed to initialize Bluetooth service:', error);
  }
}

// Handle Bluetooth data received
function handleBluetoothData(data: BluetoothData): void {
  console.log('Bluetooth data received:', data);
  
  switch (data.type) {
    case 'power':
      currentMetrics.watts = data.value;
      updatePowerDisplay(data.value);
      break;
    case 'heartRate':
      currentMetrics.heartRate = data.value;
      updateHeartRateDisplay(data.value);
      updateHRZoneDisplay(data.value);
      break;
    case 'cadence':
      currentMetrics.cadence = data.value;
      // TODO: Add cadence display
      break;
    case 'speed':
      currentMetrics.speed = data.value;
      // TODO: Add speed display
      break;
  }
}

// Handle device connection
function handleDeviceConnected(device: DeviceInfo): void {
  console.log('Device connected:', device);
  setStatus(`Connected to ${device.name}`);
  
  // Update device list
  const deviceIndex = devicePanelState.devices.findIndex(d => d.id === device.id);
  if (deviceIndex !== -1) {
    devicePanelState.devices[deviceIndex].isConnected = true;
    devicePanelState.devices[deviceIndex].status = 'Connected';
    displayDevices(devicePanelState.devices);
  }
}

// Handle device disconnection
function handleDeviceDisconnected(device: DeviceInfo): void {
  console.log('Device disconnected:', device);
  setStatus(`Disconnected from ${device.name}`);
  
  // Update device list
  const deviceIndex = devicePanelState.devices.findIndex(d => d.id === device.id);
  if (deviceIndex !== -1) {
    devicePanelState.devices[deviceIndex].isConnected = false;
    devicePanelState.devices[deviceIndex].status = 'Disconnected';
    displayDevices(devicePanelState.devices);
  }
}

// Initialize event listeners
function initializeEventListeners(): void {
  // Device panel toggle
  const toggleDevicePanel = document.getElementById('toggleDevicePanel');
  if (toggleDevicePanel) {
    toggleDevicePanel.addEventListener('click', toggleDevicePanelVisibility);
  }
  
  // HR zone panel toggle
  const toggleHrZonePanel = document.getElementById('toggleHrZonePanel');
  if (toggleHrZonePanel) {
    toggleHrZonePanel.addEventListener('click', toggleHRZonePanelVisibility);
  }
  
  // Scan devices button
  const scanDevicesBtn = document.getElementById('scanDevicesBtn');
  if (scanDevicesBtn) {
    scanDevicesBtn.addEventListener('click', startDeviceScan);
  }
  
  // Refresh devices button
  const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
  if (refreshDevicesBtn) {
    refreshDevicesBtn.addEventListener('click', refreshDevices);
  }
  
  // HR zone configuration inputs
  const userAgeInput = document.getElementById('userAge') as HTMLInputElement;
  if (userAgeInput) {
    userAgeInput.addEventListener('change', updateHRZones);
  }
  
  const restingHRInput = document.getElementById('restingHR') as HTMLInputElement;
  if (restingHRInput) {
    restingHRInput.addEventListener('change', updateHRZones);
  }
  
  // Zone selection
  const zoneOptions = document.querySelectorAll('.zone-option');
  zoneOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const zone = parseInt(target.getAttribute('data-zone') || '2');
      selectTargetZone(zone);
    });
  });
}

// Handle window messages (for mouse events)
function handleWindowMessage(event: MessageEvent): void {
  if (event.data && event.data.type === 'set-ignore-mouse-events') {
    const message = event.data as MouseEventMessage;
    // This will be handled by the main process via postMessage
    console.log('Mouse event message:', message);
  }
}

// Device panel functions
function toggleDevicePanelVisibility(): void {
  devicePanelVisible = !devicePanelVisible;
  const devicePanel = document.getElementById('devicePanel');
  if (devicePanel) {
    devicePanel.style.display = devicePanelVisible ? 'block' : 'none';
  }
  devicePanelState.visible = devicePanelVisible;
}

function toggleHRZonePanelVisibility(): void {
  hrZonePanelVisible = !hrZonePanelVisible;
  const hrZonePanel = document.getElementById('hrZonePanel');
  if (hrZonePanel) {
    hrZonePanel.style.display = hrZonePanelVisible ? 'block' : 'none';
  }
}

async function startDeviceScan(): Promise<void> {
  try {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('ble:startScan');
    }
  } catch (error) {
    console.error('Failed to start scan:', error);
    setStatus('Failed to start scan');
  }
}

async function refreshDevices(): Promise<void> {
  try {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      const devices = await ipcRenderer.invoke('ble:getDevices');
      devicePanelState.devices = devices;
      displayDevices(devices);
      setStatus(`Found ${devices.length} device(s)`);
    }
  } catch (error) {
    console.error('Failed to refresh devices:', error);
    setStatus('Failed to refresh devices');
  }
}

function appendOrUpdateDevice(device: DeviceInfo): void {
  const existingIndex = devicePanelState.devices.findIndex(d => d.id === device.id);
  if (existingIndex !== -1) {
    devicePanelState.devices[existingIndex] = device;
  } else {
    devicePanelState.devices.push(device);
  }
  displayDevices(devicePanelState.devices);
}

function displayDevices(devices: DeviceInfo[]): void {
  const deviceList = document.getElementById('deviceList');
  if (!deviceList) return;
  
  if (devices.length === 0) {
    deviceList.innerHTML = '<div class="no-devices">No devices found. Click "Scan for Devices" to search for fitness equipment.</div>';
    return;
  }
  
  deviceList.innerHTML = devices.map(device => `
    <div class="device-item ${device.isConnected ? 'connected' : ''}">
      <div class="device-info">
        <div class="device-name">${device.name}</div>
        <div class="device-type">${device.type}</div>
        <div class="device-status">${device.status}</div>
      </div>
      <div class="device-actions">
        ${device.isConnected ? 
          `<button class="btn-disconnect" onclick="disconnectDevice('${device.id}')">Disconnect</button>` :
          `<button class="btn-connect" onclick="connectDevice('${device.id}')">Connect</button>`
        }
      </div>
    </div>
  `).join('');
}

async function connectDevice(deviceId: string): Promise<void> {
  try {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('ble:connect', deviceId);
    }
  } catch (error) {
    console.error('Failed to connect to device:', error);
    setStatus('Failed to connect to device');
  }
}

async function disconnectDevice(_deviceId: string): Promise<void> {
  try {
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('ble:disconnect');
    }
  } catch (error) {
    console.error('Failed to disconnect device:', error);
    setStatus('Failed to disconnect device');
  }
}

// HR Zone functions
function initializeHRZones(): void {
  updateHRZones();
}

function updateHRZones(): void {
  const userAgeInput = document.getElementById('userAge') as HTMLInputElement;
  const restingHRInput = document.getElementById('restingHR') as HTMLInputElement;
  
  if (userAgeInput && restingHRInput) {
    hrConfig.age = parseInt(userAgeInput.value) || 30;
    hrConfig.restingHR = parseInt(restingHRInput.value) || 60;
    
    // Calculate HR zones using Karvonen formula
    const maxHR = 220 - hrConfig.age;
    const hrReserve = maxHR - hrConfig.restingHR;
    
    hrZones = [
      {
        zone: 1,
        name: 'Recovery',
        minHR: Math.round(hrConfig.restingHR + hrReserve * 0.5),
        maxHR: Math.round(hrConfig.restingHR + hrReserve * 0.6),
        description: 'Active recovery, very light',
        color: '#4CAF50'
      },
      {
        zone: 2,
        name: 'Aerobic',
        minHR: Math.round(hrConfig.restingHR + hrReserve * 0.6),
        maxHR: Math.round(hrConfig.restingHR + hrReserve * 0.7),
        description: 'Fat burning, endurance',
        color: '#8BC34A'
      },
      {
        zone: 3,
        name: 'Moderate',
        minHR: Math.round(hrConfig.restingHR + hrReserve * 0.7),
        maxHR: Math.round(hrConfig.restingHR + hrReserve * 0.8),
        description: 'Aerobic fitness',
        color: '#FFC107'
      },
      {
        zone: 4,
        name: 'Hard',
        minHR: Math.round(hrConfig.restingHR + hrReserve * 0.8),
        maxHR: Math.round(hrConfig.restingHR + hrReserve * 0.9),
        description: 'Lactate threshold',
        color: '#FF9800'
      },
      {
        zone: 5,
        name: 'Maximal',
        minHR: Math.round(hrConfig.restingHR + hrReserve * 0.9),
        maxHR: Math.round(hrConfig.restingHR + hrReserve * 1.0),
        description: 'VO2 max, very hard',
        color: '#F44336'
      }
    ];
    
    // Update zone display
    updateZoneDisplay();
  }
}

function updateZoneDisplay(): void {
  hrZones.forEach(zone => {
    const zoneElement = document.getElementById(`zone${zone.zone}Range`);
    if (zoneElement) {
      zoneElement.textContent = `${zone.minHR}-${zone.maxHR} BPM`;
    }
  });
}

function selectTargetZone(zone: number): void {
  hrConfig.targetZone = zone;
  
  // Update radio button
  const radioButton = document.getElementById(`zone${zone}`) as HTMLInputElement;
  if (radioButton) {
    radioButton.checked = true;
  }
  
  // Update zone labels
  updateHRZoneLabels();
}

function updateHRZoneLabels(): void {
  const hrZoneLabel = document.getElementById('hrZoneLabel');
  if (hrZoneLabel) {
    const currentZone = hrZones.find(z => z.zone === hrConfig.targetZone);
    if (currentZone) {
      hrZoneLabel.textContent = `Zone ${currentZone.zone}`;
      hrZoneLabel.style.color = currentZone.color;
    }
  }
}

function updateHRZoneDisplay(heartRate: number): void {
  const zone = hrZones.find(z => heartRate >= z.minHR && heartRate <= z.maxHR);
  if (zone) {
    const hrZoneLabel = document.getElementById('hrZoneLabel');
    if (hrZoneLabel) {
      hrZoneLabel.textContent = `Zone ${zone.zone}`;
      hrZoneLabel.style.color = zone.color;
    }
  }
}

// Timer functions
function startTimer(): void {
  if (!timerState.isRunning) {
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    
    timerInterval = setInterval(() => {
      if (timerState.startTime) {
        timerState.elapsedTime = Date.now() - timerState.startTime;
        updateTimerDisplay();
      }
    }, 1000);
    
    updateTimerButtons();
  }
}

function stopTimer(): void {
  if (timerState.isRunning) {
    timerState.isRunning = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateTimerButtons();
  }
}

function resetTimer(): void {
  stopTimer();
  timerState.elapsedTime = 0;
  timerState.totalTime = 0;
  updateTimerDisplay();
  updateTimerButtons();
}

function updateTimerDisplay(): void {
  const totalTimeElement = document.getElementById('totalTime');
  if (totalTimeElement) {
    const totalSeconds = Math.floor(timerState.elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    totalTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function updateTimerButtons(): void {
  const startBtn = document.getElementById('startTimer');
  const stopBtn = document.getElementById('stopTimer');
  
  if (startBtn && stopBtn) {
    if (timerState.isRunning) {
      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
    } else {
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
    }
  }
}

// Display update functions
function updatePowerDisplay(watts: number): void {
  const wattsElement = document.getElementById('watts');
  if (wattsElement) {
    wattsElement.textContent = watts.toString();
  }
}

function updateHeartRateDisplay(heartRate: number): void {
  const heartRateElement = document.getElementById('heartRate');
  if (heartRateElement) {
    heartRateElement.textContent = heartRate.toString();
  }
}

function updateScanButton(): void {
  const scanBtn = document.getElementById('scanDevicesBtn');
  if (scanBtn) {
    if (devicePanelState.isScanning) {
      scanBtn.textContent = 'Scanning...';
      scanBtn.setAttribute('disabled', 'true');
    } else {
      scanBtn.textContent = 'Scan for Devices';
      scanBtn.removeAttribute('disabled');
    }
  }
}

// Utility functions
function setStatus(message: string): void {
  const statusElement = document.getElementById('deviceStatus');
  if (statusElement) {
    const statusText = statusElement.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = message;
    }
  }
}

// Make functions globally available for HTML onclick handlers
(window as any).startTimer = startTimer;
(window as any).stopTimer = stopTimer;
(window as any).resetTimer = resetTimer;
(window as any).connectDevice = connectDevice;
(window as any).disconnectDevice = disconnectDevice;
