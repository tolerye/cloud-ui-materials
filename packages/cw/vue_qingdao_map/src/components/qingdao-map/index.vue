<template>
  <div class="qingdao-map-container" :style="rootStyle">
    <div ref="mapContainer" class="map-element"></div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { MapBoxBase } from './MapBoxBase';
import { Operate } from './Operate';
import { MapBoxConfig } from './MapBoxConfig';
import { MapImageList, MapStyleConfig, default as MapLayerConfig } from './MapLayerConfig';

export default {
  name: 'qingdao-map',
  props: {
    // 组织编码
    organizationCode: {
      type: String,
      default: '3300200'
    },
    // 初始化显示的图层名称
    initLayerNames: {
      type: [Array, String],
      default: () => ['event', 'resourceStation', 'resourcePeople', 'resourceCar']
    },
    // 地图宽度
    width: {
      type: Number,
      default: 800
    },
    // 地图高度
    height: {
      type: Number,
      default: 600
    },
    // 是否自动初始化
    autoInit: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      mapBase: null,
      operate: null,
      mapLoaded: false
    };
  },
  computed: {
    rootStyle() {
      return {
        width: typeof this.width === 'number' ? `${this.width}px` : this.width,
        height: typeof this.height === 'number' ? `${this.height}px` : this.height
      };
    },
    normalizedInitLayerNames() {
      if (Array.isArray(this.initLayerNames)) {
        return this.initLayerNames.filter(Boolean);
      }
      if (typeof this.initLayerNames === 'string') {
        const text = this.initLayerNames.trim();
        if (!text) {
          return [];
        }
        if (text.startsWith('[') && text.endsWith(']')) {
          try {
            const parsed = JSON.parse(text);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
          } catch (e) {
          }
        }
        return text.split(',').map(item => item.trim()).filter(Boolean);
      }
      return [];
    }
  },
  mounted() {
    if (!window.mapboxgl) {
      window.mapboxgl = mapboxgl;
    }

    if (!window.turf) {
      window.turf = window.Turf || turf;
    }

    console.log('QingdaoMap component mounted, checking dependencies...');
    console.log('mapboxgl:', !!window.mapboxgl);
    console.log('turf:', !!window.turf);
    
    if (!window.mapboxgl) {
      console.error('mapboxgl is not loaded globally. Please include mapbox-gl.js before loading this component.');
      return;
    }
    if (!window.turf) {
      console.error('turf is not loaded.');
      return;
    }
    
    if (!window.MapUtil) {
      console.warn('MapUtil is not loaded globally. Some coordinate transformation functions might fail.');
    }

    if (this.autoInit) {
      this.initMap();
    }
  },
  beforeDestroy() {
    if (this.operate) {
      this.operate.destroy();
    }
    if (this.mapBase && this.mapBase.xMap) {
      this.mapBase.xMap.remove();
    }
  },
  methods: {
    initMap() {
      if (!window.mapboxgl) {
        console.error('mapboxgl is not loaded');
        return;
      }

      const options = {
        MapStyleConfig: MapStyleConfig,
        MapImageList: MapImageList,
        MapLayerConfig: MapLayerConfig,
        onLoadedMap: () => {
          this.mapLoaded = true;
          this.$emit('map-loaded');
          console.log('Map loaded successfully');
        },
        onClickMarker: (params) => {
          this.$emit('click-marker', params);
        },
        onCloseMarker: () => {
          this.$emit('close-marker');
        }
      };

      // 容器id需要绑定到ref
      const container = this.$refs.mapContainer;
      this.mapBase = new MapBoxBase(container, options);
      
      // 确保地图容器尺寸更新后重绘地图
      this.$nextTick(() => {
        if (this.mapBase && this.mapBase.xMap) {
          this.mapBase.xMap.resize();
        }
      });
      
      const operateConfig = {
        organizationCode: this.organizationCode,
        initLayerNames: this.normalizedInitLayerNames,
        onClickMarker: (params) => {
          this.$emit('click-marker', params);
        }
      };

      this.operate = new Operate(this.mapBase, operateConfig);
      
      // 代理 Operate 内部的 $emit 到 Vue 组件，并支持 Promise 返回
      this.operate.$emit = (eventName, params) => {
        return new Promise((resolve, reject) => {
          this.$emit(eventName, params, resolve, reject);
        });
      };
    },

    // 显示/隐藏图层
    showLayer(layerName, deviceName) {
      if (this.operate) {
        this.operate.showLayer(layerName, deviceName);
      }
    },

    hideLayer(layerName) {
      if (this.operate) {
        this.operate.hideLayer(layerName);
      }
    },

    // 定位
    locator(lng, lat, zoom = 9, isFly = true) {
      if (this.mapBase) {
        this.mapBase.locator(lng, lat, zoom, isFly);
      }
    },

    // 清除图层
    clearLayer(layerName) {
      if (this.mapBase) {
        this.mapBase.clearLayer(layerName);
      }
    },

    // 圆形区域高亮
    eventCircle(lng, lat, color = '#FD0000') {
      if (this.operate) {
        this.operate.eventCircle(lng, lat, color);
      }
    },

    // 切换组织
    toggleMap(organizationCode) {
      if (this.operate) {
        this.operate.toggleMap(organizationCode);
      }
    }
  }
};
</script>

<style scoped>
.qingdao-map-container {
  position: relative;
  background-color: #071928;
  overflow: hidden;
}

.map-element {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
