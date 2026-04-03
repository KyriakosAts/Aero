import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Trash2, Play, Shuffle } from 'lucide-react'
import { Card } from '../components/Card'
import { Alert } from '../components/Alert'
import { Loading } from '../components/Loading'
import { ResultsDashboard } from '../components/ResultsDashboard'
import { API, SimulationResults } from '../api/client'

interface FlowNodeData {
  [key: string]: unknown
  label: string
  componentType: string
  name: string
  parameters: Record<string, any>
}

type FlowNode = Node<FlowNodeData>

interface ComponentTemplate {
  type: string
  description: string
  parameters: string[]
}

const FALLBACK_COMPONENT_LIBRARY: ComponentTemplate[] = [
  { type: 'Ambient', description: 'Atmospheric conditions', parameters: ['altitude', 'temperature_offset', 'humidity'] },
  { type: 'Inlet', description: 'Intake system', parameters: ['efficiency', 'pressure_recovery'] },
  { type: 'Compressor', description: 'Compression stage', parameters: ['pressure_ratio', 'efficiency', 'speed'] },
  { type: 'Combustor', description: 'Fuel combustion', parameters: ['fuel_flow', 'efficiency', 'outlet_temperature'] },
  { type: 'Turbine', description: 'Expansion turbine', parameters: ['pressure_ratio', 'efficiency', 'speed'] },
  { type: 'Nozzle', description: 'Exit nozzle', parameters: ['throat_area', 'exit_area'] },
]

function parseValue(raw: string) {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return ''
  }
  const maybeNumber = Number(trimmed)
  return Number.isNaN(maybeNumber) ? trimmed : maybeNumber
}

