# AQI_taly - Smart Air Quality Map for Italy 🇮🇹

An intelligent air quality monitoring system for Italy that provides real-time pollution data, forecasting, and contextual environmental information.

## 🌟 Features

### Core Functionality
- **Real-time Air Quality Monitoring**: Live PM10 and PM2.5 data from monitoring stations across Italy
- **Interactive Map**: Leaflet-based map with intuitive visualization of pollution levels
- **AI-Powered Forecasting**: Prophet-based time series forecasting for pollution predictions
- **Contextual Layers**: 
  - Active fires tracking (incendioggi.it integration)
  - Industrial facilities mapping with pollution impact analysis
  - BBOX spatial filtering for optimized performance

### Smart Features
- **Pollution Source Analysis**: AI-driven identification of pollution sources for each monitoring station
- **Smart Icon States**: Visual feedback showing which industries are contributing to pollution
- **Debounced Map Updates**: Optimized API calls triggered only on map interaction (zoom/pan)
- **Lazy Loading**: Efficient data loading for popups and details

### Data Visualization
- **Dual View Modes**: Switch between real-time data and forecast views
- **Color-coded Stations**: Green (good), yellow (moderate), red (poor) air quality indicators
- **Comprehensive Station Details**: Historical data, trends, and pollution analysis
- **Forecast Timeline**: Interactive timeline for exploring future pollution predictions

## 🏗️ Architecture

### Backend (Python/Flask)
- **Framework**: Flask with Flask-CORS and Flask-Caching
- **Data Sources**:
  - ARPA (Regional Environmental Protection Agencies)
  - OpenWeatherMap API for air quality data
  - incendioggi.it for fire tracking
  - E-PRTR Database for industrial facilities
- **Forecasting**: Facebook Prophet for time series prediction
- **Caching**: 30-minute cache for optimal performance

### Frontend (React)
- **Framework**: React 18 with Hooks
- **Mapping**: React-Leaflet for interactive maps
- **State Management**: React Context and local state
- **UI Components**: Custom floating UI with professional design
- **Optimization**: Memoization and debouncing for smooth performance

## 📦 Installation

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your OpenWeatherMap API key

# Run the backend
python app.py
```

The backend will start on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will start on `http://localhost:3000`

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
OWM_API_KEY=your_openweathermap_api_key_here
FLASK_ENV=development
FLASK_DEBUG=True
```

### API Keys

- **OpenWeatherMap API**: Get your free API key at [openweathermap.org](https://openweathermap.org/api)

## 🚀 Usage

1. **Start the Backend**: Run `python app.py` in the backend directory
2. **Start the Frontend**: Run `npm start` in the frontend directory
3. **Open Browser**: Navigate to `http://localhost:3000`
4. **Explore the Map**:
   - Click on stations to view detailed information
   - Toggle between PM10 and PM2.5 pollutants
   - Switch between daily and hourly data
   - Enable contextual layers (fires, industries)
   - Switch to forecast mode to see predictions

## 📊 API Endpoints

### Core Endpoints
- `GET /api/map-base` - Base map data with all stations
- `GET /api/realtime-details` - Real-time hourly data
- `GET /api/forecast-maps` - Forecast data for map visualization
- `GET /api/map-layers` - Contextual layers (fires, industries) with BBOX filtering

### Station Details
- `GET /api/station/<station_id>` - Detailed station information
- `GET /api/pollution-analysis` - AI-powered pollution source analysis

### Contextual Data
- `GET /api/industry-details/<industry_id>` - Industrial facility details
- `GET /api/fire-details/<fire_id>` - Fire incident details

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🎨 Features in Detail

### BBOX Spatial Filtering
Optimizes map performance by filtering industries and fires based on the visible viewport:
- Automatic BBOX calculation on map movement
- 500ms debounce to prevent API spam
- Server-side spatial filtering
- Graceful degradation if filtering fails

### Smart Icon States
Visual feedback system for pollution sources:
- **Neutral State**: 50% opacity, no border (non-pollution sources)
- **Active State**: 100% opacity, red border with pulse animation (pollution sources)
- Reactive updates based on pollution analysis

### Pollution Source Analysis
AI-driven analysis that identifies:
- Industrial emissions
- Traffic patterns
- Fire incidents
- Meteorological conditions
- Provides actionable insights for each station

## 📁 Project Structure

```
AQI_taly/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── context/
│   │   ├── industry_checker.py  # Industrial facilities logic
│   │   └── fire_fetcher.py      # Fire tracking logic
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   └── index.js          # Entry point
│   ├── package.json          # Node dependencies
│   └── public/               # Static assets
├── AnalisiGeodatabase/       # GeoDatabase analysis tools
└── README.md                 # This file
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Data Sources**:
  - ARPA (Regional Environmental Protection Agencies)
  - OpenWeatherMap
  - incendioggi.it
  - E-PRTR Database
- **Libraries**:
  - Flask & React ecosystems
  - Facebook Prophet for forecasting
  - Leaflet for mapping
  - Hypothesis for property-based testing

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

Made with ❤️ for cleaner air in Italy
