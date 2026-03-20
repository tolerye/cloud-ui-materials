const MapBoxConfig = {
    version: 8,
    name: 'Empty Style',
    metadata: { 'maputnik:renderer': 'mbgljs' },
    zoom: 7,
    center: [120.323822, 29.41365],
    sources: {
        gaoDeWhite: {
            type: 'raster',
            tiles: [
                'http://webrd02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
            ],
            tileSize: 256,
        },
        gaoDeTxt: {
            type: 'raster',
            tiles: [
                'https://webst02.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scale=1&style=8',
            ],
            tileSize: 256,
        },
        gaoDeImg: {
            type: 'raster',
            tiles: [
                'http://wprd04.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=6',
            ],
            tileSize: 256,
        },
        night: {
            type: 'raster',
            tiles: [
                'https://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
        },
        geoServerBase: {
            type: 'raster',
            tiles: [
                `${
                    window.location.hostname.indexOf('localhost') > -1
                        ? 'http://10.126.3.241:8122'
                        : window.location.origin
                }/geoserver/wms/wms?service=WMS&version=1.1.0&request=GetMap&layers=cico:gzwBaseMap&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true`,
            ],
            tileSize: 256,
        },
        allHighway: {
            scheme: 'tms',
            type: 'vector',
            tiles: [
                `${
                    window.location.hostname.indexOf('localhost') > -1
                        ? 'http://10.126.3.241:8122'
                        : window.location.origin
                }/geoserver/gwc/service/tms/1.0.0/cico%3AallHighway@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf`,
            ],
            bounds: [118.04768808272274, 27.26678017464339, 122.08434691962329, 31.167939667873938],
        },
    },
    sprite: '',
    glyphs: './glyphs/mapbox/{fontstack}/{range}.pbf',
    layers: [
        {
            id: 'geoServerBase',
            type: 'raster',
            source: 'geoServerBase',
            layout: {
                visibility: 'visible',
            },
        },
        {
            id: 'allHighway',
            type: 'line',
            source: 'allHighway',
            'source-layer': 'allHighway',
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
                visibility: 'none',
            },
            paint: {
                'line-color': '#1666A6',
                'line-width': 3,
            },
        },
    ],
    id: 'uabmg9mr6',
};

const URL = {
    iep: 'http://12.1.150.98:8120',
};

export { MapBoxConfig };
