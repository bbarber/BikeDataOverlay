const axios = require('axios');

// Initialize Lucide icons when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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


async function fetchMetrics() {
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
    fetchMetrics();
    updateInterval = setInterval(fetchMetrics, 1000);
}

function stopMetricsUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
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
        
        const response = await axios.get(`${API_BASE_URL}/metrics/devices/list`);
        const data = response.data;
        
        if (data.success || data.Success) {
            statusEl.textContent = data.message || data.Message;
            displayDevices(data.devices || data.Devices || []);
        } else {
            statusEl.textContent = `Scan failed: ${data.message || data.Message}`;
            displayDevices([]);
        }
        
    } catch (error) {
        console.error('Failed to scan for devices:', error);
        if (error.response && error.response.data && error.response.data.message) {
            statusEl.textContent = `Scan error: ${error.response.data.message}`;
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
        
        const response = await axios.get(`${API_BASE_URL}/metrics/devices/list`);
        const data = response.data;
        
        if (data.success || data.Success) {
            statusEl.textContent = data.message || data.Message;
            displayDevices(data.devices || data.Devices || []);
        } else {
            statusEl.textContent = data.message || data.Message;
            displayDevices([]);
        }
        
    } catch (error) {
        console.error('Failed to load device list:', error);
        if (error.response && error.response.status === 400) {
            statusEl.textContent = 'Bluetooth scan error - try refreshing';
        } else {
            statusEl.textContent = 'Backend not available - click "Scan for Devices" when ready';
        }
        displayDevices([]);
        // Don't re-throw the error so the panel stays visible
    }
}

function displayDevices(devices) {
    const deviceList = document.getElementById('deviceList');
    
    if (!devices || devices.length === 0) {
        deviceList.innerHTML = '<div class="no-devices">No fitness devices found. Click "Scan for Devices" to search for equipment.</div>';
        return;
    }
    
    deviceList.innerHTML = devices.map(device => {
        const isConnected = device.isConnected || device.IsConnected;
        const canConnect = device.canConnect !== undefined ? device.canConnect : device.CanConnect;
        const statusClass = isConnected ? 'connected' : 'available';
        const connectBtnText = isConnected ? 'Connected' : 'Connect';
        const connectBtnDisabled = isConnected || !canConnect;
        
        const deviceName = device.name || device.Name;
        const deviceType = device.type || device.Type;
        const deviceStatus = device.status || device.Status;
        const deviceId = device.id || device.Id;
        const deviceInfo = device.deviceInfo || device.DeviceInfo;
        
        return `
            <div class="device-item">
                <div class="device-name">${deviceName}</div>
                <div class="device-info">
                    <span class="device-type">${deviceType}</span>
                    <span class="device-status-badge ${statusClass}">${deviceStatus}</span>
                </div>
                <div class="device-details">
                    ${deviceInfo.manufacturer || deviceInfo.Manufacturer || 'Unknown'} ${deviceInfo.model || deviceInfo.Model || 'Unknown'} (${deviceInfo.type || deviceInfo.Type || 'Unknown'})
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

async function connectToDevice(deviceId) {
    const statusEl = document.querySelector('.status-text');
    
    try {
        statusEl.textContent = `Connecting to device...`;
        
        const response = await axios.post(`${API_BASE_URL}/metrics/connection/connect/${deviceId}`);
        const data = response.data;
        
        if (data.success || data.Success) {
            const deviceCount = data.connectedDevices || 1;
            statusEl.textContent = `Connected! Total devices: ${deviceCount}`;
            loadDeviceList(); // Refresh the device list
        } else {
            statusEl.textContent = `Connection failed: ${data.message || data.Message}`;
        }
        
    } catch (error) {
        console.error('Failed to connect to device:', error);
        statusEl.textContent = `Connection error: ${error.message}`;
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
        updateTimerDisplay(); // Immediately update display to show 00:01
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
    devicePanel.addEventListener('mouseenter', () => {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('set-ignore-mouse-events', false);
            console.log('Device panel mouseenter - enabling mouse events');
        }
    });
    
    // Enable mouse events when hovering over the timer container
    const timerContainer = document.querySelector('.time-container');
    timerContainer.addEventListener('mouseenter', () => {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('set-ignore-mouse-events', false);
            console.log('Timer container mouseenter - enabling mouse events');
        }
    });
    
    document.getElementById('scanDevicesBtn').addEventListener('click', scanForDevices);
    document.getElementById('refreshDevicesBtn').addEventListener('click', loadDeviceList);
    
    // HR Zone panel event listeners
    const hrZoneToggleBtn = document.getElementById('toggleHrZonePanel');
    const hrZonePanel = document.getElementById('hrZonePanel');
    
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
    
    hrZonePanel.addEventListener('mouseenter', () => {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('set-ignore-mouse-events', false);
        }
    });
    
    // HR Zone configuration buttons
    document.getElementById('calculateZones').addEventListener('click', () => {
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
    document.getElementById('userAge').addEventListener('input', (e) => {
        const age = parseInt(e.target.value);
        if (age && age >= 18 && age <= 100) {
            hrConfig.age = age;
            updateHrZones();
            saveHrConfig();
        }
    });
    
    document.getElementById('restingHR').addEventListener('input', (e) => {
        const restingHR = parseInt(e.target.value);
        if (restingHR && restingHR >= 40 && restingHR <= 100) {
            hrConfig.restingHR = restingHR;
            updateHrZones();
            saveHrConfig();
        }
    });
    
    
    // Timer button event listeners
    document.getElementById('startTimer').addEventListener('click', startTimer);
    document.getElementById('stopTimer').addEventListener('click', stopTimer);
    document.getElementById('resetTimer').addEventListener('click', resetTimer);
    
    // Initialize displays
    updateTimerDisplay();
    loadHrConfig();
    
    setTimeout(startMetricsUpdates, 2000);
});

window.addEventListener('beforeunload', stopMetricsUpdates);