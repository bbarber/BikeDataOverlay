const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
let updateInterval;
let devicePanelVisible = false;
let isScanning = false;

async function fetchMetrics() {
    try {
        const response = await axios.get(`${API_BASE_URL}/metrics/current`);
        const metrics = response.data;
        
        document.getElementById('watts').textContent = Math.round(metrics.watts);
        
    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        document.getElementById('watts').textContent = '--';
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

function toggleDevicePanel() {
    devicePanelVisible = !devicePanelVisible;
    const panel = document.getElementById('devicePanel');
    
    if (devicePanelVisible) {
        panel.classList.add('visible');
        loadDeviceList();
    } else {
        panel.classList.remove('visible');
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
        
        if (data.Success) {
            statusEl.textContent = data.Message;
            displayDevices(data.Devices);
        } else {
            statusEl.textContent = `Scan failed: ${data.Message}`;
            displayDevices([]);
        }
        
    } catch (error) {
        console.error('Failed to scan for devices:', error);
        statusEl.textContent = `Scan error: ${error.message}`;
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
        
        if (data.Success) {
            statusEl.textContent = data.Message;
            displayDevices(data.Devices);
        } else {
            statusEl.textContent = data.Message;
            displayDevices([]);
        }
        
    } catch (error) {
        console.error('Failed to load device list:', error);
        statusEl.textContent = 'Ready to scan';
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
        const statusClass = device.IsConnected ? 'connected' : 'available';
        const connectBtnText = device.IsConnected ? 'Connected' : 'Connect';
        const connectBtnDisabled = device.IsConnected || !device.CanConnect;
        
        return `
            <div class="device-item">
                <div class="device-name">${device.Name}</div>
                <div class="device-info">
                    <span class="device-type">${device.Type}</span>
                    <span class="device-status-badge ${statusClass}">${device.Status}</span>
                </div>
                <div class="device-details">
                    ${device.DeviceInfo.Manufacturer} ${device.DeviceInfo.Model} (${device.DeviceInfo.Type})
                </div>
                <div class="device-actions">
                    <button class="btn-connect" ${connectBtnDisabled ? 'disabled' : ''} 
                            onclick="connectToDevice('${device.Id}')">
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
        
        const response = await axios.post(`${API_BASE_URL}/metrics/connection/connect`);
        const data = response.data;
        
        if (data.Success) {
            statusEl.textContent = data.Message;
            loadDeviceList(); // Refresh the device list
        } else {
            statusEl.textContent = `Connection failed: ${data.Message}`;
        }
        
    } catch (error) {
        console.error('Failed to connect to device:', error);
        statusEl.textContent = `Connection error: ${error.message}`;
    }
}

function initializeDevicePanel() {
    const toggleBtn = document.getElementById('toggleDevicePanel');
    const scanBtn = document.getElementById('scanDevicesBtn');
    const refreshBtn = document.getElementById('refreshDevicesBtn');
    
    toggleBtn.addEventListener('click', toggleDevicePanel);
    scanBtn.addEventListener('click', scanForDevices);
    refreshBtn.addEventListener('click', loadDeviceList);
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(startMetricsUpdates, 2000);
    initializeDevicePanel();
});

window.addEventListener('beforeunload', stopMetricsUpdates);