// stoneformat is used in Operate.js, just keep the reference
import { DEFAULT_ORG_CODE } from './constants';
import { CityConfig, CityData, CityNameData, haxData, qdOut, roadData } from './CityData';

export const MapStyleConfig = {
    version: 8,
    sprite: '',
    glyphs: './glyphs/mapbox/{fontstack}/{range}.pbf',
    center: [120.395966, 36.070892],
    zoom: 9.2,
    pitch: 45,
    sources: {
        city: {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: CityData.features,
            },
        },
        cityInLine: {
            type: 'geojson',
            data: CityConfig[DEFAULT_ORG_CODE].cityInLine,
        },
        cityName: {
            type: 'geojson',
            data: CityNameData,
        },
        hax: {
            type: 'geojson',
            data: haxData,
        },
        qdOut: {
            type: 'geojson',
            data: qdOut,
        },
        roadData: {
            type: 'geojson',
            data: roadData,
        },
    },
    layers: [
        {
            id: 'cityLayer2',
            type: 'fill',
            source: 'city',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'fill-color': '#071928',
                'fill-opacity': 0.9,
                'fill-translate': [0, 20],
                'fill-translate-anchor': 'map',
            },
        },
        {
            id: 'city',
            type: 'fill',
            source: 'city',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'fill-color': '#006BBD',
                'fill-opacity': 1,
            },
        },
        {
            id: 'cityInLine',
            type: 'line',
            source: 'cityInLine',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'line-color': '#FFFFFF',
                'line-width': 1,
                'line-opacity': 0.8,
                'line-dasharray': [2, 4],
            },
        },
        {
            id: 'hax',
            type: 'line',
            source: 'hax',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'line-translate': [0, 18],
                'line-color': '#31FBFF',
                'line-width': [
                    'interpolate',
                    ['exponential', 0.5],
                    ['zoom'],
                    2,
                    8,
                    3,
                    16,
                ],
                'line-blur': 5,
                'line-opacity': 0.8,
            },
        },

        {
            id: 'qdOut',
            type: 'line',
            source: 'qdOut',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'line-translate-anchor': 'map',
                'line-color': '#00FFFF',
                'line-width': 2,
            },
        },
        {
            id: 'roadDataOut',
            type: 'line',
            source: 'roadData',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'line-color': '#BDDEFF',
                'line-width': 8,
            },
        },
        {
            id: 'roadDataIn',
            type: 'line',
            source: 'roadData',
            layout: {
                visibility: 'visible',
            },
            paint: {
                'line-color': '#000',
                'line-width': 1,
            },
        },
        {
            id: 'cityName',
            type: 'symbol',
            source: 'cityName',
            layout: {
                visibility: 'visible',
                'text-ignore-placement': true,
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Semibold,Arial Unicode MS Bold'],
                'text-allow-overlap': true,
                'text-anchor': 'left',
            },
            paint: {
                'text-color': '#FFFFFF',
                'text-halo-width': 0.1,
                'text-opacity': 0.75,
            },
        },
    ],
};

/**
 * 图层图片要素
 * url: 图片存储相对路径（相对mapbox包，位于public）
 * name: 与图片名保持一致
 */
export const MapImageList = [
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png', // Fallback for testing icon-event
        name: 'icon-event',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-station',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-people',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-vehicle',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-bridge',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-construct',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-hub',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-mainControl',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-messageBoard',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-service',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-toll',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-tollControl',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-uav',
    },
    {
        url: 'https://img.alicdn.com/tfs/TB1Z5V6aYvpK1RjSZFqXXcXgVXa-64-64.png',
        name: 'icon-video',
    },
];

/**
 * 图层要素配置
 * @param {*} name string 图层唯一
 * @param {?} canHover boolean 元素是否可hover
 * @param {?} showListItem Function 参数为地图要素属性 元素hover出现提示列表; canHover为true时，必填
 * @param {?} canClick boolean 元素是否可点击
 * @param {?} canHoverHigh boolean 要素是否需要高亮显示，多指道路或者面
 * @param {?} popPath string 弹窗页面文件相对路径，全部弹窗文件路径：src\components\MapMarkerPopup；canClick为true时，必填
 * @param {?} propertyName string 点击弹窗，地图返回数据解析字段名
 */
const MapLayerConfig = {
    // 交通事件
    event: {
        name: 'event',
        canClick: true,
        canHover: true,
        showListItem(item) {
            return `<li>${item.reportTime} ${item.roadName} ${item.directionName} ${stoneformat(
                item.beginMilestone,
            )}，${item.subEventTypeName}，${item.situation}</li>`;
        },
        popPath: 'EventPopup',
    },
    // 道路施工
    eventClgz: {
        name: 'construct',
        canClick: true,
        canHover: true,
        showListItem(item) {
            return `<li>${item.reportTime} ${item.roadName} ${item.directionName} ${stoneformat(
                item.beginMilestone,
            )}，${item.subEventTypeName}，${item.situation}</li>`;
        },
        popPath: 'EventPopup',
    },
    // 施救驻点
    resourceStation: {
        name: 'resourceStation',
        canHover: true,
        showListItem(item) {
            return `<li>${item?.info}</li>` || '-';
        },
    },
    // 施救人员
    resourcePeople: {
        name: 'resourcePeople',
        canClick: false,
        canHover: true,
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
    // 施救车辆
    resourceCar: {
        name: 'resourceCar',
        canClick: false,
        canHover: true,
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
    //摄像机
    resourceVideo: {
        name: 'resourceVideo',
        canClick: true,
        canHover: true,
        canClickShowList: true,
        marKerListPath: 'videoMarKerList',
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
    // 情报板
    infoBoard_device: {
        name: 'infoBoard_device',
        canClick: true,
        canHover: true,
        canClickShowList: true,
        popPath: 'InfoBoardPopup',
        marKerListPath: 'commonMarKerList',
        showListItem(item) {
            return `<li>桩号: ${stoneformat(item.milestone)}--${item.name}</li>`;
        },
    },
    // 无人机库
    uavk: {
        name: 'uavk',
        canClick: true,
        canHover: true,
        showListItem(item) {
            return `<li>${item.hangarName}</li>`;
        },
    },
    // 无人机
    uav: {
        name: 'uav',
        canClick: true,
        canHover: true,
        showListItem(item) {
            return `<li>${item.deviceName || '无人机'}</li>`;
        },
    },
    // 桥梁
    bridge_facility: {
        name: 'bridge_facility',
        canClick: false,
        canHover: true,
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
    // 互通
    interflow_facility: {
        name: 'interflow_facility',
        canClick: false,
        canHover: true,
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
    // 枢纽
    hub_facility: {
        name: 'hub_facility',
        canClick: false,
        canHover: true,
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
    // 收费站
    toll_facility: {
        name: 'toll_facility',
        canClick: false,
        canHover: true,
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
    // 服务区
    serviceArea_facility: {
        name: 'serviceArea',
        canClick: true,
        canHover: true,
        showListItem(item) {
            return `<li>${item.info} </li>`;
        },
    },
};

export default MapLayerConfig;
