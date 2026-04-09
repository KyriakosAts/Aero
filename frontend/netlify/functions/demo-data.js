const PRESET_ENGINES = ['turbojet', 'turbojet_n1', 'turbofan', 'turbofan_n1']

const COMPONENT_LIBRARY = [
  {
    type: 'Ambient',
    description: 'Ambient conditions (altitude, temperature)',
    parameters: ['altitude', 'temperature_offset', 'humidity'],
  },
  {
    type: 'Inlet',
    description: 'Engine inlet',
    parameters: ['efficiency', 'pressure_recovery'],
  },
  {
    type: 'Compressor',
    description: 'Compression stage',
    parameters: ['pressure_ratio', 'efficiency', 'speed'],
  },
  {
    type: 'Combustor',
    description: 'Combustion chamber',
    parameters: ['fuel_flow', 'efficiency', 'outlet_temperature'],
  },
  {
    type: 'Turbine',
    description: 'Turbine stage',
    parameters: ['pressure_ratio', 'efficiency', 'speed'],
  },
  {
    type: 'Nozzle',
    description: 'Exit nozzle',
    parameters: ['throat_area', 'exit_area'],
  },
]

const ENGINE_SCHEMAS = {
  turbojet: [
    {
      name: 'altitude',
      description: 'Flight altitude in meters',
      type: 'number',
      default: 0,
      min: 0,
      max: 15000,
    },
    {
      name: 'mach',
      description: 'Flight Mach number',
      type: 'number',
      default: 0,
      min: 0,
      max: 0.95,
    },
    {
      name: 'temperature_offset',
      description: 'Temperature offset from ISA (deg C)',
      type: 'number',
      default: 0,
      min: -50,
      max: 50,
    },
  ],
  turbofan: [
    {
      name: 'altitude',
      description: 'Flight altitude in meters',
      type: 'number',
      default: 0,
      min: 0,
      max: 15000,
    },
    {
      name: 'mach',
      description: 'Flight Mach number',
      type: 'number',
      default: 0,
      min: 0,
      max: 0.95,
    },
    {
      name: 'fan_speed',
      description: 'Fan speed (N1 as % of design)',
      type: 'number',
      default: 85,
      min: 50,
      max: 100,
    },
    {
      name: 'core_speed',
      description: 'Core speed (N2 as % of design)',
      type: 'number',
      default: 85,
      min: 50,
      max: 100,
    },
  ],
}

const BASE_TURBOJET_CURVE = [
  {
    point: 0,
    fuel_flow: 0.38,
    net_thrust: 14689.04,
    gross_thrust: 15423.49,
    n1_percent: 100,
    mach_exit: 0.058,
    turbine_inlet_temp: 1235.9,
    compressor_pr: 6.92,
  },
  {
    point: 5,
    fuel_flow: 0.33,
    net_thrust: 13122.48,
    gross_thrust: 13778.6,
    n1_percent: 95.97,
    mach_exit: 0.058,
    turbine_inlet_temp: 1167.06,
    compressor_pr: 6.402,
  },
  {
    point: 10,
    fuel_flow: 0.28,
    net_thrust: 11414.39,
    gross_thrust: 11985.11,
    n1_percent: 92.66,
    mach_exit: 0.058,
    turbine_inlet_temp: 1096.11,
    compressor_pr: 5.84,
  },
  {
    point: 15,
    fuel_flow: 0.23,
    net_thrust: 9660.01,
    gross_thrust: 10143.01,
    n1_percent: 90.01,
    mach_exit: 0.058,
    turbine_inlet_temp: 1015.26,
    compressor_pr: 5.267,
  },
  {
    point: 20,
    fuel_flow: 0.18,
    net_thrust: 7728.03,
    gross_thrust: 8114.43,
    n1_percent: 86.05,
    mach_exit: 0.981,
    turbine_inlet_temp: 926.7,
    compressor_pr: 4.629,
  },
  {
    point: 25,
    fuel_flow: 0.13,
    net_thrust: 4861.44,
    gross_thrust: 5104.51,
    n1_percent: 75.81,
    mach_exit: 0.778,
    turbine_inlet_temp: 868.03,
    compressor_pr: 3.55,
  },
  {
    point: 28,
    fuel_flow: 0.1,
    net_thrust: 2630.14,
    gross_thrust: 2761.65,
    n1_percent: 62.25,
    mach_exit: 0.574,
    turbine_inlet_temp: 879.59,
    compressor_pr: 2.521,
  },
  {
    point: 30,
    fuel_flow: 0.08,
    net_thrust: 1463.75,
    gross_thrust: 1536.94,
    n1_percent: 50.48,
    mach_exit: 0.43,
    turbine_inlet_temp: 902.57,
    compressor_pr: 1.895,
  },
]

