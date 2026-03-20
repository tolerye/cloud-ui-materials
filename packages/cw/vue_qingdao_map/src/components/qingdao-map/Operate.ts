import { CityConfig, exRoad, exNbRoad } from './CityData';
import { DEFAULT_ORG_CODE, FACILITY_MAP_ID, DEVICE_MAP_ID } from './constants';
import MapLayerConfig from './MapLayerConfig';

const LAYER_ORDER = [
    'eventHeat',
    'rescueHeat',
    'bridge',
    'hub',
    'icon-service',
    'icon-toll',
    'icon-messageBoard',
    'icon-uav',
    'icon-video',
    'event',
    'construct',
    'resourceStation',
    'resourcePeople',
    'resourceCar',
    'icon-mainControl',
    'icon-tollControl',
];

let uavTimer = null;

export class Operate {
    _initTimeout;

    constructor(mapBase, operateConfig = {}) {
        const { organizationCode, initLayerNames, onClickMarker } = operateConfig;
        this.onClickMarker = onClickMarker;
        this.mapBase = mapBase;
        this.xMap = this.mapBase.xMap;
        this.xMap.setMaxZoom(13);
        this.organizationCode = organizationCode; //组织id
        this.initLayerNames = initLayerNames; //初始化要显示的图层
        this.resourceTimerTask = null; //施救车辆定时器
        this.resourceTimerJcTask = null; //警车定时器
        this.carFlowPopList = new Map(); //出入口流量气泡集合
        this.scenicSpotPopList = new Map(); //景区流量气泡集合
        this.eventMarkerDLSGList = [];
        this.eventMarkerJTSGList = [];
        this.layerNameList = [
            'event',
            'resourceStation',
            'resourcePeople',
            'resourceCar',
            'eventHeat',
            'rescueHeat',
        ];
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this.xMap.on('load', () => {
            //图层初始化
            console.log('地图图层初始化。进入青岛大屏');
            // 如果是在 Vue/Storybook 环境中可能存在多次触发，确保不要重复调用，或者延迟一下
            if (this._initTimeout) clearTimeout(this._initTimeout);
            this._initTimeout = setTimeout(() => {
                if (this.initLayerNames && Array.isArray(this.initLayerNames)) {
                    this.initLayerNames.forEach((intiLayerName) => {
                        this.showLayer(intiLayerName);
                    });
                }
            }, 100);
        });
    }

    /**
     * 隐藏或展示图层
     * @param layerName
     */
    showHideLayer(layerName) {
        this.mapBase.showHideLayer(layerName);
    }

    /**
     * 定位
     * @param lng 经度
     * @param lat 纬度
     * @param zoom 放大层级
     */
    locator(lng, lat, zoom, isFly = true) {
        this.mapBase.locator(lng, lat, zoom, isFly);
    }

    /**
     * 清除图层
     * @param layerName
     */
    clearLayer(layerName) {
        this.mapBase.clearLayer(layerName);
    }

    /**
     * 显示图层
     * @param layerName
     */
    showLayer(layerName, deviceName) {
        if (!layerName) return;
        const resourceParams = { dataType: 2, organizationCode: this.organizationCode };
        switch (layerName) {
            case 'event': // 交通事件
                this.showEvent(1, layerName, 'eventMarkerJTSGList');
                break;
            case 'construct': // 道路施工
                this.showEvent(2, layerName, 'eventMarkerDLSGList');
                break;
            case 'resourceStation': // 施救驻点
                this.showRescueStation(layerName);
                break;
            case 'resourcePeople': //应急资源-施救人员
                this.showSimpleLayer('SJRY', resourceParams);
                break;
            case 'resourceCar': // 救援车辆
                this.showResourceCar(layerName);
                break;
            case 'eventHeat': // 事件热力图
                this.showEventHeat(layerName);
                break;
            case 'rescueHeat': // 救援热力图
                this.showRescueHeat(layerName);
                break;
            case 'resourceVideo': // 摄像机
                this.showVideoLayer({ deviceName });
                break;
            case 'infoBoard_device': // 情报板
                this.showDevice(layerName);
                break;
            case 'uav': // 无人机
                this.showUavLayer();
                if (uavTimer) {
                    clearInterval(uavTimer);
                }
                uavTimer = setInterval(() => {
                    this.showUavLayer();
                }, 30 * 1000);
                break;
            case 'bridge_facility': // 桥梁
            case 'interflow_facility': // 互通
            case 'hub_facility': // 枢纽
            case 'toll_facility': // 收费站
            case 'serviceArea_facility': // 服务区
                this.showFacility(layerName);
                break;
            case 'tollControl': // 收费站管制
            case 'mainControl': // 主线管制
                this.showControlMeasures(layerName);
                break;
            default:
                break;
        }
    }

