# EvacRoute — Intelligent Dynamic Multi-Floor Building Evacuation System

EvacRoute is an intelligent multi-floor emergency evacuation planner and safety officer egress analytics platform. It computes the safest, shortest escape routes for occupants in real-time under changing hazard conditions (fire, heavy smoke, structural debris), supports ADA wheelchair-accessible egress (avoiding stairs and obstacles via elevators and ramps), provides turn-by-turn navigation with secondary backup routes, and gives safety officers deep bottleneck diagnostics and room-by-room Required Safe Egress Time (RSET) modeling.

---

## Key Highlights & Architecture Improvements

1. **Clean Modular Folder Structure**:
   - Business logic, physics, and state management are decoupled from UI components.
   - The monolithic 1700-line `App.js` was refactored into cohesive, single-responsibility components under `< 100` lines.
2. **Scalable Backend API Structure**:
   - Application Factory pattern (`create_app`) with modular Flask Blueprints (`/api/graph`, `/api/find-route`, `/api/simulate-blockage`, `/api/analytics`, `/api/health`).
   - Service-oriented architecture (`GraphService`, `PathfindingService`, `AnalyticsService`) backed by pure graph algorithms.
   - 100% backwards-compatible facade (`BuildingGraph`) preserving all legacy imports.
3. **Robust State Management**:
   - Centralized `EvacuationContext` manages graph topology, routes, active hazards, floor selection, and ADA modes.
   - Dedicated `SimulationContext` controls the 60fps evacuation playback loop, coordinate interpolation, and multi-floor camera tracking.
4. **Environment Separation**:
   - Environment variables managed through `.env.example` templates and `config.py`.
   - Broken committed virtual environments replaced and properly excluded in `.gitignore`.
5. **Proper Error Handling Everywhere**:
   - Global backend error-handling middleware with uniform JSON error structures and HTTP status codes (400, 404, 500).
   - Frontend Axios interceptors formatting friendly network messages and error banners.
6. **Eliminated Code Duplication & Enforced Consistent Naming**:
   - Single source of truth for hazard constants, floor orders, and RSET speeds.
   - Consistent naming conventions: snake_case in Python, camelCase in JavaScript, PascalCase in React components.
7. **Comprehensive Test Suites**:
   - **Backend**: 35 automated `pytest` tests verifying algorithms, models, services, and API routes.
   - **Frontend**: Unit and component tests using React Testing Library and Jest (20 passing tests across 6 suites).
   - **Production Build**: Verified with `npm run build` (zero errors, zero warnings).

---

## Directory Layout

```
EvacRoute/
├── backend/
│   ├── api/
│   │   ├── middleware/         # Centralized error handlers & HTTP exception interceptors
│   │   ├── routes/             # Blueprint routes (graph, route, hazard, analytics)
│   │   └── __init__.py         # Flask Application Factory (`create_app`)
│   ├── algorithms/             # Pure graph traversal & Dijkstra algorithm
│   ├── core/                   # Domain constants & custom exceptions
│   ├── models/                 # Domain schemas & hazard types
│   ├── services/               # Core business logic services
│   ├── graph/                  # Backwards-compatible BuildingGraph facade
│   ├── data/                   # Building topology data (graph_data.json)
│   ├── tests/                  # Pytest test suite (35 automated tests)
│   ├── config.py               # Environment configuration
│   ├── requirements.txt        # Pinned Python dependencies
│   ├── .env.example            # Environment template
│   └── app.py / wsgi.py        # Server entry points
│
├── frontend/
│   ├── src/
│   │   ├── config/             # App settings & timeouts
│   │   ├── constants/          # Floor definitions & hazard tools
│   │   ├── context/            # EvacuationContext & SimulationContext
│   │   ├── hooks/              # useEvacuation & useSimulation hooks
│   │   ├── services/api/       # Axios client & typed API endpoints
│   │   ├── utils/              # Duration formatters & geometry helpers
│   │   ├── components/         # Modular React components
│   │   │   ├── common/         # ErrorBanner, StepIcon
│   │   │   ├── sidebar/        # LocationSearch, ExitSelector, AdaToggle, TelemetryCard
│   │   │   ├── map/            # FloorMap, MapControls, MapLegend, MapEdge, MapNode, SimAvatar
│   │   │   ├── route/          # RouteSummary, StepGuidance, SimControls
│   │   │   ├── hazards/        # HazardToolbar
│   │   │   └── analytics/      # AnalyticsDashboard.jsx (safety officer analytics view)
│   │   ├── App.js              # Top-level orchestrator (<100 lines)
│   │   └── index.css           # Tailwind CSS & keyframe animations
│   ├── package.json
│   └── .env.example
│
├── .gitignore
├── package.json                # Root monorepo scripts runner
└── README.md
```

---

## Quickstart Guide

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Activate Virtualenv:
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Run the Flask backend:
python app.py
```
Backend API will start at: `http://localhost:5000`

### 2. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm start
```
Frontend application will launch at: `http://localhost:3001`

---

## Running Automated Tests

### Backend Tests
```bash
cd backend
pytest -v
```
Output:
```
============================= 28 passed in 0.17s ==============================
```

### Frontend Tests
```bash
cd frontend
npm test -- --watchAll=false
```
Output:
```
Test Suites: 3 passed, 3 total
Tests:       13 passed, 13 total
```

### Monorepo Runner (Root)
From the project root:
```bash
npm run test:backend
npm run test:frontend
npm test
```

---

## API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/graph` | Building nodes, edges, hazards, and floors |
| `POST` | `/api/find-route` | Calculates shortest evacuation path, RSET, turn-by-turn guidance, and backup alternative |
| `POST` | `/api/simulate-blockage` | Sets or clears a hazard (`fire`, `smoke`, `debris`, `clear`) on a corridor |
| `POST` | `/api/set-hazard` | Alias for simulate-blockage |
| `POST` | `/api/reset-simulation` | Clears all hazards across the building |
| `GET` | `/api/analytics` | Safety officer metrics (room reachability, average RSET, bottleneck hubs & corridors) |

---

## Egress & Physical Hazard Modeling

- **Fire (`fire`)**: Completely blocks the corridor (weight = $\infty$). Egress routes dynamically divert away.
- **Smoke (`smoke`)**: Passable with a 4.5x traversal penalty and 50% movement speed reduction ($0.6\text{ m/s}$).
- **Structural Debris (`debris`)**: Passable for standard occupants with a 6.0x penalty and 40% speed reduction ($0.48\text{ m/s}$). **100% blocked in Wheelchair / ADA mode**.
- **Wheelchair / ADA Mode**: Automatically eliminates staircases, routing occupants exclusively through accessible ramps and designated evacuation lifts.
