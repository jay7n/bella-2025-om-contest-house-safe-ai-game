import Phaser from 'phaser';
import { LEVELS } from '../state/levels.js';
import DialogueManager from '../systems/dialogue.js';
import { loadAndCreateMultiImageAnim, spawnMultiImageAnim } from '../systems/multiframe.js';
import CharacterController from '../systems/characterController.js';

export default class LevelScene extends Phaser.Scene {
  constructor(){ super('Level'); }
  init(data){ this.levelId = data?.levelId || 'kitchen'; }
  create(){
    const level = LEVELS.find(l => l.id === this.levelId) || LEVELS[0];
    this.levelData = level; // keep reference for other methods
    const { width, height } = this.scale;

    // 背景与可点击区域（留边距，标题占位）
    this.cameras.main.setBackgroundColor('#0f172a');
    const margin = 24;
    const areaW = width - margin*2;
    const areaH = height - margin*2 - 48; // 顶部留出标题空间
    const areaX = margin;
    const areaY = margin + 32;
    const area = new Phaser.Geom.Rectangle(areaX, areaY, areaW, areaH);

    this.add.text(width/2, areaY-18, level.title, { fontSize:20, color:'#e5e7eb' }).setOrigin(0.5);

    // 若提供了背景图片，按比例绘制到 area 内部
    this.bgBounds = null;
    const bgKey = level.bg ? `bg_${level.id}` : null;
    const toLoad = [];
    if (bgKey && !this.textures.exists(bgKey)){
      this.load.image(bgKey, level.bg);
      toLoad.push(bgKey);
    }
    // Queue hazard sprites
    level.hazards.forEach(h => {
      if (!h.sprite) return;
      const key = `h_${h.id}`;
      if (!this.textures.exists(key)){
        this.load.image(key, h.sprite);
        toLoad.push(key);
      }
    });

    const drawBg = () => {
      if (!bgKey) return;
      const tex = this.textures.get(bgKey);
      const source = tex.getSourceImage();
      const iw = source.width, ih = source.height;
      const scale = Math.min(area.width/iw, area.height/ih);
      const drawW = iw*scale, drawH = ih*scale;
      const dx = area.x + (area.width - drawW)/2;
      const dy = area.y + (area.height - drawH)/2;
      this.add.image(dx, dy, bgKey).setOrigin(0).setDisplaySize(drawW, drawH).setDepth(0);
      this.bgBounds = new Phaser.Geom.Rectangle(dx, dy, drawW, drawH);
    };

    const getCenter = (ref, h) => {
      if (h?.coords && (h.coords.cx != null) && (h.coords.cy != null)){
        const cx = ref.x + (h.coords.cx/100) * ref.width;
        const cy = ref.y + (h.coords.cy/100) * ref.height;
        return { cx, cy };
      }
      if (h.shape === 'circle'){
        const cx = ref.x + (h.coords.cx/100) * ref.width;
        const cy = ref.y + (h.coords.cy/100) * ref.height;
        return { cx, cy };
      }
      const cx = ref.x + ((h.coords.x + h.coords.w/2)/100) * ref.width;
      const cy = ref.y + ((h.coords.y + h.coords.h/2)/100) * ref.height;
      return { cx, cy };
    };

    const drawHazards = () => {
      const ref = this.bgBounds || area;
      this.hSprites = new Map();
      level.hazards.forEach(h => {
        if (!h.sprite) return;
        const key = `h_${h.id}`;
        const { cx, cy } = getCenter(ref, h);
        const img = this.add.image(cx, cy, key).setOrigin(0.5).setDepth(1);
        if (h.scale != null) img.setScale(h.scale);
        this.hSprites.set(h.id, img);
      });
    };

    // Queue portraits if present
    if (level.portraits){
      if (level.portraits.father && !this.textures.exists('portrait_father')){ this.load.image('portrait_father', level.portraits.father); toLoad.push('portrait_father'); }
      if (level.portraits.daughter && !this.textures.exists('portrait_daughter')){ this.load.image('portrait_daughter', level.portraits.daughter); toLoad.push('portrait_daughter'); }
    }

    if (toLoad.length){
      this.load.once('complete', () => { drawBg(); drawHazards(); this.setupActors(level); this.setupDialogue(level); this.setupController(level); });
      this.load.start();
    } else {
      drawBg(); drawHazards(); this.setupActors(level); this.setupDialogue(level); this.setupController(level);
    }

    // 简化：用热区占位（百分比坐标映射到矩形/圆形）
    this.found = new Set();
    this.total = level.hazards.length;
    this.timeLeft = level.time;
    this.errors = 0;

    // UI
    this.scoreText = this.add.text(16, 12, '', { fontSize:16, color:'#e5e7eb' }).setDepth(5);
    this.timerEvent = this.time.addEvent({ delay:1000, loop:true, callback:()=>{ this.timeLeft--; if(this.timeLeft<=0){ this.finish(false); } this.updateUI(); } });

    // 交互层（以背景图区域或备用的 area 为参照）
    this.input.on('pointerup', (p)=>{
      const ref = this.bgBounds || area;
      const px = (p.x - ref.x)/ref.width*100;
      const py = (p.y - ref.y)/ref.height*100;
      const hit = level.hazards.find(h => !this.found.has(h.id) && this.inHotspot(px, py, h));
      if (hit){ this.onHit(hit, area); } else { this.onMiss(); }
      // 调试：打印点击坐标（百分比与像素），按中心点使用：cx/cy=上述百分比
      const ix = Math.round(p.x - ref.x), iy = Math.round(p.y - ref.y);
      console.log('click %', px.toFixed(2), py.toFixed(2), '| px', ix, iy);
    });

    // 提示按钮
    const hintBtn = this.add.text(width-110, height-28, '提示(H)', { fontSize:16, color:'#10b981', backgroundColor:'#00000055', padding:{x:8,y:4} })
      .setInteractive({useHandCursor:true})
      .on('pointerup', ()=> this.showHint(level, area));

    // 调试：H 键切换显示热点框，G 键切换网格，P 键进入放置模式
    this.debugDraw = false;
    this.input.keyboard?.on('keydown-H', ()=>{ this.debugDraw = !this.debugDraw; this.drawDebug(level, area); });
    this.showGrid = false;
    this.input.keyboard?.on('keydown-G', ()=>{ this.showGrid = !this.showGrid; this.drawGrid(area); });
    this.placing = false;
    this.input.keyboard?.on('keydown-P', ()=>{ this.placing = !this.placing; this.showToast(this.placing? '放置模式：点击设矩形左上，再次点击设宽高；按 P 退出' : '放置模式已退出'); });
    this.drawDebug(level, area);

    this.updateUI();
  }

