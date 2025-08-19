const axios = require('axios');
let ipcRenderer = null;
try { ipcRenderer = require('electron').ipcRenderer; } catch {}

// Initialize Bluetooth service
let bluetoothService;
let currentMetrics = {
    watts: 0,
    heartRate: 0
};

// Initialize Lucide icons when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize Bluetooth service
    initializeBluetooth();
});

const API_BASE_URL = 'http://localhost:5000/api';
let updateInterval;
let devicePanelVisible = false;
let isScanning = false;

// Timer variables
let timerInterval;
let timerStartTime = null;
let timerElapsedTime = 0;
let isTimerRunning = false;

// HR Zone variables
let hrZonePanelVisible = false;
let hrConfig = {
    age: 30,
    restingHR: 60,
    targetZone: 2
};
let hrZones = {};

// Initialize Bluetooth service
function initializeBluetooth() {
    try {
        if (ipcRenderer) {
			// Electron IPC BLE path
			console.log('Initializing IPC BLE');
			ipcRenderer.invoke('ble:init').catch(() => {});
			// Listen for devices and data
			ipcRenderer.on('ble:device', (_e, device) => {
				appendOrUpdateDevice(device);
			});
			ipcRenderer.on('ble:scan-started', () => {
				setStatus('Scanning for Bluetooth devices...');
			});
			ipcRenderer.on('ble:scan-stopped', (_e, devices) => {
				setStatus(`Found ${devices.length} device(s)`);
				displayDevices(devices);
			});
			ipcRenderer.on('ble:connected', (_e, device) => {
				handleDeviceConnected(device);
			});
			ipcRenderer.on('ble:disconnected', (_e, device) => {
				handleDeviceDisconnected(device);
			});
			ipcRenderer.on('ble:data', (_e, payload) => {
				handleBluetoothData(payload);
			});
			console.log('IPC BLE initialized');
		} else {
			// Fallback: Web Bluetooth
			bluetoothService = new BluetoothService();
			bluetoothService.setDataCallback(handleBluetoothData);
			bluetoothService.setDeviceConnectedCallback(handleDeviceConnected);
			bluetoothService.setDeviceDisconnectedCallback(handleDeviceDisconnected);
			console.log('Web Bluetooth service initialized');
			if (!bluetoothService.isSupported()) {
				console.warn('Web Bluetooth API not supported');
				document.querySelector('.status-text').textContent = 'Bluetooth not supported in this browser';
			}
		}
    } catch (error) {
        console.error('Failed to initialize Bluetooth service:', error);
    }
}

// Handle Bluetooth data received
function handleBluetoothData(data) {
    console.log('Bluetooth data received:', data);
    
    switch (data.type) {
        case 'power':
            currentMetrics.watts = data.value;
            updatePowerDisplay(data.value);
            break;
        case 'heartRate':
            currentMetrics.heartRate = data.value;
            updateHeartRateDisplay(data.value);
            break;
    }
}

// Handle device connected
function handleDeviceConnected(device) {
    console.log('Device connected:', device);
    document.querySelector('.status-text').textContent = `Connected to ${device.name}`;
    
    // Start real-time updates
    startRealTimeUpdates();
}

// Handle device disconnected
function handleDeviceDisconnected(device) {
    console.log('Device disconnected:', device);
    document.querySelector('.status-text').textContent = `${device.name} disconnected`;
    
    // Stop real-time updates
    stopRealTimeUpdates();
}

// Update power display
function updatePowerDisplay(watts) {
    const wattsElement = document.getElementById('watts');
    if (wattsElement) {
        wattsElement.textContent = Math.round(watts);
    }
}

// Start real-time updates from Bluetooth
function startRealTimeUpdates() {
    // No need for polling when using Bluetooth - data comes in real-time
    console.log('Started real-time Bluetooth updates');
}

// Stop real-time updates
function stopRealTimeUpdates() {
    console.log('Stopped real-time Bluetooth updates');
}

