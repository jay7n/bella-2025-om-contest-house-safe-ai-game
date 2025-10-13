export const LEVELS = [
  {
    id: 'kitchen',
    title: '地点：诺诺家的厨房',
    time: 60,
    bg: '/images/levels/lv1/bg.png',
    // 背景音乐（将文件放到 public/audio/levels/lv1/ 下）
    bgm: { key: 'lv1_bgm', url: '/audio/levels/lv1/bgm.mp3', volume: 0.4, loop: true },
    portraits: {
      father: '/images/levels/lv1/figures/daddy.png',
      daughter: '/images/levels/lv1/figures/daughter.png',
    },
    dialogueUI: {
      // 面板高度略增，给头像下方名字留空间
      // heightRatio: 0.40,
      fontSize: 18,
      fatherColor: '#3b82f6',
      daughterColor: '#ec4899',
      // 角色名称（用于头像下方标签）
      names: { father: '爸爸', daughter: '诺诺' },
      blocking: true,
    },
    dialogues: {
      intro: [
        { speaker: 'father',   text: '诺诺，准备出门去玩啦，东西都带好了吗？' },
        { speaker: 'daughter', text: '爸爸等等～我在学校学了家庭安全宣传，出发前先检查一下厨房吧！' },
        { speaker: 'father',   text: '好主意，安全第一。那我们一起检查厨房。' },
        { speaker: 'father',   text: '任务：1分钟内找到所有隐患并指出来。方向键移动，靠近后按空格确认。' },
        { speaker: 'daughter', text: '收到！我来当家庭安全小巡查员～' },
        { speaker: 'father',   text: '开始吧！' },
      ],
      success: [
        { speaker: 'daughter', text: '全部找到了！太棒啦！' },
        { speaker: 'father',   text: '做得好，记住这些安全要点哦。' },
      ],
      fail: [
        { speaker: 'daughter', text: '唉，时间到了……这次我还没全部找到。' },
        { speaker: 'father',   text: '没关系诺诺，安全意识最重要。我们一起复盘下漏掉的地方。' },
        { speaker: 'father',   text: '总结完下次再挑战，慢慢来，我们会越来越好。' },
      ],
      // 针对具体要素（按 id）
      hazards: {
        knife: [
          { speaker: 'father',   text: '不错，观察很仔细！刀具要及时收回刀架，刀口朝下更安全。' },
          { speaker: 'daughter', text: '明白，我把刀口朝下收进刀架，远离边缘。' },
        ],
        stove: [
          { speaker: 'father',   text: '做得好，灶台用完要立刻关火，阀门也要再确认一遍。' },
          { speaker: 'daughter', text: '收到，出门前再做一次火源和阀门确认。' },
        ],
        oil_pan: [
          { speaker: 'father',   text: '提醒得及时！热油无人看管很危险，记得人走先关火再降温。' },
          { speaker: 'daughter', text: '了解，先关火再降温，我会一直看着。' },
        ],
        water_puddle: [
          { speaker: 'father',   text: '发现得很快！地面湿滑容易摔倒，要马上擦干并提醒家人小心。' },
          { speaker: 'daughter', text: '好的，我去拿拖把，清理完提醒大家小心走路。' },
        ],
        pressure_tank: [
          { speaker: 'father',   text: '判断正确！压力罐要远离热源、保持竖直稳固，记得定期检查阀门。' },
          { speaker: 'daughter', text: '记住了，我把它放到阴凉稳固的位置，并定期检查。' },
        ],
      },
    },
    triggers: {
      onStart: 'intro',
      onFinish: { success: 'success', fail: 'fail' },
      // 命中特定要素时触发对话
      onHazardHit: {
        knife: { key: 'knife', once: true, blocking: true },
        stove: { key: 'stove', once: true, blocking: true },
        oil_pan: { key: 'oil_pan', once: true, blocking: true },
        water_puddle: { key: 'water_puddle', once: true, blocking: false }, // 示例：非阻塞对话，不暂停计时
        pressure_tank: { key: 'pressure_tank', once: true, blocking: true },
      },
    },
    // 多边形障碍（百分比坐标，基于背景绘制区域）
    obstacles: [
      { id: 'wall-top', shape: 'line', solid: true, label: '顶部墙线',
        debug: { color: '#f50b0b', stroke: '#d90606' }, a: { x: 48, y: 14 }, b: { x: 93, y: 56 }, halfWidthPx: 0 },
      { id: 'wall-bottom', shape: 'line', solid: true, label: '底部墙线',
        debug: { color: '#8b5cf6', stroke: '#7c3aed' }, a: { x: 4, y: 57 }, b: { x: 50, y: 100 }, halfWidthPx: 0 },
      { id: 'wall-left', shape: 'line', solid: true, label: '左侧墙线',
        debug: { color: '#10b981', stroke: '#059669' }, a: { x: 4, y: 57 }, b: { x: 48, y: 14 }, halfWidthPx: 0 },
      { id: 'wall-right', shape: 'line', solid: true, label: '右侧墙线',
        debug: { color: '#3b82f6', stroke: '#2563eb' }, a: { x: 93, y: 56 }, b: { x: 50, y: 100 }, halfWidthPx: 0 },
      {
        id: 'counterA', shape: 'poly', solid: true, label: '灶台区域',
        debug: { color: '#ffb703', alpha: 0.18, stroke: '#fb8500' },
        points: [ { x: 59, y: 18 }, { x: 93, y:  50}, { x: 59, y: 30 }, { x: 88, y: 56 } ]
      },
      {
        id: 'table1', shape: 'poly', solid: true, label: '洗手台区域',
        debug: { color: '#ffffff', alpha: 0.18, stroke: '#ffffff' },
        points: [ { x: 4, y: 57 }, { x: 31, y: 33 }, { x: 6, y: 59 }, { x: 35, y: 36 } ]
      }
    ],
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
        defaultDir: 'ld',
        cx: 45,
        cy: 34,
        scale: 0.08,
        // 与爸爸同步出现：等开场对白第3句（index:2）显示时再出现
        appearOnDialogueUntil: { id: 'kitchen:intro', index: 2, textIncludes: '好主意，安全第一' },
        // adjust walking vector rotation (degrees) to align with background grid
        // moveAngleDeg: 10,
        // per-direction fine-tune (degrees). Overrides moveAngleDeg if provided
        dirAngleDeg: { rd: -16, ld: 16, rt: 16, lt: -16 },
        speed: 120,
        // 可选圆形碰撞体（半径按显示尺寸比例）
        collider: { type: 'circle', radiusPct: 0.5, offsetX: 0, offsetY: 0 },
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
      },
      // 爸爸（静态/占位精灵），对白出现到指定句后再进入场景
      {
        id: 'daddy',
        kind: 'multiImageLooper',
        collider: { type: 'circle', radiusPct: 0.5, offsetX: 0, offsetY: 0 },
        animKey: 'daddy_idle_anim',
        frames: [ '/images/levels/lv1/sprites/daddy/daddy_idle.png' ],
        cx: 39,
        cy: 29,
        scale: 0.07,
        appearOnDialogueUntil: { id: 'kitchen:intro', index: 2, textIncludes: '好主意，安全第一' }
      }
    ],
  },
];