export function CustomBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [engineName, setEngineName] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SimulationResults | null>(null)
  const [componentLibrary, setComponentLibrary] = useState<ComponentTemplate[]>(FALLBACK_COMPONENT_LIBRARY)
  const [customParamDraft, setCustomParamDraft] = useState<Record<string, { key: string; value: string }>>({})
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const loadComponents = async () => {
      try {
        const apiComponents = await API.getAvailableComponents()
        if (Array.isArray(apiComponents) && apiComponents.length > 0) {
          setComponentLibrary(apiComponents)
        }
      } catch {
        setComponentLibrary(FALLBACK_COMPONENT_LIBRARY)
      }
    }

    loadComponents()
  }, [])

  const templatesByType = useMemo(() => {
    const mapping: Record<string, ComponentTemplate> = {}
    for (const template of componentLibrary) {
      mapping[template.type] = template
    }
    return mapping
  }, [componentLibrary])

  const createFlowNode = (type: string, position: { x: number; y: number }): FlowNode => {
    const sameTypeCount = nodes.filter((n) => n.data.componentType === type).length + 1
    const name = `${type} ${sameTypeCount}`
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'default',
      position,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: `${type}: ${name}`,
        componentType: type,
        name,
        parameters: {},
      },
      style: {
        border: '1px solid #475569',
        borderRadius: '10px',
        background: 'rgba(15, 23, 42, 0.9)',
        color: '#e2e8f0',
        minWidth: 170,
      },
    }
  }

  const addComponent = (type: string) => {
    const newNode = createFlowNode(type, {
      x: 60 + (nodes.length % 4) * 220,
      y: 60 + Math.floor(nodes.length / 4) * 120,
    })
    setNodes((prev) => [...prev, newNode])
    setSelectedNodeId(newNode.id)
  }

  const removeSelectedNode = () => {
    if (!selectedNodeId) {
      return
    }

    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId))
    setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId))
    setCustomParamDraft((prev) => {
      const copy = { ...prev }
      delete copy[selectedNodeId]
      return copy
    })
    setSelectedNodeId(null)
  }

  const clearFlow = () => {
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setCustomParamDraft({})
  }

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )

  const updateSelectedNodeData = (updater: (current: FlowNodeData) => FlowNodeData) => {
    if (!selectedNodeId) {
      return
    }

    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: updater(node.data),
            }
          : node
      )
    )
  }

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((prev) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
            style: { stroke: '#38bdf8', strokeWidth: 2 },
          },
          prev
        )
      )
    },
    [setEdges]
  )

  const onDragStart = (event: DragEvent<HTMLElement>, componentType: string) => {
    event.dataTransfer.setData('application/gspy-component', componentType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const componentType = event.dataTransfer.getData('application/gspy-component')
      if (!componentType || !flowInstance) {
        return
      }

      const position = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const newNode = createFlowNode(componentType, position)
      setNodes((prev) => [...prev, newNode])
      setSelectedNodeId(newNode.id)
    },
    [flowInstance, nodes, setNodes]
  )

  const buildOrderedComponents = (flowNodes: FlowNode[], flowEdges: Edge[]) => {
    if (flowNodes.length === 0) {
      return []
    }

    const nodeById = new Map(flowNodes.map((node) => [node.id, node]))
    const inDegree = new Map(flowNodes.map((node) => [node.id, 0]))
    const adjacency = new Map(flowNodes.map((node) => [node.id, [] as string[]]))

    flowEdges.forEach((edge) => {
      if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
        return
      }
      adjacency.get(edge.source)?.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    })

    const queue = Array.from(inDegree.entries())
      .filter(([, deg]) => deg === 0)
      .map(([id]) => id)
      .sort((a, b) => (nodeById.get(a)?.position.x ?? 0) - (nodeById.get(b)?.position.x ?? 0))

    const orderedIds: string[] = []
    while (queue.length > 0) {
      const current = queue.shift() as string
      orderedIds.push(current)

      const neighbors = (adjacency.get(current) ?? []).sort(
        (a, b) => (nodeById.get(a)?.position.x ?? 0) - (nodeById.get(b)?.position.x ?? 0)
      )

      neighbors.forEach((targetId) => {
        const nextDegree = (inDegree.get(targetId) ?? 0) - 1
        inDegree.set(targetId, nextDegree)
        if (nextDegree === 0) {
          queue.push(targetId)
          queue.sort((a, b) => (nodeById.get(a)?.position.x ?? 0) - (nodeById.get(b)?.position.x ?? 0))
        }
      })
    }

    if (orderedIds.length !== flowNodes.length) {
      throw new Error('Flow has a cycle. Please remove looped connections before running.')
    }

    return orderedIds.map((nodeId) => {
      const node = nodeById.get(nodeId) as FlowNode
      return {
        type: node.data.componentType,
        name: node.data.name,
        parameters: node.data.parameters,
      }
    })
  }

  const updateParameter = (nodeId: string, key: string, value: string) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                parameters: {
                  ...node.data.parameters,
                  [key]: parseValue(value),
                },
              },
            }
          : node
      )
    )
  }

  const addCustomParameter = (nodeId: string) => {
    const draft = customParamDraft[nodeId]
    if (!draft || !draft.key.trim()) {
      return
    }

    updateParameter(nodeId, draft.key.trim(), draft.value)
    setCustomParamDraft((prev) => ({
      ...prev,
      [nodeId]: { key: '', value: '' },
    }))
  }

  const removeParameter = (nodeId: string, key: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) {
          return node
        }
        const next = { ...node.data.parameters }
        delete next[key]
        return {
          ...node,
          data: {
            ...node.data,
            parameters: next,
          },
        }
      })
    )
  }

  const handleRunSimulation = async () => {
    if (!engineName) {
      setAlert({
        type: 'error',
        message: 'Please enter an engine name',
      })
      return
    }

    if (nodes.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please add at least one component',
      })
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const payload = buildOrderedComponents(nodes, edges)
      const result = await API.runCustomEngine(engineName, payload, 'DP')
      setResults(result)

      if (result.status !== 'success') {
        throw new Error(result.error || 'Custom simulation failed')
      }

      setAlert({
        type: 'success',
        message: 'Custom engine simulation completed!',
      })
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

      <Card title="Engine Configuration">
        <div>
          <label className="block text-sm font-medium mb-2">Engine Name</label>
          <input
            type="text"
            value={engineName}
            onChange={(e) => setEngineName(e.target.value)}
            placeholder="Enter a name for your custom engine"
            className="input-field"
          />
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Component Palette" description="Drag to canvas or click + to add">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {componentLibrary.map((comp) => (
              <div
                key={comp.type}
                draggable
                onDragStart={(event) => onDragStart(event, comp.type)}
                className="w-full p-3 rounded-lg border border-slate-600 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all text-left flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-sm">{comp.type}</p>
                  <p className="text-xs text-slate-400">{comp.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => addComponent(comp.type)}
                  className="h-8 w-8 rounded-md border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 flex items-center justify-center shrink-0"
                  aria-label={`Add ${comp.type}`}
                >
                  <Plus size={14} className="text-cyan-300" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 flex gap-6">
            <p>Nodes: {nodes.length}</p>
            <p>Connections: {edges.length}</p>
          </div>
        </Card>

        <Card title="Engine Flow Canvas" description="Connect components to define run order" className="w-full">
          <div className="h-[760px] rounded-lg border border-slate-700 overflow-hidden" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow<FlowNode, Edge>
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setFlowInstance}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onSelectionChange={(params) => setSelectedNodeId(params.nodes[0]?.id ?? null)}
              fitView
            >
              <MiniMap pannable zoomable style={{ background: '#0f172a' }} />
              <Controls />
              <Background color="#334155" gap={20} />
            </ReactFlow>
          </div>
          <div className="flex items-center justify-end mt-3">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={clearFlow}>
              <Shuffle size={16} /> Clear Flow
            </button>
          </div>
        </Card>

        <Card title="Node Inspector" description="Edit selected component">
          {!selectedNode ? (
            <p className="text-sm text-slate-400">Select a node in the canvas to edit its name and parameters.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Component Name</label>
                <input
                  type="text"
                  value={selectedNode.data.name}
                  onChange={(e) =>
                    updateSelectedNodeData((current) => ({
                      ...current,
                      name: e.target.value,
                      label: `${current.componentType}: ${e.target.value}`,
                    }))
                  }
                  className="parameter-input"
                />
              </div>

              <p className="text-sm text-slate-400">
                Type: <span className="font-mono text-cyan-300">{selectedNode.data.componentType}</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(templatesByType[selectedNode.data.componentType]?.parameters ?? []).map((parameterName) => (
                  <div key={parameterName}>
                    <label className="text-xs text-slate-400 block mb-1">{parameterName}</label>
                    <input
                      type="text"
                      value={String(selectedNode.data.parameters[parameterName] ?? '')}
                      onChange={(e) => updateParameter(selectedNode.id, parameterName, e.target.value)}
                      className="parameter-input"
                    />
                  </div>
                ))}
              </div>

              {Object.keys(selectedNode.data.parameters).length > 0 && (
                <div className="border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Current Parameters</p>
                  <div className="space-y-2">
                    {Object.entries(selectedNode.data.parameters).map(([paramKey, paramValue]) => (
                      <div key={paramKey} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-slate-300 truncate"><span className="font-mono text-cyan-300">{paramKey}</span> = {String(paramValue)}</span>
                        <button type="button" className="text-red-400 hover:text-red-300" onClick={() => removeParameter(selectedNode.id, paramKey)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Custom parameter key</label>
                  <input
                    type="text"
                    value={customParamDraft[selectedNode.id]?.key ?? ''}
                    onChange={(e) =>
                      setCustomParamDraft((prev) => ({
                        ...prev,
                        [selectedNode.id]: { key: e.target.value, value: prev[selectedNode.id]?.value ?? '' },
                      }))
                    }
                    className="parameter-input"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Value</label>
                  <input
                    type="text"
                    value={customParamDraft[selectedNode.id]?.value ?? ''}
                    onChange={(e) =>
                      setCustomParamDraft((prev) => ({
                        ...prev,
                        [selectedNode.id]: { key: prev[selectedNode.id]?.key ?? '', value: e.target.value },
                      }))
                    }
                    className="parameter-input"
                  />
                </div>
                <button type="button" className="btn-secondary" onClick={() => addCustomParameter(selectedNode.id)}>
                  Add Parameter
                </button>
              </div>

              <button type="button" className="w-full px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 flex items-center justify-center gap-2" onClick={removeSelectedNode}>
                <Trash2 size={16} /> Remove Node
              </button>
            </div>
          )}
        </Card>
      </div>

      {nodes.length > 0 && (
        <button
          type="button"
          onClick={handleRunSimulation}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <Play size={20} />
          {loading ? 'Running...' : 'Run Custom Engine'}
        </button>
      )}

      {loading && <Loading message="Running custom simulation..." />}

      {results && !loading && (
        <div className="space-y-4">
          <Card title="Simulation Status" className="border-l-4 border-l-green-500">
            <p className={`font-mono text-lg font-bold ${results.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {results.status.toUpperCase()}
            </p>
          </Card>

          {results.data && <ResultsDashboard data={results.data} />}

          {!results.data && results.status === 'success' && (
            <Alert
              type="info"
              title="No Result Payload"
              message="Simulation completed but no data payload was returned."
            />
          )}

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
