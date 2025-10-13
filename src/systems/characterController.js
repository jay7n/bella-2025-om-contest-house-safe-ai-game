import Phaser from 'phaser';
import { loadAndCreateMultiImageAnim } from './multiframe.js';

// Simple 4-direction walk/idle controller driven by arrow keys.
// actorCfg:
// { id, cx, cy, scale, defaultDir:'rd'|'ld'|'rt'|'lt', variants:{ dir:{ walk:{kind:'multiImageAnim',animKey,frames,frameRate,repeat,flipX}, idle:{ kind:'image', key, url, flipX } } } }
export default class CharacterController {
  constructor(scene, actorCfg, refRect){
    this.scene = scene;
    this.cfg = actorCfg;
    this.ref = refRect; // bgBounds reference
    this.state = { mode: 'idle', dir: actorCfg.defaultDir || 'rd' };
    this.sprite = null;
    this.ready = false;
    this.lastHoriz = 'r'; // track last horizontal facing for single-axis mapping if needed
  }

  async init(){
    // Preload animations and idle images
    const dirs = Object.keys(this.cfg.variants || {});
    for (const dir of dirs){
      const v = this.cfg.variants[dir];
      if (v.walk?.kind === 'multiImageAnim' && Array.isArray(v.walk.frames) && v.walk.frames.length){
        await loadAndCreateMultiImageAnim(this.scene, { key: v.walk.animKey, urls: v.walk.frames, frameRate: v.walk.frameRate, repeat: v.walk.repeat });
      }
      if (v.idle?.kind === 'image' && v.idle.url){
        const idleKey = v.idle.key || `${this.cfg.id}_${dir}_idle`;
        if (!this.scene.textures.exists(idleKey)){
          this.scene.load.image(idleKey, v.idle.url);
        }
      }
    }
    if (this.scene.load.list.size > 0){
      await new Promise(res => { this.scene.load.once('complete', res); this.scene.load.start(); });
    }
    // Spawn sprite at position
    const x = this.ref.x + (this.cfg.cx/100) * this.ref.width;
    const y = this.ref.y + (this.cfg.cy/100) * this.ref.height;
    // Use a generic sprite to allow animation & static textures
    this.sprite = this.scene.add.sprite(x, y).setOrigin(0.5).setDepth(3);
    // Enter default idle state
    this.setState('idle', this.state.dir, true);
    this.ready = true;
  }

  // Map arrow inputs to requested directions (per user's mapping)
  readInput(){
    const cursors = this.scene.input.keyboard.createCursorKeys();
    const right = !!cursors.right?.isDown;
    const left = !!cursors.left?.isDown;
    const up = !!cursors.up?.isDown;
    const down = !!cursors.down?.isDown;
    // Exact mapping: single keys
    if (right && !left && !up && !down) return 'rd';
    if (left && !right && !up && !down) return 'lt';
    if (up && !down && !left && !right) return 'rt';
    if (down && !up && !left && !right) return 'ld';
    // If multiple pressed, prefer diagonals based on combinations
    if (right && down) return 'rd';
    if (right && up) return 'rt';
    if (left && down) return 'ld';
    if (left && up) return 'lt';
    return null;
  }

  update(){
    if (!this.ready) return;
    // If dialogue active, hold idle
    if (this.scene.dialogue?.isActive && this.scene.dialogue.isActive()){
      if (this.state.mode !== 'idle'){ this.setState('idle', this.state.dir); }
      return;
    }
    const dir = this.readInput();
    if (dir){
      if (this.state.mode !== 'walk' || this.state.dir !== dir){ this.setState('walk', dir); }
    } else {
      if (this.state.mode !== 'idle'){ this.setState('idle', this.state.dir); }
    }

    // Movement when walking
    if (this.state.mode === 'walk'){
      const v = this.dirVector(this.state.dir);
      const speed = this.cfg.speed ?? 100; // px per second
      const dt = (this.scene.game.loop?.delta ?? 16) / 1000;
      let nx = this.sprite.x + v.x * speed * dt;
      let ny = this.sprite.y + v.y * speed * dt;
      // clamp to ref bounds, respecting sprite size
      const halfW = (this.sprite.displayWidth || 0) / 2;
      const halfH = (this.sprite.displayHeight || 0) / 2;
      const minX = this.ref.x + halfW;
      const maxX = this.ref.x + this.ref.width - halfW;
      const minY = this.ref.y + halfH;
      const maxY = this.ref.y + this.ref.height - halfH;
      nx = Math.max(minX, Math.min(maxX, nx));
      ny = Math.max(minY, Math.min(maxY, ny));
      this.sprite.setPosition(nx, ny);
    }
  }

  setState(mode, dir, force=false){
    if (!force && mode === this.state.mode && dir === this.state.dir) return;
    this.state = { mode, dir };
    const v = this.cfg.variants[dir];
    if (!v) return;
    // Apply flip for this direction
    const flipX = !!( (mode === 'walk' ? v.walk?.flipX : v.idle?.flipX) );
    this.sprite.setFlipX(flipX);
    this.sprite.setFlipY(!!( (mode === 'walk' ? v.walk?.flipY : v.idle?.flipY) ));
    // Apply scale preference: variant > actor default > keep current
    const variantScale = (mode === 'walk') ? v.walk?.scale : v.idle?.scale;
    if (variantScale != null) {
      this.sprite.setScale(variantScale);
    } else if (this.cfg.scale != null) {
      this.sprite.setScale(this.cfg.scale);
    }
    // Play
    if (mode === 'walk' && v.walk){
      if (v.walk.kind === 'multiImageAnim'){
        // ensure anim exists, then play
        if (!this.scene.anims.exists(v.walk.animKey)){
          // try (re)create (frames should be preloaded)
          const frames = (v.walk.frames||[]).map((u,i)=>({ key: `${v.walk.animKey}_f${i}` }));
          if (frames.length){
            this.scene.anims.create({ key: v.walk.animKey, frames, frameRate: v.walk.frameRate||10, repeat: v.walk.repeat ?? -1, skipMissedFrames:false });
          }
        }
        this.sprite.play(v.walk.animKey, true);
      }
    } else if (mode === 'idle' && v.idle){
      // Stop any running animation and set static texture
      this.sprite.anims?.stop();
      const idleKey = v.idle.key || `${this.cfg.id}_${dir}_idle`;
      this.sprite.setTexture(idleKey);
    }
  }

  // Map dir key to normalized vector
  dirVector(dir){
    // 1) explicit per-direction vector override
    const dv = this.cfg.dirVectors?.[dir];
    if (dv && Array.isArray(dv) && dv.length >= 2){
      let [x, y] = dv;
      const len = Math.hypot(x, y) || 1; x/=len; y/=len;
      return { x, y };
    }

    // 2) base 45° diagonals
    let x = 0, y = 0;
    if (dir === 'rd') { x = 1;  y = 1; }
    if (dir === 'ld') { x = -1; y = 1; }
    if (dir === 'rt') { x = 1;  y = -1; }
    if (dir === 'lt') { x = -1; y = -1; }
    // normalize
    let len = Math.hypot(x, y) || 1;
    x /= len; y /= len;
    // 3) optional rotation: per-direction angle overrides global
    const perDirDeg = this.cfg.dirAngleDeg?.[dir];
    const deg = (perDirDeg != null ? perDirDeg : (this.cfg.moveAngleDeg || 0));
    if (deg){
      const rad = deg * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      x = rx; y = ry;
      // re-normalize to be safe
      len = Math.hypot(x, y) || 1; x /= len; y /= len;
    }
    return { x, y };
  }
}
