# 🚀 GSPy Web UI - Full Stack Setup

Complete web interface for GSPy gas turbine simulation engine.

## **📁 Project Structure**

```
Aero/
├── backend/              # FastAPI backend (Python)
│   ├── main.py          # API server
│   └── requirements.txt  # Dependencies
├── frontend/            # React frontend (TypeScript)
│   ├── src/             # React components
│   ├── package.json     # Dependencies
│   └── index.html       # HTML entry
├── src/gspy/            # Core simulation engine (existing)
└── projects/            # Example models (existing)
```

## **✨ Features**

### **Quick Start** (MVP - Ready Now)
- ✅ Select preset engines (Turbojet, Turbofan, etc.)
- ✅ Adjust simulation parameters with sliders
- ✅ Run design point simulations
- ✅ View results in real-time
- ✅ Beautiful dark-mode UI

### **Custom Engine Builder** (Foundation Ready)
- 🏗️ Build custom engines from components
- 🏗️ Configure each component's parameters
- 🏗️ Visual component assembly
- 🏗️ Run custom simulations

---

## **🛠️ Installation & Startup**

### **Step 1: Install Backend Dependencies**

```bash
cd backend
pip install -r requirements.txt
```

### **Step 2: Install Frontend Dependencies**

```bash
cd frontend
npm install
```

### **Step 3: Start the Backend (Terminal 1)**

```bash
cd backend
python main.py
```

Backend runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### **Step 4: Start the Frontend (Terminal 2)**

```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## **🌐 Access the UI**

Open your browser:
```
http://localhost:5173
```

---

## **📡 API Endpoints**

| Method | Endpoint                          | Purpose                    |
|--------|-----------------------------------|----------------------------|
| GET    | `/api/health`                    | Health check               |
| GET    | `/api/engines`                   | List available engines     |
| GET    | `/api/engines/{name}/schema`     | Get engine parameters      |
| POST   | `/api/engines/{name}/run`        | Run preset engine          |
| POST   | `/api/engines/custom/run`        | Run custom engine          |
| GET    | `/api/engines/custom/components` | Available engine components|

---

## **🎯 Next Steps (Roadmap)**

1. **Connect Custom Builder to Backend** - Wire component configuration to API
2. **Add Results Visualization** - Charts, plots, export CSV
3. **History & Comparison** - Save and compare simulation runs
4. **Advanced Parameters** - More control over engine behavior
5. **Real-time Plotting** - Live performance curves
6. **Mobile Responsive** - Full mobile support

---

## **🔧 Development**

### Frontend
- Built with: **React 18** + **TypeScript** + **Vite**
- Styling: **Tailwind CSS**
- HTTP: **Axios**
- Icons: **Lucide React**

### Backend
- Built with: **FastAPI** + **Pydantic**
- Server: **Uvicorn**
- Integration: Wraps existing **GSPy API**

---

## **📝 Notes**

- Backend automatically detects all available engines in `projects/`
- Frontend has built-in error handling and loading states
- CORS enabled for local development (change in production!)
- API returns structured JSON for easy frontend integration

---

**Made with ❤️ for GSPy Students & Researchers**