async function fetchMetrics() {
    // This function is now deprecated in favor of Bluetooth real-time updates
    // Keep for fallback if needed
    try {
        const response = await axios.get(`${API_BASE_URL}/metrics/current`);
        const metrics = response.data;
        
        document.getElementById('watts').textContent = Math.round(metrics.watts);
        
        // Update heart rate with zone coloring
        let heartRate = metrics.heartRate || metrics.bpm || 0;
        updateHeartRateDisplay(heartRate);
        
    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        document.getElementById('watts').textContent = '--';
        document.getElementById('heartRate').textContent = '--';
    }
}

function startMetricsUpdates() {
    // Stop any existing polling to prevent multiple intervals
    stopMetricsUpdates();
    
    // If we have Bluetooth devices connected, use real-time updates
    if (bluetoothService && bluetoothService.getConnectedDevices().length > 0) {
        startRealTimeUpdates();
    } else {
        // Fallback to API polling
        fetchMetrics();
        updateInterval = setInterval(fetchMetrics, 1000);
        console.log('Started metrics polling (fallback)');
    }
}

function stopMetricsUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        console.log('Stopped metrics polling');
    }
    stopRealTimeUpdates();
}

async function scanForDevices() {
    if (isScanning) return;
    
    isScanning = true;
    const statusEl = document.querySelector('.status-text');
    const scanBtn = document.getElementById('scanDevicesBtn');
    
    try {
        statusEl.textContent = 'Scanning for Bluetooth devices...';
        scanBtn.disabled = true;
        scanBtn.textContent = 'Scanning...';
        
        if (ipcRenderer) {
			const devices = await ipcRenderer.invoke('ble:startScan');
			if (devices && devices.length > 0) {
				statusEl.textContent = `Found ${devices.length} device(s)`;
				displayDevices(devices);
			} else {
				statusEl.textContent = 'No devices found';
				displayDevices([]);
			}
		} else {
			if (!bluetoothService) throw new Error('Bluetooth service not initialized');
			if (!bluetoothService.isSupported()) throw new Error('Web Bluetooth API not supported in this browser');
			const devices = await bluetoothService.scanForDevices();
			if (devices && devices.length > 0) {
				statusEl.textContent = `Found ${devices.length} device(s)`;
				displayDevices(devices);
			} else {
				statusEl.textContent = 'No devices found or scan cancelled';
				displayDevices([]);
			}
		}
    } catch (error) {
        console.error('Failed to scan for devices:', error);
        
        // Handle specific error cases more gracefully
        if (error.message.includes('user cancelled') || error.message.includes('No device selected')) {
            statusEl.textContent = 'Scan cancelled - no device selected';
        } else if (error.message.includes('Permission denied')) {
            statusEl.textContent = 'Bluetooth permission denied - please allow access';
        } else if (error.message.includes('not supported')) {
            statusEl.textContent = 'Bluetooth not supported on this device';
        } else {
            statusEl.textContent = `Scan error: ${error.message}`;
        }
        
        displayDevices([]);
    } finally {
        isScanning = false;
        scanBtn.disabled = false;
        scanBtn.textContent = 'Scan for Devices';
    }
}

async function loadDeviceList() {
    const statusEl = document.querySelector('.status-text');
    
    try {
        statusEl.textContent = 'Loading device list...';
        let devices = [];
        if (ipcRenderer) {
            devices = await ipcRenderer.invoke('ble:getDevices');
        } else if (bluetoothService) {
            devices = bluetoothService.getDevices();
        }
        statusEl.textContent = `Found ${devices.length} device(s)`;
        displayDevices(devices);
        
    } catch (error) {
        console.error('Failed to load device list:', error);
        statusEl.textContent = 'Failed to load devices';
        displayDevices([]);
    }
}

