import { useState } from 'react'
import { Zap } from 'lucide-react'
import { QuickStart } from './sections/QuickStart'
import './index.css'

function App() {
  const [selectedEngine, setSelectedEngine] = useState('turbojet')
  const hasExternalApi = Boolean(import.meta.env.VITE_API_BASE_URL)
  const isDemoMode = !hasExternalApi && import.meta.env.VITE_USE_DEMO_API === 'true'

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="card p-6 md:p-7 border-l-4 border-l-emerald-400">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-400/20 rounded-lg">
              <Zap size={28} className="text-emerald-300" />
            </div>
            <span className="status-pill">Engine Workspace</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">GSPy Web Engine</h1>
            <p className="text-slate-300 mt-1">Select an engine mode, run, and inspect results.</p>
          </div>
        </div>
      </div>

      {isDemoMode && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Demo fallback is active because no external backend URL is configured for this deployment. Set VITE_API_BASE_URL in Netlify to point at a real backend service if you want the live solver.
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <QuickStart
          selectedEngine={selectedEngine}
          onEngineChange={setSelectedEngine}
        />
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-10 pt-8 border-t border-slate-700/80 text-center text-slate-400 text-sm">
        <p>{isDemoMode ? 'GSPy Web Engine v1.0.0 • React + Netlify Functions demo fallback' : 'GSPy Web Engine v1.0.0 • React + FastAPI'}</p>
      </div>
    </div>
  )
}

export default App
