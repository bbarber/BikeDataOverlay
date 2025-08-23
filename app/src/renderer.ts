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
import { Chart, ChartConfiguration, registerables } from 'chart.js';

let updateInterval: NodeJS.Timeout | null = null;
let settingsPanelVisible = false;
let activeTab: string = 'devices';
let isScanning = false;
let showAllDevices = false;
let testMode = false;

// Timer variables
let timerInterval: NodeJS.Timeout | null = null;
let timerStartTime: number | null = null;
let timerElapsedTime = 0;
let isTimerRunning = false;

// HR Zone variables
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
let hasValidHeartRate = false;
let zoneTrackingStartTime: number | null = null;
let zoneTimes = {
  zone1: 0,
  zone2: 0,
  zone3: 0,
  zone4: 0,
  zone5: 0
};
let zoneTrackingInterval: NodeJS.Timeout | null = null;

// HR Chart variables
interface HRDataPoint {
  timestamp: number;
  heartRate: number;
  zone: number;
}
let hrDataPoints: HRDataPoint[] = [];
let hrChart: Chart | null = null;
const MAX_DATA_POINTS = 1000; // Limit to ~16 minutes of data

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

// Register Chart.js components
Chart.register(...registerables);

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
  initializeHrChart();
  
  // Set up event listeners
  setupEventListeners();
  
  // Auto-start timer
  startTimer();
}

function setupEventListeners(): void {
  // Settings panel toggle
  const toggleBtn = document.getElementById('toggleSettingsPanel');
  toggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle button clicked');
    toggleSettingsPanel();
  });
  
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabName = target.dataset.tab;
      if (tabName) {
        switchTab(tabName);
      }
    });
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
  
  
  
  // Add event listeners for zone selection
  document.querySelectorAll('input[name="targetZone"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        hrConfig.targetZone = parseInt(target.value);
        updateHrZones();
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

function closeSettingsPanel(): void {
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanelVisible = false;
  settingsPanel?.classList.remove('visible');
}


function toggleSettingsPanel(): void {
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanelVisible = !settingsPanelVisible;
  
  console.log('Toggling settings panel, visible:', settingsPanelVisible);
  
  if (settingsPanelVisible) {
    if (analyticsVisible) {
      closeAnalyticsPanel();
    }
    settingsPanel?.classList.add('visible');
    console.log('Settings panel should now be visible');
    loadDeviceList().catch(error => {
      console.warn('Failed to load device list, but panel remains visible:', error);
    });
  } else {
    settingsPanel?.classList.remove('visible');
    console.log('Settings panel hidden');
  }
}

function switchTab(tabName: string): void {
  activeTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  if (tabName === 'devices') {
    document.getElementById('devicesTab')?.classList.add('active');
  } else if (tabName === 'hr-zones') {
    document.getElementById('hrZonesTab')?.classList.add('active');
    updateHrInputs();
    updateHrZoneDisplay();
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
  hasValidHeartRate = false;
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
  if (!zoneTrackingStartTime || !lastZoneUpdateTime || !hasValidHeartRate) return;
  
  const now = Date.now();
  const timeInCurrentZone = now - lastZoneUpdateTime;
  
  // Add time to current zone only if we have valid heart rate data
  const zoneKey = `zone${currentHrZone}` as keyof typeof zoneTimes;
  zoneTimes[zoneKey] += timeInCurrentZone;
  
  lastZoneUpdateTime = now;
  
  // Update analytics display if visible
  if (analyticsVisible) {
    updateAnalyticsDisplay();
  }
}

function updateCurrentZone(heartRate: number): void {
  if (heartRate <= 0) {
    hasValidHeartRate = false;
    return;
  }
  
  hasValidHeartRate = true;
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
    // Close settings panel if open
    if (settingsPanelVisible) closeSettingsPanel();
    
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
    const barHeight = Math.max(percentage, 10); // Minimum height for percentage label visibility
    
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
  const hrChartTitles = document.querySelectorAll('.analytics-panel-content h4');
  const hrChartTitle = hrChartTitles[1] as HTMLElement; // Second h4 is "Heart Rate Chart"
  const hrChartSection = document.querySelector('.hr-chart-section') as HTMLElement;
  
  if (totalTime === 0) {
    emptyState?.classList.remove('hidden');
    if (histogram) histogram.style.display = 'none';
    if (hrChartTitle) hrChartTitle.style.display = 'none';
    if (hrChartSection) hrChartSection.style.display = 'none';
  } else {
    emptyState?.classList.add('hidden');
    if (histogram) histogram.style.display = 'block';
    if (hrChartTitle) hrChartTitle.style.display = 'block';
    if (hrChartSection) hrChartSection.style.display = 'block';
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
    
    // Add data point to chart if tracking is active
    if (zoneTrackingStartTime && zone) {
      addHrDataPoint(heartRate, zone.zone);
    }
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
  
  // Reset HR chart
  resetHrChart();
  
  updateTimerDisplay();
  console.log('Timer reset');
}

// HR Chart Functions
function initializeHrChart(): void {
  const canvas = document.getElementById('hrLineChart') as HTMLCanvasElement;
  if (!canvas) {
    console.error('HR chart canvas not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Unable to get canvas context');
    return;
  }

  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Heart Rate (BPM)',
        data: [],
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      backgroundColor: 'transparent',
      scales: {
        x: {
          title: {
            display: false
          },
          ticks: {
            display: false,
            maxTicksLimit: 6
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Heart Rate (BPM)',
            color: 'rgba(255, 255, 255, 0.8)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.6)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#00ff88',
          bodyColor: 'white',
          borderColor: '#00ff88',
          borderWidth: 1,
          callbacks: {
            title: function(context) {
              return `Time: ${context[0].label}`;
            },
            label: function(context) {
              const dataPoint = hrDataPoints[context.dataIndex];
              return [
                `Heart Rate: ${context.parsed.y} BPM`,
                `Zone: ${dataPoint?.zone || 'N/A'}`
              ];
            }
          }
        }
      },
      animation: {
        duration: 0
      }
    }
  };

  hrChart = new Chart(ctx, config);
  console.log('HR chart initialized');
}

function addHrDataPoint(heartRate: number, zone: number): void {
  if (!zoneTrackingStartTime || heartRate <= 0) return;

  const now = Date.now();
  const sessionTime = now - zoneTrackingStartTime;
  
  const dataPoint: HRDataPoint = {
    timestamp: sessionTime,
    heartRate: heartRate,
    zone: zone
  };

  hrDataPoints.push(dataPoint);

  // Limit data points to prevent memory issues
  if (hrDataPoints.length > MAX_DATA_POINTS) {
    hrDataPoints.shift();
  }

  updateHrChart();
}

function updateHrChart(): void {
  if (!hrChart || hrDataPoints.length === 0) return;

  const labels = hrDataPoints.map(point => formatTime(point.timestamp));
  const data = hrDataPoints.map(point => point.heartRate);

  hrChart.data.labels = labels;
  hrChart.data.datasets[0].data = data;
  hrChart.update('none');
}

function resetHrChart(): void {
  hrDataPoints = [];
  if (hrChart) {
    hrChart.data.labels = [];
    hrChart.data.datasets[0].data = [];
    hrChart.update('none');
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopMetricsUpdates();
  stopZoneTracking();
  if (hrChart) {
    hrChart.destroy();
  }
});