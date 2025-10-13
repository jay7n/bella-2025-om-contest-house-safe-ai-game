import Phaser from 'phaser';

export default class DialogueManager {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg || {};
    this.active = false;
    this.lineIndex = 0;
    this.onComplete = null;
    this.typedEvent = null;
    this.currentFullText = '';
    this.currentShown = '';
    this.colors = {
      father: this.cfg.fatherColor || '#3b82f6',
      daughter: this.cfg.daughterColor || '#ec4899',
    };
    this.names = Object.assign({ father: '爸爸', daughter: '诺诺' }, this.cfg.names || {});
    this.buildUI();
  }

  buildUI() {
    const { width, height } = this.scene.scale;
    const ratio = (this.cfg.heightRatio ?? 0.24);
    const h = Math.max(100, Math.floor(height * ratio));
    const y0 = height - h;

    const container = this.scene.add.container(0, y0).setDepth(10);
    const bg = this.scene.add.rectangle(0, 0, width, h, 0x0b1220, 0.7).setOrigin(0);
    bg.setStrokeStyle(2, 0xffffff, 0.15);

    // Portrait slots
    const slotPad = 12;
    const slotSize = Math.min(160, Math.floor(h * 0.8));
    const lX = slotPad + slotSize / 2;
    const rX = width - slotPad - slotSize / 2;
    const cY = h / 2;

    const fatherKey = 'portrait_father';
    const daughterKey = 'portrait_daughter';
    const father = this.scene.add.image(lX, cY, fatherKey).setOrigin(0.5).setDisplaySize(slotSize, slotSize).setAlpha(0.35);
    const daughter = this.scene.add.image(rX, cY, daughterKey).setOrigin(0.5).setDisplaySize(slotSize, slotSize).setAlpha(0.35);
    // Name labels under portraits
    const nameYOffset = (this.cfg.nameOffsetY ?? 3); // push a bit downward to avoid visual ascender clipping
    const nameY = Math.min(h - 10, Math.floor(cY + slotSize/2 + 12 + nameYOffset));
    const nameFont = Math.max(12, (this.cfg.fontSize ?? 18) - 2);
    // 默认用白色；可通过 cfg.nameColorActive/nameColorIdle 覆盖
    const nameIdle = this.cfg.nameColorIdle || '#e5e7eb';
    const nameStyle = { fontSize: `${nameFont}px`, color: nameIdle, padding: { x: 2, y: 3 } };
    // 朝内侧微移，靠近中间一些
    const inward = (this.cfg.nameInwardPx != null) ? this.cfg.nameInwardPx : Math.max(80, Math.floor(slotSize * 0.3));
    const fatherNameX = lX + inward;
    const daughterNameX = rX - inward;
    const fatherName = this.scene.add.text(fatherNameX, nameY, this.names.father || '爸爸', nameStyle).setOrigin(0.5).setAlpha(0.9);
    const daughterName = this.scene.add.text(daughterNameX, nameY, this.names.daughter || '诺诺', nameStyle).setOrigin(0.5).setAlpha(0.9);

    // Text area: unified centered text
    const textPad = slotPad + slotSize + 16;
    const textWidth = Math.max(200, width - textPad * 2);
    const baseFont = this.cfg.fontSize ?? 18;
    const centerX = Math.floor(width / 2);
    const text = this.scene.add.text(centerX, cY, '', {
      fontSize: `${baseFont}px`,
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      color: '#e5e7eb',
      align: 'center',
      wordWrap: { width: textWidth },
    }).setOrigin(0.5, 0.5).setVisible(true);

    // Continue hint（移至底部居中）
    const hint = this.scene.add.text(Math.floor(width/2), h - 10, '按空格继续 ▶', { fontSize: `${Math.max(12, baseFont - 4)}px`, color: '#9ca3af' }).setOrigin(0.5, 1);
    hint.setVisible(false);

    // Hit area to advance (with guard to avoid advancing immediately on the same key that opened dialogue)
    const hit = this.scene.add.zone(0, 0, width, h).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => { if (this.canAdvance()) this.next(); else console.info('[DLG guard] pointer ignored'); });
    this.scene.input.keyboard?.on('keydown-SPACE', () => { if (this.canAdvance()) this.next(); else console.info('[DLG guard] space ignored'); });
    this.scene.input.keyboard?.on('keydown-ENTER', () => { if (this.canAdvance()) this.next(); else console.info('[DLG guard] enter ignored'); });

    container.add([bg, father, daughter, fatherName, daughterName, text, hint, hit]);
    container.setVisible(false);

    // cache layout helpers
    const rightTextX = width - textPad; // reserved for future side alignment
    this.ui = { container, bg, father, daughter, fatherName, daughterName, text, hint, slotSize, textPad, textWidth, rightTextX, centerX };
  }

  isActive() { return this.active; }

  start(script, { id = null, blocking = true, onComplete } = {}) {
    if (!script || !script.length) { onComplete?.(); return; }
    this.id = id;
    this.blocking = blocking;
    this.onComplete = onComplete || null;
    this.script = script;
    this.lineIndex = 0;
    this.active = true;
    this.ui.container.setVisible(true);
    if (blocking) this.scene.timerEvent && (this.scene.timerEvent.paused = true);
    // Set an advance guard window to ignore the same input that triggered opening
    this._guardUntil = performance.now() + (this.cfg.advanceGuardMs ?? 140);
    this.showLine(0, true);
  }

  canAdvance(){
    if (!this.active) return false;
    if (typeof performance !== 'undefined' && this._guardUntil != null){
      const now = performance.now();
      if (now < this._guardUntil) return false;
    }
    return true;
  }

  applySpeaker(speaker) {
    const color = this.colors[speaker] || '#e5e7eb';
    const nameIdle = this.cfg.nameColorIdle || '#e5e7eb';
    const nameActive = this.cfg.nameColorActive || '#e5e7eb';
    const { text, centerX } = this.ui;
    // set color
    text.setColor(color);
    // portrait highlight + name highlight
    const fActive = speaker === 'father';
    const dActive = speaker === 'daughter';
    this.ui.father.setAlpha(fActive ? 1 : 0.35);
    this.ui.daughter.setAlpha(dActive ? 1 : 0.35);
    this.ui.fatherName.setAlpha(fActive ? 1 : 0.9).setColor(fActive ? nameActive : nameIdle);
    this.ui.daughterName.setAlpha(dActive ? 1 : 0.9).setColor(dActive ? nameActive : nameIdle);
    // unified centered layout
    text.setStyle({ align: 'center' });
    text.setOrigin(0.5, 0.5);
    text.setX(centerX);
  }

  showLine(index, reset = false) {
    if (!this.script || index < 0 || index >= this.script.length) return this.finish();
    const line = this.script[index];
    this.applySpeaker(line.speaker);
    try { console.info('[DLG line]', { id: this.id, index, speaker: line.speaker, text: line.text }); } catch(_) {}
    // Emit an event for scene-level triggers
    try { this.scene.events.emit('dialogue_line', { id: this.id, index, line }); } catch(_) {}
    // Typewriter
    this.currentFullText = line.text || '';
    this.currentShown = '';
    this.ui.hint.setVisible(false);
    this.typedEvent?.remove(false);

    // Typewriter unified
    this.ui.text.setText('');
    let i = 0;
    const step = () => {
      if (!this.active) return;
      if (i >= this.currentFullText.length) { this.ui.hint.setVisible(true); return; }
      this.currentShown += this.currentFullText[i];
      this.ui.text.setText(this.currentShown);
      i++;
    };
    this.typedEvent = this.scene.time.addEvent({ delay: 24, loop: true, callback: step });
  }

  next() {
    if (!this.active) return;
    if (this.currentShown !== this.currentFullText) {
      // fast-forward current line
      this.currentShown = this.currentFullText;
      this.ui.text.setText(this.currentFullText);
      this.ui.hint.setVisible(true);
      return;
    }
    this.lineIndex++;
    if (this.lineIndex >= this.script.length) return this.finish();
    this.showLine(this.lineIndex);
  }

  finish() {
    this.active = false;
    this.ui.container.setVisible(false);
    this.typedEvent?.remove(false);
    // Clear mask (none in centered mode)
    this.ui.text.setMask(null);
    if (this.blocking) this.scene.timerEvent && (this.scene.timerEvent.paused = false);
    const cb = this.onComplete; this.onComplete = null;
    cb && cb();
  }
}
