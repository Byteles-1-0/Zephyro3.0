import os

# Contenuto del file Markdown basato sulla conversazione
md_content = """# Specifica Tecnica: App Monitoraggio Qualità dell'Aria (PM10/PM2.5)

Questo documento riassume i dettagli tecnici scoperti per l'implementazione di un'applicazione Full Stack (Flask + React) che interroga i dati ufficiali ISPRA/SINA.

## 1. Architettura dei Dati (Sorgente)

I dati sono ospitati su un'istanza **ArcGIS REST Server**. Questo permette interrogazioni dirette tramite API invece del classico web scraping del DOM.

### Endpoint Base

- **PM10:** `https://sinacloud.isprambiente.it/arcgisadv/rest/services/Particulate_matter10_informambiente/MapServer`
- **PM2.5:** `https://sinacloud.isprambiente.it/arcgisadv/rest/services/Particulate_matter_2_5_informambiente/MapServer`

### Mappatura dei Layer (Dati Giornalieri)

Per entrambi i servizi, il layer di interesse è il **Layer ID: 2** (solitamente denominato "Giornaliero giorno precedente").

## 2. Protocollo di Interrogazione (API Query)

Per estrarre i dati in formato JSON, la chiamata deve puntare all'endpoint `/{layer_id}/query`.

### Parametri Query Fondamentali

| Parametro | Valore | Descrizione |
| :--- | :--- | :--- |
| `where` | `1=1` | Estrae tutti i record (SQL dummy) |
| `outFields` | `*` | Estrae tutte le colonne (attributi) |
| `f` | `json` | Formato di risposta richiesto |
| `outSR` | `4326` | Sistema di coordinate WGS84 (Lat/Lon standard) |

### Campi Chiave nel Payload JSON

- `data_record_value`: Il valore numerico dell'inquinante ($\mu g/m^3$).
- `station_name`: Nome della stazione di rilevamento.
- `station_lat` / `station_lon`: Coordinate geografiche.
- `data_record`: Timestamp in millisecondi (Epoch).

## 3. Implementazione Backend (Flask)

Il backend funge da proxy per evitare problemi di CORS e per normalizzare i dati prima di inviarli al frontend.

### Logica Suggerita

1. **Interfacciamento:** Utilizzare la libreria `requests` per interrogare gli endpoint ISPRA.
2. **Normalizzazione:** Convertire i timestamp Epoch in stringhe ISO e pulire i nomi delle stazioni (gestione encoding).
3. **Caching:** Implementare un sistema di cache (es. `Flask-Caching`) poiché i dati ISPRA vengono aggiornati tipicamente una volta al giorno.

## 4. Implementazione Frontend (React)

### Visualizzazione Dati

- **Mappa Interattiva:** Utilizzare `react-leaflet` o `react-map-gl`.
- **Formato Dati:** Richiedere al backend i dati in formato **GeoJSON** per una renderizzazione nativa dei punti circolari sulla mappa verd giallo rosso.

### Integrazione API

- Utilizzare `useEffect` e `axios` (o `fetch`) per recuperare i dati dal server Flask.
- Gestire gli stati di caricamento (Loading) e gli errori di connessione.

## 5. Sfide Tecniche Risolte

- **Errore 400:** Risolto identificando che il Layer 0 è un "Group Layer" non interrogabile; i dati risiedono nel Layer 2.
- **Parametri Mancanti:** È necessario specificare sempre `f=json` per evitare risposte HTML predefinite dai server ArcGIS.

---

**Documento redatto per lo sviluppo dell'App AirQuality (Flask/React integration).**
"""

# Scrittura del file
with open("specifica_tecnica_app_aria.md", "w", encoding="utf-8") as f:
    f.write(md_content)

print("File creato correttamente.")
