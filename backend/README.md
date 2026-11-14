# EvacRoute Backend

Scalable, modular Flask REST API for dynamic multi-floor building evacuation route planning, hazard modeling, and safety officer egress analytics.

---

## Architecture Overview

```
backend/
├── api/                        # REST API layer
│   ├── middleware/             # Error handlers & request interceptors
│   │   └── error_handler.py    # Global 400, 404, 500 & domain exception handling
│   ├── routes/                 # Modular Flask Blueprints
│   │   ├── analytics_routes.py # Egress statistics & bottleneck analytics
│   │   ├── graph_routes.py     # Building topology & floor data
│   │   ├── hazard_routes.py    # Hazard simulation & corridor blockages
│   │   └── route_routes.py     # Primary and backup route calculation
│   └── __init__.py             # Application factory (`create_app`)
├── algorithms/                 # Pure graph algorithms
│   └── dijkstra.py             # Single-target & multi-target Dijkstra traversal
├── core/                       # Core domain models & constants
│   ├── constants.py            # Floor orders, hazard configs, egress speeds
│   └── exceptions.py           # Domain exceptions (NodeNotFoundError, etc.)
├── models/                     # Data schemas & types
│   └── hazard.py               # HazardType dataclass
├── services/                   # Business logic layer
│   ├── analytics_service.py    # RSET distributions, exit load, transit hub load
│   ├── graph_service.py        # Graph topology, hazard state, adjacency dicts
│   └── pathfinding_service.py  # Path generation, RSET calculation, guidance
├── graph/                      # Backward-compatibility facade
│   └── building_graph.py       # Legacy BuildingGraph facade
├── data/                       # Building topology data
│   └── graph_data.json         # Graph nodes & weighted edges
├── tests/                      # Automated test suite (pytest)
├── config.py                   # Environment-driven configuration
├── requirements.txt            # Python dependencies
├── .env.example                # Environment template
└── wsgi.py                     # WSGI server entry point
```

---

## Setup & Running

### 1. Requirements
- Python 3.10+
- `pip`

### 2. Installation
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration values:
```ini
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000
HOST=0.0.0.0
CORS_ORIGINS=*
DATA_PATH=data/graph_data.json
```

### 4. Running the Server
```bash
python app.py
```
Or with WSGI:
```bash
python wsgi.py
```
The API is available at `http://localhost:5000/api`.

---

## REST API Reference

### 1. Healthcheck
- **Endpoint**: `GET /api/health`
- **Response**:
```json
{
  "service": "EvacRoute API",
  "status": "healthy",
  "version": "1.0.0"
}
```

### 2. Graph Topology
- **Endpoint**: `GET /api/graph`
- **Response**: Nodes, edges, active hazards, impassable blocked corridors, and floors.

### 3. Calculate Evacuation Route
- **Endpoint**: `POST /api/find-route`
- **Request Body**:
```json
{
  "start": "F2-201",
  "target": "AUTO",
  "accessible": false
}
```
- **Response**: Primary route, physical distance, RSET time, turn-by-turn guidance steps, exit candidate comparisons, and backup route.

### 4. Inject Corridor Hazard
- **Endpoint**: `POST /api/simulate-blockage` or `POST /api/set-hazard`
- **Request Body**:
```json
{
  "u": "GF-E-MAIN",
  "v": "GF-RAMP",
  "hazard_type": "fire"
}
```
- **Supported Hazards**:
  - `fire`: 100% impassable
  - `smoke`: Passable with 4.5x penalty and 50% walking speed
  - `debris`: Passable with 6.0x penalty and 40% speed; fully blocked in Wheelchair / ADA mode
  - `clear`: Removes hazard from corridor

### 5. Reset Simulation
- **Endpoint**: `POST /api/reset-simulation`
- **Response**: Clears all active corridor hazards.

### 6. Safety Officer Egress Analytics
- **Endpoint**: `GET /api/analytics?accessible=false`
- **Response**: Total rooms reachability, trapped room count, average RSET, slowest room, exit load distribution, and transit hub bottleneck metrics.

---

## Running Tests

Run the test suite using `pytest`:
```bash
cd backend
pytest -v
```
All 28 unit and integration tests verify algorithms, models, services, and API endpoints.
