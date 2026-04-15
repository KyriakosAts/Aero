"""
GSPy Web Service Backend
FastAPI wrapper around GSPy gas turbine simulation engine
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import math
import os
from pathlib import Path
import sys

# Add the workspace to path so we can import from projects and src
workspace_root = Path(__file__).parent.parent
sys.path.insert(0, str(workspace_root / "src"))
sys.path.insert(0, str(workspace_root))

# Ensure Cantera can find bundled fluid property files.
# GSPy refers to: data/fluid_props/jetsurf.yaml
cantera_data_dir = workspace_root / "src" / "gspy"
if cantera_data_dir.exists():
    existing_cantera_data = os.environ.get("CANTERA_DATA", "")
    os.environ["CANTERA_DATA"] = (
        f"{cantera_data_dir}:{existing_cantera_data}"
        if existing_cantera_data
        else str(cantera_data_dir)
    )

# Import GSPy API (gspy is in src/gspy)
try:
    from gspy.api import gspy_api
except ImportError as e:
    print(f"Warning: Could not import gspy_api: {e}")
    print(f"Python path: {sys.path}")
    gspy_api = None

app = FastAPI(
    title="GSPy Web Engine",
    description="Gas Turbine Performance Simulation API",
    version="1.0.0",
)

frontend_dist_dir = workspace_root / "frontend" / "dist"
frontend_assets_dir = frontend_dist_dir / "assets"
frontend_index_file = frontend_dist_dir / "index.html"

# Enable CORS – configurable via CORS_ORIGINS env var (comma-separated).
# When unset, defaults to ["*"] for local development.
_cors_env = os.environ.get("CORS_ORIGINS", "")
_allowed_origins = (
    [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Pydantic Models for Request/Response
# ============================================================================

class EngineListResponse(BaseModel):
    """List of available engines"""
    engines: List[str]

class EngineParameter(BaseModel):
    """Parameter definition for an engine"""
    name: str
    description: str
    type: str
    default: Optional[Any] = None
    min: Optional[float] = None
    max: Optional[float] = None

class EngineSchema(BaseModel):
    """Schema for an engine's configuration"""
    engine_name: str
    parameters: List[EngineParameter]
    description: str

class RunSimulationRequest(BaseModel):
    """Request to run a preset engine"""
    engine_name: str
    run_mode: str = "DP"  # Design Point or Off-Design
    parameters: Dict[str, Any] = Field(default_factory=dict)

class CustomEngineComponent(BaseModel):
    """A component in a custom engine"""
    type: str  # Compressor, Turbine, Combustor, etc.
    name: str
    parameters: Dict[str, Any]

class RunCustomEngineRequest(BaseModel):
    """Request to run a custom-configured engine"""
    engine_name: str
    components: List[CustomEngineComponent]
    run_mode: str = "DP"

class SimulationResults(BaseModel):
    """Results from simulation"""
    engine_name: str
    run_mode: str
    status: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Available Engines Registry
# ============================================================================

AVAILABLE_ENGINES = {
    "turbojet": {
        "module": "projects.turbojet.turbojet",
        "api_model": "projects.turbojet_api.turbojet",
        "description": "Basic turbojet engine",
    },
    "turbojet_n1": {
        "module": "projects.turbojet.turbojet_Ncontrol",
        "api_model": None,
        "description": "Turbojet with N1 speed control",
    },
    "turbofan": {
        "module": "projects.turbofan.turbofan",
        "api_model": None,
        "description": "Basic turbofan engine",
    },
    "turbofan_n1": {
        "module": "projects.turbofan.turbofan_N1control",
        "api_model": None,
        "description": "Turbofan with N1 control",
    },
}


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _kn_to_n(value: Any) -> Optional[float]:
    thrust_kn = _to_float(value)
    if thrust_kn is None:
        return None
    return thrust_kn * 1000.0


def _json_safe_value(value: Any) -> Any:
    if value is None:
        return None

    if hasattr(value, "item"):
        try:
            return _json_safe_value(value.item())
        except Exception:
            pass

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value

    return value


