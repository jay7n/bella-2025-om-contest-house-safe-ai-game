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
      // 针对具体要素（按 id）
      hazards: {
        knife: [
          { speaker: 'father',   text: '观察得真细致！刀具要收纳好，避免误伤。' },
          { speaker: 'daughter', text: '收到～我会把刀放回刀架。' },
        ],
      },
    },
    triggers: {
      onStart: 'intro',
      onFound: [ { count: 2, key: 'hint1' } ],
      onFinish: { success: 'success', fail: 'fail' },
      // 命中特定要素时触发对话
      onHazardHit: {
        knife: { key: 'knife', once: true, blocking: true },
      },
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
    // controllable girl with 4-direction walk/idle
    actors: [
      {
        id: 'girl',
        controller: true,
        defaultDir: 'rd',
        cx: 26,
        cy: 86,
        scale: 0.08,
        // adjust walking vector rotation (degrees) to align with background grid
        // moveAngleDeg: 10,
        // per-direction fine-tune (degrees). Overrides moveAngleDeg if provided
        dirAngleDeg: { rd: -16, ld: 16, rt: 16, lt: -16 },
        speed: 120,
        variants: {
          rd: {
            walk: { kind:'multiImageAnim', animKey:'daughter_walk_rd', scale: 0.08, frames:[
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_1.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_2.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_3.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_4.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_5.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_6.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_7.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_8.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_9.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_10.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_11.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_12.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_13.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_14.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_15.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_16.png',
            ], frameRate:16, repeat:-1 },
            idle: { kind:'image', key:'girl_rd_idle', url:'/images/levels/lv1/sprites/daughter_walking/right_down_idle.png', scale: 0.04 }
          },
          ld: {
            walk: { kind:'multiImageAnim', animKey:'daughter_walk_rd', flipX:true, scale: 0.08, frames:[
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_1.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_2.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_3.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_4.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_5.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_6.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_7.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_8.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_9.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_10.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_11.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_12.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_13.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_14.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_15.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_down_16.png',
            ], frameRate:16, repeat:-1, flipX:true },
            idle: { kind:'image', key:'girl_ld_idle', url:'/images/levels/lv1/sprites/daughter_walking/right_down_idle.png', flipX:true, scale: 0.04 }
          },
          rt: {
            walk: { kind:'multiImageAnim', animKey:'daughter_walk_rt', scale: 0.1, frames:[
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_1.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_2.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_3.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_4.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_5.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_6.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_7.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_8.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_9.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_10.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_11.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_12.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_13.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_14.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_15.png',
            ], frameRate:16, repeat:-1 },
            idle: { kind:'image', key:'girl_rt_idle', url:'/images/levels/lv1/sprites/daughter_walking/right_top_idle.png', scale: 0.039 }
          },
          lt: {
            walk: { kind:'multiImageAnim', animKey:'daughter_walk_rt', flipX:true, scale: 0.1, frames:[
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_1.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_2.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_3.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_4.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_5.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_6.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_7.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_8.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_9.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_10.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_11.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_12.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_13.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_14.png',
              '/images/levels/lv1/sprites/daughter_walking/to_right_top_15.png',
            ], frameRate:16, repeat:-1, flipX:true },
            idle: { kind:'image', key:'girl_lt_idle', url:'/images/levels/lv1/sprites/daughter_walking/right_top_idle.png', flipX:true, scale: 0.039 }
          }
        }
      }
    ],
  },
];
