# BikeDataOverlay Development Guide

## CORE PRINCIPLES

1. **Build Often**: Test the Electron app frequently with `npm run package`
2. **Test Manually**: Use the app to verify BLE connectivity and UI functionality
3. **Track Progress**: Update todos throughout development
4. **Clean Commits**: Only commit working code, always push
5. **Real BLE**: Use actual heart rate monitors for testing

## WORKFLOW

1. **Explore**: Read files, use Grep/Glob to understand codebase
2. **Plan**: Break tasks into todos, verify approach before coding
3. **Code**: Follow existing patterns, build frequently
4. **Commit**: Verify tests pass, write descriptive messages

## PROJECT COMMANDS

```bash
# Electron app
cd app && npm install
cd app && npm start

# Unit Testing (Jest)
cd app && npm run test:unit            # Run all unit tests
cd app && npm run test:unit:watch      # Run tests in watch mode
cd app && npm run test:unit:coverage   # Run tests with coverage report

# Run specific unit test file
cd app && npx jest histogram-calculations.test.ts

# Run specific test by pattern
cd app && npx jest --testNamePattern="should calculate correct percentages"

# Integration Testing (Playwright)
cd app && npm test                     # Run all Playwright tests
cd app && npm run test:ui              # Run Playwright tests with UI

# Individual Playwright Tests
# Run specific test file
npx playwright test tests/filename.spec.js

# Run specific test by name
npx playwright test -g "test name"

# Run tests with specific reporter
npx playwright test --reporter=line

# List all available tests
npx playwright test --list
```

## ARCHITECTURE

- **Frontend**: Electron app with native BLE support via @abandonware/noble
- **BLE Service**: Main process BLE handling with IPC communication
- **Services**: BluetoothService for device communication, FTMSService for protocol parsing
- **Testing**: Jest for unit tests, Playwright for UI testing, manual BLE device testing

