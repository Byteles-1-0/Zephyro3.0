import React, { useMemo } from 'react';

const AQI_COLOR_MAP = {
  red:    { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444', label: 'Alto' },
  yellow: { bg: 'rgba(234,179,8,0.12)',  text: '#d97706', label: 'Medio' },
  green:  { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a', label: 'Buono' },
  gray:   { bg: 'rgba(107,114,128,0.12)',text: '#6b7280', label: 'N/D' },
};

// Major Italian cities with coordinates
const ITALIAN_CITIES = [
  { name: 'Milano',       lat: 45.4654, lng: 9.1859 },
  { name: 'Roma',         lat: 41.9028, lng: 12.4964 },
  { name: 'Napoli',       lat: 40.8518, lng: 14.2681 },
  { name: 'Torino',       lat: 45.0703, lng: 7.6869 },
  { name: 'Palermo',      lat: 38.1157, lng: 13.3613 },
  { name: 'Genova',       lat: 44.4056, lng: 8.9463 },
  { name: 'Bologna',      lat: 44.4949, lng: 11.3426 },
  { name: 'Firenze',      lat: 43.7696, lng: 11.2558 },
  { name: 'Bari',         lat: 41.1171, lng: 16.8719 },
  { name: 'Catania',      lat: 37.5079, lng: 15.0830 },
  { name: 'Venezia',      lat: 45.4408, lng: 12.3155 },
  { name: 'Verona',       lat: 45.4384, lng: 10.9916 },
  { name: 'Messina',      lat: 38.1938, lng: 15.5540 },
  { name: 'Padova',       lat: 45.4064, lng: 11.8768 },
  { name: 'Trieste',      lat: 45.6496, lng: 13.7681 },
  { name: 'Taranto',      lat: 40.4644, lng: 17.2470 },
  { name: 'Brescia',      lat: 45.5416, lng: 10.2118 },
  { name: 'Reggio Calabria', lat: 38.1113, lng: 15.6474 },
  { name: 'Prato',        lat: 43.8777, lng: 11.1022 },
  { name: 'Modena',       lat: 44.6471, lng: 10.9252 },
  { name: 'Reggio Emilia',lat: 44.6989, lng: 10.6297 },
  { name: 'Perugia',      lat: 43.1122, lng: 12.3888 },
  { name: 'Livorno',      lat: 43.5485, lng: 10.3106 },
  { name: 'Cagliari',     lat: 39.2238, lng: 9.1217 },
  { name: 'Foggia',       lat: 41.4623, lng: 15.5444 },
  { name: 'Salerno',      lat: 40.6824, lng: 14.7681 },
  { name: 'Rimini',       lat: 44.0678, lng: 12.5695 },
  { name: 'Ferrara',      lat: 44.8381, lng: 11.6197 },
  { name: 'Sassari',      lat: 40.7259, lng: 8.5557 },
  { name: 'Bergamo',      lat: 45.6983, lng: 9.6773 },
  { name: 'Monza',        lat: 45.5845, lng: 9.2744 },
  { name: 'Ravenna',      lat: 44.4184, lng: 12.1988 },
  { name: 'Latina',       lat: 41.4674, lng: 12.9035 },
  { name: 'Giugliano in Campania', lat: 40.9279, lng: 14.1947 },
  { name: 'Mestre',       lat: 45.4913, lng: 12.2410 },
  { name: 'Siracusa',     lat: 37.0755, lng: 15.2866 },
  { name: 'Pescara',      lat: 42.4602, lng: 14.2150 },
  { name: 'Arezzo',       lat: 43.4623, lng: 11.8796 },
  { name: 'Vicenza',      lat: 45.5455, lng: 11.5354 },
  { name: 'Trento',       lat: 46.0748, lng: 11.1217 },
  { name: 'Udine',        lat: 46.0634, lng: 13.2350 },
  { name: 'Bolzano',      lat: 46.4983, lng: 11.3548 },
  { name: 'Novara',       lat: 45.4469, lng: 8.6219 },
  { name: 'Ancona',       lat: 43.6158, lng: 13.5189 },
  { name: 'Aosta',        lat: 45.7372, lng: 7.3200 },
  { name: 'Piacenza',     lat: 45.0526, lng: 9.6933 },
  { name: 'Parma',        lat: 44.8015, lng: 10.3279 },
  { name: 'Como',         lat: 45.8080, lng: 9.0852 },
  { name: 'Lecce',        lat: 40.3516, lng: 18.1750 },
  { name: 'Catanzaro',    lat: 38.9101, lng: 16.5872 },
  { name: 'L\'Aquila',    lat: 42.3498, lng: 13.3995 },
  { name: 'Campobasso',   lat: 41.5602, lng: 14.6634 },
  { name: 'Potenza',      lat: 40.6400, lng: 15.7983 },
];

const MAX_DISTANCE_KM = 60; // stations farther than this won't be assigned to a city

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestCity(lat, lng) {
  let bestCity = null;
  let bestDist = Infinity;
  for (const city of ITALIAN_CITIES) {
    const d = haversineKm(lat, lng, city.lat, city.lng);
    if (d < bestDist) {
      bestDist = d;
      bestCity = city;
    }
  }
  return bestDist <= MAX_DISTANCE_KM ? bestCity : null;
}

function valueToColor(avg, pollutant) {
  if (avg === null || avg === undefined) return 'gray';
  if (pollutant === 'pm25') {
    if (avg <= 15) return 'green';
    if (avg <= 25) return 'yellow';
    return 'red';
  }
  if (avg <= 25) return 'green';
  if (avg <= 50) return 'yellow';
  return 'red';
}

const colorOrder = { red: 3, yellow: 2, green: 1, gray: 0 };

function TopCitiesWidget({ baseMapData, realtimeData, dataSource, viewMode, mapRef, pollutantType }) {
  const topCities = useMemo(() => {
    if (!baseMapData || !baseMapData.features) return [];

    const cityMap = {};

    baseMapData.features.forEach(f => {
      const props = f.properties;
      const [lng, lat] = f.geometry.coordinates;

      const city = nearestCity(lat, lng);
      if (!city) return; // too far from any known city

      const hasRealtime = realtimeData[props.station_id];
      const hasBase = props.value !== null && props.value !== undefined;

      let value = props.value;
      if (dataSource === 'hourly') {
        value = hasRealtime ? (hasRealtime.value ?? null) : null;
      } else if (!hasBase) {
        value = null;
      }

      if (value === null || value === undefined) return;

      if (!cityMap[city.name]) {
        cityMap[city.name] = { values: [], lat: city.lat, lng: city.lng };
      }
      cityMap[city.name].values.push(value);
    });

    return Object.entries(cityMap)
      .map(([name, { values, lat, lng }]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const color = valueToColor(avg, pollutantType || 'pm10');
        return { name, avg, color, lat, lng };
      })
      .sort((a, b) => {
        const orderDiff = (colorOrder[b.color] || 0) - (colorOrder[a.color] || 0);
        return orderDiff !== 0 ? orderDiff : b.avg - a.avg;
      })
      .slice(0, 5);
  }, [baseMapData, realtimeData, dataSource, pollutantType]);

  const handleCityClick = (city) => {
    if (mapRef && mapRef.current) {
      mapRef.current.flyTo([city.lat, city.lng], 12, { animate: true, duration: 1.2 });
    }
  };

  if (viewMode !== 'realtime' || topCities.length === 0) return null;

  return (
    <div
      className="widget"
      style={{
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '6px',
        padding: '12px 14px',
        borderRadius: '16px',
        background: 'var(--bg-color)',
        boxShadow: 'var(--shadow-color) 0px 4px 20px',
        minWidth: '220px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px',
        fontWeight: 700,
        fontSize: '12px',
        letterSpacing: '0.5px',
        color: 'var(--text-color)',
        opacity: 0.65,
        textTransform: 'uppercase',
      }}>
        <span>⚠️</span> Top 5 Città Critiche
      </div>

      {topCities.map((city, i) => {
        const style = AQI_COLOR_MAP[city.color] || AQI_COLOR_MAP.gray;
        return (
          <div
            key={i}
            onClick={() => handleCityClick(city)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              borderRadius: '10px',
              background: style.bg,
              gap: '8px',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.72'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <span style={{
                fontWeight: 700,
                fontSize: '12px',
                color: style.text,
                opacity: 0.6,
                minWidth: '16px',
              }}>
                {i + 1}
              </span>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-color)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {city.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: style.text }}>
                {Math.round(city.avg)} µg/m³
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: '20px',
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.text}33`,
              }}>
                {style.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TopCitiesWidget;
