# Prompt: Implement Bluetooth Device Listing for Fitness Equipment

## 1. Goal

Create a feature that scans for nearby Bluetooth Low Energy (BLE) fitness devices and displays them in a list for the user to select.

## 2. Supported Device Types

The implementation should be able to discover the following types of standard BLE fitness devices:
- Heart Rate Monitors (HRM)
- Cycling Power Meters
- Cycling Speed and Cadence Sensors
- Fitness Machines (e.g., Smart Trainers)


### 3.2. BLE Scanning
- Initiate a BLE scan for devices.
- The scan should filter for devices advertising specific GATT services relevant to fitness equipment.


### 3.3. Device Filtering and Identification
- During the scan, filter devices based on the advertised Service UUIDs. The key standard services are:
    - **Heart Rate Service:** `0x180D`
    - **Cycling Power Service:** `0x1818`
    - **Cycling Speed and Cadence Service:** `0x1816`
    - **Fitness Machine Service (FTMS):** `0x1826`
- For each discovered device, parse the advertisement data to extract its name, address (or UUID), and signal strength (RSSI).
