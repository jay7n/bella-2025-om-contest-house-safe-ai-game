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
      // Once bgBounds is known, (re)build obstacles in pixel space
      this.buildObstacles(level);
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
      this.hPulseTweens = new Map(); // optional ambience tweens per hazard id
      level.hazards.forEach(h => {
        if (!h.sprite) return;
        const key = `h_${h.id}`;
        const { cx, cy } = getCenter(ref, h);
        const img = this.add.image(cx, cy, key).setOrigin(0.5).setDepth(1);
        if (h.scale != null) img.setScale(h.scale);
        this.hSprites.set(h.id, img);

        // Low-cost ambience: gentle flicker for stove flame (brightness + tiny scale pulse)
        if (h.id === 'stove'){
          // color flicker using a counter tween
          const tintTw = this.tweens.addCounter({
            from: 0, to: 100, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            onUpdate: (tw) => {
              const v = tw.getValue() / 100; // 0..1
              const r = 255 - Math.floor(10 * v);
              const g = 255 - Math.floor(25 * v);
              const b = 255; // keep bluish highlight
              img.setTint(Phaser.Display.Color.GetColor(r, g, b));
            }
          });
          // subtle scale pulse (very small to avoid noticeable stretching)
          const baseScale = img.scale || 1;
          const scaleTw = this.tweens.add({ targets: img, scale: baseScale * 1.015, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.hPulseTweens.set(h.id, { tweens: [tintTw, scaleTw], baseScale });
        }

        if (h.id === 'water_puddle'){
          // Gentle ripple breathing: desynced X/Y pulse + tiny rotation sway
          const baseScaleX = img.scaleX || img.scale || 1;
          const baseScaleY = img.scaleY || img.scale || 1;
          const sxTw = this.tweens.add({ targets: img, scaleX: baseScaleX * 1.02, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          const syTw = this.tweens.add({ targets: img, scaleY: baseScaleY * 0.985, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 200 });
          const rotTw = this.tweens.add({ targets: img, angle: 0.2, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.hPulseTweens.set(h.id, { tweens: [sxTw, syTw, rotTw], baseScaleX, baseScaleY });
        }
      });
    };

    // Queue portraits if present
    if (level.portraits){
      if (level.portraits.father && !this.textures.exists('portrait_father')){ this.load.image('portrait_father', level.portraits.father); toLoad.push('portrait_father'); }
      if (level.portraits.daughter && !this.textures.exists('portrait_daughter')){ this.load.image('portrait_daughter', level.portraits.daughter); toLoad.push('portrait_daughter'); }
    }

    // Queue BGM if provided (supports public/ absolute URLs)
    if (level.bgm?.url){
      console.info('[Level] queue BGM', level.bgm.key, level.bgm.url);
      const bgmKey = level.bgm.key;
      const inCache = this.cache.audio.exists ? this.cache.audio.exists(bgmKey) : this.cache.audio.has?.(bgmKey);
      if (!inCache){
        this.load.audio(bgmKey, level.bgm.url);
        toLoad.push(bgmKey);
      }
    }

    // Queue hit SFX (public/audio/beat.mp3)
    const beatKey = 'sfx_beat';
    const beatInCache = this.cache.audio.exists ? this.cache.audio.exists(beatKey) : this.cache.audio.has?.(beatKey);
    if (!beatInCache){
      this.load.audio(beatKey, '/audio/beat.mp3');
      toLoad.push(beatKey);
    }

    const startBgm = () => {
      const cfg = level.bgm;
      if (!cfg?.key) return;
      // Clean up any existing sounds with same key (without relying on removeByKey availability)
      const sounds = (this.sound.sounds || []).filter(s => s.key === cfg.key);
      sounds.forEach(s => { try { s.stop(); } catch(_){} try { s.destroy(); } catch(_){} });
      const play = () => {
        try {
          const s = this.sound.add(cfg.key, { loop: cfg.loop !== false, volume: cfg.volume ?? 0.5 });
          s.play();
          console.info('[Level] BGM started', cfg.key);
          this.bgm = s;
        } catch (e) {
          console.error('[Level] BGM play error', e);
        }
      };
      if (this.sound.locked){ this.sound.once('unlocked', play); } else { play(); }
    };

    if (toLoad.length){
      this.load.once('complete', () => { drawBg(); drawHazards(); this.setupActors(level); this.setupDialogue(level); this.setupController(level); this.setupObstacleDebug(level); startBgm(); });
      this.load.start();
    } else {
      drawBg(); drawHazards(); this.setupActors(level); this.setupDialogue(level); this.setupController(level); this.setupObstacleDebug(level); startBgm();
    }

    // 简化：用热区占位（百分比坐标映射到矩形/圆形）
    this.isFinished = false;
    this.found = new Set();
    this.total = level.hazards.length;
    this.timeLeft = level.time;
    this.errors = 0;

    // UI：顶部状态条稍微下移并加内边距，避免视觉裁切
    this.scoreText = this.add.text(16, 18, '', { fontSize:16, color:'#e5e7eb', padding:{ x:6, y:2 } }).setDepth(5);
    this.timerEvent = this.time.addEvent({ delay:1000, loop:true, callback:()=>{ this.timeLeft--; if(this.timeLeft<=0){ this.finish(false); } this.updateUI(); } });

    // 交互：移除鼠标点击，改为靠近后按空格触发
    const hazardGeom = (h, refRect) => {
      if (h.shape === 'circle'){
        const cx = refRect.x + (h.coords.cx/100) * refRect.width;
        const cy = refRect.y + (h.coords.cy/100) * refRect.height;
        const r = (h.coords.r/100) * Math.min(refRect.width, refRect.height);
        return { cx, cy, r };
      }
      // rect default
      const x = refRect.x + (h.coords.x/100) * refRect.width;
      const y = refRect.y + (h.coords.y/100) * refRect.height;
      const w = (h.coords.w/100) * refRect.width;
      const hgt = (h.coords.h/100) * refRect.height;
      const cx = x + w/2, cy = y + hgt/2;
      // approximate interaction radius by half of max side
      const r = Math.max(w, hgt)/2;
      return { cx, cy, r };
    };
    const findNearbyHazard = () => {
      const ref = this.bgBounds || area;
      const spr = this.controller?.sprite;
      if (!spr) return null;
      const px = spr.x, py = spr.y;
      const margin = 24; // extra interaction margin (px)
      // Prefer nearest one within range
      let best = null; let bestDist = Infinity;
      level.hazards.forEach(h => {
        if (this.found.has(h.id)) return;
        const g = hazardGeom(h, ref);
        const d = Math.hypot(px - g.cx, py - g.cy);
        if (d <= g.r + margin && d < bestDist){ best = h; bestDist = d; }
      });
      return best;
    };
    this.input.keyboard?.on('keydown-SPACE', () => {
      // 若对话进行中，空格仅用于推进对话，不触发找 hazard
      if (this.dialogue?.isActive && this.dialogue.isActive()) return;
      const hit = findNearbyHazard();
      if (hit){ this.onHit(hit, area); } else { this.onMiss(); }
    });

    // 提示功能已移除（原“提示(H)”按钮）

    // 调试：支持 URL 参数 debug=1 初始开启调试；仍保留 H/G/P 快捷键
    const params = new URLSearchParams(window.location.search);
    const debugOn = ['1', 'true', 'yes'].includes((params.get('debug')||'').toLowerCase());
    // G 键切换网格，P 键进入放置模式（移除 H 快捷键）
    this.debugDraw = false;
    this.showGrid = debugOn;
    this.input.keyboard?.on('keydown-G', ()=>{ this.showGrid = !this.showGrid; this.drawGrid(area); });
    this.placing = false;
    this.input.keyboard?.on('keydown-P', ()=>{ this.placing = !this.placing; this.showToast(this.placing? '放置模式：点击设矩形左上，再次点击设宽高；按 P 退出' : '放置模式已退出'); });
    // 调试热点框已移除
    this.drawGrid(area);

    // Debug hotkeys: B to (re)start/stop BGM, M to mute/unmute
    this.input.keyboard?.on('keydown-B', () => {
      if (level.bgm?.key){
        if (this.bgm?.isPlaying){
          try { this.bgm.stop(); } catch(_){}
          try { this.bgm.destroy(); } catch(_){}
          this.bgm = null;
          this.showToast('BGM 停止');
        } else {
          this.showToast('尝试播放 BGM');
          // reuse startBgm closure
          try { startBgm(); } catch (e) { console.error('BGM start error', e); }
        }
      }
    });
    this.input.keyboard?.on('keydown-M', () => {
      if (this.bgm){
        const mute = !this.bgm.mute;
        this.bgm.setMute(mute);
        this.showToast(mute ? '已静音' : '已取消静音');
      }
    });

    this.updateUI();

    // Fallback: first user interaction triggers BGM if not playing (helps in strict autoplay policies)
    this.input.once('pointerdown', () => {
      if (level.bgm?.key && (!this.bgm || !this.bgm.isPlaying)){
        console.info('[Level] pointerdown fallback: starting BGM');
        startBgm();
      }
    });

    // BGM is now started via startBgm() above after assets are loaded
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
    // Play success SFX
    try { this.sound?.play('sfx_beat', { volume: 0.6 }); } catch(_) {}
    // 画一个√提示
    const ref = this.bgBounds || area;
    const x = ref.x + (h.coords.cx ?? (h.coords.x + h.coords.w/2)) * ref.width/100;
    const y = ref.y + (h.coords.cy ?? (h.coords.y + h.coords.h/2)) * ref.height/100;
    this.add.text(x, y, '✓', { fontSize:28, color:'#10b981' }).setOrigin(0.5);
    // 若有对应精灵，命中后降低透明或隐藏
    const spr = this.hSprites?.get(h.id);
    if (spr) {
      // stop any ambience tween for this hazard and clear tint
      const amb = this.hPulseTweens?.get(h.id);
      if (amb){
        if (amb.timer){ try { amb.timer.remove(false); } catch(_){} }
        if (Array.isArray(amb.tweens)) amb.tweens.forEach(tw => { try { tw?.stop(); } catch(_){} });
        else { try { amb.tintTw?.stop(); } catch(_){} try { amb.scaleTw?.stop(); } catch(_){} }
        this.hPulseTweens.delete(h.id);
      }
      spr.clearTint?.();
      if (spr.alpha !== 1) spr.setAlpha(1);
      this.tweens.add({ targets: spr, alpha: 0.25, duration: 200 });
    }
    // 知识点弹窗
    const tip = this.add.text(x, y-24, h.fact, { fontSize:14, color:'#e5e7eb', backgroundColor:'#00000099', padding:{x:8,y:6}, wordWrap:{width:300} }).setOrigin(0.5);
    this.tweens.add({ targets: tip, alpha:0, y: y-50, duration:1500, onComplete:()=> tip.destroy() });
    // 记录是否为最后一个，稍后再结算，以便先播放命中对话
    const isLastFound = (this.found.size === this.total);
    // Dialogue triggers: hazard-specific and by-found-count in the same frame
    const levelData = this.levelData;
    const onHazardHit = levelData?.triggers?.onHazardHit;
    const dlgBlockingDefault = (levelData.dialogueUI?.blocking !== false);
    let hazardScript = null; let hazardId = null; let hazardBlocking = dlgBlockingDefault;
    if (this.dialogue && onHazardHit && levelData?.dialogues?.hazards){
      const r = onHazardHit[h.id];
      if (r && levelData.dialogues.hazards[r.key] && !this._playedOnHit?.has(h.id)){
        hazardScript = levelData.dialogues.hazards[r.key];
        hazardId = `haz:${h.id}`;
        hazardBlocking = (r.blocking ?? dlgBlockingDefault);
      }
    }
    let foundScript = null; let foundId = null;
    if (this.dialogue && Array.isArray(this.dialogueFoundRules) && levelData?.dialogues){
      const r = this.dialogueFoundRules.find(r => r.count === this.found.size && levelData.dialogues?.[r.key]);
      if (r){
        this._playedFoundCounts = this._playedFoundCounts || new Set();
        if (!this._playedFoundCounts.has(r.count)){
          foundScript = levelData.dialogues[r.key];
          foundId = `found:${r.count}`;
        }
      }
    }
    // If both exist, bundle into one dialogue sequence to avoid visual "拼接"
    if (hazardScript && foundScript){
      this._playedOnHit = this._playedOnHit || new Set();
      this._playedOnHit.add(h.id);
      this._playedFoundCounts.add(parseInt(foundId.split(':')[1]));
      const combo = ([]).concat(hazardScript, foundScript);
      this.enqueueDialogue(combo, { id: `bundle:${hazardId}+${foundId}`, blocking: hazardBlocking });
    } else {
      if (hazardScript){
        this._playedOnHit = this._playedOnHit || new Set();
        this._playedOnHit.add(h.id);
        this.enqueueDialogue(hazardScript, { id: hazardId, blocking: hazardBlocking });
      }
      if (foundScript){
        this._playedFoundCounts.add(parseInt(foundId.split(':')[1]));
        this.enqueueDialogue(foundScript, { id: foundId, blocking: dlgBlockingDefault });
      }
    }
    // 若是最后一个，放在对话入队之后再进行结算（success 对话会排在后面）
    if (isLastFound){ this.finish(true); }
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
    if (this.isFinished) return;
    this.isFinished = true;

    this.timerEvent?.remove();
    // fade out BGM
    if (this.bgm){
      this.tweens.add({ targets: this.bgm, volume: 0, duration: 300, onComplete: ()=>{ this.bgm.stop(); this.bgm.destroy(); this.bgm = null; } });
    }
    const left = this.total - this.found.size;
    const score = Math.max(0, (success?100:50) + this.timeLeft*2 - this.errors*5 - left*10);
    const missed = (this.levelData?.hazards || []).filter(h => !this.found.has(h.id)).map(h => ({ id: h.id, name: h.name || h.id }));
    const rating = score>=120?'S':score>=90?'A':'B';
    // Trigger dialogue before leaving
    const levelData = this.levelData;
    const key = success ? levelData?.triggers?.onFinish?.success : levelData?.triggers?.onFinish?.fail;
    if (key && this.dialogue && levelData?.dialogues?.[key]){
      this.enqueueDialogue(levelData.dialogues[key], { id:`finish:${success?'ok':'fail'}`, blocking: true, onComplete: () => this.scene.start('Result', { success, score, rating, found: this.found.size, total: this.total, levelId: this.levelId, missed }) });
      return;
    }
    this.scene.start('Result', { success, score, rating, found: this.found.size, total: this.total, levelId: this.levelId, missed });
  }

  setupDialogue(level){
    // Build manager
    const uiCfg = level.dialogueUI || {};
    this.dialogue = new DialogueManager(this, uiCfg);
    // Start-of-level dialogue
    const key = level?.triggers?.onStart;
    if (key && level.dialogues?.[key]){
      this.enqueueDialogue(level.dialogues[key], { id: `${level.id}:${key}`, blocking: uiCfg.blocking !== false });
    }
    // Mid-level triggers by found count
    const foundRules = level?.triggers?.onFound || [];
    if (Array.isArray(foundRules)) this.dialogueFoundRules = foundRules.slice();

    // 如果主角延迟出现，则在出现后再初始化控制器
    this.events.on('dialogue_line', async (ev) => {
      const girlDef = Array.isArray(level.actors) ? level.actors.find(a => a.id==='girl') : null;
      if (!girlDef) return;
      if (girlDef.appearOnDialogueUntil){
        const { id, index, textIncludes } = girlDef.appearOnDialogueUntil;
        const ok = (!id || id===ev?.id) && (typeof index!=='number' || ev?.index>=index) && (!textIncludes || ev?.line?.text?.includes?.(textIncludes));
        if (ok && !this.controller){
          // 确保 girl 已生成
          if (!this.actors?.girl) await this.spawnActor(girlDef);
          // 然后初始化控制器
          const ref = this.bgBounds || new Phaser.Geom.Rectangle(24, 24, this.scale.width-48, this.scale.height-96);
          this.controller = new CharacterController(this, girlDef, ref);
          await this.controller.init();
        }
      }
    });
  }

  // Queue dialogues to avoid overlapping when multiple triggers fire in the same moment
  enqueueDialogue(script, opts={}){
    if (!this.dialogue || !script) return;
    this._dlgQueue = this._dlgQueue || [];
    this._dlgQueuedIds = this._dlgQueuedIds || new Set();
    this._dlgPlayedIds = this._dlgPlayedIds || new Set();
    const id = opts?.id;
    if (id) { try { console.info('[DLG enqueue req]', id); } catch(_){} }
    if (id && (this._dlgQueuedIds.has(id) || this._dlgPlayedIds.has(id))){
      return; // already queued or played; avoid duplicates
    }
    if (id) this._dlgQueuedIds.add(id);
    // Sanitize: flatten arrays and drop duplicate consecutive lines; also fix exact double-text
    const toArray = (v) => Array.isArray(v) ? v.slice() : (v ? [v] : []);
    const flat = toArray(script).flat();
    const norm = [];
    for (const ln of flat){
      if (!ln || typeof ln.text !== 'string') { norm.push(ln); continue; }
      let txt = ln.text;
      // fix exact double concatenation: e.g., 'ABCABC'
      if (txt.length % 2 === 0){
        const half = txt.slice(0, txt.length/2);
        if (half + half === txt){
          try { console.info('[DLG fix double]', { id, before: txt, after: half }); } catch(_){}
          txt = half;
        }
      }
      const candidate = { ...ln, text: txt };
      const prev = norm[norm.length-1];
      if (prev && prev.speaker === candidate.speaker && prev.text === candidate.text){
        try { console.info('[DLG drop dup line]', { id, text: candidate.text }); } catch(_){}
        continue;
      }
      norm.push(candidate);
    }
    const finalScript = norm;
    const startNext = () => {
      if (!this._dlgQueue?.length) return;
      const next = this._dlgQueue.shift();
      const nextId = next.opts?.id;
      const chained = (next.opts && next.opts.onComplete)
        ? () => { try { next.opts.onComplete(); } catch(_){} startNext(); }
        : startNext;
      this.dialogue.start(next.script, { ...next.opts, onComplete: () => {
        if (nextId){ this._dlgQueuedIds.delete(nextId); this._dlgPlayedIds.add(nextId); }
        chained();
      }});
    };
    if (this.dialogue.isActive && this.dialogue.isActive()){
      this._dlgQueue.push({ script: finalScript, opts });
    } else {
      const chained = (opts && opts.onComplete)
        ? () => { try { opts.onComplete(); } catch(_){} startNext(); }
        : startNext;
      this.dialogue.start(finalScript, { ...opts, onComplete: () => {
        if (id){ this._dlgQueuedIds.delete(id); this._dlgPlayedIds.add(id); }
        chained();
      }});
    }
  }

  async setupActors(level){
    if (!Array.isArray(level.actors)) return;
    // Defer actors that are flagged with appearOnDialogueUntil to appear later
    const deferred = [];
    for (const a of level.actors){
      if (a.appearOnDialogueUntil && typeof a.appearOnDialogueUntil === 'object'){
        deferred.push(a);
        continue;
      }
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

        // If actor defines a collider, add a simple blocking polygon to obstacles for the controller to collide with
        if (a.collider && a.collider.type === 'circle'){
          const halfW = (res.sprite.displayWidth || 0) / 2;
          const halfH = (res.sprite.displayHeight || 0) / 2;
          const r = (a.collider.radiusPct != null) ? Math.min(halfW, halfH) * a.collider.radiusPct : Math.min(halfW, halfH) * 0.45;
          const offX = a.collider.offsetX || 0;
          const offY = a.collider.offsetY || 0;
          const cx = res.sprite.x + offX;
          const cy = res.sprite.y + offY;
          const pts = [
            { x: cx - r, y: cy - r },
            { x: cx + r, y: cy - r },
            { x: cx + r, y: cy + r },
            { x: cx - r, y: cy + r },
          ];
          // compute AABB
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          pts.forEach(p => { if (p.x<minX) minX=p.x; if (p.x>maxX) maxX=p.x; if (p.y<minY) minY=p.y; if (p.y>maxY) maxY=p.y; });
          const aabb = new Phaser.Geom.Rectangle(minX, minY, maxX-minX, maxY-minY);
          this.obstaclesPx = this.obstaclesPx || [];
          this.obstaclesPx.push({ type:'poly', id:`actor:${a.id}`, label:a.id, solid:true, points:pts, aabb, debug:{ color:'#0ea5e9', stroke:'#0284c7' }, index: this.obstaclesPx.length });
          // refresh obstacle debug layer if visible
          if (this.showObstacles) this.drawObstacles();
        }
      }
    }
    // If any deferred, subscribe to dialogue_line and spawn when condition met
    if (deferred.length){
      const handler = (ev) => {
        deferred.slice().forEach((a) => {
          const cond = a.appearOnDialogueUntil;
          const matchId = !cond.id || cond.id === ev?.id;
          const atOrAfter = (typeof cond.index === 'number') ? (ev?.index >= cond.index) : true;
          const textMatch = cond.textIncludes ? (ev?.line?.text?.includes?.(cond.textIncludes)) : true;
          if (matchId && atOrAfter && textMatch){
            // spawn now
            this.spawnActor(a);
            deferred.splice(deferred.indexOf(a), 1);
          }
        });
        if (!deferred.length){ this.events.off('dialogue_line', handler); }
      };
      this.events.on('dialogue_line', handler);
    }
  }

  // helper to spawn one actor definition (shared with setupActors and deferred spawns)
  async spawnActor(a){
    if (!a) return;
    if (a.kind === 'multiImageAnim' && Array.isArray(a.frames) && a.frames.length){
      await loadAndCreateMultiImageAnim(this, { key: a.animKey, urls: a.frames, frameRate: a.frameRate, repeat: a.repeat });
      const ref = this.bgBounds || new Phaser.Geom.Rectangle(24, 24, this.scale.width-48, this.scale.height-96);
      const x = ref.x + (a.cx/100) * ref.width;
      const y = ref.y + (a.cy/100) * ref.height;
      const sp = spawnMultiImageAnim(this, a.animKey, { x, y, scale: a.scale ?? 1, depth: 2 });
      if (a.flipX) sp.setFlipX(true);
      if (a.flipY) sp.setFlipY(true);
      this.actors = this.actors || {};
      this.actors[a.id] = sp;
      return sp;
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
      // add collider obstacle if defined
      if (a.collider && a.collider.type === 'circle'){
        const halfW = (res.sprite.displayWidth || 0) / 2;
        const halfH = (res.sprite.displayHeight || 0) / 2;
        const r = (a.collider.radiusPct != null) ? Math.min(halfW, halfH) * a.collider.radiusPct : Math.min(halfW, halfH) * 0.45;
        const offX = a.collider.offsetX || 0;
        const offY = a.collider.offsetY || 0;
        const cx = res.sprite.x + offX;
        const cy = res.sprite.y + offY;
        const pts = [ { x: cx - r, y: cy - r }, { x: cx + r, y: cy - r }, { x: cx + r, y: cy + r }, { x: cx - r, y: cy + r } ];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        pts.forEach(p => { if (p.x<minX) minX=p.x; if (p.x>maxX) maxX=p.x; if (p.y<minY) minY=p.y; if (p.y>maxY) maxY=p.y; });
        const aabb = new Phaser.Geom.Rectangle(minX, minY, maxX-minX, maxY-minY);
        this.obstaclesPx = this.obstaclesPx || [];
        this.obstaclesPx.push({ type:'poly', id:`actor:${a.id}`, label:a.id, solid:true, points:pts, aabb, debug:{ color:'#0ea5e9', stroke:'#0284c7' }, index: this.obstaclesPx.length });
        if (this.showObstacles) this.drawObstacles();
      }
      return res.sprite;
    }
  }

  buildObstacles(level){
    // Parse level.obstacles (percent) into pixel-space polygons relative to bgBounds
    const ref = this.bgBounds || new Phaser.Geom.Rectangle(24, 24, this.scale.width-48, this.scale.height-96);
    const obs = [];
    const normPoly = (ptsPct) => {
      if (!Array.isArray(ptsPct) || ptsPct.length < 3) return ptsPct || [];
      // 1) centroid
      let cx = 0, cy = 0; ptsPct.forEach(p=>{ cx+=p.x; cy+=p.y; }); cx/=ptsPct.length; cy/=ptsPct.length;
      // 2) angle from centroid
      const sorted = ptsPct.slice().sort((a,b)=> Math.atan2(a.y-cy, a.x-cx) - Math.atan2(b.y-cy, b.x-cx));
      // 3) rotate so that first is top-left (min y, then min x)
      let minIdx = 0; let best = { y: Infinity, x: Infinity };
      for (let i=0;i<sorted.length;i++){
        const p = sorted[i];
        if (p.y < best.y - 1e-6 || (Math.abs(p.y - best.y) <= 1e-6 && p.x < best.x)){
          best = { x:p.x, y:p.y }; minIdx = i;
        }
      }
      const rotated = sorted.slice(minIdx).concat(sorted.slice(0,minIdx));
      // 4) ensure clockwise using shoelace area on percent (scale-invariant)
      const area = (()=>{
        let s=0; for (let i=0;i<rotated.length;i++){ const p=rotated[i], q=rotated[(i+1)%rotated.length]; s += p.x*q.y - q.x*p.y; } return s/2; })();
      // In screen coords (y down), positive/negative sign can be inverted; we just normalize to a consistent clockwise by taking negative area as CW
      const cw = area < 0; // treat negative as CW
      return cw ? rotated : rotated.slice().reverse();
    };
    (level.obstacles || []).forEach((o, i) => {
      if (o.shape === 'poly' && Array.isArray(o.points) && o.points.length >= 3){
        const norm = normPoly(o.points);
        const pts = norm.map(p => ({
          x: ref.x + (p.x/100) * ref.width,
          y: ref.y + (p.y/100) * ref.height,
        }));
        // compute AABB
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        pts.forEach(p => { if (p.x<minX) minX=p.x; if (p.x>maxX) maxX=p.x; if (p.y<minY) minY=p.y; if (p.y>maxY) maxY=p.y; });
        const aabb = new Phaser.Geom.Rectangle(minX, minY, maxX-minX, maxY-minY);
        obs.push({ type:'poly', id:o.id, label:o.label, solid:o.solid!==false, points:pts, aabb, debug:o.debug||{}, index:i });
      } else if (o.shape === 'line' && o.a && o.b){
        const a = { x: ref.x + (o.a.x/100)*ref.width, y: ref.y + (o.a.y/100)*ref.height };
        const b = { x: ref.x + (o.b.x/100)*ref.width, y: ref.y + (o.b.y/100)*ref.height };
        const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
        const aabb = new Phaser.Geom.Rectangle(minX, minY, maxX-minX, maxY-minY);
        obs.push({ type:'line', id:o.id, label:o.label, solid:o.solid!==false, a, b, aabb, debug:o.debug||{}, halfWidthPx: o.halfWidthPx||0, index:i });
      }
    });
    this.obstaclesPx = obs;
  }

  setupObstacleDebug(level){
    const params = new URLSearchParams(window.location.search);
    const debugOn = ['1','true','yes'].includes((params.get('debug')||'').toLowerCase());
    this.showObstacles = debugOn;
    this.input.keyboard?.on('keydown-O', () => { this.showObstacles = !this.showObstacles; this.drawObstacles(); });
    this.drawObstacles();
  }

  drawObstacles(){
    // Destroy previous container (graphics + texts)
    this.obstacleLayer?.destroy(true);
    if (!this.showObstacles || !this.obstaclesPx?.length) return;
    const layer = this.add.container(0, 0);
    const g = this.add.graphics();
    layer.add(g);
    this.obstaclesPx.forEach((o, idx) => {
      // color per obstacle for stroke only
      const col = o.debug.color || Phaser.Display.Color.HSVToRGB(((idx*47)%360)/360, 0.7, 1).color;
      const strokeCol = o.debug.stroke ? Phaser.Display.Color.HexStringToColor(o.debug.stroke).color : col;
      g.lineStyle(2, strokeCol, 0.9);
      if (o.type === 'poly'){
        const path = o.points;
        g.beginPath();
        g.moveTo(path[0].x, path[0].y);
        for (let i=1;i<path.length;i++) g.lineTo(path[i].x, path[i].y);
        g.closePath();
        g.strokePath();
      } else if (o.type === 'line'){
        g.beginPath();
        g.moveTo(o.a.x, o.a.y);
        g.lineTo(o.b.x, o.b.y);
        g.strokePath();
      }
      // center label
      const cx = o.aabb.centerX, cy = o.aabb.centerY;
      const t = this.add.text(cx, cy, o.label||o.id||`obs${idx}`, { fontSize:12, color:'#e5e7eb', backgroundColor:'#00000066', padding:{x:4,y:2} }).setOrigin(0.5);
      layer.add(t);
    });
    this.obstacleLayer = layer;
  }

  async setupController(level){
    const ctrlDef = Array.isArray(level.actors) ? level.actors.find(a => a.controller) : null;
    if (!ctrlDef) return;
    // 若主角配置了延迟出现，则此处先不初始化控制器，等对白事件触发后再创建
    if (ctrlDef.appearOnDialogueUntil) return;
    const ref = this.bgBounds || new Phaser.Geom.Rectangle(24, 24, this.scale.width-48, this.scale.height-96);
    this.controller = new CharacterController(this, ctrlDef, ref);
    await this.controller.init();
  }

  update(){
    super.update?.();
    this.controller?.update();
  }

  // 调试绘制热点矩形/圆形，参考背景图缩放后的区域
  // 调试热点框功能已移除
  drawDebug(){ this.debugLayer?.destroy(true); this.debugLayer = null; }

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
