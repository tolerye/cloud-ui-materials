import QingdaoMap from '../index';

export default {
  id: 'qingdao-map-examples',
  title: '组件列表/QingdaoMap/示例',
  component: QingdaoMap,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    organizationCode: {
      control: { type: 'text' },
      defaultValue: '3300200',
      description: '组织编码'
    },
    width: {
      control: { type: 'number' },
      defaultValue: 1200,
      description: '地图宽度'
    },
    height: {
      control: { type: 'number' },
      defaultValue: 800,
      description: '地图高度'
    },
    autoInit: {
      control: { type: 'boolean' },
      defaultValue: true,
      description: '是否自动初始化'
    }
  },
};

export const Example1 = {
  name: '基本用法',
  render: (args) => ({
    components: { QingdaoMap },
    props: Object.keys(args),
    template: '<div style="width: 100%;"><qingdao-map v-bind="$props"></qingdao-map></div>',
  }),
  args: {
    organizationCode: '3300200',
    initLayerNames: ['event', 'resourceStation', 'resourcePeople', 'resourceCar'],
    width: 1200,
    height: 800,
    autoInit: true
  },
};