  inHotspot(px, py, h){
    if (h.shape === 'circle'){
      const dx = px - h.coords.cx, dy = py - h.coords.cy;
      return Math.hypot(dx, dy) <= h.coords.r;
    }
    // rect by default
    return px >= h.coords.x && px <= h.coords.x + h.coords.w && py >= h.coords.y && py <= h.coords.y + h.coords.h;
  }

  onHit(h, area){
    this.found.add(h.id);
    // 画一个√提示
    const ref = this.bgBounds || area;
    const x = ref.x + (h.coords.cx ?? (h.coords.x + h.coords.w/2)) * ref.width/100;
    const y = ref.y + (h.coords.cy ?? (h.coords.y + h.coords.h/2)) * ref.height/100;
    this.add.text(x, y, '✓', { fontSize:28, color:'#10b981' }).setOrigin(0.5);
    // 若有对应精灵，命中后降低透明或隐藏
    const spr = this.hSprites?.get(h.id);
    if (spr) this.tweens.add({ targets: spr, alpha: 0.25, duration: 200 });
    // 知识点弹窗
    const tip = this.add.text(x, y-24, h.fact, { fontSize:14, color:'#e5e7eb', backgroundColor:'#00000099', padding:{x:8,y:6}, wordWrap:{width:300} }).setOrigin(0.5);
    this.tweens.add({ targets: tip, alpha:0, y: y-50, duration:1500, onComplete:()=> tip.destroy() });
    if (this.found.size === this.total){ this.finish(true); }
    // Dialogue trigger by hazard id (specific)
    const levelData = this.levelData;
    const onHazardHit = levelData?.triggers?.onHazardHit;
    if (this.dialogue && onHazardHit && levelData?.dialogues?.hazards){
      const rule = onHazardHit[h.id];
      if (rule && levelData.dialogues.hazards[rule.key] && !this._playedOnHit?.has(h.id)){
        this._playedOnHit = this._playedOnHit || new Set();
        this._playedOnHit.add(h.id);
        this.dialogue.start(levelData.dialogues.hazards[rule.key], { blocking: (rule.blocking ?? (levelData.dialogueUI?.blocking !== false)) });
      }
    }

    // Dialogue trigger by found count
    if (this.dialogue && Array.isArray(this.dialogueFoundRules) && levelData?.dialogues){
      const rule = this.dialogueFoundRules.find(r => r.count === this.found.size && levelData.dialogues?.[r.key]);
      if (rule){
        this.dialogue.start(levelData.dialogues[rule.key], { blocking: (levelData.dialogueUI?.blocking !== false) });
      }
    }
    this.updateUI();
  }

