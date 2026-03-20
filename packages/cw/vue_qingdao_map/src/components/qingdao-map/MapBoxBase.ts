import { MapBoxConfig } from './MapBoxConfig';
import { MAP_POP_CONTAINER_CLASSNAME } from './constants';

export class MapBoxBase {
    MapStyleConfig: any;
    MapImageList: any;
    MapLayerConfig: any;
    onLoadedMap: any;
    onClickMarker: any;
    onClickMapMarkerList: any;
    onCloseMarker: any;
    callBackFuntion: any;
    popLayer: any;
    container: any;
    xMap: any;
    popup: any;

    /**
     * 初始化参数
     * @param {*} container 地图容器id
     * @param {*} options 可选参数
     * @param {*} options.MapImageList 必填。地图图层图片数组。具体参照src\pages\Map\MapLayerConfig.ts文件
     * @param {*} options.MapLayerConfig 必填。地图图层配置：基础图层，浮窗，点击弹窗等等，具体参照src\pages\Map\MapLayerConfig.ts文件
     * @param {*} options.onLoadedMap 非必填。更新src\models\global.ts文件内hadLoadedMap字段。（判断地图相关图片是否已加载完成，加载完成后进行图层渲染）
     * @param {} options.onClickMarker 非必填。图层要素点击事件，与地图弹窗交互（src\hooks\useMapMarker.ts）
     * @param {} options.onCloseMarker 非必填。图层弹窗关闭事件，与地图弹窗交互（src\hooks\useMapMarker.ts）
     * @param {} options.initialOption 非必填。地图初始化参数，默认为空对象
     */
    constructor(container: any, options: any = {}) {
        const {
            MapStyleConfig,
            MapImageList,
            MapLayerConfig,
            onLoadedMap,
            onClickMarker,
            onClickMapMarkerList,
            onCloseMarker,
            initialOption = {},
            callBackFuntion,
        } = options;
        this.MapStyleConfig = MapStyleConfig ?? MapBoxConfig;
        this.MapImageList = MapImageList;
        this.MapLayerConfig = MapLayerConfig;
        this.onLoadedMap = onLoadedMap;
        this.onClickMarker = onClickMarker;
        this.onClickMapMarkerList = onClickMapMarkerList;
        this.callBackFuntion = callBackFuntion;
        this.onCloseMarker = onCloseMarker;
        this.popLayer = null; // 当前打开弹窗的图层
        this.container = container;
        this.xMap = this.mapInit(initialOption);
        this.popup = new window.mapboxgl.Popup({
            anchor: 'top-left',
            closeButton: false,
            className: 'precinctCarcnt',
            maxWidth: '1000px',
            offset: [10, 10],
        });
    }

    /**
     * 地图初始化
     */
    mapInit(params: any) {
        if (!this.container) {
            console.error('MapBoxBase container is required!');
            return null;
        }
        
        const map = new window.mapboxgl.Map({
            container: this.container,
            style: this.MapStyleConfig,
            center: [120.395966, 36.070892],
            pitch: 45,
            zoom: 8.5, // 调整初始缩放级别
            maxZoom: 22,
            dragRotate: false,
            ...params,
        });
        map.on('load', () => {
            const { MapImageList } = this;
            if (MapImageList?.length) {
                for (let i = 0; i < MapImageList.length; i++) {
                    const { url, name } = MapImageList[i];
                    map.loadImage(url, (error: any, image: any) => {
                        if (error) {
                            console.warn(`MapBoxBase: Failed to load image ${name} from ${url}`, error);
                            return;
                        }
                        map.addImage(name, image);
                    });
                }
            }
            this.onLoadedMap?.();
        });
        return map;
    }

