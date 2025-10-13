import Phaser from 'phaser';

// Load multiple standalone images as frames and create a Phaser animation
// cfg: { key, urls: string[], frameRate=8, repeat=-1 }
export function loadAndCreateMultiImageAnim(scene, cfg){
  const key = cfg.key;
  const urls = cfg.urls || [];
  const frameRate = cfg.frameRate ?? 8;
  const repeat = cfg.repeat ?? -1;
  const frameKeys = urls.map((u, i) => `${key}_f${i}`);
  const msPerFrame = cfg.msPerFrame ?? Math.max(1, Math.round(1000 / Math.max(1, frameRate)));

  // Queue loads for any missing frame textures
  urls.forEach((url, i) => {
    const fk = frameKeys[i];
    if (!scene.textures.exists(fk)) {
      scene.load.image(fk, url);
    }
  });

  return new Promise((resolve) => {
    const build = () => {
      if (!scene.anims.exists(key)){
        scene.anims.create({
          key,
          // Use explicit per-frame duration to avoid catch-up jitter across loops
          frames: frameKeys.map(k => ({ key: k, duration: msPerFrame })),
          frameRate,
          repeat,
          repeatDelay: 0,
          // Prevent Phaser from skipping frames to catch up after stalls
          skipMissedFrames: false,
        });
      }
      // Warm up GPU by briefly drawing each texture once (alpha ~0), then remove next tick
      const warm = [];
      frameKeys.forEach(k => {
        const img = scene.add.image(2, 2, k).setAlpha(0.001).setDepth(-9999);
        warm.push(img);
      });
      scene.time.delayedCall(16, () => { warm.forEach(i => i.destroy()); resolve({ animKey: key, frameKeys }); });
    };
    // If we queued anything, run the loader once and then build
    if (scene.load.list.size > 0) {
      scene.load.once('complete', build);
      scene.load.start();
    } else {
      build();
    }
  });
}

// Spawn a sprite and play an existing animation created by loadAndCreateMultiImageAnim
// opts: { x, y, scale=1, depth=1 }
export function spawnMultiImageAnim(scene, animKey, opts={}){
  const { x=0, y=0, scale=1, depth=1 } = opts;
  // Use first frame texture as initial
  const anim = scene.anims.get(animKey);
  const firstKey = anim?.frames?.[0]?.textureKey;
  const sp = scene.add.sprite(x, y, firstKey || undefined).setOrigin(0.5).setDepth(depth);
  if (scale !== 1) sp.setScale(scale);
  if (anim) {
    sp.play(animKey);
    // normalize time scale
    sp.anims.timeScale = 1;
  }
  return sp;
}

// Alternative: deterministic looper that swaps standalone frame textures at fixed intervals
// load frames (if needed) and then cycle them with a TimerEvent (no Phaser Animations involved)
// cfg: { key, urls: string[], msPerFrame=125, x=0, y=0, scale=1, depth=1 }
export function loadAndSpawnMultiImageLooper(scene, cfg){
  const key = cfg.key;
  const urls = cfg.urls || [];
  const msPerFrame = cfg.msPerFrame ?? 125;
  const frameKeys = urls.map((u, i) => `${key}_f${i}`);

  urls.forEach((url, i) => {
    const fk = frameKeys[i];
    if (!scene.textures.exists(fk)) {
      scene.load.image(fk, url);
    }
  });

  return new Promise((resolve) => {
    const spawn = () => {
      const firstKey = frameKeys[0];
      const sp = scene.add.image(cfg.x ?? 0, cfg.y ?? 0, firstKey).setOrigin(0.5).setDepth(cfg.depth ?? 1);
      if (cfg.scale && cfg.scale !== 1) sp.setScale(cfg.scale);
      if (frameKeys.length > 1){
        // Deterministic index from absolute time: no accumulation, no catch-up
        let t0 = performance.now();
        const update = () => {
          const elapsed = performance.now() - t0;
          const idx = Math.floor(elapsed / msPerFrame) % frameKeys.length;
          const key = frameKeys[idx];
          if (sp.texture?.key !== key) sp.setTexture(key);
        };
        scene.events.on('update', update);
        // Reset baseline on scene sleep/wake or page visibility changes
        const reset = () => { t0 = performance.now(); };
        scene.events.on('sleep', reset);
        scene.events.on('wake', reset);
        scene.game.events.on('hidden', reset);
        scene.game.events.on('visible', reset);
        sp.on('destroy', () => {
          scene.events.off('update', update);
          scene.events.off('sleep', reset);
          scene.events.off('wake', reset);
          scene.game.events.off('hidden', reset);
          scene.game.events.off('visible', reset);
        });
      }
      resolve({ sprite: sp, frameKeys });
    };
    if (scene.load.list.size > 0) {
      scene.load.once('complete', spawn);
      scene.load.start();
    } else {
      spawn();
    }
  });
}
