export const LEVELS = [
  {
    id: 'kitchen',
    title: '第一关：厨房禁区（教学关）',
    time: 90,
    bg: '/images/levels/lv1/bg.png',
    portraits: {
      father: '/images/levels/lv1/figures/daddy.png',
      daughter: '/images/levels/lv1/figures/daughter.png',
    },
    dialogueUI: {
      heightRatio: 0.24,
      fontSize: 18,
      fatherColor: '#3b82f6',
      daughterColor: '#ec4899',
      blocking: true,
    },
    dialogues: {
      intro: [
        { speaker: 'father',   text: '今天我们来当家庭安全巡查官！' },
        { speaker: 'daughter', text: '好的，我会仔细找隐患～' },
        { speaker: 'father',   text: '从厨房开始，注意火、油、电与地面安全。' },
      ],
      hint1: [
        { speaker: 'father',   text: '看看灶台附近，抹布和塑料要远离火源。' },
      ],
      success: [
        { speaker: 'daughter', text: '全部找到了！太棒啦！' },
        { speaker: 'father',   text: '做得好，记住这些安全要点哦。' },
      ],
      fail: [
        { speaker: 'father',   text: '时间到了，我们复盘一下遗漏的地方。' },
      ],
    },
    triggers: {
      onStart: 'intro',
      onFound: [ { count: 2, key: 'hint1' } ],
      onFinish: { success: 'success', fail: 'fail' },
    },
    hazards: [
      {
        id: 'stove',
        name: '燃气灶/阀门未关',
        fact: '离开灶台前务必关火。',
        shape: 'rect',
        coords: { x: 72, y: 34, w: 10, h: 10 },
        sprite: '/images/levels/lv1/sprites/stove_top.png',
      },
      {
        id: 'knife',
        name: '刀具外露',
        fact: '刀具应放刀架或带刀套，远离儿童触及。',
        shape: 'rect',
        coords: { x: 78, y: 43, w: 16, h: 12 },
        scale: 0.8,
        sprite: '/images/levels/lv1/sprites/knife_exposed.png',
      },
      {
        id: 'oil_pan',
        name: '无人看守油锅',
        fact: '用完及时给热锅降温，以免烫伤发生意外',
        shape: 'rect',
        coords: { x: 74, y: 32, w: 10, h: 10 },
        scale: 0.9,
        sprite: '/images/levels/lv1/sprites/oil_pan.png',
      },
      {
        id: 'water_puddle',
        name: '地面湿滑',
        fact: '及时清理地面积水，防滑倒。',
        shape: 'circle',
        coords: { cx: 28, cy: 65, r: 8 },
        sprite: '/images/levels/lv1/sprites/water_puddle.png',
      },
      {
        id: 'pressure_tank',
        name: '压力罐存放不当',
        fact: '压力容器远离热源并竖直稳固放置。',
        shape: 'rect',
        coords: { x: 64, y: 24, w: 10, h: 10 },
        sprite: '/images/levels/lv1/sprites/pressure_tank.png',
      },
    ],
  },
];