def _normalize_table_rows(raw_rows: Any) -> List[Dict[str, Any]]:
    if raw_rows is None:
        return []

    if hasattr(raw_rows, "to_dict"):
        try:
            raw_rows = raw_rows.to_dict(orient="records")
        except Exception:
            pass

    if isinstance(raw_rows, dict):
        for key in ("table_rows", "rows", "results", "records"):
            candidate = raw_rows.get(key)
            if isinstance(candidate, list):
                raw_rows = candidate
                break

    if not isinstance(raw_rows, list):
        return []

    normalized_rows: List[Dict[str, Any]] = []
    for row in raw_rows:
        if not isinstance(row, dict):
            continue
        normalized_rows.append(
            {str(key): _json_safe_value(value) for key, value in row.items()}
        )

    return normalized_rows


def _build_dataset_from_table_rows(
    table_rows: List[Dict[str, Any]],
    source: str,
    preferred_mode: str = "DP",
) -> Dict[str, Any]:
    if not table_rows:
        raise ValueError("Simulation produced no tabular output rows")

    dp_row = next((row for row in table_rows if str(row.get("Mode", "")).upper() == "DP"), table_rows[0])
    od_rows = [row for row in table_rows if str(row.get("Mode", "")).upper() == "OD"]
    normalized_mode = preferred_mode.upper()

    if normalized_mode == "OD" and od_rows:
        summary_row = od_rows[-1]
        series_rows = od_rows

        def _avg(values: List[float]) -> Optional[float]:
            return (sum(values) / len(values)) if values else None

        thrust_values = [_kn_to_n(row.get("FN")) for row in od_rows]
        thrust_values = [value for value in thrust_values if value is not None]

        fuel_values = [
            _to_float(row.get("WF")) or _to_float(row.get("Wf_combustor1"))
            for row in od_rows
        ]
        fuel_values = [value for value in fuel_values if value is not None]

        compressor_pr_values = [_to_float(row.get("PR_compressor1")) for row in od_rows]
        compressor_pr_values = [value for value in compressor_pr_values if value is not None]

        t4_values = [_to_float(row.get("T4")) for row in od_rows]
        t4_values = [value for value in t4_values if value is not None]

        n1_values = [_to_float(row.get("N1%")) for row in od_rows]
        n1_values = [value for value in n1_values if value is not None]

        tsfc_values: List[float] = []
        for row in od_rows:
            fuel = _to_float(row.get("WF")) or _to_float(row.get("Wf_combustor1"))
            thrust = _kn_to_n(row.get("FN"))
            if fuel is None or thrust in (None, 0.0):
                continue
            tsfc_values.append(fuel / thrust)

        summary = {
            "net_thrust_N": _avg(thrust_values),
            "fuel_flow_kg_s": _avg(fuel_values),
            "tsfc_kg_per_Ns": _avg(tsfc_values),
            "compressor_pr": _avg(compressor_pr_values),
            "turbine_inlet_temp_K": _avg(t4_values),
            "n1_percent": _avg(n1_values),
        }
    else:
        summary_row = dp_row
        series_rows = od_rows if od_rows else table_rows

        fuel_flow = _to_float(summary_row.get("WF")) or _to_float(summary_row.get("Wf_combustor1"))
        net_thrust = _kn_to_n(summary_row.get("FN"))
        tsfc = None
        if fuel_flow is not None and net_thrust not in (None, 0.0):
            tsfc = fuel_flow / net_thrust

        summary = {
            "net_thrust_N": net_thrust,
            "fuel_flow_kg_s": fuel_flow,
            "tsfc_kg_per_Ns": tsfc,
            "compressor_pr": _to_float(summary_row.get("PR_compressor1")),
            "turbine_inlet_temp_K": _to_float(summary_row.get("T4")),
            "n1_percent": _to_float(summary_row.get("N1%")),
        }

    station_map = [
        ("0", "T0", "P0"),
        ("2", "T2", "P2"),
        ("3", "T3", "P3"),
        ("4", "T4", "P4"),
        ("5", "T5", "P5"),
        ("7", "T7", "P7"),
        ("8", "T8", "P8"),
        ("9", "T9", "P9"),
    ]

    station_profile = []
    for station, t_key, p_key in station_map:
        temp = _to_float(summary_row.get(t_key))
        press = _to_float(summary_row.get(p_key))
        if temp is None and press is None:
            continue
        station_profile.append(
            {
                "station": station,
                "temperature_K": temp,
                "pressure_Pa": press,
            }
        )

    performance_curve = []
    for row in series_rows:
        performance_curve.append(
            {
                "point": _to_float(row.get("Point/Time")),
                "fuel_flow": _to_float(row.get("Wf_combustor1")) or _to_float(row.get("WF")),
                "net_thrust": _kn_to_n(row.get("FN")),
                "gross_thrust": _kn_to_n(row.get("FG")),
                "n1_percent": _to_float(row.get("N1%")),
                "mach_exit": _to_float(row.get("Mach8")),
                "turbine_inlet_temp": _to_float(row.get("T4")),
                "compressor_pr": _to_float(row.get("PR_compressor1")),
            }
        )

    return {
        "source": source,
        "summary": summary,
        "station_profile": station_profile,
        "performance_curve": performance_curve,
        "table_columns": list(table_rows[0].keys()),
        "table_rows": table_rows,
        "row_count": len(table_rows),
    }


