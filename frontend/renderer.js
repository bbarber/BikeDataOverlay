const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
let updateInterval;

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

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(startMetricsUpdates, 2000);
});

window.addEventListener('beforeunload', stopMetricsUpdates);