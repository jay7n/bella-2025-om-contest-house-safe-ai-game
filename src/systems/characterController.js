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

      // Collision with polygon obstacles: per-axis resolve, circle collider
      const halfW = (this.sprite.displayWidth || 0) / 2;
      const halfH = (this.sprite.displayHeight || 0) / 2;
      // collider: circle radius from display size; center at sprite origin by default
      const r = (this.cfg.collider?.radiusPct != null)
        ? Math.min(halfW, halfH) * this.cfg.collider.radiusPct
        : Math.min(halfW, halfH) * 0.45;
      const offX = this.cfg.collider?.offsetX || 0;
      const offY = this.cfg.collider?.offsetY || 0;

      // try move X
      let tryX = nx, tryY = this.sprite.y;
      ({ x: tryX } = this.resolveCollision(tryX+offX, tryY+offY, r, 'x'));
      // then move Y
      tryY = ny;
      ({ y: tryY } = this.resolveCollision(tryX+offX, tryY+offY, r, 'y'));

      // clamp collider center to bg bounds, then convert back to sprite position
      let cx = tryX + offX; let cy = tryY + offY;
      const minCx = this.ref.x + r; const maxCx = this.ref.x + this.ref.width - r;
      const minCy = this.ref.y + r; const maxCy = this.ref.y + this.ref.height - r;
      cx = Math.max(minCx, Math.min(maxCx, cx));
      cy = Math.max(minCy, Math.min(maxCy, cy));
      this.sprite.setPosition(cx - offX, cy - offY);
    }

    // Debug: draw collider outline when URL debug=1
    const params = new URLSearchParams(window.location.search);
    const debugOn = ['1','true','yes'].includes((params.get('debug')||'').toLowerCase());
    if (debugOn){
      this.drawCollider();
    } else {
      this.clearCollider();
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

  drawCollider(){
    // circle collider (centered at sprite origin + user offset)
    const halfW = (this.sprite.displayWidth || 0) / 2;
    const halfH = (this.sprite.displayHeight || 0) / 2;
    const r = (this.cfg.collider?.radiusPct != null)
      ? Math.min(halfW, halfH) * this.cfg.collider.radiusPct
      : Math.min(halfW, halfH) * 0.45;
    const offX = this.cfg.collider?.offsetX || 0;
    const offY = this.cfg.collider?.offsetY || 0;
    const cx = this.sprite.x + offX;
    const cy = this.sprite.y + offY;
    this.colliderG?.destroy();
    const g = this.scene.add.graphics();
    g.lineStyle(1, 0x10b981, 0.95);
    g.strokeCircle(cx, cy, r);
    // crosshair for center
    g.lineBetween(cx-4, cy, cx+4, cy);
    g.lineBetween(cx, cy-4, cx, cy+4);
    this.colliderG = g;
  }

  clearCollider(){ this.colliderG?.destroy(); this.colliderG = null; }

  // Resolve circle vs polygon collisions along one axis (ax='x' or 'y')
  resolveCollision(cx, cy, r, ax){
    const obs = this.scene.obstaclesPx || [];
    let rx = cx, ry = cy;
    for (const o of obs){
      // AABB coarse check
      if (rx + r < o.aabb.x || rx - r > o.aabb.right || ry + r < o.aabb.y || ry - r > o.aabb.bottom) continue;
      if (o.type === 'poly'){
        // fine: circle vs polygon edges
        const pts = o.points; const n = pts.length;
        for (let i=0;i<n;i++){
          const a = pts[i], b = pts[(i+1)%n];
          // closest point on segment ab to circle center
          const vx = b.x - a.x, vy = b.y - a.y;
          const wx = rx - a.x, wy = ry - a.y;
          const c1 = vx*wx + vy*wy; const c2 = vx*vx + vy*vy;
          let t = c2 ? (c1 / c2) : 0; if (t<0) t=0; if (t>1) t=1;
          const px = a.x + t*vx, py = a.y + t*vy;
          const dx = rx - px, dy = ry - py;
          const dist = Math.hypot(dx, dy);
          if (dist < r){
            // push out along the minimal axis
            const overlap = r - dist || r; // handle zero dist edge case
            if (ax === 'x') rx += (dx === 0 ? (vx===0?0:Math.sign(vx))*overlap : (dx/dist)*overlap);
            else ry += (dy === 0 ? (vy===0?0:Math.sign(vy))*overlap : (dy/dist)*overlap);
          }
        }
        // also check vertices (circle vs point)
        for (let i=0;i<n;i++){
          const vx = rx - pts[i].x, vy = ry - pts[i].y;
          const d = Math.hypot(vx, vy);
          if (d < r){
            const overlap = r - d || r;
            if (ax === 'x') rx += (vx === 0 ? 0 : (vx/d)*overlap);
            else ry += (vy === 0 ? 0 : (vy/d)*overlap);
          }
        }
      } else if (o.type === 'line'){
        // circle vs segment with optional halfWidthPx (thick line by radius inflate)
        const axx = o.a.x, ayy = o.a.y, bxx = o.b.x, byy = o.b.y;
        const vx = bxx - axx, vy = byy - ayy;
        const wx = rx - axx, wy = ry - ayy;
        const c1 = vx*wx + vy*wy; const c2 = vx*vx + vy*vy;
        let t = c2 ? (c1 / c2) : 0; if (t<0) t=0; if (t>1) t=1;
        const px = axx + t*vx, py = ayy + t*vy;
        const dx = rx - px, dy = ry - py;
        const rInflated = r + (o.halfWidthPx || 0);
        const dist = Math.hypot(dx, dy);
        if (dist < rInflated){
          const overlap = rInflated - dist || rInflated;
          if (ax === 'x') rx += (dx === 0 ? (vx===0?0:Math.sign(vx))*overlap : (dx/dist)*overlap);
          else ry += (dy === 0 ? (vy===0?0:Math.sign(vy))*overlap : (dy/dist)*overlap);
        }
      }
    }
    return { x: rx, y: ry };
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