def _prepare_live_simulation_state() -> None:
    import numpy as np
    from gspy.core import system as core_system

    # Clear accumulated mutable globals so each request starts clean.
    core_system.OutputTable = None
    core_system.output_dict = {}
    core_system.components = {}
    core_system.gaspath_conditions = {}
    core_system.system_model = []
    core_system.shaft_list = []
    core_system.inputpoints = np.array([], dtype=float)
    core_system.states = np.array([], dtype=float)
    core_system.errors = np.array([], dtype=float)
    core_system.Ambient = None


def _configure_od_input_points() -> None:
    from gspy.core import system as core_system

    existing_points = getattr(core_system, "inputpoints", None)
    if existing_points is not None:
        try:
            if len(existing_points) > 0:
                return
        except TypeError:
            pass

    for component in getattr(core_system, "system_model", []):
        getter = getattr(component, "Get_OD_inputpoints", None)
        if not callable(getter):
            continue
        points = getter()
        if points is None:
            continue
        try:
            if len(points) > 0:
                core_system.inputpoints = points
                return
        except TypeError:
            continue

    raise RuntimeError(
        "OD mode requested, but no off-design input points are defined by this model"
    )


def _apply_live_preset_parameters(
    engine_name: str,
    run_mode: str,
    parameters: Dict[str, Any],
) -> Dict[str, List[str]]:
    from gspy.core import system as core_system

    components = getattr(core_system, "components", {}) or {}
    applied: List[str] = []

    ambient = components.get("Ambient")
    altitude = _to_float(parameters.get("altitude"))
    mach = _to_float(parameters.get("mach"))
    temperature_offset = _to_float(parameters.get("temperature_offset"))

    if ambient:
        mode_key = "DP" if run_mode.upper() == "DP" else "OD"

        def _mode_value(dp_attr: str, od_attr: str, fallback: float) -> float:
            if mode_key == "DP":
                return _to_float(getattr(ambient, dp_attr, None)) or fallback
            return (
                _to_float(getattr(ambient, od_attr, None))
                or _to_float(getattr(ambient, dp_attr, None))
                or fallback
            )

        altitude_value = altitude if altitude is not None else _mode_value("Altitude_des", "Altitude", 0.0)
        mach_value = mach if mach is not None else _mode_value("Macha_des", "Macha", 0.0)
        dts_value = temperature_offset if temperature_offset is not None else _mode_value("dTs_des", "dTs", 0.0)
        psa_value = getattr(ambient, "Psa_des", None) if mode_key == "DP" else getattr(ambient, "Psa", None)
        tsa_value = getattr(ambient, "Tsa_des", None) if mode_key == "DP" else getattr(ambient, "Tsa", None)

        if mode_key == "OD":
            # Keep OD ambient inputs consistent across the mandatory DP warm-up
            # and the subsequent OD sweep rows.
            ambient.SetConditions("DP", altitude_value, mach_value, dts_value, psa_value, tsa_value)
            ambient.SetConditions("OD", altitude_value, mach_value, dts_value, psa_value, tsa_value)
        else:
            ambient.SetConditions("DP", altitude_value, mach_value, dts_value, psa_value, tsa_value)
        if altitude is not None:
            applied.append("altitude")
        if mach is not None:
            applied.append("mach")
        if temperature_offset is not None:
            applied.append("temperature_offset")

    ignored = [key for key in parameters.keys() if key not in applied]
    return {"applied": sorted(set(applied)), "ignored": sorted(set(ignored))}