  onMiss(){ this.errors++; this.timeLeft = Math.max(0, this.timeLeft-3); this.cameras.main.shake(80, 0.003); this.updateUI(); if(this.timeLeft<=0) this.finish(false); }

  showHint(level, area){
    const target = level.hazards.find(h => !this.found.has(h.id));
    if (!target) return;
    const ref = this.bgBounds || area;
    const x = ref.x + (target.coords.cx ?? (target.coords.x + target.coords.w/2)) * ref.width/100;
    const y = ref.y + (target.coords.cy ?? (target.coords.y + target.coords.h/2)) * ref.height/100;
    const ring = this.add.circle(x, y, 24, 0x10b981, 0.2).setStrokeStyle(2, 0x10b981);
    this.tweens.add({ targets: ring, alpha:0, scale:1.6, duration:800, onComplete:()=> ring.destroy() });
  }

  updateUI(){
    const left = this.total - this.found.size;
    this.scoreText.setText(`剩余隐患: ${left}    时间: ${this.timeLeft}s    误点: ${this.errors}`);
  }

  finish(success){
    this.timerEvent?.remove();
    const left = this.total - this.found.size;
    const score = Math.max(0, (success?100:50) + this.timeLeft*2 - this.errors*5 - left*10);
    const rating = score>=120?'S':score>=90?'A':'B';
    // Trigger dialogue before leaving
    const levelData = this.levelData;
    const key = success ? levelData?.triggers?.onFinish?.success : levelData?.triggers?.onFinish?.fail;
    if (key && this.dialogue && levelData?.dialogues?.[key]){
      this.dialogue.start(levelData.dialogues[key], { blocking: true, onComplete: () => this.scene.start('Result', { success, score, rating, found: this.found.size, total: this.total, levelId: this.levelId }) });
      return;
    }
    this.scene.start('Result', { success, score, rating, found: this.found.size, total: this.total, levelId: this.levelId });
  }

  setupDialogue(level){
    // Build manager
    const uiCfg = level.dialogueUI || {};
    this.dialogue = new DialogueManager(this, uiCfg);
    // Start-of-level dialogue
    const key = level?.triggers?.onStart;
    if (key && level.dialogues?.[key]){
      this.dialogue.start(level.dialogues[key], { blocking: uiCfg.blocking !== false });
    }
    // Mid-level triggers by found count
    const foundRules = level?.triggers?.onFound || [];
    if (Array.isArray(foundRules)) this.dialogueFoundRules = foundRules.slice();
  }

