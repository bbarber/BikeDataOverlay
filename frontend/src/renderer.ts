import { CyclingMetrics, ScanResult, ConnectionResult, ConnectionStatus } from './types/CyclingMetrics';
import { ipcRenderer } from 'electron';


let updateInterval: NodeJS.Timeout | null = null;
let devicePanelVisible = false;
let isScanning = false;

// Timer variables
let timerInterval: NodeJS.Timeout | null = null;
let timerStartTime: number | null = null;
let timerElapsedTime = 0;
let isTimerRunning = false;

// HR Zone variables
let hrZonePanelVisible = false;
let hrConfig = {
  age: 30,
  restingHR: 60,
  targetZone: 2
};
let hrZones: any = {};

// Listen for metrics updates from main process
ipcRenderer.on('metrics-update', (event: any, metrics: CyclingMetrics) => {
  updateMetricsDisplay(metrics);
});

// Listen for connection status changes from main process
ipcRenderer.on('connection-status-changed', (event: any, status: { isConnected: boolean; deviceName: string | null }) => {
  console.log('Connection status changed:', status);
});

function updateMetricsDisplay(metrics: CyclingMetrics): void {
  const wattsElement = document.getElementById('watts');
  const heartRateElement = document.getElementById('heartRate');
  
  if (wattsElement) {
    wattsElement.textContent = Math.round(metrics.watts).toString();
  }
  
  if (heartRateElement) {
    updateHeartRateDisplay(metrics.heartRate || 0);
  }
}

async function fetchMetrics(): Promise<void> {
  try {
    const metrics: CyclingMetrics = await ipcRenderer.invoke('get-current-metrics');
    updateMetricsDisplay(metrics);
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    const wattsElement = document.getElementById('watts');
    const heartRateElement = document.getElementById('heartRate');
    if (wattsElement) wattsElement.textContent = '--';
    if (heartRateElement) heartRateElement.textContent = '--';
  }
}

function startMetricsUpdates(): void {
  stopMetricsUpdates();
  
  fetchMetrics();
  updateInterval = setInterval(fetchMetrics, 1000);
  console.log('Started metrics polling');
}

function stopMetricsUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    console.log('Stopped metrics polling');
  }
}

async function scanForDevices(): Promise<void> {
  if (isScanning) return;
  
  isScanning = true;
  const statusEl = document.querySelector('.status-text') as HTMLElement;
  const scanBtn = document.getElementById('scanDevicesBtn') as HTMLButtonElement;
  
  try {
    if (statusEl) statusEl.textContent = 'Scanning for Bluetooth devices...';
    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.textContent = 'Scanning...';
    }
    
    const result: ScanResult = await ipcRenderer.invoke('scan-for-devices', 15);
    
    if (statusEl) {
      statusEl.textContent = result.message;
    }
    displayDevices(result.devices);
    
  } catch (error) {
    console.error('Failed to scan for devices:', error);
    if (statusEl) {
      statusEl.textContent = `Scan error: ${error}`;
    }
    displayDevices([]);
  } finally {
    isScanning = false;
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Scan for Devices';
    }
  }
}

async function loadDeviceList(): Promise<void> {
  const statusEl = document.querySelector('.status-text') as HTMLElement;
  
  try {
    if (statusEl) statusEl.textContent = 'Loading device list...';
    
    const result: ScanResult = await ipcRenderer.invoke('list-devices');
    
    if (statusEl) {
      statusEl.textContent = result.message;
    }
    displayDevices(result.devices);
    
  } catch (error) {
    console.error('Failed to load device list:', error);
    if (statusEl) {
      statusEl.textContent = 'Backend not available - click "Scan for Devices" when ready';
    }
    displayDevices([]);
  }
}