def _extract_live_simulation_rows(run_result: Any) -> List[Dict[str, Any]]:
    # Preferred path for future API evolution.
    get_results = getattr(gspy_api, "get_results", None)
    if callable(get_results):
        rows = _normalize_table_rows(get_results())
        if rows:
            return rows

    rows = _normalize_table_rows(run_result)
    if rows:
        return rows

    # Current GSPy writes results into core.system.OutputTable.
    try:
        from gspy.core import system as core_system

        rows = _normalize_table_rows(getattr(core_system, "OutputTable", None))
    except Exception as exc:
        raise RuntimeError(f"Unable to read live simulation table: {exc}") from exc

    if not rows:
        raise RuntimeError("Live simulation completed but produced no output rows")

    return rows


def _run_live_preset_simulation(
    engine_name: str,
    run_mode: str,
    parameters: Dict[str, Any],
) -> Dict[str, Any]:
    if gspy_api is None:
        raise RuntimeError("GSPy API is unavailable")

    model_module = AVAILABLE_ENGINES[engine_name].get("api_model")
    if not model_module:
        raise RuntimeError(f"Live API model not configured for '{engine_name}'")

    initialized = False
    try:
        _prepare_live_simulation_state()
        gspy_api.initProg(model=model_module, mode=run_mode)
        initialized = True

        parameter_result = _apply_live_preset_parameters(
            engine_name=engine_name,
            run_mode=run_mode,
            parameters=parameters,
        )

        if run_mode.upper() == "OD":
            _configure_od_input_points()

        run_result = gspy_api.run()
        table_rows = _extract_live_simulation_rows(run_result)
        response_payload = _build_dataset_from_table_rows(
            table_rows=table_rows,
            source="live_simulation",
            preferred_mode=run_mode,
        )
        response_payload["simulation_mode"] = run_mode
        response_payload["applied_parameters"] = parameter_result["applied"]

        if parameter_result["ignored"]:
            response_payload["parameter_notice"] = (
                "Some parameters are not yet wired for this engine and were ignored: "
                + ", ".join(parameter_result["ignored"])
            )

        return response_payload
    finally:
        if initialized:
            try:
                gspy_api.terminate()
            except Exception:
                pass

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "GSPy Web Engine"}

@app.get("/api/engines", response_model=EngineListResponse)
async def list_engines():
    """Get list of available preset engines"""
    return EngineListResponse(engines=list(AVAILABLE_ENGINES.keys()))

