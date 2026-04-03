#!/bin/bash

# GSPy Web UI - Quick Start Script (Linux/Mac)
# Starts both backend and frontend in parallel

set -e

echo "🚀 GSPy Web UI - Starting Full Stack"
echo "====================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "SETUP.md" ]; then
    echo -e "${RED}❌ Error: Please run this script from the Aero directory${NC}"
    exit 1
fi

# Install dependencies if not already done
echo -e "${YELLOW}📦 Checking dependencies...${NC}"

if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start backend
echo -e "${GREEN}✅ Starting Backend (port 8000)...${NC}"
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 2

# Start frontend
echo -e "${GREEN}✅ Starting Frontend (port 5173)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}🎉 Full Stack Started!${NC}"
echo "========================================"
echo -e "Backend:  ${YELLOW}http://localhost:8000${NC}"
echo -e "API Docs: ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "Frontend: ${YELLOW}http://localhost:5173${NC}"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