function displayDevices(devices: any[]): void {
  const deviceList = document.getElementById('deviceList');
  if (!deviceList) return;
  
  if (!devices || devices.length === 0) {
    deviceList.innerHTML = '<div class="no-devices">No fitness devices found. Click "Scan for Devices" to search for equipment.</div>';
    return;
  }
  
  deviceList.innerHTML = devices.map(device => {
    const isConnected = device.isConnected;
    const canConnect = !isConnected;
    const statusClass = isConnected ? 'connected' : 'available';
    const connectBtnText = isConnected ? 'Connected' : 'Connect';
    const connectBtnDisabled = isConnected || !canConnect;
    
    const deviceName = device.name;
    const deviceType = 'Fitness Device';
    const deviceStatus = isConnected ? 'Connected' : 'Available';
    const deviceId = device.id;
    const deviceInfo = device.deviceInfo || {};
    
    return `
      <div class="device-item">
        <div class="device-name">${deviceName}</div>
        <div class="device-info">
          <span class="device-type">${deviceType}</span>
          <span class="device-status-badge ${statusClass}">${deviceStatus}</span>
        </div>
        <div class="device-details">
          ${deviceInfo.manufacturerName || 'Unknown'} ${deviceInfo.modelNumber || 'Unknown'} (${deviceInfo.machineType || 'Unknown'})
        </div>
        <div class="device-actions">
          <button class="btn-connect" ${connectBtnDisabled ? 'disabled' : ''} 
                  onclick="connectToDevice('${deviceId}')">
            ${connectBtnText}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function connectToDevice(deviceId: string): Promise<void> {
  const statusEl = document.querySelector('.status-text') as HTMLElement;
  
  try {
    if (statusEl) statusEl.textContent = 'Connecting to device...';
    
    const result: ConnectionResult = await ipcRenderer.invoke('connect-to-device', deviceId);
    
    if (result.success) {
      const deviceCount = result.connectedDevices || 1;
      if (statusEl) statusEl.textContent = `Connected! Total devices: ${deviceCount}`;
      loadDeviceList();
      startMetricsUpdates();
    } else {
      if (statusEl) statusEl.textContent = `Connection failed: ${result.message}`;
    }
    
  } catch (error) {
    console.error('Failed to connect to device:', error);
    if (statusEl) statusEl.textContent = `Connection error: ${error}`;
  }
}

// Timer functions
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay(): void {
  const totalTime = timerElapsedTime + (isTimerRunning ? Date.now() - (timerStartTime || 0) : 0);
  const totalTimeElement = document.getElementById('totalTime');
  if (totalTimeElement) {
    totalTimeElement.textContent = formatTime(totalTime);
  }
  updateTimerButtonVisibility();
}

function updateTimerButtonVisibility(): void {
  const startBtn = document.getElementById('startTimer');
  const stopBtn = document.getElementById('stopTimer');
  const resetBtn = document.getElementById('resetTimer');
  
  if (isTimerRunning) {
    startBtn?.classList.add('hidden');
    stopBtn?.classList.remove('hidden');
    resetBtn?.classList.remove('hidden');
  } else if (timerElapsedTime > 0) {
    startBtn?.classList.remove('hidden');
    stopBtn?.classList.add('hidden');
    resetBtn?.classList.remove('hidden');
  } else {
    startBtn?.classList.remove('hidden');
    stopBtn?.classList.add('hidden');
    resetBtn?.classList.remove('hidden');
  }
}

function startTimer(): void {
  if (!isTimerRunning) {
    isTimerRunning = true;
    timerStartTime = Date.now() - 1000;
    timerInterval = setInterval(updateTimerDisplay, 100);
    
    const totalTime = timerElapsedTime + (Date.now() - (timerStartTime || 0));
    const totalTimeElement = document.getElementById('totalTime');
    if (totalTimeElement) {
      totalTimeElement.textContent = formatTime(totalTime);
    }
    updateTimerButtonVisibility();
    
    console.log('Timer started');
  }
}

function stopTimer(): void {
  if (isTimerRunning) {
    isTimerRunning = false;
    timerElapsedTime += Date.now() - (timerStartTime || 0);
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    updateTimerDisplay();
    console.log('Timer stopped');
  }
}

function resetTimer(): void {
  isTimerRunning = false;
  timerElapsedTime = 0;
  timerStartTime = null;
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  updateTimerDisplay();
  console.log('Timer reset');
}

// HR Zone functions
function calculateHrZones(age: number, restingHR: number = 60): any {
  const maxHR = Math.round(208 - 0.7 * age);
  const hrReserve = maxHR - restingHR;
  
  return {
    zone1: {
      min: Math.round(restingHR + hrReserve * 0.50),
      max: Math.round(restingHR + hrReserve * 0.60),
      name: 'Recovery',
      desc: 'Active recovery, very light'
    },
    zone2: {
      min: Math.round(restingHR + hrReserve * 0.60),
      max: Math.round(restingHR + hrReserve * 0.70),
      name: 'Aerobic',
      desc: 'Fat burning, endurance'
    },
    zone3: {
      min: Math.round(restingHR + hrReserve * 0.70),
      max: Math.round(restingHR + hrReserve * 0.80),
      name: 'Moderate',
      desc: 'Aerobic fitness'
    },
    zone4: {
      min: Math.round(restingHR + hrReserve * 0.80),
      max: Math.round(restingHR + hrReserve * 0.90),
      name: 'Hard',
      desc: 'Lactate threshold'
    },
    zone5: {
      min: Math.round(restingHR + hrReserve * 0.90),
      max: maxHR,
      name: 'Maximal',
      desc: 'VO2 max, very hard'
    }
  };
}

function loadHrConfig(): void {
  const saved = localStorage.getItem('bikeDataHrConfig');
  if (saved) {
    hrConfig = { ...hrConfig, ...JSON.parse(saved) };
  }
  updateHrZones();
  updateHrInputs();
  updateTargetZoneSelection();
}

function saveHrConfig(): void {
  localStorage.setItem('bikeDataHrConfig', JSON.stringify(hrConfig));
  console.log('HR config saved:', hrConfig);
}

function updateHrZones(): void {
  hrZones = calculateHrZones(hrConfig.age, hrConfig.restingHR);
  updateHrZoneDisplay();
}

function updateHrInputs(): void {
  const ageInput = document.getElementById('userAge') as HTMLInputElement;
  const restingHRInput = document.getElementById('restingHR') as HTMLInputElement;
  if (ageInput) ageInput.value = hrConfig.age.toString();
  if (restingHRInput) restingHRInput.value = hrConfig.restingHR.toString();
}

function updateTargetZoneSelection(): void {
  const radio = document.querySelector(`input[name="targetZone"][value="${hrConfig.targetZone}"]`) as HTMLInputElement;
  if (radio) radio.checked = true;
}

function updateHrZoneDisplay(): void {
  for (let i = 1; i <= 5; i++) {
    const zone = hrZones[`zone${i}`];
    const rangeElement = document.getElementById(`zone${i}Range`);
    if (rangeElement && zone) {
      rangeElement.textContent = `${zone.min}-${zone.max} BPM`;
    }
  }
}

function getHrZone(heartRate: number): { zone: number; name: string; inTarget: boolean } {
  for (let i = 1; i <= 5; i++) {
    const zone = hrZones[`zone${i}`];
    if (heartRate >= zone.min && heartRate <= zone.max) {
      return { 
        zone: i, 
        name: zone.name, 
        inTarget: i === hrConfig.targetZone 
      };
    }
  }
  
  if (heartRate < hrZones.zone1.min) {
    return { zone: 1, name: hrZones.zone1.name, inTarget: hrConfig.targetZone === 1 };
  }
  
  return { zone: 5, name: hrZones.zone5.name, inTarget: hrConfig.targetZone === 5 };
}

function updateHeartRateDisplay(heartRate: number): void {
  const hrElement = document.getElementById('heartRate');
  const zoneElement = document.getElementById('hrZoneLabel');
  
  if (heartRate > 0) {
    if (hrElement) hrElement.textContent = Math.round(heartRate).toString();
    
    const zone = getHrZone(heartRate);
    if (zoneElement) zoneElement.textContent = `Zone ${zone.zone} (${zone.name})`;
    
    hrElement?.classList.remove('hr-in-zone', 'hr-out-of-zone');
    if (zone.inTarget) {
      hrElement?.classList.add('hr-in-zone');
    } else {
      hrElement?.classList.add('hr-out-of-zone');
    }
  } else {
    if (hrElement) hrElement.textContent = '--';
    if (zoneElement) zoneElement.textContent = 'Zone 1';
    hrElement?.classList.remove('hr-in-zone', 'hr-out-of-zone');
  }
}

function closeHrZonePanel(): void {
  const hrZonePanel = document.getElementById('hrZonePanel');
  hrZonePanelVisible = false;
  hrZonePanel?.classList.remove('visible');
}

function closeDevicePanel(): void {
  const devicePanel = document.getElementById('devicePanel');
  devicePanelVisible = false;
  devicePanel?.classList.remove('visible');
}

function toggleHrZonePanel(): void {
  const hrZonePanel = document.getElementById('hrZonePanel');
  hrZonePanelVisible = !hrZonePanelVisible;
  
  if (hrZonePanelVisible) {
    if (devicePanelVisible) {
      closeDevicePanel();
    }
    hrZonePanel?.classList.add('visible');
    updateHrInputs();
    updateHrZoneDisplay();
  } else {
    hrZonePanel?.classList.remove('visible');
  }
}

function toggleDevicePanel(): void {
  const devicePanel = document.getElementById('devicePanel');
  devicePanelVisible = !devicePanelVisible;
  
  console.log('Toggling device panel, visible:', devicePanelVisible);
  
  if (devicePanelVisible) {
    if (hrZonePanelVisible) {
      closeHrZonePanel();
    }
    devicePanel?.classList.add('visible');
    console.log('Device panel should now be visible');
    loadDeviceList().catch(error => {
      console.warn('Failed to load device list, but panel remains visible:', error);
    });
  } else {
    devicePanel?.classList.remove('visible');
    console.log('Device panel hidden');
  }
}

// Make functions available globally for onclick handlers
(window as any).startTimer = startTimer;
(window as any).stopTimer = stopTimer;
(window as any).resetTimer = resetTimer;
(window as any).connectToDevice = connectToDevice;

window.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleDevicePanel');
  const devicePanel = document.getElementById('devicePanel');
  
  toggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle button clicked');
    toggleDevicePanel();
  });
  
  // Enable mouse events for interactive elements
  const enableMouseEvents = () => {
    ipcRenderer.send('set-ignore-mouse-events', false);
  };
  
  const disableMouseEvents = () => {
    ipcRenderer.send('set-ignore-mouse-events', true);
  };
  
  toggleBtn?.addEventListener('mouseenter', enableMouseEvents);
  devicePanel?.addEventListener('mouseenter', enableMouseEvents);
  
  const timerContainer = document.querySelector('.time-container');
  timerContainer?.addEventListener('mouseenter', enableMouseEvents);
  
  document.getElementById('scanDevicesBtn')?.addEventListener('click', scanForDevices);
  document.getElementById('refreshDevicesBtn')?.addEventListener('click', loadDeviceList);
  
  // HR Zone panel event listeners
  const hrZoneToggleBtn = document.getElementById('toggleHrZonePanel');
  const hrZonePanel = document.getElementById('hrZonePanel');
  
  hrZoneToggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleHrZonePanel();
  });
  
  hrZoneToggleBtn?.addEventListener('mouseenter', enableMouseEvents);
  hrZonePanel?.addEventListener('mouseenter', enableMouseEvents);
  
  // HR Zone configuration buttons
  document.getElementById('calculateZones')?.addEventListener('click', () => {
    const ageInput = document.getElementById('userAge') as HTMLInputElement;
    const restingHRInput = document.getElementById('restingHR') as HTMLInputElement;
    
    hrConfig.age = parseInt(ageInput.value);
    hrConfig.restingHR = parseInt(restingHRInput.value);
    
    const selectedZone = document.querySelector('input[name="targetZone"]:checked') as HTMLInputElement;
    if (selectedZone) {
      hrConfig.targetZone = parseInt(selectedZone.value);
    }
    
    updateHrZones();
    saveHrConfig();
  });
  
  // Add event listeners for zone selection
  document.querySelectorAll('input[name="targetZone"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        hrConfig.targetZone = parseInt(target.value);
        saveHrConfig();
      }
    });
  });
  
  // Auto-update zones when age or resting HR changes
  const ageInput = document.getElementById('userAge') as HTMLInputElement;
  ageInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const age = parseInt(target.value);
    if (age && age >= 18 && age <= 100) {
      hrConfig.age = age;
      updateHrZones();
      saveHrConfig();
    }
  });
  
  const restingHRInput = document.getElementById('restingHR') as HTMLInputElement;
  restingHRInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const restingHR = parseInt(target.value);
    if (restingHR && restingHR >= 40 && restingHR <= 100) {
      hrConfig.restingHR = restingHR;
      updateHrZones();
      saveHrConfig();
    }
  });
  
  // Initialize displays
  updateTimerDisplay();
  loadHrConfig();
  
});

window.addEventListener('beforeunload', stopMetricsUpdates);