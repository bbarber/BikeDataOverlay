# BikeDataOverlay Development Guide

## CORE PRINCIPLES

1. **Build Often**: `npm run build`
2. **Test Functionality**: Test UI and Bluetooth manually
3. **Track Progress**: Update todos throughout development
4. **Clean Commits**: Only commit working code, always push
5. **Never Mock**: Use real implementations for testing

## WORKFLOW

1. **Explore**: Read files, use Grep/Glob to understand codebase
2. **Plan**: Break tasks into todos, verify approach before coding
3. **Code**: Follow existing patterns, build frequently
4. **Commit**: Verify tests pass, write descriptive messages

## PROJECT COMMANDS

```bash
# Frontend Development
npm run start
npm run test

# Individual Playwright Tests
npx playwright test tests/filename.spec.js -g "test name" --reporter=line
```

## ARCHITECTURE

- **Frontend**: Electron app with real Bluetooth communication via @stoprocent/noble
- **Services**: BluetoothService for device communication, FTMSService for protocol parsing
- **Testing**: Playwright for UI testing

