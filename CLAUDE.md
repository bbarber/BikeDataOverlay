# BikeDataOverlay Development Guide

## CORE PRINCIPLES

1. **Build Often**: `dotnet build backend/BikeDataApi.csproj`
2. **Test Manually**: Use curl commands to verify API outputs
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
# Backend
dotnet build backend/BikeDataApi.csproj
dotnet run --project backend/BikeDataApi.csproj

# Frontend  
cd frontend && npm run dev
cd frontend && npm run test

# API Testing
curl http://localhost:5000/api/[endpoint]
```

## ARCHITECTURE

- **Backend**: .NET 8 Web API for Bluetooth communication
- **Frontend**: Electron app for overlay UI
- **Testing**: Playwright for frontend, manual curl for API