const BASE_TURBOJET_STATIONS = [
  { station: '0', temperature_K: 288.15, pressure_Pa: 101325 },
  { station: '2', temperature_K: 288.15, pressure_Pa: 101325 },
  { station: '3', temperature_K: 542.01, pressure_Pa: 701169 },
  { station: '4', temperature_K: 1235.9, pressure_Pa: 701169 },
  { station: '5', temperature_K: 1022.56, pressure_Pa: 281252.96 },
  { station: '8', temperature_K: 878.59, pressure_Pa: 151779.18 },
  { station: '9', temperature_K: 579.71, pressure_Pa: 101325 },
]

const BASE_TURBOFAN_STATIONS = [
  { station: '0', temperature_K: 288.15, pressure_Pa: 101325 },
  { station: '2', temperature_K: 295.4, pressure_Pa: 118500 },
  { station: '3', temperature_K: 676.2, pressure_Pa: 1335000 },
  { station: '4', temperature_K: 1465.0, pressure_Pa: 1328000 },
  { station: '5', temperature_K: 1188.0, pressure_Pa: 522000 },
  { station: '8', temperature_K: 812.0, pressure_Pa: 186500 },
  { station: '9', temperature_K: 645.0, pressure_Pa: 109000 },
]

const ENGINE_PROFILES = {
  turbojet: {
    description: 'Basic turbojet engine',
    thrustScale: 1,
    fuelScale: 1,
    pressureScale: 1,
    temperatureScale: 1,
    n1Scale: 1,
    curveShape: 1,
    stationProfile: BASE_TURBOJET_STATIONS,
  },
  turbojet_n1: {
    description: 'Turbojet with N1 speed control',
    thrustScale: 0.97,
    fuelScale: 0.95,
    pressureScale: 1.02,
    temperatureScale: 0.99,
    n1Scale: 0.985,
    curveShape: 0.985,
    stationProfile: BASE_TURBOJET_STATIONS,
  },
  turbofan: {
    description: 'Basic turbofan engine',
    thrustScale: 2.85,
    fuelScale: 1.55,
    pressureScale: 1.9,
    temperatureScale: 1.08,
    n1Scale: 0.92,
    curveShape: 1.07,
    stationProfile: BASE_TURBOFAN_STATIONS,
  },
  turbofan_n1: {
    description: 'Turbofan with N1 control',
    thrustScale: 2.72,
    fuelScale: 1.48,
    pressureScale: 1.82,
    temperatureScale: 1.05,
    n1Scale: 0.9,
    curveShape: 1.03,
    stationProfile: BASE_TURBOFAN_STATIONS,
  },
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function round(value, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value))
  if (validValues.length === 0) {
    return null
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
}

function standardPressureAtAltitude(altitude) {
  const normalized = 1 - 2.25577e-5 * altitude
  if (normalized <= 0) {
    return 12000
  }
  return 101325 * normalized ** 5.25588
}

function standardTemperatureAtAltitude(altitude, temperatureOffset) {
  return clamp(288.15 - altitude * 0.0065 + temperatureOffset, 180, 340)
}

function summarizeCurve(performanceCurve) {
  const thrustValues = performanceCurve.map((row) => row.net_thrust)
  const fuelValues = performanceCurve.map((row) => row.fuel_flow)
  const compressorValues = performanceCurve.map((row) => row.compressor_pr)
  const turbineValues = performanceCurve.map((row) => row.turbine_inlet_temp)
  const n1Values = performanceCurve.map((row) => row.n1_percent)
  const tsfcValues = performanceCurve
    .filter((row) => row.net_thrust > 0)
    .map((row) => row.fuel_flow / row.net_thrust)

  return {
    net_thrust_N: round(average(thrustValues) ?? 0, 2),
    fuel_flow_kg_s: round(average(fuelValues) ?? 0, 4),
    tsfc_kg_per_Ns: round(average(tsfcValues) ?? 0, 6),
    compressor_pr: round(average(compressorValues) ?? 0, 3),
    turbine_inlet_temp_K: round(average(turbineValues) ?? 0, 2),
    n1_percent: round(average(n1Values) ?? 0, 2),
  }
}