    /**
     * 隐藏可见的图层
     */
    hideVisibilityLayers(exceptList = []) {
        if (this.eventMarkerJTSGList?.length > 0) {
            this.eventMarkerJTSGList = this.mapBase.removeMarkerLayer(this.eventMarkerJTSGList);
        }
        if (this.eventMarkerDLSGList?.length > 0) {
            this.eventMarkerDLSGList = this.mapBase.removeMarkerLayer(this.eventMarkerDLSGList);
        }
        this.layerNameList?.forEach((item) => {
            if (
                this.xMap.getLayer(item) &&
                this.xMap.getLayoutProperty(item, 'visibility') === 'visible' &&
                !(exceptList.indexOf(item) > -1)
            ) {
                this.hideLayer(item);
            }
        });
    }

    /**
     * 隐藏图层
     * @param layerName
     */
    hideLayer(layerName) {
        if (layerName === 'circleLayer') {
            this.showHideLayer(layerName);
            return;
        }
        if (layerName === 'resourceCar') {
            clearInterval(this.resourceTimerTask);
        }
        if (layerName === 'roadInfoToll') {
            this.xMap.setLayoutProperty('roadInfoToll', 'visibility', 'none');
            return;
        }
        if (layerName === 'construct') {
            this.eventMarkerDLSGList = this.mapBase.removeMarkerLayer(this.eventMarkerDLSGList);
        }
        if (layerName === 'event') {
            this.eventMarkerJTSGList = this.mapBase.removeMarkerLayer(this.eventMarkerJTSGList);
        }
        this.showHideLayer(layerName);
    }

