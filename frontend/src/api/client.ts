import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface EngineParameter {
  name: string
  description: string
  type: string
  default?: any
  min?: number
  max?: number
}

export interface EngineSchema {
  engine_name: string
  parameters: EngineParameter[]
  description: string
}

export interface SimulationResults {
  engine_name: string
  run_mode: string
  status: string
  data?: any
  error?: string
}

export interface StationProfilePoint {
  station: string
  temperature_K: number | null
  pressure_Pa: number | null
}

export interface PerformanceCurvePoint {
  point: number | null
  fuel_flow: number | null
  net_thrust: number | null
  gross_thrust: number | null
  n1_percent: number | null
  mach_exit: number | null
  turbine_inlet_temp?: number | null
  compressor_pr?: number | null
}

export interface SimulationDataPayload {
  source?: string
  warning?: string
  custom_builder?: {
    engine_name?: string
    run_mode?: string
    component_count?: number
    component_sequence?: string[]
    component_names?: string[]
  }
  summary?: {
    net_thrust_N?: number | null
    fuel_flow_kg_s?: number | null
    tsfc_kg_per_Ns?: number | null
    compressor_pr?: number | null
    turbine_inlet_temp_K?: number | null
    n1_percent?: number | null
  }
  station_profile?: StationProfilePoint[]
  performance_curve?: PerformanceCurvePoint[]
  table_columns?: string[]
  table_rows?: Record<string, string | number | null>[]
  row_count?: number
}

export const API = {
  // Health check
  getHealth: async () => {
    const res = await client.get('/health')
    return res.data
  },

  // Engines
  listEngines: async (): Promise<string[]> => {
    const res = await client.get('/engines')
    return res.data.engines
  },

  getEngineSchema: async (engineName: string): Promise<EngineSchema> => {
    const res = await client.get(`/engines/${engineName}/schema`)
    return res.data
  },

  runEngine: async (
    engineName: string,
    runMode: string = 'DP',
    parameters: Record<string, any> = {}
  ): Promise<SimulationResults> => {
    const res = await client.post(`/engines/${engineName}/run`, {
      engine_name: engineName,
      run_mode: runMode,
      parameters,
    })
    return res.data
  },

  // Custom engines
  getAvailableComponents: async () => {
    const res = await client.get('/engines/custom/components')
    return res.data.available_components
  },

  runCustomEngine: async (
    engineName: string,
    components: any[],
    runMode: string = 'DP'
  ): Promise<SimulationResults> => {
    const res = await client.post('/custom-engines/run', {
      engine_name: engineName,
      components,
      run_mode: runMode,
    })
    return res.data
  },
}
