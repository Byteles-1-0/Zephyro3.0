# AQI_taly Project Structure

## Overview
This document describes the structure and organization of the AQI_taly project.

## Directory Structure

```
AQI_taly/
├── .github/                    # GitHub configuration
│   ├── workflows/             # CI/CD workflows
│   │   └── ci.yml            # Continuous Integration
│   └── ISSUE_TEMPLATE/       # Issue templates
│       ├── bug_report.md
│       └── feature_request.md
│
├── backend/                   # Python Flask backend
│   ├── context/              # Context modules
│   │   ├── industry_checker.py  # Industrial facilities logic
│   │   └── fire_fetcher.py      # Fire tracking logic
│   ├── data/                 # Data files
│   │   └── industrie_italia.geojson  # Industrial facilities data
│   ├── app.py                # Main Flask application
│   ├── cause_analyzer.py     # Pollution source analysis
│   ├── forecast_extractor.py # Forecast data extraction
│   ├── utils.py              # Utility functions
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variables template
│
├── frontend/                  # React frontend
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ForecastMapOverlay.js
│   │   │   ├── ForecastTimeline.js
│   │   │   ├── SearchBar.js
│   │   │   ├── SideDrawer.js
│   │   │   ├── FABGroup.js
│   │   │   ├── ViewModeToggle.js
│   │   │   ├── Legend.js
│   │   │   ├── FireLayerRenderer.js
│   │   │   └── IndustryLayerRenderer.js
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useMapBounds.js
│   │   │   └── useDebouncedCallback.js
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # Main styles
│   │   └── index.js          # Entry point
│   ├── package.json          # Node dependencies
│   └── package-lock.json     # Locked dependencies
│
├── AnalisiGeodatabase/       # GeoDatabase analysis tools
│   ├── SiteMap.gdb/         # Geodatabase files
│   ├── convert_gdb.py       # Conversion script
│   └── industrie_italia.geojson  # Converted data
│
├── dati_storici/             # Historical data
│
├── .gitignore                # Git ignore rules
├── .gitattributes            # Git attributes
├── LICENSE                   # MIT License
├── README.md                 # Main documentation
├── QUICK_START.md            # Quick start guide
├── CONTRIBUTING.md           # Contribution guidelines
├── CHANGELOG.md              # Version history
└── PROJECT_STRUCTURE.md      # This file
```

## Key Components

### Backend (Flask)

#### Core Files
- **app.py**: Main Flask application with all API endpoints
- **cause_analyzer.py**: AI-powered pollution source analysis
- **forecast_extractor.py**: Time series forecasting with Prophet
- **utils.py**: Shared utility functions

#### Context Modules
- **industry_checker.py**: Industrial facilities management and spatial filtering
- **fire_fetcher.py**: Fire tracking and spatial filtering

#### API Endpoints
- `/api/map-base` - Base map data
- `/api/realtime-details` - Real-time hourly data
- `/api/forecast-maps` - Forecast visualizations
- `/api/map-layers` - Contextual layers with BBOX filtering
- `/api/station/<id>` - Station details
- `/api/pollution-analysis` - Pollution source analysis
- `/api/industry-details/<id>` - Industry details
- `/api/fire-details/<id>` - Fire details

### Frontend (React)

#### Main Components
- **App.js**: Main application container
- **ForecastMapOverlay.js**: Forecast visualization overlay
- **ForecastTimeline.js**: Interactive timeline for forecasts
- **SearchBar.js**: Station search and filters
- **SideDrawer.js**: Station details drawer
- **FABGroup.js**: Floating action buttons
- **ViewModeToggle.js**: Switch between real-time and forecast
- **Legend.js**: Map legend
- **FireLayerRenderer.js**: Fire markers layer
- **IndustryLayerRenderer.js**: Industry markers layer with smart icons

#### Custom Hooks
- **useMapBounds.js**: Track map viewport bounds
- **useDebouncedCallback.js**: Debounce function calls

## Data Flow

1. **User Interaction** → Map movement/zoom
2. **Bounds Extraction** → useMapBounds hook
3. **Debounced API Call** → useDebouncedCallback (500ms)
4. **Backend Processing** → Spatial filtering with BBOX
5. **Response** → Filtered data
6. **Rendering** → Optimized with memoization

## Technologies

### Backend
- Python 3.8+
- Flask (web framework)
- Flask-CORS (CORS handling)
- Flask-Caching (response caching)
- Prophet (forecasting)
- Pandas (data manipulation)
- Requests (HTTP client)
- PyOWM (OpenWeatherMap client)

### Frontend
- React 18
- React-Leaflet (mapping)
- Axios (HTTP client)
- Leaflet (map library)

## Development Workflow

1. **Setup**: Install dependencies (backend + frontend)
2. **Development**: Run both servers concurrently
3. **Testing**: Run test suites
4. **Build**: Create production builds
5. **Deploy**: Deploy to hosting platform

## Environment Variables

### Backend (.env)
```
OWM_API_KEY=your_openweathermap_api_key
FLASK_ENV=development
FLASK_DEBUG=True
```

## Performance Optimizations

1. **Backend Caching**: 30-minute cache for API responses
2. **BBOX Filtering**: Server-side spatial filtering
3. **Debouncing**: 500ms delay for map updates
4. **Memoization**: React component optimization
5. **Lazy Loading**: On-demand data fetching

## Security Considerations

1. **API Keys**: Stored in environment variables
2. **CORS**: Configured for specific origins
3. **Input Validation**: BBOX parameter validation
4. **Error Handling**: Graceful degradation

## Future Enhancements

- User authentication
- Data export functionality
- Mobile app
- More pollutant types
- Multi-language support
- Dark mode
- Notifications system
