export const MAPBOX_STYLE = {
  version: 8,
  name: 'overture-choropleth',
  sources: {
    overture: { type: 'geojson', data: './overture.geojson' },
  },
  layers: [
    {
      id: 'overture-fill',
      type: 'fill',
      source: 'overture',
      paint: {
        'fill-color': [
          'match', ['get', 'source_type'],
          'my',  '#22c55e',
          'osm', '#3b82f6',
          'ml',  '#f97316',
          '#94a3b8',
        ],
        'fill-opacity': 0.75,
      },
    },
    {
      id: 'overture-outline',
      type: 'line',
      source: 'overture',
      paint: {
        'line-color': [
          'match', ['get', 'source_type'],
          'my',  '#15803d',
          'osm', '#1d4ed8',
          'ml',  '#c2410c',
          '#475569',
        ],
        'line-width': 1,
      },
    },
  ],
} as const;
