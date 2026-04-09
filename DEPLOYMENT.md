# 🚀 GSPy Web UI - Deployment & Usage Guide

## **🌐 Netlify Deployment**

This repository is now configured for a Netlify-hosted demo deployment.

- Build config lives in `netlify.toml`
- Netlify serves the Vite frontend from `frontend/dist`
- `/api/*` is routed to Netlify Functions under `frontend/netlify/functions`
- The Netlify deployment can either use a real external backend or fall back to representative demo data

### **Why demo data on Netlify?**

The live backend depends on heavyweight scientific Python packages such as Cantera, NumPy, SciPy, and Matplotlib. That stack is a poor fit for standard Netlify Functions, so the Netlify deployment keeps the UI intact and serves realistic demo responses instead.

Netlify also does not run arbitrary user Docker containers for your app runtime, so a true full-container deployment cannot be hosted there.

### **Fully Functional Netlify Setup**

If you want Netlify to use the real backend instead of the fallback demo layer:

1. Deploy the backend container to a real container host.
2. In Netlify, set `VITE_API_BASE_URL` to that backend URL, for example `https://your-backend-host/api`.
3. Redeploy the Netlify site.

When `VITE_API_BASE_URL` is set, the frontend will call that backend directly and will not use the fallback demo functions.

## **🐳 Full Container Deployment**

If you want the real application online with the live backend, use the full-container path on a container host such as Render, Railway, Fly.io, Azure Container Apps, or a VPS.

### **Single Container**

The repository now includes a root `Dockerfile` that:

- builds the Vite frontend
- copies the backend, `src`, and `projects` into the runtime image
- serves the built frontend from FastAPI on the same port as the API

Build and run it locally:

```bash
docker build -t aero-fullstack .
docker run --rm -p 8000:8000 aero-fullstack
```

Then open:

- App: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### **Two-Container Local Dev**

The existing `docker-compose.yml` has been corrected to build from the repository root so the backend can actually see the `backend`, `src`, and `projects` folders it depends on.

Run it with:

```bash
docker compose up --build
```

### **Single-Container Compose**

For a single-container compose flow, use:

```bash
docker compose -f docker-compose.fullstack.yml up --build
```

### **Deploy Steps**

1. Push this repository to GitHub.
2. In Netlify, create a new site from the repo.
3. Netlify should pick up `netlify.toml` automatically.
4. If Netlify asks for values manually, use:
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
5. Deploy the site.

### **What works on Netlify**

- Preset engine flows in the current UI
- Parameter-sensitive demo responses for the preset engines
- The Custom Builder UI with a structural demo estimator
- Same `/api` routes the frontend already expects

### **What still requires local or Docker deployment**

- Live FastAPI execution
- Real GSPy and Cantera simulations
- Full scientific backend behavior

## **How to Run**

### **⚡ Quickest Way (One Command)**

```bash
cd /workspaces/Aero
chmod +x start.sh          # Linux/Mac only (one-time)
./start.sh                 # Starts everything automatically
```

**Then open**: `http://localhost:5173` in your browser

---

### **🛠️ Manual Way (Two Terminals)**

**Terminal 1 - Backend:**
```bash
cd /workspaces/Aero/backend
pip install -r requirements.txt
python main.py
```
✅ Backend ready at: `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd /workspaces/Aero/frontend
npm install
npm run dev
```
✅ Frontend ready at: `http://localhost:5173`

---

## **🎮 Using the Application**

### **Tab 1: Quick Start** (Active First)

1. **Select Engine** 
   - Click a preset engine button (Turbojet, Turbofan, etc.)
   - Shows engine description

2. **Configure Parameters**
   - Adjust sliders or type values
   - Parameters specific to selected engine:
     - Altitude (0-15,000 m)
     - Mach number (0-0.95)
     - Throttle setting (0-1)
     - Temperature offset (-50 to +50°C)

3. **Run Simulation**
   - Click "Run Simulation" button
   - Watch loading spinner
   - View results as JSON

### **Tab 2: Custom Builder**

1. **Name Your Engine**
   - Enter a name (e.g., "My First Engine")

2. **Add Components**
   - Click component buttons to add:
     - Ambient (atmospheric conditions)
     - Inlet (intake)
     - Compressor (compression)
     - Combustor (combustion)
     - Turbine (expansion)
     - Nozzle (exit)

3. **Configure Each Component**
   - Click/edit component names
   - Add parameters (foundation ready)
   - Remove with trash icon