function displayDevices(devices) {
    const deviceList = document.getElementById('deviceList');
    
    if (!devices || devices.length === 0) {
        deviceList.innerHTML = '<div class="no-devices">No fitness devices found. Click "Scan for Devices" to search for equipment.</div>';
        return;
    }
    
    deviceList.innerHTML = devices.map(device => {
        const isConnected = device.isConnected;
        const canConnect = device.canConnect;
        const statusClass = isConnected ? 'connected' : 'available';
        const connectBtnText = isConnected ? 'Connected' : 'Connect';
        const connectBtnDisabled = isConnected || !canConnect;
        
        return `
            <div class="device-item">
                <div class="device-name">${device.name}</div>
                <div class="device-info">
                    <span class="device-type">${device.type}</span>
                    <span class="device-status-badge ${statusClass}">${device.status}</span>
                </div>
                <div class="device-details">
                    ${device.deviceInfo.manufacturer} ${device.deviceInfo.model} (${device.deviceInfo.type})
                </div>
                <div class="device-actions">
                    ${isConnected ? 
                        `<button class="btn-connect" onclick="disconnectDevice('${device.id}')">Disconnect</button>` :
                        `<button class="btn-connect" ${connectBtnDisabled ? 'disabled' : ''} 
                                onclick="connectToDevice('${device.id}')">
                            ${connectBtnText}
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

async function connectToDevice(deviceId) {
    const statusEl = document.querySelector('.status-text');
    
    try {
        statusEl.textContent = `Connecting to device...`;
        
        if (ipcRenderer) {
            await ipcRenderer.invoke('ble:connect', deviceId);
        } else {
            if (!bluetoothService) throw new Error('Bluetooth service not initialized');
            await bluetoothService.connectToDevice(deviceId);
        }
        
        // The callbacks will handle the UI updates
        statusEl.textContent = 'Device connected successfully!';
        
    } catch (error) {
        console.error('Failed to connect to device:', error);
        statusEl.textContent = `Connection error: ${error.message}`;
    }
}

async function disconnectDevice(deviceId) {
    const statusEl = document.querySelector('.status-text');
    
    try {
        statusEl.textContent = `Disconnecting device...`;
        
        if (ipcRenderer) {
            await ipcRenderer.invoke('ble:disconnect');
        } else {
            if (!bluetoothService) throw new Error('Bluetooth service not initialized');
            await bluetoothService.disconnectDevice(deviceId);
        }
        
        // Refresh device list
        loadDeviceList();
        statusEl.textContent = 'Device disconnected';
        
    } catch (error) {
        console.error('Failed to disconnect device:', error);
        statusEl.textContent = `Disconnect error: ${error.message}`;
    }
}

// Timer functions
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const totalTime = timerElapsedTime + (isTimerRunning ? Date.now() - timerStartTime : 0);
    document.getElementById('totalTime').textContent = formatTime(totalTime);
    updateTimerButtonVisibility();
}

function updateTimerButtonVisibility() {
    const startBtn = document.getElementById('startTimer');
    const stopBtn = document.getElementById('stopTimer');
    const resetBtn = document.getElementById('resetTimer');
    
    if (isTimerRunning) {
        // Timer is running: show Pause + Reset
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        resetBtn.classList.remove('hidden');
    } else if (timerElapsedTime > 0) {
        // Timer is paused (has elapsed time): show Play + Reset
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
    } else {
        // Timer is stopped/reset (00:00): show Play + Reset
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
    }
}

function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        timerStartTime = Date.now() - 1000; // Start 1 second back for immediate 00:01 display
        timerInterval = setInterval(updateTimerDisplay, 100);
        
        // Force immediate update to show at least 00:01
        const totalTime = timerElapsedTime + (Date.now() - timerStartTime);
        document.getElementById('totalTime').textContent = formatTime(totalTime);
        updateTimerButtonVisibility();
        
        console.log('Timer started');
    }
}

function stopTimer() {
    if (isTimerRunning) {
        isTimerRunning = false;
        timerElapsedTime += Date.now() - timerStartTime;
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        updateTimerDisplay();
        console.log('Timer stopped');
    }
}