function buildTableRows(performanceCurve, runMode) {
  return performanceCurve.map((row) => ({
    Point: row.point,
    Mode: runMode,
    Fuel_Flow_kg_s: row.fuel_flow,
    Net_Thrust_N: row.net_thrust,
    Gross_Thrust_N: row.gross_thrust,
    N1_percent: row.n1_percent,
    Compressor_PR: row.compressor_pr,
    Turbine_Inlet_Temperature_K: row.turbine_inlet_temp,
    Exit_Mach: row.mach_exit,
  }))
}

function getParameterFactors(engineName, parameters = {}) {
  const altitude = clamp(toNumber(parameters.altitude, 0), 0, 15000)
  const mach = clamp(toNumber(parameters.mach, 0), 0, 0.95)
  const temperatureOffset = clamp(toNumber(parameters.temperature_offset, 0), -50, 50)
  const fanSpeed = clamp(toNumber(parameters.fan_speed, 85), 50, 100)
  const coreSpeed = clamp(toNumber(parameters.core_speed, 85), 50, 100)
  const altitudeFraction = altitude / 15000
  const engineIsTurbofan = engineName.startsWith('turbofan')
  const fanFactor = fanSpeed / 85
  const coreFactor = coreSpeed / 85
  const speedBlend = engineIsTurbofan
    ? 0.55 * fanFactor + 0.45 * coreFactor
    : coreFactor

  const thrustFactor = clamp(
    (1 - altitudeFraction * (engineIsTurbofan ? 0.24 : 0.32)) *
      (1 + mach * (engineIsTurbofan ? 0.12 : 0.05)) *
      (1 - temperatureOffset * 0.0032) *
      speedBlend,
    0.42,
    1.45,
  )

  const fuelFactor = clamp(
    (1 - altitudeFraction * 0.14) *
      (1 + mach * 0.04) *
      (1 + temperatureOffset * 0.0026) *
      (0.7 + speedBlend * 0.3),
    0.5,
    1.35,
  )

  const pressureFactor = clamp((1 - altitudeFraction * 0.05) * (0.85 + speedBlend * 0.15), 0.8, 1.2)
  const temperatureFactor = clamp((1 + temperatureOffset * 0.0018) * (0.9 + speedBlend * 0.1), 0.85, 1.2)
  const n1Factor = clamp(0.94 + speedBlend * 0.08 - altitudeFraction * 0.04, 0.82, 1.12)

  return {
    altitude,
    mach,
    temperatureOffset,
    thrustFactor,
    fuelFactor,
    pressureFactor,
    temperatureFactor,
    n1Factor,
  }
}

export function listEngines() {
  return PRESET_ENGINES
}

export function getEngineSchema(engineName) {
  if (!PRESET_ENGINES.includes(engineName)) {
    return null
  }

  const schemaKey = engineName.startsWith('turbojet') ? 'turbojet' : 'turbofan'
  return {
    engine_name: engineName,
    parameters: ENGINE_SCHEMAS[schemaKey],
    description: ENGINE_PROFILES[engineName].description,
  }
}

export function getAvailableComponents() {
  return COMPONENT_LIBRARY
}

