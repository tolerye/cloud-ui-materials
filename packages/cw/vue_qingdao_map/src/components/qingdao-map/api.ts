/// <reference types="@nasl/types" />
namespace extensions.vue_qingdao_map.viewComponents {
  const { Component, Prop, ViewComponent, Slot, Method, Param, Event, ViewComponentOptions } = nasl.ui;

  @ExtensionComponent({
    type: 'both',
    ideusage: {
      idetype: 'element',
    }
  })
  @Component({
    title: '地图组件',
    description: '地图组件',
  })
  export class QingdaoMap extends ViewComponent {
    constructor(options?: Partial<QingdaoMapOptions>) {
      super();
    }
  }

  export class QingdaoMapOptions extends ViewComponentOptions {
    @Prop({
      title: '组织编码',
      description: '区域组织编码',
      setter: {
        concept: 'InputSetter'
      }
    })
    organizationCode: nasl.core.String = '3300200';

    @Prop({
      title: '初始化图层',
      description: '首次加载时展示的图层名称列表，多个值用英文逗号分隔',
      setter: {
        concept: 'InputSetter'
      }
    })
    initLayerNames: nasl.core.String = 'event,resourceStation,resourcePeople,resourceCar';

    @Prop({
      title: '宽度',
      description: '地图宽度，单位 px',
      setter: {
        concept: 'NumberInputSetter'
      }
    })
    width: nasl.core.Decimal = 800;

    @Prop({
      title: '高度',
      description: '地图高度，单位 px',
      setter: {
        concept: 'NumberInputSetter'
      }
    })
    height: nasl.core.Decimal = 600;

    @Prop({
      title: '自动初始化',
      description: '组件挂载后是否自动初始化地图',
      setter: {
        concept: 'SwitchSetter'
      }
    })
    autoInit: nasl.core.Boolean = true;
  }
}
