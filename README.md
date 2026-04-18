# AirQuality Italy - Monitoraggio Qualità dell'Aria

Applicazione Full Stack per il monitoraggio in tempo reale della qualità dell'aria in Italia (PM10 e PM2.5) utilizzando i dati ufficiali ISPRA/SINA.

## 🏗️ Architettura

- **Backend**: Flask (Python) - API proxy per dati ISPRA
- **Frontend**: React + Leaflet - Mappa interattiva
- **Fonte Dati**: ArcGIS REST Server (ISPRA/SINA)

## 🚀 Installazione e Avvio

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Su Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Il backend sarà disponibile su `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm start
```

Il frontend sarà disponibile su `http://localhost:3000`

## 📡 API Endpoints

### New Hybrid Architecture Endpoints

#### `/api/map-base`
Returns Layer 2 daily average data for all stations (~430 stations) in GeoJSON format.

**Parameters:**
- `pollutant` (query): `pm10` or `pm25` (default: `pm10`)

**Response Format:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [12.4964, 41.9028]
      },
      "properties": {
        "station_id": "IT1234",
        "station_name": "Roma - Via Magna Grecia",
        "value": 35.2,
        "unit": "μg/m³",
        "pollutant": "PM10",
        "date": "2025-01-14T23:59:59Z",
        "color": "yellow"
      }
    }
  ]
}
```

**Caching:** 24 hours (daily data updates once per day)

**Example:**
```bash
curl "http://localhost:5000/api/map-base?pollutant=pm10"
```

#### `/api/realtime-details`
Returns Layer 3 hourly real-time data for active stations (~70 stations) as a dictionary.

**Parameters:**
- `pollutant` (query): `pm10` or `pm25` (default: `pm10`)

**Response Format:**
```json
{
  "IT1234": {
    "value": 38.5,
    "unit": "μg/m³",
    "timestamp": "2025-01-15T14:00:00Z"
  },
  "IT5678": {
    "value": 22.1,
    "unit": "μg/m³",
    "timestamp": "2025-01-15T14:00:00Z"
  }
}
```

**Caching:** 1 hour (hourly data updates with 2-3 hour delay)

**Example:**
```bash
curl "http://localhost:5000/api/realtime-details?pollutant=pm10"
```

#### `/api/data/{pollutant_type}` (Legacy)
Legacy endpoint maintained for backward compatibility. Redirects to `/api/map-base`.

**Note:** This endpoint will be deprecated in a future version.

### Health Check

- `GET /api/health` - Returns `{"status": "ok"}`

## 🎨 Funzionalità

- ✅ Visualizzazione mappa interattiva dell'Italia
- ✅ **Architettura dati ibrida**: Layer 2 (medie giornaliere) + Layer 3 (dati orari)
- ✅ **Selezione tipo dati**: Switch tra visualizzazione dati giornalieri (~430 stazioni) e dati orari (~70 stazioni attive)
- ✅ **Caricamento ottimizzato**: Layer 2 carica prima per rendering immediato, Layer 3 in background
- ✅ **Popup arricchiti**: Visualizzazione sia della media giornaliera che dell'ultimo rilevamento orario
- ✅ Cerchi geografici con raggio reale in km (area di copertura stazione)
- ✅ Dimensione cerchi proporzionale allo zoom (mantengono il raggio geografico)
- ✅ Controllo dinamico del raggio di copertura (5-25 km)
- ✅ Cerchi colorati per livelli di qualità (verde/giallo/rosso)
- ✅ Switch tra PM10 e PM2.5
- ✅ Caching differenziato (24h per dati giornalieri, 1h per dati orari)
- ✅ Degradazione elegante quando dati orari non disponibili
- ✅ Gestione errori e stati di caricamento

## 🌈 Soglie Qualità dell'Aria

### PM10
- 🟢 Verde: ≤ 25 μg/m³ (Buona)
- 🟡 Giallo: 26-50 μg/m³ (Moderata)
- 🔴 Rosso: > 50 μg/m³ (Scarsa)

### PM2.5
- 🟢 Verde: ≤ 15 μg/m³ (Buona)
- 🟡 Giallo: 16-25 μg/m³ (Moderata)
- 🔴 Rosso: > 25 μg/m³ (Scarsa)

## 📝 Note Tecniche

### Raggio di Copertura delle Stazioni

Il raggio predefinito di 10 km è basato su studi di rappresentatività spaziale delle stazioni di monitoraggio urbane/suburbane. Questo valore può essere regolato tramite lo slider nell'interfaccia (5-25 km) per visualizzare diverse aree di influenza.

I cerchi sulla mappa utilizzano il componente `Circle` di Leaflet con raggio geografico reale in metri, quindi:
- Mantengono le dimensioni proporzionali allo zoom
- Rappresentano l'area geografica effettiva coperta dalla stazione
- Permettono di visualizzare sovrapposizioni tra aree di copertura

### Aggiornamento Dati

I dati vengono aggiornati quotidianamente da ISPRA. Il backend implementa un sistema di caching per ridurre le chiamate API non necessarie.

Per dettagli tecnici completi, consulta `specifica_tecnica_app_aria.md`.

## 🚀 Deployment

### Dipendenze Backend

Assicurati di installare tutte le dipendenze, inclusa Flask-Caching:

```bash
cd backend
pip install -r requirements.txt
```

**requirements.txt include:**
- Flask==3.0.0
- Flask-CORS==4.0.0
- Flask-Caching==2.1.0
- requests==2.31.0

### Variabili d'Ambiente (Opzionali)

```bash
# Backend (.env)
FLASK_ENV=production
CACHE_TYPE=SimpleCache
CACHE_DEFAULT_TIMEOUT=3600
```

### Caching Strategy

- **Layer 2 (Base Map)**: Cache TTL di 24 ore (dati aggiornati una volta al giorno)
- **Layer 3 (Real-Time)**: Cache TTL di 1 ora (dati aggiornati ogni ora con ritardo di 2-3 ore)
- **Cache Type**: SimpleCache (in-memory) per deployment single-server
- **Future Upgrade**: Redis per deployment multi-server

### Monitoraggio Raccomandato

Metriche chiave da monitorare:
- **Cache hit rate**: Target > 95%
- **ISPRA service response time**: Target < 2 secondi
- **Frontend page load time**: Target < 3 secondi
- **Error rate Layer 2**: Target < 0.1% (critico)
- **Error rate Layer 3**: Target < 5% (non critico, degradazione elegante)

### Performance Targets

- **Initial Map Load**: < 3 secondi (Layer 2 fetch + render)
- **Background Layer 3 Load**: < 1 secondo (non-blocking)
- **Popup Enrichment**: < 500 millisecondi (O(1) lookup + render)
- **Cached Response**: < 100 millisecondi (cache hit)
