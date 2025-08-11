#!/bin/bash

echo "Starting Bike Data Overlay Application..."

echo "Starting .NET backend API..."
(cd backend && dotnet run) &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 3

echo "Installing frontend dependencies..."
(cd frontend && npm install)

echo "Starting Electron overlay..."
(cd frontend && npm start) &
FRONTEND_PID=$!

echo "Application started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both processes"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait