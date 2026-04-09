import { useState, useEffect } from 'react'
import { Zap, Play } from 'lucide-react'
import { API, EngineSchema, SimulationResults } from '../api/client'
import { Card } from '../components/Card'
import { Loading } from '../components/Loading'
import { Alert } from '../components/Alert'
import { ResultsDashboard } from '../components/ResultsDashboard'
import { CustomBuilder } from './CustomBuilder'

interface QuickStartProps {
  selectedEngine: string
  onEngineChange: (engine: string) => void
}

export function QuickStart({ selectedEngine, onEngineChange }: QuickStartProps) {
  const [engines, setEngines] = useState<string[]>([])
  const [schema, setSchema] = useState<EngineSchema | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SimulationResults | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [parameters, setParameters] = useState<Record<string, any>>({})

  // Load available engines
  useEffect(() => {
    const loadEngines = async () => {
      try {
        const engineList = await API.listEngines()
        const engineOptions = [...engineList, 'custom_builder']
        setEngines(engineOptions)
        if (engineOptions.length > 0 && !selectedEngine) {
          onEngineChange(engineOptions[0])
        }
      } catch (error) {
        setAlert({
          type: 'error',
          message: 'Failed to load engines: ' + String(error),
        })
      }
    }
    loadEngines()
  }, [])

  // Load schema when engine changes
  useEffect(() => {
    if (!selectedEngine) return

    if (selectedEngine === 'custom_builder') {
      setSchema(null)
      setParameters({})
      return
    }

    const loadSchema = async () => {
      try {
        const engineSchema = await API.getEngineSchema(selectedEngine)
        setSchema(engineSchema)

        // Initialize parameters with defaults
        const defaultParams: Record<string, any> = {}
        engineSchema.parameters.forEach((param) => {
          defaultParams[param.name] = param.default ?? ''
        })
        setParameters(defaultParams)
      } catch (error) {
        setAlert({
          type: 'error',
          message: 'Failed to load schema: ' + String(error),
        })
      }
    }

    loadSchema()
  }, [selectedEngine])

  const handleRunSimulation = async () => {
    if (selectedEngine === 'custom_builder') {
      return
    }

    setLoading(true)
    try {
      const sanitizedParameters = Object.fromEntries(
        Object.entries(parameters).filter(([, value]) => {
          if (value === '' || value === null || value === undefined) {
            return false
          }
          if (typeof value === 'number' && Number.isNaN(value)) {
            return false
          }
          return true
        })
      )

      const effectiveRunMode: 'DP' | 'OD' = selectedEngine.startsWith('turbojet') ? 'OD' : 'DP'

      const result = await API.runEngine(selectedEngine, effectiveRunMode, sanitizedParameters)
      setResults(result)

      if (result.status === 'success') {
        setAlert({
          type: 'success',
          message: 'Simulation completed successfully!',
        })
      } else {
        setAlert({
          type: 'error',
          message: result.error || 'Simulation failed',
        })
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Error running simulation: ' + String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {alert && (
        <Alert
          type={alert.type}
          title={alert.type === 'success' ? 'Success' : 'Error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Engine Selection */}
      <Card
        title="Select Engine"
        description="Choose a preset engine configuration to simulate"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {engines.map((engine) => (
            <button
              key={engine}
              type="button"
              onClick={() => onEngineChange(engine)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedEngine === engine
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
              }`}
            >
              <div className="font-semibold flex items-center gap-2">
                <Zap size={18} />
                {engine === 'custom_builder' ? 'Custom Engine Builder' : engine}
              </div>
              <p className="text-sm text-slate-400 mt-1 capitalize">
                {engine === 'custom_builder' ? 'Build your own engine configuration' : engine.replace(/_/g, ' ')}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {selectedEngine === 'custom_builder' && <CustomBuilder />}

      {/* Parameters */}
      {selectedEngine !== 'custom_builder' && schema && (
        <Card
          title="Configuration"
          description="Adjust parameters for this simulation"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.parameters.map((param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium mb-2">
                  {param.name}
                  <span className="text-slate-400 text-xs block mt-1">
                    {param.description}
                  </span>
                </label>
                {param.type === 'number' ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step="0.1"
                      value={parameters[param.name] ?? ''}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          [param.name]: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1"
                    />
                    <input
                      type="number"
                      value={parameters[param.name] ?? ''}
                      onChange={(e) =>
                        setParameters({
                          ...parameters,
                          [param.name]: parseFloat(e.target.value),
                        })
                      }
                      className="parameter-input w-24"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={parameters[param.name] ?? ''}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        [param.name]: e.target.value,
                      })
                    }
                    className="parameter-input"
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedEngine !== 'custom_builder' && selectedEngine.startsWith('turbojet') && (
        <Card
          title="Analysis Mode"
          description="OD is used automatically for turbojet analysis. DP warm-up is handled internally by the model."
        >
          <p className="text-sm text-slate-300">
            Turbojet presets use the off-design sweep so the dashboard can show the operating curve across the throttle range.
          </p>
        </Card>
      )}

      {/* Run Button */}
      {selectedEngine !== 'custom_builder' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRunSimulation}
            disabled={loading || !selectedEngine}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} />
            {loading ? 'Running...' : 'Run Simulation'}
          </button>
        </div>
      )}

      {/* Loading */}
      {selectedEngine !== 'custom_builder' && loading && <Loading message="Running simulation..." />}

      {/* Results */}
      {selectedEngine !== 'custom_builder' && results && !loading && (
        <div className="space-y-4">
          <Card title="Simulation Status" className="border-l-4 border-l-green-500">
            <p className="font-mono text-lg font-bold text-green-400">
              {results.status.toUpperCase()}
            </p>
          </Card>

          {results.data && <ResultsDashboard data={results.data} />}

          {results.error && (
            <Alert
              type="error"
              title="Simulation Error"
              message={results.error}
            />
          )}
        </div>
      )}
    </div>
  )
}