export function buildPresetDemo(engineName, runMode = 'DP', parameters = {}) {
  const profile = ENGINE_PROFILES[engineName]
  if (!profile) {
    return null
  }

  const factors = getParameterFactors(engineName, parameters)
  const ambientPressure = standardPressureAtAltitude(factors.altitude)
  const ambientTemperature = standardTemperatureAtAltitude(
    factors.altitude,
    factors.temperatureOffset,
  )

  const performanceCurve = BASE_TURBOJET_CURVE.map((row, index) => {
    const curveProgress = index / Math.max(BASE_TURBOJET_CURVE.length - 1, 1)
    const curveLift = 1 + (profile.curveShape - 1) * (0.45 + curveProgress * 0.55)
    const netThrust =
      row.net_thrust * profile.thrustScale * factors.thrustFactor * curveLift
    const fuelFlow = row.fuel_flow * profile.fuelScale * factors.fuelFactor
    const n1Percent = row.n1_percent * profile.n1Scale * factors.n1Factor

    return {
      point: row.point,
      fuel_flow: round(fuelFlow, 4),
      net_thrust: round(netThrust, 2),
      gross_thrust: round(netThrust * 1.045, 2),
      n1_percent: round(n1Percent, 2),
      mach_exit: round(clamp(row.mach_exit * (0.85 + factors.thrustFactor * 0.2), 0.03, 1.8), 3),
      turbine_inlet_temp: round(
        row.turbine_inlet_temp * profile.temperatureScale * factors.temperatureFactor,
        2,
      ),
      compressor_pr: round(
        row.compressor_pr * profile.pressureScale * factors.pressureFactor,
        3,
      ),
    }
  })

  const stationProfile = profile.stationProfile.map((station) => {
    if (station.station === '0' || station.station === '2') {
      return {
        station: station.station,
        temperature_K: round(ambientTemperature, 2),
        pressure_Pa: round(ambientPressure, 2),
      }
    }

    return {
      station: station.station,
      temperature_K: round(
        station.temperature_K * profile.temperatureScale * factors.temperatureFactor,
        2,
      ),
      pressure_Pa: round(
        station.pressure_Pa * profile.pressureScale * factors.pressureFactor * (ambientPressure / 101325),
        2,
      ),
    }
  })

  const tableRows = buildTableRows(performanceCurve, runMode)

  return {
    source: 'netlify_demo',
    warning:
      'This Netlify deployment serves representative demo data. Run the local or Docker stack for the live GSPy and Cantera solver.',
    summary: summarizeCurve(performanceCurve),
    station_profile: stationProfile,
    performance_curve: performanceCurve,
    table_columns: Object.keys(tableRows[0] ?? {}),
    table_rows: tableRows,
    row_count: tableRows.length,
    simulation_mode: runMode,
    parameter_notice:
      'Altitude, Mach, temperature offset, and available speed controls are applied to the demo estimator.',
  }
}

