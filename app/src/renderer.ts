/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 */

import './index.css';
import { CyclingMetrics, ScanResult, ConnectionResult } from './types/CyclingMetrics';

let updateInterval: NodeJS.Timeout | null = null;
let devicePanelVisible = false;
let isScanning = false;
let showAllDevices = false;
let testMode = false;

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

// HR Zone Analytics variables
let analyticsVisible = false;
let currentHrZone = 1;
let lastZoneUpdateTime = 0;
let zoneTrackingStartTime: number | null = null;
let zoneTimes = {
  zone1: 0,
  zone2: 0,
  zone3: 0,
  zone4: 0,
  zone5: 0
};
let zoneTrackingInterval: NodeJS.Timeout | null = null;

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

// Wait for the DOM to be loaded and the API to be available
document.addEventListener('DOMContentLoaded', () => {
  if (!window.electronAPI) {
    console.error('Electron API not available');
    return;
  }

  // Listen for metrics updates from main process
  window.electronAPI.onMetricsUpdate((metrics: CyclingMetrics) => {
    updateMetricsDisplay(metrics);
  });

  // Listen for connection status changes from main process
  window.electronAPI.onConnectionStatusChanged((status: { isConnected: boolean; deviceName: string | null }) => {
    console.log('Connection status changed:', status);
  });

  // Initialize the app
  initializeApp();
});

function initializeApp(): void {
  // Start metrics updates
  startMetricsUpdates();
  
  // Initialize displays
  updateTimerDisplay();
  loadHrConfig();
  loadShowAllDevicesState();
  loadTestModeState();
  
  // Set up event listeners
  setupEventListeners();
}

function setupEventListeners(): void {
  // Device panel toggle
  const toggleBtn = document.getElementById('toggleDevicePanel');
  toggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle button clicked');
    toggleDevicePanel();
  });
  
  // Device management buttons
  document.getElementById('scanDevicesBtn')?.addEventListener('click', scanForDevices);
  document.getElementById('refreshDevicesBtn')?.addEventListener('click', loadDeviceList);
  
  // Device filter toggle
  const showAllToggle = document.getElementById('showAllDevicesToggle') as HTMLInputElement;
  showAllToggle?.addEventListener('change', handleShowAllDevicesToggle);
  
  // Test mode toggle
  const testModeToggle = document.getElementById('testModeToggle') as HTMLInputElement;
  testModeToggle?.addEventListener('change', handleTestModeToggle);
  
  // HR Zone panel event listeners
  const hrZoneToggleBtn = document.getElementById('toggleHrZonePanel');
  hrZoneToggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleHrZonePanel();
  });
  
  // HR Zone configuration buttons
  document.getElementById('calculateZones')?.addEventListener('click', () => {
    const ageInput = document.getElementById('userAge');
    const restingHRInput = document.getElementById('restingHR');
    
    if (ageInput && 'value' in ageInput) {
      hrConfig.age = parseInt((ageInput as HTMLInputElement).value);
    }
    if (restingHRInput && 'value' in restingHRInput) {
      hrConfig.restingHR = parseInt((restingHRInput as HTMLInputElement).value);
    }
    
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
  
  // Timer control event listeners
  document.getElementById('startTimer')?.addEventListener('click', startTimer);
  document.getElementById('stopTimer')?.addEventListener('click', stopTimer);
  document.getElementById('resetTimer')?.addEventListener('click', resetTimer);
  
  // Analytics panel event listeners
  document.getElementById('toggleAnalyticsPanel')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleAnalyticsPanel();
  });
  
  document.getElementById('closeAnalyticsPanel')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAnalyticsPanel();
  });
}

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
    const metrics: CyclingMetrics = await window.electronAPI.getCurrentMetrics();
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
  const statusEl = document.querySelector('.status-text');
  const scanBtn = document.getElementById('scanDevicesBtn');
  
  try {
    if (statusEl) statusEl.textContent = 'Scanning for Bluetooth devices...';
    if (scanBtn && 'disabled' in scanBtn) {
      (scanBtn as HTMLButtonElement).disabled = true;
      scanBtn.textContent = 'Scanning...';
    }
    
    const result: ScanResult = await window.electronAPI.scanForDevices(15);
    
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
    if (scanBtn && 'disabled' in scanBtn) {
      (scanBtn as HTMLButtonElement).disabled = false;
      scanBtn.textContent = 'Scan for Devices';
    }
  }
}