@app.get("/api/engines/{engine_name}/schema", response_model=EngineSchema)
async def get_engine_schema(engine_name: str):
    """
    Get the configuration schema for an engine.
    Returns the parameters that can be configured.
    """
    if engine_name not in AVAILABLE_ENGINES:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_name}' not found")
    
    engine_info = AVAILABLE_ENGINES[engine_name]
    
    # Mock schema for now - can be expanded to dynamically read from engine
    schemas = {
        "turbojet": {
            "parameters": [
                EngineParameter(
                    name="altitude",
                    description="Flight altitude in meters",
                    type="number",
                    default=0,
                    min=0,
                    max=15000,
                ),
                EngineParameter(
                    name="mach",
                    description="Flight Mach number",
                    type="number",
                    default=0,
                    min=0,
                    max=0.95,
                ),
                EngineParameter(
                    name="temperature_offset",
                    description="Temperature offset from ISA (°C)",
                    type="number",
                    default=0,
                    min=-50,
                    max=50,
                ),
            ]
        },
        "turbofan": {
            "parameters": [
                EngineParameter(
                    name="altitude",
                    description="Flight altitude in meters",
                    type="number",
                    default=0,
                    min=0,
                    max=15000,
                ),
                EngineParameter(
                    name="mach",
                    description="Flight Mach number",
                    type="number",
                    default=0,
                    min=0,
                    max=0.95,
                ),
                EngineParameter(
                    name="fan_speed",
                    description="Fan speed (N1 as % of design)",
                    type="number",
                    default=85,
                    min=50,
                    max=100,
                ),
                EngineParameter(
                    name="core_speed",
                    description="Core speed (N2 as % of design)",
                    type="number",
                    default=85,
                    min=50,
                    max=100,
                ),
            ]
        },
    }
    
    if engine_name.startswith("turbojet"):
        params = schemas.get("turbojet", {}).get("parameters", [])
    elif engine_name.startswith("turbofan"):
        params = schemas.get("turbofan", {}).get("parameters", [])
    else:
        params = []
    
    return EngineSchema(
        engine_name=engine_name,
        parameters=params,
        description=engine_info["description"],
    )

@app.post("/api/engines/{engine_name}/run", response_model=SimulationResults)
async def run_preset_engine(engine_name: str, request: RunSimulationRequest):
    """
    Run a preset engine with default parameters.
    This is the "Quick Start" option.
    """
    if engine_name not in AVAILABLE_ENGINES:
        raise HTTPException(status_code=404, detail=f"Engine '{engine_name}' not found")

    if request.engine_name and request.engine_name != engine_name:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Engine mismatch: path engine is '{engine_name}' "
                f"but payload engine is '{request.engine_name}'"
            ),
        )

    if gspy_api is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Live simulation backend is unavailable. "
                "Install missing simulation dependencies and restart the API."
            ),
        )
    
    try:
        results_data = _run_live_preset_simulation(
            engine_name=engine_name,
            run_mode=request.run_mode,
            parameters=request.parameters,
        )

        return SimulationResults(
            engine_name=engine_name,
            run_mode=request.run_mode,
            status="success",
            data=results_data,
        )
    
    except Exception as e:
        message = str(e)
        if "not configured" in message:
            raise HTTPException(status_code=501, detail=message)
        raise HTTPException(status_code=500, detail=f"Live simulation failed: {message}")

@app.post("/api/custom-engines/run", response_model=SimulationResults)
async def run_custom_engine(request: RunCustomEngineRequest):
    """
    Run a custom-configured engine.
    User provides their own component configuration.
    """
    raise HTTPException(
        status_code=501,
        detail=(
            "Custom engine execution is not wired to the live solver yet. "
            "No synthetic output is returned."
        ),
    )

@app.get("/api/engines/custom/components")
async def get_available_components():
    """Get list of available component types for custom engine builder"""
    components = [
        {
            "type": "Ambient",
            "description": "Ambient conditions (altitude, temperature)",
            "parameters": ["altitude", "temperature_offset", "humidity"],
        },
        {
            "type": "Inlet",
            "description": "Engine inlet",
            "parameters": ["efficiency", "pressure_recovery"],
        },
        {
            "type": "Compressor",
            "description": "Compression stage",
            "parameters": ["pressure_ratio", "efficiency", "speed"],
        },
        {
            "type": "Combustor",
            "description": "Combustion chamber",
            "parameters": ["fuel_flow", "efficiency", "outlet_temperature"],
        },
        {
            "type": "Turbine",
            "description": "Turbine stage",
            "parameters": ["pressure_ratio", "efficiency", "speed"],
        },
        {
            "type": "Nozzle",
            "description": "Exit nozzle",
            "parameters": ["throat_area", "exit_area"],
        },
    ]
    return {"available_components": components}

if frontend_assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_assets_dir), name="frontend-assets")

if frontend_index_file.exists():
    @app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
    async def serve_frontend_index():
        return FileResponse(frontend_index_file)

# ============================================================================
# Run the app
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
