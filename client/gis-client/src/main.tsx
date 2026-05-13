import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import ImageWMS from 'ol/source/ImageWMS';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke } from 'ol/style';
import type { FeatureLike } from 'ol/Feature';
import { fromLonLat } from 'ol/proj';

import 'ol/ol.css';
import './style.css';

const SOURCE_COLORS: Record<string, { fill: string; stroke: string }> = {
  my:  { fill: '#22c55e', stroke: '#15803d' },
  osm: { fill: '#3b82f6', stroke: '#1d4ed8' },
  ml:  { fill: '#f97316', stroke: '#c2410c' },
};

function buildingsStyle(feature: FeatureLike) {
  const type = feature.get('source_type') as string;
  const colors = SOURCE_COLORS[type] ?? { fill: '#94a3b8', stroke: '#475569' };
  return new Style({
    fill:   new Fill({ color: colors.fill + 'bf' }),
    stroke: new Stroke({ color: colors.stroke, width: 1 }),
  });
}

function highwaysStyle(feature: FeatureLike) {
  const type = feature.get('source_type') as string;
  const colors = SOURCE_COLORS[type] ?? { fill: '#94a3b8', stroke: '#475569' };
  return new Style({
    stroke: new Stroke({ color: colors.stroke, width: 3 }),
  });
}

const GEOSERVER_WMS_URL = 'http://localhost:18080/geoserver/gis/wms';
const OVERTURE_BUILDINGS_PATH = './overture_buildings.geojson';
const OVERTURE_HIGHWAYS_PATH = './overture_highways.geojson';
const HIGHWAYS_LAYER = 'highways';
const BUILDINGS_LAYER = 'buildings'
const BOUNDS = [49.326586, 53.579436, 49.33931, 53.5752];
const ZOOM = 16;
 
const LEGEND_ITEMS = [
  { type: 'my',  label: 'my — оцифровка' },
  { type: 'osm', label: 'osm — OSM' },
  { type: 'ml',  label: 'ml — автораспознавание' },
];


function Legend() {
  return (
    <div className="legend">
      <p className="legend-title">Источник данных</p>
      {LEGEND_ITEMS.map(({ type, label }) => (
        <div key={type} className="legend-item">
          <span className={`legend-swatch legend-swatch-${type}`} />
          {label}
        </div>
      ))}
    </div>
  );
}

function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    function createWmsLayer(layerName: string) {
      return new ImageLayer({
        source: new ImageWMS({
          url: GEOSERVER_WMS_URL,
          params: { LAYERS: `gis:${layerName}`, TILED: true },
          ratio: 1,
          serverType: 'geoserver',
        }),
      });
    }

    function loadGeoJSON(url: string, source: VectorSource) {
      fetch(url)
        .then((r) => r.json())
        .then((geojson) => {
          const features = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          source.addFeatures(features);
        });
    }

    const buildingsSource = new VectorSource();
    const buildingsLayer = new VectorLayer({ source: buildingsSource, style: buildingsStyle });
    loadGeoJSON(OVERTURE_BUILDINGS_PATH, buildingsSource);

    const highwaysSource = new VectorSource();
    const highwaysLayer = new VectorLayer({ source: highwaysSource, style: highwaysStyle });
    loadGeoJSON(OVERTURE_HIGHWAYS_PATH, highwaysSource);

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        createWmsLayer(BUILDINGS_LAYER),
        createWmsLayer(HIGHWAYS_LAYER),
        highwaysLayer,
        buildingsLayer,
      ],
      view: new View({
        center: fromLonLat([
          (BOUNDS[0] + BOUNDS[2]) / 2,
          (BOUNDS[1] + BOUNDS[3]) / 2,
        ]),
        zoom: ZOOM,
      }),
    });

    return () => map.setTarget(undefined);
  }, []);

  return <div ref={mapRef} className="map-container" />;
}

function App() {
  return (
    <div className="app-container">
      <MapView />
      <Legend />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
