# BikeDataOverlay Development Guide

## CORE PRINCIPLES

1. **Build Often**: Test the Electron app frequently
2. **Test Manually**: Use the app to verify BLE connectivity
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
# Frontend  
cd frontend && npm install
cd frontend && npm start
cd frontend && npm run dev

# Testing
cd frontend && npm test

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

- **Frontend**: Electron app with native BLE support via noble
- **BLE Service**: Main process BLE handling with IPC communication
- **Testing**: Playwright for frontend, manual BLE device testing