export function buildCustomEngineDemo(engineName, components = []) {
  const normalizedComponents = Array.isArray(components) ? components : []
  const componentTypes = normalizedComponents.map((component) => String(component.type || 'Component'))
  const componentNames = normalizedComponents.map((component, index) =>
    String(component.name || `${componentTypes[index]} ${index + 1}`),
  )

  const componentCounts = normalizedComponents.reduce(
    (counts, component) => {
      const key = String(component.type || '').toLowerCase()
      counts[key] = (counts[key] || 0) + 1
      return counts
    },
    {},
  )

  const ambientComponent = normalizedComponents.find(
    (component) => String(component.type || '').toLowerCase() === 'ambient',
  )
  const altitude = clamp(toNumber(ambientComponent?.parameters?.altitude, 0), 0, 15000)
  const temperatureOffset = clamp(
    toNumber(ambientComponent?.parameters?.temperature_offset, 0),
    -50,
    50,
  )

  const ambientPressure = standardPressureAtAltitude(altitude)
  const ambientTemperature = standardTemperatureAtAltitude(altitude, temperatureOffset)

  const compressorRatios = normalizedComponents
    .filter((component) => String(component.type || '').toLowerCase() === 'compressor')
    .map((component) => clamp(toNumber(component.parameters?.pressure_ratio, 3.2), 1.1, 8))

  const efficiencyValues = normalizedComponents
    .map((component) => toNumber(component.parameters?.efficiency, Number.NaN))
    .filter((value) => Number.isFinite(value))

  const speedValues = normalizedComponents
    .map((component) => toNumber(component.parameters?.speed, Number.NaN))
    .filter((value) => Number.isFinite(value))

  const outletTemperatureValues = normalizedComponents
    .filter((component) => String(component.type || '').toLowerCase() === 'combustor')
    .map((component) => clamp(toNumber(component.parameters?.outlet_temperature, 1180), 850, 1800))

  const throatAreaValues = normalizedComponents
    .filter((component) => String(component.type || '').toLowerCase() === 'nozzle')
    .map((component) => clamp(toNumber(component.parameters?.throat_area, 0.055), 0.02, 0.18))

  const compressorCount = componentCounts.compressor || 0
  const turbineCount = componentCounts.turbine || 0
  const combustorCount = componentCounts.combustor || 0
  const nozzleCount = componentCounts.nozzle || 0
  const inletCount = componentCounts.inlet || 0

  const meanCompressorRatio = average(compressorRatios) ?? 3.1
  const meanEfficiency = average(efficiencyValues) ?? 0.86
  const meanSpeed = average(speedValues) ?? 86
  const turbineInletTemperature = average(outletTemperatureValues) ?? 1180 + combustorCount * 55
  const throatArea = average(throatAreaValues) ?? 0.055

  const compressorPr = round(
    meanCompressorRatio * (1 + Math.max(0, compressorCount - 1) * 0.35),
    3,
  )
  const netThrustBase =
    (2200 + compressorCount * 1400 + turbineCount * 1650 + nozzleCount * 950 + inletCount * 280) *
    clamp(meanCompressorRatio / 3.1, 0.7, 2.2) *
    clamp(meanEfficiency / 0.86, 0.82, 1.12) *
    clamp(0.78 + meanSpeed / 120, 0.92, 1.32) *
    clamp(0.82 + throatArea * 2.2, 0.86, 1.18)

  const fuelFlowBase =
    (0.05 + combustorCount * 0.075 + turbineCount * 0.012 + compressorCount * 0.008) *
    clamp(turbineInletTemperature / 1200, 0.82, 1.3)

  const n1Percent = clamp(meanSpeed, 55, 100)
  const curvePoints = [0.55, 0.64, 0.73, 0.82, 0.91, 1.0]
  const performanceCurve = curvePoints.map((throttle, index) => {
    const curveBias = 0.86 + index * 0.075
    const thrust = netThrustBase * throttle * curveBias
    const fuel = fuelFlowBase * throttle

    return {
      point: index,
      fuel_flow: round(fuel, 4),
      net_thrust: round(thrust, 2),
      gross_thrust: round(thrust * 1.05, 2),
      n1_percent: round(clamp(n1Percent * (0.84 + index * 0.035), 45, 100), 2),
      mach_exit: round(clamp(0.22 + index * 0.09 + nozzleCount * 0.03, 0.2, 1.35), 3),
      turbine_inlet_temp: round(turbineInletTemperature * (0.9 + index * 0.025), 2),
      compressor_pr: round(compressorPr * (0.86 + index * 0.03), 3),
    }
  })

  const stationThreePressure = ambientPressure * compressorPr
  const stationProfile = [
    { station: '0', temperature_K: round(ambientTemperature, 2), pressure_Pa: round(ambientPressure, 2) },
    { station: '2', temperature_K: round(ambientTemperature + 8, 2), pressure_Pa: round(ambientPressure * 1.08, 2) },
    {
      station: '3',
      temperature_K: round(ambientTemperature * (1 + 0.16 * Math.max(1, compressorCount)), 2),
      pressure_Pa: round(stationThreePressure, 2),
    },
    {
      station: '4',
      temperature_K: round(turbineInletTemperature, 2),
      pressure_Pa: round(stationThreePressure * 0.98, 2),
    },
    {
      station: '5',
      temperature_K: round(turbineInletTemperature * 0.83, 2),
      pressure_Pa: round(stationThreePressure * 0.42, 2),
    },
    {
      station: '8',
      temperature_K: round(turbineInletTemperature * 0.62, 2),
      pressure_Pa: round(Math.max(ambientPressure * 1.35, stationThreePressure * 0.16), 2),
    },
    {
      station: '9',
      temperature_K: round(turbineInletTemperature * 0.48, 2),
      pressure_Pa: round(ambientPressure, 2),
    },
  ]

  const tableRows = buildTableRows(performanceCurve, 'DP')

  return {
    source: 'netlify_demo_custom',
    warning:
      'Custom Builder runs a structural demo estimator on Netlify. Use the local or Docker backend for the full live solver.',
    custom_builder: {
      engine_name: engineName,
      component_count: normalizedComponents.length,
      component_sequence: componentTypes,
      component_names: componentNames,
    },
    summary: summarizeCurve(performanceCurve),
    station_profile: stationProfile,
    performance_curve: performanceCurve,
    table_columns: Object.keys(tableRows[0] ?? {}),
    table_rows: tableRows,
    row_count: tableRows.length,
    simulation_mode: 'DP',
  }
}