  async setupActors(level){
    if (!Array.isArray(level.actors)) return;
    for (const a of level.actors){
      if (a.kind === 'multiImageAnim' && Array.isArray(a.frames) && a.frames.length){
        await loadAndCreateMultiImageAnim(this, { key: a.animKey, urls: a.frames, frameRate: a.frameRate, repeat: a.repeat });
        const ref = this.bgBounds || new Phaser.Geom.Rectangle(24, 24, this.scale.width-48, this.scale.height-96);
        const x = ref.x + (a.cx/100) * ref.width;
        const y = ref.y + (a.cy/100) * ref.height;
        const sp = spawnMultiImageAnim(this, a.animKey, { x, y, scale: a.scale ?? 1, depth: 2 });
        if (a.flipX) sp.setFlipX(true);
        if (a.flipY) sp.setFlipY(true);
        // Optional: stash for later control
        this.actors = this.actors || {};
        this.actors[a.id] = sp;
      } else if (a.kind === 'multiImageLooper' && Array.isArray(a.frames) && a.frames.length){
        const ref = this.bgBounds || new Phaser.Geom.Rectangle(24, 24, this.scale.width-48, this.scale.height-96);
        const x = ref.x + (a.cx/100) * ref.width;
        const y = ref.y + (a.cy/100) * ref.height;
        const { loadAndSpawnMultiImageLooper } = await import('../systems/multiframe.js');
        const res = await loadAndSpawnMultiImageLooper(this, { key: a.animKey, urls: a.frames, msPerFrame: a.msPerFrame ?? 125, x, y, scale: a.scale ?? 1, depth: 2 });
        if (a.flipX) res.sprite.setFlipX(true);
        if (a.flipY) res.sprite.setFlipY(true);
        this.actors = this.actors || {};
        this.actors[a.id] = res.sprite;
      }
    }
  }

  async setupController(level){
    const ctrlDef = Array.isArray(level.actors) ? level.actors.find(a => a.controller) : null;
    if (!ctrlDef) return;
    const ref = this.bgBounds || new Phaser.Geom.Rectangle(24, 24, this.scale.width-48, this.scale.height-96);
    this.controller = new CharacterController(this, ctrlDef, ref);
    await this.controller.init();
  }

  update(){
    super.update?.();
    this.controller?.update();
  }

  // 调试绘制热点矩形/圆形，参考背景图缩放后的区域
  drawDebug(level, fallbackArea){
    this.debugLayer?.destroy(true);
    if (!this.debugDraw) return;
    const ref = this.bgBounds || fallbackArea;
    const g = this.add.graphics();
    g.lineStyle(2, 0x10b981, 0.85);
    level.hazards.forEach(h => {
      if (h.shape === 'circle'){
        const x = ref.x + h.coords.cx/100 * ref.width;
        const y = ref.y + h.coords.cy/100 * ref.height;
        const r = h.coords.r/100 * Math.min(ref.width, ref.height);
        g.strokeCircle(x, y, r);
      } else {
        const x = ref.x + h.coords.x/100 * ref.width;
        const y = ref.y + h.coords.y/100 * ref.height;
        const w = h.coords.w/100 * ref.width;
        const hgt = h.coords.h/100 * ref.height;
        g.strokeRect(x, y, w, hgt);
      }
    });
    this.debugLayer = g;
  }

  // 画参考网格（10%步进），辅助对齐
  drawGrid(fallbackArea){
    this.gridLayer?.destroy(true);
    if (!this.showGrid) return;
    const ref = this.bgBounds || fallbackArea;
    const g = this.add.graphics();
    g.lineStyle(1, 0x94a3b8, 0.25);
    for (let i=0;i<=10;i++){
      const x = ref.x + i/10*ref.width;
      g.lineBetween(x, ref.y, x, ref.y+ref.height);
      const y = ref.y + i/10*ref.height;
      g.lineBetween(ref.x, y, ref.x+ref.width, y);
    }
    this.gridLayer = g;
  }

  // 轻量提示
  showToast(text){
    const t = this.add.text(this.scale.width/2, 28, text, { fontSize: 14, color:'#e5e7eb', backgroundColor:'#00000088', padding:{x:8,y:4} }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha:0, y:8, duration:1200, onComplete:()=>t.destroy() });
  }
}