async function loadDeviceList(): Promise<void> {
  const statusEl = document.querySelector('.status-text');
  
  try {
    if (statusEl) statusEl.textContent = 'Loading device list...';
    
    const result: ScanResult = await window.electronAPI.listDevices();
    
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
    const deviceType = showAllDevices ? 'devices' : 'fitness devices';
    deviceList.innerHTML = `<div class="no-devices">No ${deviceType} found. Click "Scan for Devices" to search for equipment.</div>`;
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
  const statusEl = document.querySelector('.status-text');
  
  try {
    if (statusEl) statusEl.textContent = 'Connecting to device...';
    
    const result: ConnectionResult = await window.electronAPI.connectToDevice(deviceId);
    
    if (result.success) {
      const deviceCount = result.connectedDevices || 1;
      if (statusEl) statusEl.textContent = `Connected! Total devices: ${deviceCount}`;
      loadDeviceList();
      startMetricsUpdates();
    } else if (statusEl) {
      statusEl.textContent = `Connection failed: ${result.message}`;
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
  } else {
    startBtn?.classList.remove('hidden');
    stopBtn?.classList.add('hidden');
    resetBtn?.classList.remove('hidden');
  }
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
  const ageInput = document.getElementById('userAge');
  const restingHRInput = document.getElementById('restingHR');
  if (ageInput && 'value' in ageInput) {
    (ageInput as HTMLInputElement).value = hrConfig.age.toString();
  }
  if (restingHRInput && 'value' in restingHRInput) {
    (restingHRInput as HTMLInputElement).value = hrConfig.restingHR.toString();
  }
}

function updateTargetZoneSelection(): void {
  const radio = document.querySelector(`input[name="targetZone"][value="${hrConfig.targetZone}"]`);
  if (radio && 'checked' in radio) {
    (radio as HTMLInputElement).checked = true;
  }
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
    if (analyticsVisible) {
      closeAnalyticsPanel();
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
    if (analyticsVisible) {
      closeAnalyticsPanel();
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

async function loadShowAllDevicesState(): Promise<void> {
  try {
    showAllDevices = await window.electronAPI.getShowAllDevices();
    const toggle = document.getElementById('showAllDevicesToggle') as HTMLInputElement;
    if (toggle) {
      toggle.checked = showAllDevices;
    }
  } catch (error) {
    console.error('Failed to load show all devices state:', error);
  }
}

async function handleShowAllDevicesToggle(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  showAllDevices = target.checked;
  
  try {
    const result = await window.electronAPI.setShowAllDevices(showAllDevices);
    console.log(`Device filter mode changed: ${result ? 'showing all devices' : 'fitness devices only'}`);
    
    // Update the no-devices message if the device list is empty
    const deviceList = document.getElementById('deviceList');
    if (deviceList && deviceList.querySelector('.no-devices')) {
      const deviceType = showAllDevices ? 'devices' : 'fitness devices';
      deviceList.innerHTML = `<div class="no-devices">No ${deviceType} found. Click "Scan for Devices" to search for equipment.</div>`;
    }
  } catch (error) {
    console.error('Failed to set show all devices:', error);
    // Revert the toggle on error
    target.checked = !showAllDevices;
    showAllDevices = !showAllDevices;
  }
}

async function loadTestModeState(): Promise<void> {
  try {
    testMode = await window.electronAPI.getTestMode();
    const toggle = document.getElementById('testModeToggle') as HTMLInputElement;
    if (toggle) {
      toggle.checked = testMode;
    }
  } catch (error) {
    console.error('Failed to load test mode state:', error);
  }
}

async function handleTestModeToggle(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  testMode = target.checked;
  
  try {
    const result = await window.electronAPI.setTestMode(testMode);
    console.log(`Test mode ${result ? 'enabled' : 'disabled'}`);
    
    // Update the status message
    const statusEl = document.querySelector('.status-text');
    if (statusEl) {
      statusEl.textContent = testMode ? 'Test mode enabled - generating mock data' : 'Ready to scan';
    }
    
    // If test mode is enabled, start the metrics updates
    if (testMode) {
      startMetricsUpdates();
    }
  } catch (error) {
    console.error('Failed to set test mode:', error);
    // Revert the toggle on error
    target.checked = !testMode;
    testMode = !testMode;
  }
}

// Make functions available globally for onclick handlers
(window as any).connectToDevice = connectToDevice;

// Zone Analytics Functions
function startZoneTracking(): void {
  if (!zoneTrackingStartTime) {
    zoneTrackingStartTime = Date.now();
    lastZoneUpdateTime = Date.now();
    
    // Start interval to track zone time
    zoneTrackingInterval = setInterval(updateZoneTracking, 1000);
    console.log('Zone tracking started');
  }
}

function stopZoneTracking(): void {
  if (zoneTrackingInterval) {
    // Final update before stopping
    updateZoneTracking();
    clearInterval(zoneTrackingInterval);
    zoneTrackingInterval = null;
    console.log('Zone tracking stopped');
  }
}

function resetZoneTracking(): void {
  stopZoneTracking();
  zoneTrackingStartTime = null;
  lastZoneUpdateTime = 0;
  zoneTimes = {
    zone1: 0,
    zone2: 0,
    zone3: 0,
    zone4: 0,
    zone5: 0
  };
  updateAnalyticsDisplay();
  console.log('Zone tracking reset');
}

function updateZoneTracking(): void {
  if (!zoneTrackingStartTime || !lastZoneUpdateTime) return;
  
  const now = Date.now();
  const timeInCurrentZone = now - lastZoneUpdateTime;
  
  // Add time to current zone
  const zoneKey = `zone${currentHrZone}` as keyof typeof zoneTimes;
  zoneTimes[zoneKey] += timeInCurrentZone;
  
  lastZoneUpdateTime = now;
  
  // Update analytics display if visible
  if (analyticsVisible) {
    updateAnalyticsDisplay();
  }
}

function updateCurrentZone(heartRate: number): void {
  if (heartRate <= 0) return;
  
  const zone = getHrZone(heartRate);
  if (zone.zone !== currentHrZone) {
    // Update zone tracking if tracking is active
    if (zoneTrackingStartTime) {
      updateZoneTracking();
    }
    currentHrZone = zone.zone;
    lastZoneUpdateTime = Date.now();
  }
}

function toggleAnalyticsPanel(): void {
  analyticsVisible = !analyticsVisible;
  const panel = document.getElementById('hrAnalyticsPanel');
  
  if (analyticsVisible) {
    // Close other panels
    if (hrZonePanelVisible) closeHrZonePanel();
    if (devicePanelVisible) closeDevicePanel();
    
    panel?.classList.add('visible');
    updateAnalyticsDisplay();
    updateAnalyticsZoneRanges();
  } else {
    panel?.classList.remove('visible');
  }
}

function closeAnalyticsPanel(): void {
  analyticsVisible = false;
  const panel = document.getElementById('hrAnalyticsPanel');
  panel?.classList.remove('visible');
}

function updateAnalyticsDisplay(): void {
  const totalSessionTime = getTotalSessionTime();
  updateAnalyticsSessionTime(totalSessionTime);
  updateHistogram(totalSessionTime);
  updateEmptyState(totalSessionTime);
}

function getTotalSessionTime(): number {
  if (!zoneTrackingStartTime) return 0;
  
  const baseTime = Object.values(zoneTimes).reduce((total, time) => total + time, 0);
  
  // Add current zone time if tracking is active
  if (zoneTrackingInterval && lastZoneUpdateTime) {
    const currentZoneTime = Date.now() - lastZoneUpdateTime;
    return baseTime + currentZoneTime;
  }
  
  return baseTime;
}

function updateAnalyticsSessionTime(totalTime: number): void {
  const sessionTimeEl = document.getElementById('analyticsSessionTime');
  if (sessionTimeEl) {
    sessionTimeEl.textContent = formatTime(totalTime);
  }
}

function updateHistogram(totalTime: number): void {
  if (totalTime === 0) return;
  
  for (let i = 1; i <= 5; i++) {
    const zoneKey = `zone${i}` as keyof typeof zoneTimes;
    let zoneTime = zoneTimes[zoneKey];
    
    // Add current zone time if this is the active zone
    if (currentHrZone === i && zoneTrackingInterval && lastZoneUpdateTime) {
      zoneTime += Date.now() - lastZoneUpdateTime;
    }
    
    const percentage = (zoneTime / totalTime) * 100;
    const barHeight = Math.max(percentage, 2); // Minimum 2% height for visibility
    
    // Update bar height
    const bar = document.querySelector(`.histogram-bar-container[data-zone="${i}"] .histogram-bar`) as HTMLElement;
    if (bar) {
      bar.style.height = `${barHeight}%`;
    }
    
    // Update percentage display
    const valueEl = document.querySelector(`.histogram-bar-container[data-zone="${i}"] .bar-value`) as HTMLElement;
    if (valueEl) {
      valueEl.textContent = `${Math.round(percentage)}%`;
    }
    
    // Update time display
    const timeEl = document.querySelector(`.histogram-bar-container[data-zone="${i}"] .zone-time`) as HTMLElement;
    if (timeEl) {
      timeEl.textContent = formatTime(zoneTime);
    }
  }
}

function updateAnalyticsZoneRanges(): void {
  for (let i = 1; i <= 5; i++) {
    const zone = hrZones[`zone${i}`];
    const rangeElement = document.getElementById(`analyticsZone${i}Range`);
    if (rangeElement && zone) {
      rangeElement.textContent = `${zone.min}-${zone.max} BPM`;
    }
  }
}

function updateEmptyState(totalTime: number): void {
  const emptyState = document.getElementById('analyticsEmptyState');
  const histogram = document.querySelector('.zone-histogram') as HTMLElement;
  
  if (totalTime === 0) {
    emptyState?.classList.remove('hidden');
    if (histogram) histogram.style.display = 'none';
  } else {
    emptyState?.classList.add('hidden');
    if (histogram) histogram.style.display = 'block';
  }
}

// Enhanced heart rate display to include zone tracking
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
    
    // Update current zone for tracking
    updateCurrentZone(heartRate);
  } else {
    if (hrElement) hrElement.textContent = '--';
    if (zoneElement) zoneElement.textContent = 'Zone 1';
    hrElement?.classList.remove('hr-in-zone', 'hr-out-of-zone');
  }
}

// Enhanced timer functions to integrate with zone tracking
function startTimer(): void {
  if (!isTimerRunning) {
    isTimerRunning = true;
    timerStartTime = Date.now() - 1000;
    timerInterval = setInterval(updateTimerDisplay, 100);
    
    // Start zone tracking
    startZoneTracking();
    
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
    
    // Stop zone tracking
    stopZoneTracking();
    
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
  
  // Reset zone tracking
  resetZoneTracking();
  
  updateTimerDisplay();
  console.log('Timer reset');
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopMetricsUpdates();
  stopZoneTracking();
});