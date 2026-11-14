# EvacRoute Frontend

Modular React 19 single-page application for dynamic multi-floor building evacuation route planning, hazard brush injection, interactive 2D floor plans, animated evacuation simulation, and safety officer egress analytics.

---

## Architecture Overview

```
frontend/src/
├── config/                     # Environment configuration & constants
│   └── index.js                # API URLs, default speeds, timeouts
├── constants/                  # Domain constants
│   ├── floorConfig.js          # Floor ordering & map blueprint PNG paths
│   └── hazardConfig.js         # Hazard brushes, descriptions, colors
├── context/                    # Centralized React State Management
│   ├── EvacuationContext.js    # Graph, route, hazards, ADA mode, floors
│   └── SimulationContext.js    # RequestAnimationFrame playback loop & avatar
├── hooks/                      # Custom React hooks
│   ├── useEvacuation.js        # Hook to consume EvacuationContext
│   └── useSimulation.js        # Hook to consume SimulationContext
├── services/                   # Scalable API Client Layer
│   ├── api/
│   │   ├── client.js           # Axios instance with interceptors & error formatting
│   │   ├── graphApi.js         # Topology fetching
│   │   ├── routeApi.js         # Pathfinding requests
│   │   ├── hazardApi.js        # Hazard injection & reset
│   │   └── analyticsApi.js     # Safety officer analytics
│   └── api.js                  # Backward-compatible API exports
├── utils/                      # Pure helper functions
│   ├── formatters.js           # Duration and distance formatters
│   └── geometry.js             # Direction bearings & edge comparison
├── components/                 # Modular UI Components
│   ├── common/
│   │   ├── ErrorBanner.jsx     # Top alert banner
│   │   └── StepIcon.jsx        # Dynamic directional step icons
│   ├── sidebar/
│   │   ├── Sidebar.jsx         # Sidebar orchestrator
│   │   ├── LocationSearch.jsx  # Searchable room dropdown
│   │   ├── ExitSelector.jsx    # Target exit selector
│   │   ├── AdaToggle.jsx       # Wheelchair / ADA mode switch
│   │   └── TelemetryCard.jsx   # Building telemetry counts
│   ├── map/
│   │   ├── FloorMap.jsx        # SVG floor plan container
│   │   ├── MapControls.jsx     # Floor tabs & blueprint opacity buttons
│   │   ├── MapLegend.jsx       # Symbol and hazard legend
│   │   ├── MapEdge.jsx         # Clickable corridors with hazard styles
│   │   ├── MapNode.jsx         # Floor nodes & floor transition badges
│   │   └── SimAvatar.jsx       # Animated evacuee avatar overlay
│   ├── route/
│   │   ├── RouteSummary.jsx    # Primary vs Backup toggle & KPI cards
│   │   ├── StepGuidance.jsx    # Turn-by-turn instruction list
│   │   └── SimControls.jsx     # Playback control bar (Play/Pause/Speed)
│   ├── hazards/
│   │   └── HazardToolbar.jsx   # Hazard brush toolbar
│   └── analytics/
│       └── AnalyticsDashboard.jsx # Safety officer egress dashboard
├── App.js                      # Clean top-level layout orchestrator (<100 lines)
├── index.js                    # React root render
└── index.css                   # Tailwind styles & SVG animation keyframes
```

---

## Setup & Running

### 1. Requirements
- Node.js 18+
- `npm`

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Variables
Create `.env` or use `.env.example`:
```ini
PORT=3001
BROWSER=none
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Available Scripts
- `npm start`: Runs development server on `http://localhost:3001`
- `npm test`: Runs Jest/RTL unit and component test suites
- `npm run build`: Bundles the application for production into `build/`