    /**
     * 道路初始化
     */
    roadInit(init) {
        const bodyData = CityConfig[DEFAULT_ORG_CODE].roadList;
        // TODO: 这里需要调用GlobalApi，在低代码中可以通过emit或外部API调用
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getLiveRoadInfo',
            params: bodyData
        }).then((data) => {
            if (data != null && data.data) {
                this.showRoad(data.data, 'roadLine');
                if (init) {
                    this.initLayerNames.forEach((intiLayerName) => {
                        this.showLayer(intiLayerName);
                    });
                }
            }
        }).catch(function (error) {
            console.log(error);
        });
    }

    /**
     * 格式化经纬度
     */
    transLonlat1(data) {
        if (data && data.length) {
            return data.map((item) => {
                const {
                    geometry: { coordinates },
                } = item;
                const newCoordinates = coordinates.map((coord) => {
                    return window.MapUtil.GPS.gcj_encrypt(coord[0], coord[1]);
                });
                return {
                    ...item,
                    geometry: {
                        ...item.geometry,
                        coordinates: newCoordinates,
                    },
                };
            });
        }
        return data;
    }

    /**
     * 显示道路
     */
    showRoad(data, layerName) {
        const roadFeatures = [...this.transLonlat1(exRoad.features), ...exNbRoad.features];
        for (let road of data.features) {
            roadFeatures.push(road);
        }

        const laout = {
            visibility: 'visible',
        };
        const paint = {
            'line-color': [
                'match',
                ['get', 'color'],
                '1',
                '#FF0000',
                '2',
                '#DC143C',
                '3',
                '#FFD700',
                '#00FF00',
            ],
            'line-offset': ['match', ['get', 'direction'], 0, 3, -3],
            'line-width': 2,
        };
        this.mapBase.addUpdateLayerByGeoJson(
            layerName,
            'line',
            roadFeatures,
            laout,
            paint,
            'resourceCar',
        );
        this.onOrderLayers();
    }

    /**
     * 显示事件--交通事故 道路施工
     */
    showEvent(type, layerName, markerName) {
        // 低代码中通过API调用
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getRealTimeEvent',
            params: {
                type,
                organizationCode: this.organizationCode,
                statusList: [1, 2, 5],
                showRescue: 1,
            }
        }).then((res) => {
            const data = res?.data;
            if (data?.length > 0) {
                let imageName = 'icon-event';
                // 道路施工
                if (type === 2) {
                    imageName = 'icon-construct';
                }
                //显示图层
                const layout = {
                    'icon-image': imageName,
                    'icon-size': 0.8,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                };
                this.mapBase.addUpdatePointVectorLayer(
                    layerName,
                    data,
                    'longitude',
                    'latitude',
                    true,
                    layout,
                    null,
                );
            }
        }).catch(function (error) {
            console.log(error);
        });
    }

    // 显示施救驻点
    showRescueStation(layerName) {
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getCarLatLng',
            params: {
            organizationCode: this.organizationCode,
            type: 2,
            stagnationType: 15,
        }
        }).then((res) => {
            const list = res || [];
            //样式
            const layout = {
                'icon-image': 'icon-station',
                'icon-size': 0.8,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'text-allow-overlap': true,
                'text-ignore-placement': true,
            };
            this.mapBase.addUpdatePointVectorLayer(
                layerName,
                list,
                'lng',
                'lat',
                true,
                layout,
                null,
            );
        }).catch(function (error) {
            console.log(error);
        });
    }

    /**
     * 显示应急资源，警车（JC），医院(YY)，消防（XF）,施救人员(SJYR)
     */
    showSimpleLayer(type, params) {
        let layerName = null;
        let imageName = null;
        switch (type) {
            case 'JC':
                layerName = 'resourcePolice';
                imageName = 'icon-jc';
                break;
            case 'XF':
                layerName = 'resourceFire';
                imageName = 'resource_fire';
                break;
            case 'FWQ':
                layerName = 'roadInfoServiceArea';
                imageName = 'roadInfo_serviceArea';
                break;
            case 'SFZ':
                layerName = 'roadInfoToll';
                imageName = 'roadInfo_toll';
                break;
            case 'SD':
                layerName = 'roadInfoTunnel';
                imageName = 'roadInfo_tunnel';
                break;
            case 'SJRY':
                layerName = 'resourcePeople';
                imageName = 'icon-people';
                break;
            default:
                break;
        }
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getMapPointListByTypeV1',
            params: params
        }).then((data) => {
            if (data != null) {
                data = data.filter((item) => item.type === type);
                //样式
                const layout = {
                    'icon-image': imageName,
                    'icon-size': 0.8,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                };
                if (layerName === 'resourcePeople') {
                    if (
                        this.xMap.getLayer('circleLayer') &&
                        this.xMap.getLayoutProperty('circleLayer', 'visibility') === 'visible'
                    ) {
                        //如果圆存在就需要过滤
                        let circleFeature = this.xMap.getSource('circleLayer')._data.features[0];
                        data = data.filter((item) =>
                            this.pointInCircle(circleFeature, [
                                parseFloat(item.lng),
                                parseFloat(item.lat),
                            ])
                        );
                    }
                }
                this.mapBase.addUpdatePointVectorLayer(
                    layerName,
                    data,
                    'lng',
                    'lat',
                    true,
                    layout,
                    null,
                );
            }
        }).catch(function (error) {
            console.log(error);
        });
    }

    // 显示施救车辆
    showResourceCar(layerName) {
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getCarLatLng',
            params: {
                organizationCode: this.organizationCode,
                type: 3,
            }
        }).then((data) => {
            if (data != null) {
                if (
                    this.xMap.getLayer('circleLayer') &&
                        this.xMap.getLayoutProperty('circleLayer', 'visibility') === 'visible'
                    ) {
                        //如果圆存在就需要过滤
                        let circleFeature = this.xMap.getSource('circleLayer')._data.features[0];
                        data = data.filter((item) =>
                            this.pointInCircle(circleFeature, [
                                        parseFloat(item.lng),
                                        parseFloat(item.lat),
                                    ])
                        );
                    }
                let layout = {
                    'icon-image': 'icon-vehicle',
                    'icon-size': 0.8,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                };
                this.mapBase.addUpdatePointVectorLayer(
                    layerName,
                    data,
                    'lng',
                    'lat',
                    true,
                    layout,
                    null,
                );
            }
        }).catch(function (error) {
            console.log(error);
        });
    }

    /**
     * 处理车辆类型状态
     * @param carData
     * @returns {number}
     */
    dealCarType(carData) {
        let carType = parseInt(carData.carType) || 112;
        const list111 = [111, 131, 115, 119];
        const list123 = [112, 2604, 123];
        const list113 = [113, 121, 117, 2605, 2603, 2606, 114, 126];
        const list122 = [122, 128, 130];
        const list124 = [124, 2602];
        if (list111.indexOf(carType) > -1) {
            carType = 111;
        } else if (list123.indexOf(carType) > -1) {
            carType = 123;
        } else if (list113.indexOf(carType) > -1) {
            carType = 113;
        } else if (list122.indexOf(carType) > -1) {
            carType = 122;
        } else if (list124.indexOf(carType) > -1) {
            carType = 124;
        }
        return carType;
    }

    // 显示事件热力图
    showEventHeat(layerName) {
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getHeatmap',
            params: {
                organizationCode: this.organizationCode,
                type: 1,
            }
        }).then((res) => {
            const data = res || [];
            if (data?.length > 0) {
                const paint = {
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
                    'heatmap-radius': 15,
                    'heatmap-weight': ['get', 'count'],
                };
                this.mapBase.addUpdateHeatLayerByData(
                    layerName,
                    data,
                    'lon',
                    'lat',
                    false,
                    null,
                    paint,
                );
            }
        });
    }

    // 显示救援热力图
    showRescueHeat(layerName) {
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getHeatmap',
            params: {
                organizationCode: this.organizationCode,
                type: 1,
            }
        }).then((res) => {
            const data = res || [];
            if (data?.length > 0) {
                const paint = {
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
                    'heatmap-radius': 15,
                    'heatmap-weight': ['get', 'count'],
                };
                this.mapBase.addUpdateHeatLayerByData(
                    layerName,
                    data,
                    'lon',
                    'lat',
                    false,
                    null,
                    paint,
                );
            }
        });
    }

    /**
     * 显示摄像机图层，过滤设备位置为收费站的摄像机
     */
    showVideoLayer({ deviceName = '' }) {
        const layerName = 'resourceVideo';
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getMapPointListByTypeV3',
            params: {
                organizationCode: this.organizationCode,
                type: 'SXJ',
                hideDevicePositions: 19,
                deviceName,
            }
        }).then((data) => {
            if (data != null) {
                const layout = {
                    'icon-image': 'resource_video',
                    'icon-size': 0.8,
                    'icon-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-allow-overlap': true,
                };
                this.mapBase.addUpdatePointVectorLayer(
                    layerName,
                    data,
                    'lng',
                    'lat',
                    true,
                    layout,
                    null,
                );
            }
        }).catch(function (error) {
            console.log(error);
        });
    }

    // 显示设备图层
    showDevice(layerName) {
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getDevicePoint',
            params: {
                deviceTypeId: DEVICE_MAP_ID[layerName],
                organizationCode: this.organizationCode,
            }
        }).then((data) => {
            if (!data?.length) {
                return;
            }
            const layout = {
                'icon-image': layerName,
                'icon-size': 0.8,
                'icon-allow-overlap': true,
            };
            this.mapBase.addUpdateClusterLayer(
                layerName,
                data,
                'longitude',
                'latitude',
                true,
                layout,
            );
            this.onOrderLayers();
        });
    }

    /**
     * 无人机
     */
    showUavLayer() {
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getUavMapVoByOrgCode',
            params: {
                deviceStatus: 1,
                orgCode: this.organizationCode,
            }
        }).then((res) => {
            if (res?.data) {
                let list = [];
                const mapList = [];
                const mapListuav = [];
                if (!!res?.data?.length) {
                    list = res.data;
                }
                if (typeof list === 'object') {
                    for (let i = 0; i < list.length; i++) {
                        const uavItem = list[i];
                        uavItem.uavCode = uavItem.deviceCode;
                        const lib = {
                            ...uavItem,
                            id: uavItem.hangarCode,
                            type: 2,
                            longitude: uavItem.hangarLonWGS84,
                            latitude: uavItem.hangarLatWGS84,
                        };
                        mapList.push(lib);
                        if (this.isWorking(uavItem)) {
                            // 任务中无人机
                            const uav = {
                                ...uavItem,
                                id: uavItem.deviceCode,
                                type: 1,
                                longitude: uavItem.lonWGS84,
                                latitude: uavItem.latWGS84,
                            };
                            mapListuav.push(uav);
                        }
                    }
                }
                const layoutUavk = {
                    'icon-image': [
                        'match',
                        ['get', 'hangarOnlineState'],
                        'OFFLINE',
                        'uavk_0',
                        'uavk_1',
                    ],
                    'icon-size': 0.8,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                };
                const layoutUav = {
                    'icon-image': [
                        'match',
                        ['get', 'taskType'],
                        1,
                        'uav_1',
                        2,
                        'uav_2',
                        'uav_2',
                    ],
                    'icon-size': 0.8,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                };

                if (mapList.length > 0) {
                    this.mapBase.addUpdatePointVectorLayer(
                        'uavk',
                        mapList,
                        'longitude',
                        'latitude',
                        true,
                        layoutUavk,
                        null,
                    );
                }
                if (mapListuav.length > 0) {
                    this.mapBase.addUpdatePointVectorLayer(
                        'uav',
                        mapListuav,
                        'longitude',
                        'latitude',
                        true,
                        layoutUav,
                        null,
                    );
                }
                this.onOrderLayers();
            }
        }).catch((error) => console.log(error));
    }

    // 显示设施图层
    showFacility(layerName) {
        this.$emit('api-call', {
            method: 'GlobalApi.Common.getFacilityPoint',
            params: {
                facilityTypeId: FACILITY_MAP_ID[layerName],
                organizationCode: this.organizationCode,
            }
        }).then((data) => {
            if (!data?.data?.length) {
                return;
            }
            const layout = {
                'icon-image': layerName,
                'icon-size': 0.8,
                'icon-allow-overlap': true,
            };
            this.mapBase.addUpdateClusterLayer(
                layerName,
                data.data,
                'longitude',
                'latitude',
                true,
                layout,
            );
            this.onOrderLayers();
        });
    }

    // 显示收费站管制/主线管制
    async showControlMeasures(layerName) {
        const that = this;
        function getCategoryOfControlList(params) {
            if (!params?.length) {
                return {
                    mainLineRoadList: [],
                    mainList: [],
                    tollList: [],
                };
            }
            const mainLineRoadList = [],
                mainList = [],
                tollList = [];
            for (let i = 0; i < params.length; i++) {
                const item = params[i];
                if (item.type.indexOf('SFZ') === -1) {
                    if (item?.trafficControl) {
                        const { beginMilestone, endMilestone, trafficControl} = item.trafficControl;
                        const isOnePoint = beginMilestone === endMilestone;
                        if (isOnePoint) {
                            // 起止点重合
                            mainList.push(item);
                            return;
                        }
                        mainLineRoadList.push(item);
                    }
                    continue;
                }
                tollList.push(item);
            }
            return {
                mainLineRoadList,
                mainList,
                tollList,
            };
        }
        async function renderRoadLine(params) {
            if (!params?.length) {
                that.clearLayer(layerName);
                return {
                    features: [],
                    pointList: [],
                };
            }
            const formatList = params.map((item) => {
                let color = '#fff';
                const blueControlType = ['10101', '10102', '10103', '10105'];
                const purpleControlType = ['10107', '10108', '10109'];
                if (blueControlType.includes(item.trafficControl.controlType)) {
                    color = '#FF2FFC';
                } else if (purpleControlType.includes(item.trafficControl.controlType)) {
                    color = 'purple';
                }
                return {
                    dir: item.trafficControl.direction === 100700 ? 0 : 1,
                    endMilestone: item.trafficControl.endMilestone,
                    startMilestone: item.trafficControl.beginMilestone,
                    roadId: item.trafficControl.roadId,
                    standard: false,
                    attribute: {
                        ...item,
                        color,
                    },
                };
            });
            // TODO: 调用API获取GeoJSON
            return new Promise(resolve => {
                that.$emit('api-call', {
                    method: 'GlobalApi.Common.getRoadGeoJson',
                    params: formatList
                }).then((res) => {
                    // 线段起止点
                    const geojsonList = res?.data?.features ?? [];
                    const pointList = [];
                if (geojsonList.length) {
                    for (let i = 0; i < geojsonList.length; i++) {
                        const geojsonItem = geojsonList[i];
                        const eventItem = geojsonItem.properties.general;
                        const locationList = geojsonItem.geometry.coordinates;
                        const startPoint = locationList[0];
                        const endPoint = locationList[locationList.length - 1];
                        pointList.push({
                            ...eventItem,
                            lng: startPoint[0],
                            lat: startPoint[1],
                        });
                        pointList.push({
                            ...eventItem,
                            lng: endPoint[0],
                            lat: endPoint[1],
                        });
                    }
                }
                resolve({
                    features: res?.data?.features ?? [],
                    pointList,
                });
            });
            });
        }
        const response = await this.$emit('api-call', {
            method: 'GlobalApi.Common.getLWTSMapPoint',
            params: {
                type: '7',
                organizationCode: this.organizationCode,
            }
        });
        const { mainLineRoadList, mainList, tollList} = getCategoryOfControlList(response);
        const { pointList, features} = await renderRoadLine(mainLineRoadList);
        const eventList = [...mainList, ...pointList];
        const layout = {
            'icon-image': [
                'match',
                ['get', 'type'],
                'SFZX',
                'control_xl',
                'SFZG',
                'control_gb',
                'SFZF',
                'control_fl',
                'power_1',
            ],
            'icon-size': 0.8,
            'icon-allow-overlap': true,
            'text-ignore-placement': true,
            'visibility': 'visible',
        };

        if (layerName === 'mainControl') {
            // 主线封道线段
            const paint = {
                'line-color': ['get', 'color', ['get', 'general']],
                'line-offset': ['match', ['get', 'direction'], 0, 3, -3],
                'line-width': 4,
            };
            this.mapBase.addUpdateLayerByGeoJson(
                layerName + '_line',
                'line',
                features,
                {
                    visibility: 'visible',
                },
                paint,
            );
            // 主线管控打点
            this.mapBase.addUpdatePointVectorLayer(
                layerName,
                eventList,
                'lng',
                'lat',
                true,
                layout,
                null,
            );
        } else {
            // 收费站管控打点
            this.mapBase.addUpdatePointVectorLayer(
                layerName,
                tollList,
                'lng',
                'lat',
                true,
                layout,
                null,
            );
        }
        this.onOrderLayers();
    }

    /**
     * 点是否在圆内
     * @param circle
     * @param point [lng,lat]
     * @returns {*|boolean}
     */
    pointInCircle(circle, point) {
        return window.turf.booleanPointInPolygon(point, circle);
    }

    /**
     * 格式化经纬度
     */
    transLonlat(data) {
        if (data && data.length) {
            const result = {};
            data.forEach((item) => {
                const {
                    geometry: { coordinates },
                    properties: {
                        general: { status },
                    },
                } = item;
                const newCoordinates = coordinates.map((coord) => {
                    return window.MapUtil.GPS.gcj_encrypt(coord[0], coord[1]);
                });
                const newItem = {
                    ...item,
                    geometry: {
                        ...item.geometry,
                        coordinates: newCoordinates,
                    },
                };
                if (!result[status]) {
                    result[status] = [];
                }
                result[status].push(newItem);
            });
            return result;
        }
        return data;
    }

    onOrderLayers() {
        this.mapBase.onOrderLayers(LAYER_ORDER);
    }

    /**
     * 添加或更新图层（geojson）
     * @param layerName
     * @param type
     * @param data
     * @param layout
     * @param paint
     */
    addUpdateLayerByGeoJson(layerName, type, data, layout, paint, beforeId, key) {
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
                    id: layerName + '_back',
                    type: type,
                    source: layerName,
                    layout: layout || {},
                    paint: {
                        'line-color': '#fff',
                        'line-offset': ['match', ['get', 'direction'], 0, 2, -2],
                        'line-width': 6,
                    },
                },
                    beforeId,
                );
                this.xMap.addLayer(
                    {
                        id: layerName,
                        type: type,
                        source: layerName,
                        layout: layout || {},
                        paint: paint || {},
                    },
                    layerName + '_back',
                );
                if (key == 2) {
                    const arrowLayer = {
                        id: layerName + '_arrow',
                        type: 'symbol',
                        source: layerName,
                        layout: {
                            'symbol-placement': 'line',
                            'symbol-spacing': 25,
                            'icon-image': 'map_arrow',
                            'icon-size': 0.79,
                            'icon-rotate': ['match', ['get', 'direction'], 0, 0, 180],
                            'icon-offset': [2, 2],
                            'icon-allow-overlap': true, // 允许图标重叠
                        },
                        paint: {},
                    };
                    this.xMap.addLayer(arrowLayer, layerName);
                }
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
     * 切换组织
     */
    toggleMap(organizationCode) {
        this.organizationCode = organizationCode;
        this.roadInit(false);
        if (this.eventMarkerDLSGList.length > 0) {
            this.showLayer('construct');
        }
        if (this.eventMarkerDLSGList.length > 0) {
            this.showLayer('event');
        }

        this.layerNameList.forEach((item) => {
            if (
                this.xMap.getLayer(item) &&
                    this.xMap.getLayoutProperty(item, 'visibility') === 'visible'
                ) {
                    this.showLayer(item);
                }
        });
        this.mapBase.locator(
            CityConfig[DEFAULT_ORG_CODE].center[0],
            CityConfig[DEFAULT_ORG_CODE].center[1],
            CityConfig[DEFAULT_ORG_CODE].zoom,
            true,
        );
    }

    eventCircle(lng, lat, color) {
        //定位转换
        let lngLat = this.mapBase.transCoordinate(lng, lat);
        this.mapBase.locator(lngLat[0], lngLat[1], 11, true);
        let layerName = 'circleLayer';
        let circle = this.mapBase.createCircleObject(lngLat[0], lngLat[1], 20);
        var isInPolygon = window.turf.booleanPointInPolygon([lng, lat], circle);

        let paint = {
            'fill-color': color || '#FD0000',
            'fill-opacity': 0.2,
        };

        this.mapBase.addUpdateLayerByGeoJson(layerName, 'fill', [circle], {}, paint);
        this.showLayer('resourceCar');
        this.showLayer('resourcePeople');
    }

    /**
     * 销毁实例，清理定时器
     */
    destroy() {
        if (uavTimer) {
            clearInterval(uavTimer);
            uavTimer = null;
        }
        if (this.resourceTimerTask) {
            clearInterval(this.resourceTimerTask);
            this.resourceTimerTask = null;
        }
        if (this.resourceTimerJcTask) {
            clearInterval(this.resourceTimerJcTask);
            this.resourceTimerJcTask = null;
        }
        // 清理绑定的事件和引用
        if (this._initTimeout) {
            clearTimeout(this._initTimeout);
            this._initTimeout = null;
        }
        if (this.xMap) {
            // 解除所有绑定的事件
        }
        this.mapBase = null;
        this.xMap = null;
    }
}
