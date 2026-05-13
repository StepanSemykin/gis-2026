INSTALL spatial;
LOAD spatial;

INSTALL httpfs;
LOAD httpfs;

SET s3_region = 'us-west-2';

DROP TABLE IF EXISTS my_buildings;

CREATE TABLE my_buildings AS
SELECT
    feature->>'$.id' AS osm_id,
    ST_GeomFromGeoJSON(feature->>'$.geometry') AS geom,
    feature->'$.properties'->>'addr:city' AS addr_city,
    feature->'$.properties'->>'addr:place' AS addr_place,
    feature->'$.properties'->>'addr:street' AS addr_street,
    feature->'$.properties'->>'addr:housenumber' AS addr_housenumber,
    feature->'$.properties'->>'building' AS building,
    feature->'$.properties'->>'building:levels' AS building_levels
FROM (
    SELECT UNNEST(
        CAST(json_extract(content, '$.features') AS JSON[])
    ) AS feature
    FROM read_text('data.json')
);

SELECT
    COUNT(*) AS total_features,
    COUNT(geom) AS with_geometry,
    ST_AsText(ANY_VALUE(geom)) AS sample_wkt
FROM my_buildings;

DROP TABLE IF EXISTS my_highways;

CREATE TABLE my_highways AS
SELECT
    feature->>'$.id' AS osm_id,
    ST_GeomFromGeoJSON(feature->>'$.geometry') AS geom,
    feature->'$.properties'->>'highway' AS highway,
    feature->'$.properties'->>'name'    AS name
FROM (
    SELECT UNNEST(
        CAST(json_extract(content, '$.features') AS JSON[])
    ) AS feature
    FROM read_text('data.json')
)
WHERE feature->'$.properties'->>'highway' IS NOT NULL;

CREATE OR REPLACE MACRO my_bbox() AS STRUCT_PACK(
    xmin := 49.3260,
    ymin := 53.5745,
    xmax := 49.3400,
    ymax := 53.5800
);

DROP TABLE IF EXISTS overture_buildings_raw;

CREATE TABLE overture_buildings_raw AS
SELECT
    id,
    geometry,
    bbox,
    sources,
    names
FROM read_parquet(
    's3://overturemaps-us-west-2/release/2026-04-15.0/theme=buildings/type=building/*',
    filename   = true,
    hive_partitioning = false
)
WHERE
    bbox.xmin <= (my_bbox()).xmax
    AND bbox.xmax >= (my_bbox()).xmin
    AND bbox.ymin <= (my_bbox()).ymax
    AND bbox.ymax >= (my_bbox()).ymin;

SELECT COUNT(*) AS overture_raw_count FROM overture_buildings_raw;

DROP TABLE IF EXISTS overture_buildings;

CREATE TABLE overture_buildings AS
WITH classified AS (
    SELECT
        o.id,
        o.geometry AS geom,
        o.names,
        o.sources,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM my_buildings mb
                WHERE ST_Intersects(o.geometry, mb.geom)
            ) THEN 'my'
            WHEN list_contains(
                list_transform(o.sources, s -> lower(s.dataset)),
                'openstreetmap'
            ) THEN 'osm'
            ELSE 'ml'
        END AS source_type
    FROM overture_buildings_raw o
)
SELECT * FROM classified;

SELECT source_type, COUNT(*) AS cnt
FROM overture_buildings
GROUP BY source_type
ORDER BY cnt DESC;

COPY (
    SELECT
        geom AS geometry,
        id,
        source_type,
        CASE
            WHEN names IS NOT NULL AND len(names.primary) > 0
            THEN names.primary
            ELSE NULL
        END AS name
    FROM overture_buildings
    WHERE geom IS NOT NULL
)
TO 'client/gis-client/public/overture_buildings.geojson'
WITH (FORMAT GDAL, DRIVER 'GeoJSON');

SELECT
    'overture_buildings.geojson сформирован' AS status,
    COUNT(*) AS total_features
FROM overture_buildings
WHERE geom IS NOT NULL;

DROP TABLE IF EXISTS overture_highways_raw;

CREATE TABLE overture_highways_raw AS
SELECT
    id,
    geometry,
    subtype,
    class,
    sources,
    names
FROM read_parquet(
    's3://overturemaps-us-west-2/release/2026-04-15.0/theme=transportation/type=segment/*',
    filename = true,
    hive_partitioning = false
)
WHERE
    subtype = 'road'
    AND bbox.xmin <= (my_bbox()).xmax
    AND bbox.xmax >= (my_bbox()).xmin
    AND bbox.ymin <= (my_bbox()).ymax
    AND bbox.ymax >= (my_bbox()).ymin;

DROP TABLE IF EXISTS overture_highways;

CREATE TABLE overture_highways AS
SELECT
    o.id,
    o.geometry AS geom,
    o.class,
    o.names,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM my_highways mr
            WHERE ST_Intersects(o.geometry, mr.geom)
        ) THEN 'my'
        WHEN list_contains(
            list_transform(o.sources, s -> lower(s.dataset)),
            'openstreetmap'
        ) THEN 'osm'
        ELSE 'ml'
    END AS source_type
FROM overture_highways_raw o;

SELECT source_type, COUNT(*) AS cnt
FROM overture_highways
GROUP BY source_type
ORDER BY cnt DESC;

COPY (
    SELECT
        geom AS geometry,
        id,
        class,
        source_type,
        CASE
            WHEN names IS NOT NULL AND len(names.primary) > 0
            THEN names.primary
            ELSE NULL
        END AS name
    FROM overture_highways
    WHERE geom IS NOT NULL
)
TO 'client/gis-client/public/overture_highways.geojson'
WITH (FORMAT GDAL, DRIVER 'GeoJSON');

SELECT
    'overture_highways.geojson сформирован' AS status,
    COUNT(*) AS total_features
FROM overture_highways
WHERE geom IS NOT NULL;