function resetTimer() {
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
function calculateHrZones(age, restingHR = 60) {
    // Calculate max HR using improved formula: 208 - 0.7 * age
    const maxHR = Math.round(208 - 0.7 * age);
    
    // Calculate HR Reserve (Karvonen method)
    const hrReserve = maxHR - restingHR;
    
    // Calculate 5 zones based on % of HR Reserve + resting HR
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

function loadHrConfig() {
    const saved = localStorage.getItem('bikeDataHrConfig');
    if (saved) {
        hrConfig = { ...hrConfig, ...JSON.parse(saved) };
    }
    updateHrZones();
    updateHrInputs();
    updateTargetZoneSelection();
}

function saveHrConfig() {
    localStorage.setItem('bikeDataHrConfig', JSON.stringify(hrConfig));
    console.log('HR config saved:', hrConfig);
}

function updateHrZones() {
    hrZones = calculateHrZones(hrConfig.age, hrConfig.restingHR);
    updateHrZoneDisplay();
}

function updateHrInputs() {
    document.getElementById('userAge').value = hrConfig.age;
    document.getElementById('restingHR').value = hrConfig.restingHR;
}

function updateTargetZoneSelection() {
    const radio = document.querySelector(`input[name="targetZone"][value="${hrConfig.targetZone}"]`);
    if (radio) radio.checked = true;
}

function updateHrZoneDisplay() {
    for (let i = 1; i <= 5; i++) {
        const zone = hrZones[`zone${i}`];
        const rangeElement = document.getElementById(`zone${i}Range`);
        if (rangeElement && zone) {
            rangeElement.textContent = `${zone.min}-${zone.max} BPM`;
        }
    }
}

function getHrZone(heartRate) {
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
    
    // If HR is below zone 1, still return zone 1
    if (heartRate < hrZones.zone1.min) {
        return { zone: 1, name: hrZones.zone1.name, inTarget: hrConfig.targetZone === 1 };
    }
    
    // If HR is above zone 5, still return zone 5
    return { zone: 5, name: hrZones.zone5.name, inTarget: hrConfig.targetZone === 5 };
}

function updateHeartRateDisplay(heartRate) {
    const hrElement = document.getElementById('heartRate');
    const zoneElement = document.getElementById('hrZoneLabel');
    
    if (heartRate > 0) {
        hrElement.textContent = Math.round(heartRate);
        
        const zone = getHrZone(heartRate);
        zoneElement.textContent = `Zone ${zone.zone} (${zone.name})`;
        
        // Apply color based on zone
        hrElement.classList.remove('hr-in-zone', 'hr-out-of-zone');
        if (zone.inTarget) {
            hrElement.classList.add('hr-in-zone');
        } else {
            hrElement.classList.add('hr-out-of-zone');
        }
    } else {
        hrElement.textContent = '--';
        zoneElement.textContent = 'Zone 1';
        hrElement.classList.remove('hr-in-zone', 'hr-out-of-zone');
    }
}

function closeHrZonePanel() {
    const hrZonePanel = document.getElementById('hrZonePanel');
    hrZonePanelVisible = false;
    hrZonePanel.classList.remove('visible');
}

function closeDevicePanel() {
    const devicePanel = document.getElementById('devicePanel');
    devicePanelVisible = false;
    devicePanel.classList.remove('visible');
}

function toggleHrZonePanel() {
    const hrZonePanel = document.getElementById('hrZonePanel');
    hrZonePanelVisible = !hrZonePanelVisible;
    
    if (hrZonePanelVisible) {
        // Close device panel if it's open
        if (devicePanelVisible) {
            closeDevicePanel();
        }
        hrZonePanel.classList.add('visible');
        updateHrInputs();
        updateHrZoneDisplay();
    } else {
        hrZonePanel.classList.remove('visible');
    }
}

function toggleDevicePanel() {
    const devicePanel = document.getElementById('devicePanel');
    devicePanelVisible = !devicePanelVisible;
    
    console.log('Toggling device panel, visible:', devicePanelVisible);
    
    if (devicePanelVisible) {
        // Close HR zone panel if it's open
        if (hrZonePanelVisible) {
            closeHrZonePanel();
        }
        devicePanel.classList.add('visible');
        console.log('Device panel should now be visible');
        console.log('Panel classes:', devicePanel.className);
        console.log('Panel display style:', window.getComputedStyle(devicePanel).display);
        // Try to load devices, but don't block panel visibility
        loadDeviceList().catch(error => {
            console.warn('Failed to load device list, but panel remains visible:', error);
        });
    } else {
        devicePanel.classList.remove('visible');
        console.log('Device panel hidden');
        console.log('Panel classes:', devicePanel.className);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleDevicePanel');
    const devicePanel = document.getElementById('devicePanel');
    
    // Use a single, clean click handler
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Toggle button clicked');
        toggleDevicePanel();
    });
    
    // Force enable mouse events when hovering over the toggle button or device panel
    toggleBtn.addEventListener('mouseenter', () => {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('set-ignore-mouse-events', false);
            console.log('Toggle button mouseenter - enabling mouse events');
        }
    });
    
    // Also enable mouse events when hovering over the device panel
    if (devicePanel) {
        devicePanel.addEventListener('mouseenter', () => {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-ignore-mouse-events', false);
                console.log('Device panel mouseenter - enabling mouse events');
            }
        });
    }
    
    // Enable mouse events when hovering over the timer container
    const timerContainer = document.querySelector('.time-container');
    if (timerContainer) {
        timerContainer.addEventListener('mouseenter', () => {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-ignore-mouse-events', false);
                console.log('Timer container mouseenter - enabling mouse events');
            }
        });
    }
    
    // Add event listeners for device management buttons
    const scanDevicesBtn = document.getElementById('scanDevicesBtn');
    const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
    
    if (scanDevicesBtn) {
        scanDevicesBtn.addEventListener('click', scanForDevices);
    }
    if (refreshDevicesBtn) {
        refreshDevicesBtn.addEventListener('click', loadDeviceList);
    }
    
    // HR Zone panel event listeners
    const hrZoneToggleBtn = document.getElementById('toggleHrZonePanel');
    const hrZonePanel = document.getElementById('hrZonePanel');
    
    if (hrZoneToggleBtn) {
        hrZoneToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleHrZonePanel();
        });
        
        // Enable mouse events for HR zone panel
        hrZoneToggleBtn.addEventListener('mouseenter', () => {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-ignore-mouse-events', false);
            }
        });
    }
    
    if (hrZonePanel) {
        hrZonePanel.addEventListener('mouseenter', () => {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('set-ignore-mouse-events', false);
            }
        });
    }
    
    // HR Zone configuration buttons
    const calculateZonesBtn = document.getElementById('calculateZones');
    if (calculateZonesBtn) {
        calculateZonesBtn.addEventListener('click', () => {
            hrConfig.age = parseInt(document.getElementById('userAge').value);
            hrConfig.restingHR = parseInt(document.getElementById('restingHR').value);
            
            // Get selected target zone
            const selectedZone = document.querySelector('input[name="targetZone"]:checked');
            if (selectedZone) {
                hrConfig.targetZone = parseInt(selectedZone.value);
            }
            
            updateHrZones();
            saveHrConfig();
        });
    }
    
    // Add event listeners for zone selection
    document.querySelectorAll('input[name="targetZone"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                hrConfig.targetZone = parseInt(radio.value);
                saveHrConfig();
            }
        });
    });
    
    // Auto-update zones when age or resting HR changes
    const userAgeInput = document.getElementById('userAge');
    if (userAgeInput) {
        userAgeInput.addEventListener('input', (e) => {
            const age = parseInt(e.target.value);
            if (age && age >= 18 && age <= 100) {
                hrConfig.age = age;
                updateHrZones();
                saveHrConfig();
            }
        });
    }
    
    const restingHRInput = document.getElementById('restingHR');
    if (restingHRInput) {
        restingHRInput.addEventListener('input', (e) => {
            const restingHR = parseInt(e.target.value);
            if (restingHR && restingHR >= 40 && restingHR <= 100) {
                hrConfig.restingHR = restingHR;
                updateHrZones();
                saveHrConfig();
            }
        });
    }
    
    
    // Timer button event listeners (now handled by inline onclick attributes)
    
    // Initialize displays
    updateTimerDisplay();
    loadHrConfig();
});

window.addEventListener('beforeunload', stopMetricsUpdates);

// Helpers for IPC device updates
function setStatus(text) {
	const statusEl = document.querySelector('.status-text');
	if (statusEl) statusEl.textContent = text;
}

function appendOrUpdateDevice(device) {
	const existing = window.__bleDevices || new Map();
	window.__bleDevices = existing;
	existing.set(device.id, device);
	displayDevices(Array.from(existing.values()));
}