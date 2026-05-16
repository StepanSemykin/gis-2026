const FILL_COLOR_BY_SOURCE = [
  'match', ['get', 'source_type'],
  'my',  '#22c55ebf',
  'osm', '#3b82f6bf',
  'ml',  '#f97316bf',
  '#94a3b8bf',
];
const STROKE_COLOR_BY_SOURCE = [
  'match', ['get', 'source_type'],
  'my',  '#15803d',
  'osm', '#1d4ed8',
  'ml',  '#c2410c',
  '#475569',
];
const OVERTURE_BUILDINGS_PATH = './overture_buildings.geojson';
const OVERTURE_HIGHWAYS_PATH = './overture_highways.geojson';

export const BUILDINGS_STYLE = {
  version: 8,
  name: 'overture-buildings',
  sources: {
    buildings: { type: 'geojson', data: OVERTURE_BUILDINGS_PATH },
  },
  layers: [
    {
      id: 'buildings-fill',
      type: 'fill',
      source: 'buildings',
      paint: {
        'fill-color': FILL_COLOR_BY_SOURCE,
      },
    },
    {
      id: 'buildings-outline',
      type: 'line',
      source: 'buildings',
      paint: {
        'line-color': STROKE_COLOR_BY_SOURCE,
        'line-width': 1,
      },
    },
  ],
};

export const HIGHWAYS_STYLE = {
  version: 8,
  name: 'overture-highways',
  sources: {
    highways: { type: 'geojson', data: OVERTURE_HIGHWAYS_PATH },
  },
  layers: [
    {
      id: 'highways-line',
      type: 'line',
      source: 'highways',
      paint: {
        'line-color': STROKE_COLOR_BY_SOURCE,
        'line-width': 3,
      },
    },
  ],
};