    /**
     * 地图添加（更新）点位图层,
     * @param layerName  图层名称
     * @param dataList 数据集合
     * @param lngName 经度字段
     * @param latName 纬度名称
     * @param standard 是否需要转换成高德坐标，true 是需要转换，false 不需要转换
     * @param layout 样式
     * @param paint 样式
     */
    addUpdatePointVectorLayer(
        layerName: string,
        dataList: any[],
        lngName: string,
        latName: string,
        standard: boolean,
        layout: any,
        paint: any,
        beforeId: any = null,
    ) {
        try {
            let data = this.transData(dataList, lngName, latName, standard);
            if (data?.length > 0) {
                if (!this.xMap.getLayer(layerName)) {
                    this.xMap.addSource(layerName, {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: data,
                        },
                    });
                    if (beforeId && this.xMap.getLayer(beforeId)) {
                        this.xMap.addLayer(
                            {
                                id: layerName,
                                type: 'symbol',
                                source: layerName,
                                layout: layout || this.createLayout(layerName) || {},
                                paint: paint || {},
                            },
                            beforeId,
                        );
                    } else {
                        this.xMap.addLayer({
                            id: layerName,
                            type: 'symbol',
                            source: layerName,
                            layout: layout || this.createLayout(layerName) || {},
                            paint: paint || {},
                        });
                    }

                    this.addLayerMouseMove(layerName);
                    this.addLayerClick(layerName);
                } else {
                    let json = {
                        type: 'FeatureCollection',
                        features: data,
                    };
                    this.xMap.getSource(layerName).setData(json);
                }
                this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
            } else {
                if (this.xMap.getLayer(layerName)) {
                    this.clearLayer(layerName);
                }
            }
        } catch (error) {
            console.log('MapBoxBase ~ addUpdatePointVectorLayer ~ error:', error);
        }
    }

    /**
     * 移除mark图层
     * @param {*} markerList
     * {
     *  layerName: string; // 图层名
     *  marker: marker实例,
     *  clickMarkerFun: null | marker元素点击事件回调函数,
     *  hoverInMarkerFun: null | marker元素mouseenter事件回调函数,
     *  hoverOutMarkerFun: null | marker元素mouseleave事件回调函数,
     * }
     */
    removeMarkerLayer(markerList: any[]) {
        if (markerList?.length) {
            this.closePopLayer(markerList[0].layerName);
            for (let i = 0; i < markerList.length; i++) {
                const item = markerList[i];
                if (!item) {
                    continue;
                }
                const { marker, clickMarkerFun, hoverInMarkerFun, hoverOutMarkerFun } = item;
                marker.remove();
                let markerEl = marker.getElement();
                if (clickMarkerFun) {
                    markerEl.removeEventListener('click', clickMarkerFun);
                }
                if (hoverInMarkerFun) {
                    markerEl.removeEventListener('mouseenter', hoverInMarkerFun);
                }
                if (hoverOutMarkerFun) {
                    markerEl.removeEventListener('mouseleave', hoverOutMarkerFun);
                }
                markerEl = null;
            }
        }
        return [];
    }

    /**
     * 增加marker图层
     * @param {*} layerName 图层唯一标识
     * @param {*} clearMarkerList 需清除marker图层（新增时将返回）
     * {
     *  marker: marker实例,
     *  clickMarkerFun: null | marker元素点击事件回调函数,
     *  hoverInMarkerFun: null | marker元素mouseenter事件回调函数,
     *  hoverOutMarkerFun: null | marker元素mouseleave事件回调函数,
     * }
     * @param {*} dataList 需增加marker图层
     * {
     *  // mapboxgl.Marker配置项及其他自定义配置
     *  markerOptions: {
     *      className?: string; // marker元素的类名
     *      iconUrl?: string; // marker背景图（插入单个图标时可配置）
     *      html?: string; // 需插入的html代码（插入非单个图标内容时可配置）
     *      style?: {
     *          width?: string; // 宽度px；
     *          height?: string; // 宽度px；
     *      }; // marker元素样式
     *      // 以下为mapboxgl.Marker配置项
     *      config: {
     *          anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' ;// 定位，默认'center'
     *          offset?: [number, number]; // [x, y]偏移量，默认[0, 0]
     *      };
     *  };
     *  // 要素相关属性
     *  properties: {
     *      id: string;
     *      longitude: number; // 经度；key值可在options内配置别名
     *      latitude: number; // 纬度；key值可在options内配置别名
     *  };
     * }[]
     * @param {*} options 其他配置项
     * {
     *  transCoordinate?: boolean; // 是否转换坐标，默认true
     *  longitude?: string; // 经度key值，默认longitude
     *  latitude?: string; // 纬度key值，默认latitude
     *  markerOptions?: object; // 结构和上述一致。优先级dataList更高
     * }
     * @returns {
     *  layerName: string; 图层名
     *  marker: marker实例,
     *  clickMarkerFun: null | marker元素点击事件回调函数,
     *  hoverInMarkerFun: null | marker元素mouseenter事件回调函数,
     *  hoverOutMarkerFun: null | marker元素mouseleave事件回调函数,
     * }[]
     */
    addMarkerLayer(layerName: string, clearMarkerList: any[], dataList: any[], options: any = {}) {
        this.removeMarkerLayer(clearMarkerList);
        try {
            const DEFAULT_MARKER_CONFIG = {
                anchor: 'center',
                offset: [0, 0],
            };
            const transCoordinate = options?.transCoordinate ?? true;
            const longitude = options?.longitude ?? 'longitude';
            const latitude = options?.latitude ?? 'latitude';
            const markerStyle = options?.markerOptions?.style;
            const markerConfig = options?.markerOptions?.config ?? DEFAULT_MARKER_CONFIG;
            let iconUrl = options?.markerOptions?.iconUrl,
                html = options?.markerOptions?.html;
            const { canClick, canHover } = this.MapLayerConfig[layerName] ?? {};
            const markerList: any[] = [];
            for (let i = 0; i < dataList.length; i++) {
                const { markerOptions: itemOptions, properties } = dataList[i];
                const noPosition = !properties[longitude] || !properties[latitude];
                if (noPosition) {
                    continue;
                }

                const lngLatArr = [properties[longitude], properties[latitude]];
                if (itemOptions?.iconUrl) {
                    iconUrl = itemOptions.iconUrl;
                }
                if (itemOptions?.html) {
                    html = itemOptions.html;
                }

                const el = document.createElement('div');
                const { width, height } = Object.assign(
                    {},
                    markerStyle ?? {},
                    itemOptions?.style ?? {},
                );
                if (width) {
                    el.style.width = width;
                }
                if (height) {
                    el.style.height = height;
                }

                if (itemOptions?.className) {
                    el.className = itemOptions.className;
                }
                if (iconUrl) {
                    el.style.backgroundImage = `url(${iconUrl})`;
                    el.style.backgroundSize = '100%';
                    el.style.backgroundRepeat = 'no-repeat';
                }
                if (html) {
                    el.innerHTML = html;
                }

                let hoverInMarkerFun: any = null,
                    hoverOutMarkerFun: any = null;
                if (canHover) {
                    hoverInMarkerFun = () => {
                        let html = '';
                        const showListItem = this.MapLayerConfig[layerName]?.showListItem;
                        if (typeof showListItem === 'function') {
                            html = showListItem(properties);
                        }
                        this.addMouseMoveTipPop(`<ul>${html}</ul>`, lngLatArr);
                    };
                    hoverOutMarkerFun = () => {
                        this.removeMouseMoveTipPop();
                    };
                    el.addEventListener('mouseenter', hoverInMarkerFun);
                    el.addEventListener('mouseleave', hoverOutMarkerFun);
                }

                let clickMarkerFun: any = null;
                if (canClick) {
                    el.style.cursor = 'pointer';
                    clickMarkerFun = (e: any) => {
                        e.stopPropagation();
                        this.displayAPopup({
                            layerName,
                            features: {
                                properties,
                                geometry: {
                                    coordinates: [lngLatArr],
                                },
                            },
                        });
                    };
                    el.addEventListener('click', clickMarkerFun);
                }

                const lngLat = transCoordinate ? this.transCoordinate(...lngLatArr) : lngLatArr;
                const itemConfig = Object.assign(markerConfig, itemOptions?.config ?? {});
                const marker = new window.mapboxgl.Marker({
                    element: el,
                    ...itemConfig,
                })
                    .setLngLat(lngLat)
                    .addTo(this.xMap);
                markerList.push({
                    layerName,
                    marker,
                    clickMarkerFun,
                    hoverInMarkerFun,
                    hoverOutMarkerFun,
                });
            }
            return markerList;
        } catch (error) {
            console.error('MapBoxBase ~ addMarkerLayer ~ error:', error);
            return [];
        }
    }

    /**
     * 接口数据转换成geojson
     * @param data
     */
    transData(data: any, lngName: string, latName: string, standard: boolean) {
        let features = [];
        if (!data) {
            return features;
        }
        for (let d of data) {
            const _lng = parseFloat(d[lngName]),
                lat = parseFloat(d[latName]);
            let c = [_lng || d[0], lat || d[1]];
            if (standard) {
                c = this.transCoordinate(_lng || d[0], lat || d[1]);
            }
            if (c != null) {
                features.push({
                    type: 'Feature',
                    properties: d,
                    geometry: {
                        type: 'Point',
                        coordinates: c,
                    },
                });
            }
        }
        return features;
    }

    transLineFeature(data: any, lngName: string, latName: string, standard: string) {
        let coordinates = [];
        if (!data) {
            return null;
        }
        for (let d of data) {
            const _lng = parseFloat(d[lngName]),
                lat = parseFloat(d[latName]);
            let c = [_lng || d[0], lat || d[1]];
            if (standard) {
                c = this.transCoordinate(_lng || d[0], lat || d[1]);
            }
            if (c != null) {
                coordinates.push(c);
            }
        }
        return {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coordinates },
        };
    }

    /**
     * 添加或更新线图层，（geojson）
     * @param layerName 图层名称
     * @param geoJsonData  数据
     * @param layout 样式
     * @param paint 样式
     */
    addUpdateLineVectorLayer(layerName: string, geoJsonData: any, layout: any, paint: any, beforeId: any) {
        try {
            if (!this.xMap.getLayer(layerName)) {
                this.xMap.addSource(layerName, {
                    type: 'geojson',
                    data: geoJsonData,
                });
                if (!this.xMap.getLayer(beforeId)) {
                    beforeId = null;
                }
                this.xMap.addLayer(
                    {
                        id: layerName,
                        type: 'line',
                        source: layerName,
                        layout: layout || {},
                        paint: paint || this.createLinePaint() || {},
                    },
                    beforeId,
                );
            } else {
                this.xMap.getSource(layerName).setData(geoJsonData);
            }
            this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
        } catch (error) {
            console.log('MapBoxBase ~ addUpdateLineVectorLayer ~ error:', error);
        }
    }

    /**
     * 根据连续点位线数据添加或更新线 图层
     * @param layerName
     * @param dataList
     * @param lngName
     * @param latName
     * @param standard
     * @param layout
     * @param paint
     * @param beforeId
     */
    addUpdateLineVectorLayersByListData(
        layerName: string,
        dataList: any[],
        lngName: string,
        latName: string,
        standard: string,
        layout: any,
        paint: any,
        beforeId: any,
    ) {
        try {
            let fs = [];
            for (let data of dataList) {
                let lineFeature = this.transLineFeature(data, lngName, latName, standard);
                if (lineFeature != null) {
                    fs.push(lineFeature);
                }
            }

            if (!this.xMap.getLayer(layerName)) {
                this.xMap.addSource(layerName, {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: fs,
                    },
                });
                if (!this.xMap.getLayer(beforeId)) {
                    beforeId = null;
                }
                this.xMap.addLayer(
                    {
                        id: layerName,
                        type: 'line',
                        source: layerName,
                        layout: layout || {},
                        paint: paint || this.createLinePaint() || {},
                    },
                    beforeId,
                );
            } else {
                //更新数据
                let json = {
                    type: 'FeatureCollection',
                    features: fs,
                };
                this.xMap.getSource(layerName).setData(json);
            }
            this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
        } catch (error) {
            console.error('MapBoxBase ~ addUpdateLineVectorLayersByListData ~ error:', error);
        }
    }

    /**
     * 获取图层默认样式
     * @param layerType 图层类型
     * @returns {Object} 默认样式对象
     */
    getDefaultPaintStyle(layerType: string) {
        switch (layerType) {
            case 'fill':
                return {
                    'fill-color': '#0080ff',
                    'fill-opacity': 0.5,
                };
            case 'line':
                return {
                    'line-color': '#0080ff',
                    'line-width': 2,
                };
            case 'circle':
                return {
                    'circle-color': '#0080ff',
                    'circle-radius': 5,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff',
                };
            default:
                return {};
        }
    }

    /**
     * 根据多个四边形点集创建/更新一个图层，显示多个封闭图形
     * @param layerName 图层名称
     * @param areaDataList 多个区域数据，格式：[ [ [lng, lat], ... ] ]
     * @param areaDataName 区域数据字段名称
     * @param layerType 图层类型 'fill' | 'line'
     * @param layout 布局样式
     * @param paint 绘制样式
     * @param beforeId 插入位置
     */
    addUpdateMultiPolygonLayer(
        layerName: string,
        areaDataList: any[],
        areaDataName: string,
        layerType = 'fill',
        layout: any,
        paint: any,
        beforeId: any,
    ) {
        try {
            const features = areaDataList
                .map((item) => {
                    const points = item[areaDataName];
                    if (points.length < 3) {
                        console.warn('至少提供三个点');
                        return null;
                    }
                    return {
                        type: 'Feature',
                        properties: {
                            color: item.color || '#00BB25', // 默认颜色或字段
                        },
                        geometry: {
                            type: 'Polygon',
                            coordinates: [points.concat([points[0]])],
                        },
                    };
                })
                .filter((f) => f !== null);

            const sourceExists = this.xMap.getSource(layerName);
            const layerExists = this.xMap.getLayer(layerName);

            const defaultPaint = {
                'fill-color': ['get', 'color'], // 动态获取 color 属性
                'fill-opacity': 0.5,
            };

            paint = paint || defaultPaint;

            if (!layerExists) {
                if (!sourceExists) {
                    this.xMap.addSource(layerName, {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: features,
                        },
                    });
                }

                if (!this.xMap.getLayer(beforeId)) {
                    beforeId = null;
                }

                this.xMap.addLayer(
                    {
                        id: layerName,
                        type: layerType,
                        source: layerName,
                        layout: layout || {},
                        paint: paint,
                    },
                    beforeId,
                );
            } else {
                this.xMap.getSource(layerName).setData({
                    type: 'FeatureCollection',
                    features: features,
                });
            }

            this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
        } catch (error) {
            console.error('MapBoxBase ~ addUpdateMultiPolygonLayer ~ error:', error);
        }
    }

    /**
     * 显示更新聚合图层
     */
    addUpdateClusterLayer(
        layerName: string,
        dataList: any[],
        lngName: string,
        latName: string,
        standard: boolean,
        layout: any,
        paint: any,
        showCountOption: any = null,
    ) {
        try {
            let defaultLayout = {
                'icon-image': 'vd',
                'icon-size': 1,
                'icon-allow-overlap': true,
            };
            let data = this.transData(dataList, lngName, latName, standard);
            if (!this.xMap.getLayer(layerName)) {
                this.xMap.addSource(layerName, {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: data,
                    },
                    cluster: true,
                    clusterMaxZoom: 18,
                    clusterRadius: 50,
                });
                this.xMap.addLayer({
                    id: layerName,
                    type: 'symbol',
                    source: layerName,
                    layout: layout || defaultLayout,
                    paint: paint || {},
                });
                if (showCountOption && showCountOption.showCount) {
                    const { layout, paint } = showCountOption;
                    this.xMap.addLayer({
                        id: layerName + '_count',
                        type: 'symbol',
                        source: layerName,
                        filter: ['has', 'point_count'],
                        layout: {
                            'text-allow-overlap': true,
                            'text-field': ['get', 'point_count'],
                            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                            'text-anchor': 'top',
                            'text-offset': [0, -2.2],
                            'text-size': 12,
                            ...layout,
                        },
                        paint: {
                            'text-color': '#ffffff',
                            ...paint,
                        },
                    });
                }
                this.addLayerMouseMove(layerName);
                this.addLayerClick(layerName);
            } else {
                //更新数据
                let json = {
                    type: 'FeatureCollection',
                    features: data,
                };
                this.xMap.getSource(layerName).setData(json);
            }
            this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
        } catch (error) {
            console.log('MapBoxBase ~ addUpdateClusterLayer ~ error:', error);
        }
    }

    /**
     * 添加或更新图层（geojson）
     * @param layerName
     * @param type
     * @param data
     * @param layout
     * @param paint
     */
    addUpdateLayerByGeoJson(layerName: string, type: string, data: any, layout: any, paint: any, beforeId: any = null) {
        try {
            if (data == null) {
                return;
            }
            if (!this.xMap.getLayer(layerName)) {
                this.xMap.addSource(layerName, {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: data,
                    },
                });
                if (!this.xMap.getLayer(beforeId)) {
                    beforeId = null;
                }
                this.xMap.addLayer(
                    {
                        id: layerName,
                        type: type,
                        source: layerName,
                        layout: layout || {},
                        paint: paint || {},
                    },
                    beforeId,
                );
                this.addLayerMouseMove(layerName);
                this.addLayerClick(layerName);
            } else {
                let json = {
                    type: 'FeatureCollection',
                    features: data,
                };
                this.xMap.getSource(layerName).setData(json);
            }
            this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
        } catch (error) {
            console.log('MapBoxBase ~ addUpdateLayerByGeoJson ~ error:', error);
        }
    }

    /**
     * 创建一个空的点位图层
     * @param layerName
     */
    addEmptyPointLayer(layerName: string) {
        try {
            this.xMap.addSource(layerName, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [],
                },
            });
            this.xMap.addLayer({
                id: layerName,
                type: 'symbol',
                source: layerName,
                paint: {
                    'icon-opacity': 1,
                },
            });
        } catch (error) {
            console.log('MapBoxBase ~ addEmptyPointLayer ~ error:', error);
        }
    }

    /**
     * 显示热力图
     * @param layerName 图层名称
     * @param dataList 数据
     * @param lngName 经度名称
     * @param latName 纬度名称
     * @param standard 是否是84 true 是，false 高德
     * @param layout 样式
     * @param paint 样式
     */
    addUpdateHeatLayerByData(
        layerName: string,
        dataList: any[],
        lngName: string,
        latName: string,
        standard: boolean,
        layout: any,
        paint: any,
        beforeId: any = null,
    ) {
        try {
            let defaultPaint = {
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 20, 3],
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0,
                    'rgba(33,102,172,0)',
                    0.2,
                    'rgb(103,169,207)',
                    0.4,
                    'rgb(209,229,240)',
                    0.6,
                    'rgb(253,219,199)',
                    0.8,
                    'rgb(239,138,98)',
                    1,
                    'rgb(255,0,0)',
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 20, 0],
            };
            let data = this.transData(dataList, lngName, latName, standard);
            if (!this.xMap.getLayer(layerName)) {
                this.xMap.addSource(layerName, {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: data,
                    },
                });
                if (beforeId) {
                    this.xMap.addLayer(
                        {
                            id: layerName,
                            type: 'heatmap',
                            source: layerName,
                            layout: layout || {},
                            paint: paint || defaultPaint,
                        },
                        beforeId,
                    );
                } else {
                    this.xMap.addLayer({
                        id: layerName,
                        type: 'heatmap',
                        source: layerName,
                        layout: layout || {},
                        paint: paint || defaultPaint,
                    });
                }
                this.addLayerClick(layerName);
            } else {
                if (layerName !== 'controlCar_trafficstat') {
                    let radius = 15;
                    if (dataList?.length > 10000) {
                        radius = 2;
                    } else if (dataList?.length > 1000 && dataList?.length < 10000) {
                        radius = 8;
                    }
                    this.xMap.setPaintProperty(layerName, 'heatmap-radius', radius);
                }
                //更新数据
                let json = {
                    type: 'FeatureCollection',
                    features: data,
                };
                this.xMap.getSource(layerName).setData(json);
            }
            this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
        } catch (error) {
            console.log('MapBoxBase ~ addUpdateHeatLayerByData ~ error:', error);
        }
    }

    /**
     * 删除图层
     * @param layerName
     */
    moveLayer(layerName: string) {
        this.xMap.moveLayer(layerName);
    }

    /**
     * 图层排序
     * @param {*} orderLayers 图层顺序id列表
     * @returns
     */
    onOrderLayers(orderLayers: string[]) {
        try {
            const ly = this.xMap.style._layers;
            const layers = Object.keys(ly).map((key) => ly[key]);
            const ownLayers = [];
            const beforeLayers = [];
            orderLayers.forEach((id) => {
                if (id) {
                    const l = layers.find((item) => item.id === id);
                    if (l) {
                        ownLayers.push(l);
                    }
                }
            });
            layers.forEach((layer) => {
                if (!ownLayers.find((item) => item.id === layer.id)) {
                    beforeLayers.push(layer);
                }
            });
            const allLayers = beforeLayers.concat(ownLayers);
            this.xMap.style._checkLoaded();
            this.xMap.style._changed = true;
            this.xMap.style._order = allLayers.map((a) => a.id);
            this.xMap.style._layerOrderChanged = true;
            return allLayers;
        } catch (error) {
            console.log('MapBoxBase ~ onOrderLayers ~ error:', error);
        }
    }

    /**
     * 移动图层层级
     * @param downLayerName 下层图层名称
     * @param upLayerName 上层图层名称
     */
    changeLayerIndex(downLayerName: string, upLayerName: string) {
        setTimeout(() => {
            if (!this.xMap.getLayer(downLayerName) || !this.xMap.getLayer(upLayerName)) {
                return;
            }
            this.xMap.moveLayer(downLayerName, upLayerName);
        }, 2000);
    }

    /**
     * 隐藏或展示图层
     * @param layerName
     */
    showHideLayer(layerName: string) {
        if (!this.xMap.getLayer(layerName)) {
            return;
        }
        if (
            this.xMap.getLayoutProperty(layerName, 'visibility') === undefined ||
            this.xMap.getLayoutProperty(layerName, 'visibility') === 'visible'
        ) {
            this.xMap.setLayoutProperty(layerName, 'visibility', 'none');
            this.closePopLayer(layerName);
        } else {
            this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
        }
    }
    showLayer(layerName: string) {
        if (!this.xMap.getLayer(layerName)) {
            return;
        }
        this.xMap.setLayoutProperty(layerName, 'visibility', 'visible');
    }
    hideLayer(layerName: string) {
        if (!this.xMap.getLayer(layerName)) {
            return;
        }
        this.xMap.setLayoutProperty(layerName, 'visibility', 'none');
    }

    /**
     * 设置当前打开弹窗的图层
     * 关闭某图层时，以此判断是否需要关闭弹窗
     * @param {*} layerName 图层唯一名称
     */
    setPopLayer(layerName: string) {
        this.popLayer = layerName;
    }

    /**
     * 删除当前打开弹窗的图层
     */
    removePopLayer() {
        this.popLayer = null;
    }

    closePopLayer(layerName: string) {
        if (typeof this.onCloseMarker === 'function' && this.popLayer === layerName) {
            this.onCloseMarker();
            this.removePopLayer();
        }
    }

    /**
     * 清空一个矢量图层
     * @param layerName
     */
    clearLayer(layerName: string) {
        if (this.xMap.getLayer(layerName)) {
            let json = {
                type: 'FeatureCollection',
                features: [],
            };
            this.xMap.getSource(layerName).setData(json);
            this.closePopLayer(layerName);
        }
    }

    /**
     * 场景：打开浮窗，要求浮窗居中，故移动地图中心点
     * 当关闭浮窗时，重置地图中心点
     * @param {*} popup 当前浮窗实例
     */
    resetCenterOnCloseMarker(popup: any) {
        popup.once('close', () => {
            const { center, zoom } = this.MapStyleConfig;
            this.locator(...center, zoom, true);
        });
    }

    /**
     * 立即显示弹窗
     * @param {*} params
     * @param {*} params.layerName string
     * @param {*} params.features object 地图所需经纬度及要素属性
     */
    displayAPopup(params: any) {
        if (!params) {
            return;
        }
        if (typeof this.onCloseMarker === 'function') {
            this.onCloseMarker();
        }
        try {
            const { layerName, features } = params;
            const { popPath, lngLatCenterOffset } = this.MapLayerConfig[layerName];
            const {
                geometry: { coordinates },
                properties,
            } = features;
            if (!coordinates?.length) {
                console.error('displayAPopup ~ coordinates is empty');
                return;
            }
            const length = coordinates.length;
            const middleIndex = !length ? length : Math.floor(length / 2);
            const lngLat = coordinates[middleIndex];
            const popup = new window.mapboxgl.Popup({
                className: MAP_POP_CONTAINER_CLASSNAME,
                anchor: 'bottom',
                closeButton: false,
                offset: [0, -20],
                maxWidth: '1000px',
            });
            popup.setLngLat(lngLat).setHTML(`<div id='map-pop-id'></div>`).addTo(this.xMap);
            if (typeof this.onClickMarker === 'function') {
                lngLatCenterOffset && this.resetCenterOnCloseMarker(popup);
                this.onClickMarker({
                    id: properties.id,
                    path: popPath,
                    data: {
                        ...properties,
                        layerName,
                    },
                });
            }
        } catch (error) {
            console.error('MapBoxBase.js: displayAPopup ~ error', error);
        }
    }

    /**
     * 鼠标点击事件
     * @param layerName 图层名称
     */
    addLayerClick(layerName: string) {
        const { MapLayerConfig } = this;
        const popup = new window.mapboxgl.Popup({
            className: MAP_POP_CONTAINER_CLASSNAME,
            anchor: 'bottom',
            closeButton: false,
            offset: [0, -10],
            maxWidth: '1000px',
        });
        const canClick = Object.values(MapLayerConfig).find((item) => {
            return item?.canClick && item.name === layerName;
        });
        if (!canClick) {
            return;
        }

        this.xMap.on('click', layerName, (e: any) => {
            let fs = e.features;
            if (fs.length > 0) {
                const {
                    propertyName,
                    popPath,
                    marKerListPath,
                    canClickShowList,
                    lngLatCenterOffset,
                } = MapLayerConfig[layerName];
                const clusterId = fs[0].properties.cluster_id;
                let popupHtml = "<div id='map-pop-id'></div>";
                if (canClickShowList) {
                    popupHtml = `
                        <div id='map-markerList-id'></div>
                        <div id='map-pop-id'></div>
                    `;
                }
                popup.setLngLat(e.lngLat).setHTML(popupHtml).addTo(this.xMap);
                //聚合图层
                if (canClickShowList && fs.length > 0 && clusterId) {
                    this.xMap.getSource(layerName).getClusterLeaves(
                        clusterId,
                        Infinity,
                        0,
                        (err: any, leaves: any[]) => {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            if (typeof this.onClickMapMarkerList === 'function') {
                                leaves.forEach((item) => {
                                    item.source = layerName;
                                });
                                popup.setLngLat(e.lngLat).setHTML(popupHtml).addTo(this.xMap);
                                //提供下沿列表
                                this.onClickMapMarkerList({
                                    data: {
                                        list: leaves,
                                        layerName,
                                        path: popPath,
                                    },
                                    path: marKerListPath,
                                });
                            }
                        },
                    );
                    return;
                }
                if (canClickShowList && fs.length > 1) {
                    if (typeof this.onClickMapMarkerList === 'function') {
                        //提供下沿列表
                        this.onClickMapMarkerList({
                            data: {
                                list: fs,
                                layerName,
                                path: popPath,
                            },
                            path: marKerListPath,
                        });
                    }
                    return;
                }
                let f = fs[0];
                const blackList = ['backgroud', 'export_highway', 'gis_osm_water_a_free_1'];
                if (blackList.indexOf(f.layer.id) > -1) {
                    return;
                }
                if (f.properties) {
                    let data = f.properties;
                    if (propertyName && f.properties[propertyName]) {
                        data = JSON.parse(f.properties[propertyName]);
                    }
                    const { id } = data;
                    if (canClick.callBackFuntion) {
                        this.callBackFuntion({
                            modelType: layerName,
                            ...data,
                        });
                        return false;
                    }
                    if (typeof this.onClickMarker === 'function') {
                        this.onClickMarker({
                            id,
                            path: popPath,
                            data: {
                                ...data,
                                layerName,
                            },
                        });
                        if (typeof lngLatCenterOffset === 'object') {
                            this.locator(
                                e.lngLat.lng + lngLatCenterOffset[0],
                                e.lngLat.lat + lngLatCenterOffset[1],
                                this.MapStyleConfig.zoom,
                                true,
                            );
                            this.resetCenterOnCloseMarker(popup);
                        }
                    }
                }
            }
        });
    }

    /**
     * 鼠标移动事件
     * @param layerName 图层名称
     */
    addLayerMouseMove(layerName: string) {
        const { MapLayerConfig } = this;
        const canHover = Object.values(MapLayerConfig).find((item) => {
            return item?.canHover && item.name === layerName;
        });
        if (!canHover) {
            return;
        }
        //高亮id
        let hoveredStateId = null;
        this.xMap.on('mousemove', layerName, (e: any) => {
            this.popup.remove();
            this.xMap.getCanvas().style.cursor = '';
            let fs = e.features;
            //是否需要高亮显示
            if (MapLayerConfig[e.features[0].layer.id]?.canHoverHigh) {
                if (hoveredStateId !== null) {
                    this.xMap.setFeatureState(
                        { source: layerName, id: hoveredStateId },
                        { hover: false },
                    );
                }
                hoveredStateId = e.features[0].id;
                this.xMap.setFeatureState(
                    { source: layerName, id: hoveredStateId },
                    { hover: true },
                );
            }

            let html = '';
            let pointer = false;
            for (let f of fs) {
                if (!MapLayerConfig[f.layer.id]?.canHover) {
                    continue;
                }
                pointer = true;
                const layerConfig = MapLayerConfig[f.layer.id];
                const { showListItem } = layerConfig;
                if (layerConfig) {
                    // 聚合图层
                    if (f.properties.cluster) {
                        const clusterId = f.properties.cluster_id;
                        this.xMap
                            .getSource(layerName)
                            .getClusterLeaves(clusterId, Infinity, 0, (err: any, leaves: any[]) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                }
                                leaves.forEach((item) => {
                                    if (showListItem) {
                                        if (layerConfig.canHoverHigh) {
                                            html = showListItem(item.properties, this.popup);
                                        } else {
                                            html += showListItem(item.properties, this.popup);
                                        }
                                    }
                                });
                                if (html != '') {
                                    this.addMouseMoveTipPop(`<ul>${html}</ul>`, e.lngLat);
                                }
                            });
                    } else {
                        if (showListItem) {
                            if (layerConfig.canHoverHigh) {
                                html = showListItem(f.properties, this.popup);
                            } else {
                                html += showListItem(f.properties, this.popup);
                            }
                        }
                    }
                }
            }
            if (!html == '') {
                this.addMouseMoveTipPop(`<ul>${html}</ul>`, e.lngLat);
            }
            if (pointer) {
                this.xMap.getCanvas().style.cursor = 'pointer';
            }
        });
        this.xMap.on('mouseleave', layerName, (e: any) => {
            this.removeMouseMoveTipPop();
            //高亮显示控制
            if (hoveredStateId !== null && MapLayerConfig[layerName]?.canHoverHigh) {
                this.xMap.setFeatureState(
                    { source: layerName, id: hoveredStateId },
                    { hover: false },
                );
            }
            hoveredStateId = null;
        });
    }

    /**
     * 添加鼠標移動提示框
     * @param html
     */
    addMouseMoveTipPop(html: string, coor: any) {
        this.popup
            .setLngLat(coor)
            .setHTML(`<div class="mouseon-popup-wrap">${html}</div>`)
            .addTo(this.xMap);
    }

    /**
     * 移除鼠標移動提示框
     */
    removeMouseMoveTipPop() {
        this.popup.remove();
        this.xMap.getCanvas().style.cursor = '';
    }

    /**
     * 定位
     * @param lng
     * @param lat
     * @param isFly 是否需要飞行定位
     */
    locator(lng: number, lat: number, zoom: number, isFly: boolean) {
        if (isFly) {
            this.xMap.flyTo({
                center: [lng, lat],
                zoom: zoom,
            });
        } else {
            this.xMap.jumpTo({ center: [lng, lat], zoom: zoom });
        }
    }

    /**
     * 创建 默认layout
     */
    createLayout(layerName: string) {
        const layout = {
            'icon-image': layerName,
            'icon-allow-overlap': true,
            'text-ignore-placement': true,
            visibility: 'visible',
        };
        return layout;
    }

    /**
     * 创建paint
     */
    createPaint() {}

    /**
     * 创建默认的线样式
     */
    createLinePaint() {
        return {
            'line-color': '#2AD4FF',
            'line-width': 3,
            'line-opacity': 0.8,
        };
    }

    /**
     * 坐标转换
     * @param longitude
     * @param latitude
     */
    transCoordinate(longitude: number, latitude: number) {
        if (window.MapUtil && window.MapUtil.validLngLat) {
            return window.MapUtil.validLngLat(longitude, latitude);
        }
        return [longitude, latitude];
    }

    /**
     * 车辆移动
     * @param carMap key 为车牌， 第二个key  startPoint为起点，endPoint为终点
     * @param steps 步长，数值越大，移动的越慢
     */
    carMoving(origin: any, destination: any, steps: number) {
        if (steps == undefined || steps == null) {
            steps = 500;
        }
        let that: any = this;
        if (that.layerNameGather.indexOf('point') < 0) {
            that.addEmptyLayer('point');
            that.xMap.setLayoutProperty('point', 'icon-image', 'car');
            that.xMap.setLayoutProperty('point', 'icon-rotate', ['get', 'bearing']);
        }
        if (that.layerNameGather.indexOf('route') < 0) {
            that.addEmptyLayer('route');
        }
        const point = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Point',
                        coordinates: origin,
                    },
                },
            ],
        };
        const route = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [origin, destination],
                    },
                },
            ],
        };
        //总长度
        const lineDistance = window.turf.length(route.features[0]);
        //分割点
        const arc = [];
        for (let i = 0; i < lineDistance; i += lineDistance / steps) {
            const segment = window.turf.along(route.features[0], i);
            arc.push(segment.geometry.coordinates);
        }
        route.features[0].geometry.coordinates = arc;
        let counter = 0;

        function animate() {
            const start =
                route.features[0].geometry.coordinates[counter >= steps ? counter - 1 : counter];
            const end =
                route.features[0].geometry.coordinates[counter >= steps ? counter : counter + 1];
            if (!start || !end) return;
            point.features[0].geometry.coordinates =
                route.features[0].geometry.coordinates[counter];
            point.features[0].properties.bearing = window.turf.bearing(
                window.turf.point(start),
                window.turf.point(end)
            );
            that.xMap.getSource('point').setData(point);
            if (counter < steps) {
                requestAnimationFrame(animate);
            }
            counter = counter + 1;
        }

        animate();
    }

    /**
     * 创建一个圆对象
     * @param lng
     * @param lat
     * @param radis
     */
    createCircleObject(lng, lat, radius) {
        let options = { steps: 1000, units: 'kilometers' };
        let circle = window.turf.circle([lng, lat], radius, options);
        return circle;
    }
}
