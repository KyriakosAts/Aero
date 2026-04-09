import {
  buildCustomEngineDemo,
  buildPresetDemo,
  getAvailableComponents,
  getEngineSchema,
  listEngines,
} from './demo-data.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload),
  }
}

function parseRequestPath(event) {
  const rawPath = event.path || '/'
  const normalizedPath = rawPath
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '')

  return normalizedPath === '' ? '/' : normalizedPath
}

function parseRequestBody(event) {
  if (!event.body) {
    return {}
  }

  try {
    return JSON.parse(event.body)
  } catch {
    return null
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    }
  }

  const method = event.httpMethod
  const requestPath = parseRequestPath(event)
  const pathSegments = requestPath.split('/').filter(Boolean)

  if (method === 'GET' && requestPath === '/health') {
    return jsonResponse(200, {
      status: 'ok',
      service: 'GSPy Web Engine',
      mode: 'demo',
      platform: 'netlify',
    })
  }

  if (method === 'GET' && requestPath === '/engines') {
    return jsonResponse(200, { engines: listEngines() })
  }

  if (method === 'GET' && requestPath === '/engines/custom/components') {
    return jsonResponse(200, { available_components: getAvailableComponents() })
  }

  if (method === 'GET' && pathSegments[0] === 'engines' && pathSegments[2] === 'schema') {
    const engineName = pathSegments[1]
    const schema = getEngineSchema(engineName)

    if (!schema) {
      return jsonResponse(404, { detail: `Engine '${engineName}' not found` })
    }

    return jsonResponse(200, schema)
  }

  if (method === 'POST' && pathSegments[0] === 'engines' && pathSegments[2] === 'run') {
    const engineName = pathSegments[1]
    const schema = getEngineSchema(engineName)
    if (!schema) {
      return jsonResponse(404, { detail: `Engine '${engineName}' not found` })
    }

    const requestBody = parseRequestBody(event)
    if (requestBody === null) {
      return jsonResponse(400, { detail: 'Invalid JSON payload' })
    }

    if (requestBody.engine_name && requestBody.engine_name !== engineName) {
      return jsonResponse(400, {
        detail: `Engine mismatch: path engine is '${engineName}' but payload engine is '${requestBody.engine_name}'`,
      })
    }

    const runMode = requestBody.run_mode || 'DP'
    const demoPayload = buildPresetDemo(engineName, runMode, requestBody.parameters || {})
    return jsonResponse(200, {
      engine_name: engineName,
      run_mode: runMode,
      status: 'success',
      data: demoPayload,
    })
  }

  if (method === 'POST' && requestPath === '/custom-engines/run') {
    const requestBody = parseRequestBody(event)
    if (requestBody === null) {
      return jsonResponse(400, { detail: 'Invalid JSON payload' })
    }

    const engineName = String(requestBody.engine_name || '').trim()
    const components = Array.isArray(requestBody.components) ? requestBody.components : []

    if (!engineName) {
      return jsonResponse(400, { detail: 'Engine name is required' })
    }

    if (components.length === 0) {
      return jsonResponse(400, { detail: 'At least one component is required' })
    }

    const demoPayload = buildCustomEngineDemo(engineName, components)
    return jsonResponse(200, {
      engine_name: engineName,
      run_mode: 'DP',
      status: 'success',
      data: demoPayload,
    })
  }

  return jsonResponse(404, {
    detail: `No Netlify demo route matched '${requestPath}'`,
  })
}