4. **Run Custom Engine**
   - Click "Run Custom Engine"
   - Get results

---

## **📊 Understanding Results**

When simulation completes successfully:

```json
{
  "engine_name": "turbojet",
  "run_mode": "DP",
  "status": "success",
  "data": {
    "output_parameters": [...],
    "components": [...],
    "simulation_mode": "DP"
  }
}
```

- **engine_name**: Which engine was simulated
- **run_mode**: DP (Design Point) or OD (Off-Design)
- **status**: "success" or "error"
- **data**: Results from simulation

---

## **🔍 Debugging**

### **Check if Backend is Running**
```bash
curl http://localhost:8000/api/health
# Should see: {"status":"ok","service":"GSPy Web Engine"}
```

### **Check API Documentation**
```
http://localhost:8000/docs
# Interactive Swagger documentation with all endpoints
```

### **View Browser Console**
- Right-click → Inspect → Console tab
- Shows any frontend errors or API calls

### **View Backend Logs**
- Terminal running backend shows all requests and errors
- Example: `GET /api/engines 200 OK`

---

## **🐳 Docker Deployment**

### **Run with Docker Compose**

```bash
cd /workspaces/Aero
docker-compose up
```

Then access:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### **Stop Services**
```bash
docker-compose down
```

---

## **📦 Installing Additional Features**

### **Full GSPy Functionality**

To use actual simulations instead of the Netlify demo layer:

```bash
# Install GSPy in dev mode
cd /workspaces/Aero
pip install -e .

# Install additional dependencies
pip install cantera aero-calc
```

Then restart backend:
```bash
cd backend
python main.py
```

---

## **🎨 Customizing the UI**

### **Change Colors**
Edit `frontend/src/index.css`
```css
.btn-primary {
  @apply px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors;
}
```

### **Add More Components**
Edit `frontend/src/App.tsx` and add new tab:
```typescript
{
  label: 'Advanced',
  value: 'advanced',
  icon: <Settings size={20} />,
}
```

### **Change API Base URL**
Edit `frontend/src/api/client.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
```

---

## **📈 Performance Tips**

1. **Local Development**
   - Frontend and backend on same machine = fast
   - Use hot-reload for development

2. **Production**
   - Build frontend: `npm run build`
   - For live simulations, use Gunicorn for backend: `gunicorn backend.main:app`
   - Serve frontend from CDN
   - Use environment variables for configuration

---

## **🔒 Security Considerations**

### **For Development (Current)**
- ✅ CORS enabled for `*` (localhost only fine)
- ✅ No authentication needed
- ✅ Local-only deployment

### **For Production**
- 🛑 Change CORS to specific domains:
  ```python
  allow_origins=["https://yourdomain.com"]
  ```
- 🛑 Add authentication
- 🛑 Use HTTPS
- 🛑 Environment variables for secrets
- 🛑 Rate limiting
- 🛑 Input validation

---

## **💾 Environment Variables**

Create `.env` files:

**`backend/.env`**
```
HOST=0.0.0.0
PORT=8000
DEBUG=False
```

**`frontend/.env`**
```
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## **🆘 Common Issues**

| Issue | Solution |
|-------|----------|
| Port 8000 in use | `python -m pip install psutil && lsof -i :8000` then kill process |
| Port 5173 in use | `fuser -k 5173/tcp` |
| npm install fails | Delete `node_modules` and `package-lock.json`, try again |
| Backend import error | Run `pip install -e /workspaces/Aero` |
| CORS error in frontend | Check backend is running on port 8000 |
| Blank page | Check browser console (F12) for errors |

---

## **📚 File Reference**

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI application |
| `frontend/src/App.tsx` | React main component |
| `frontend/src/api/client.ts` | Backend API client |
| `frontend/src/sections/QuickStart.tsx` | Quick Start tab |
| `frontend/src/sections/CustomBuilder.tsx` | Custom Builder tab |
| `start.sh` / `start.bat` | Launcher scripts |
| `SETUP.md` | Installation guide |
| `PROJECT_COMPLETE.md` | Project overview |

---

## **✅ Verification Checklist**

- [ ] Python 3.9+ installed (`python3 --version`)
- [ ] Node.js 16+ installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Backend starts without errors (`python backend/main.py`)
- [ ] Frontend builds successfully (`npm run dev` in frontend folder)
- [ ] Can access UI at `http://localhost:5173`
- [ ] Can see API docs at `http://localhost:8000/docs`
- [ ] Can run preset engine and see results

---

**Everything is ready! Start exploring! 🎉**
