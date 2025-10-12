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

    // Text area
    const textPad = slotPad + slotSize + 16;
    const textWidth = Math.max(200, width - textPad * 2);
    const baseFont = this.cfg.fontSize ?? 18;
    const text = this.scene.add.text(textPad, cY, '', {
      fontSize: `${baseFont}px`,
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      color: '#e5e7eb',
      wordWrap: { width: textWidth },
    }).setOrigin(0, 0.5);

    // Continue hint
    const hint = this.scene.add.text(width - 12, h - 10, '点击或按空格继续 ▶', { fontSize: `${Math.max(12, baseFont - 4)}px`, color: '#9ca3af' }).setOrigin(1, 1);
    hint.setVisible(false);

    // Hit area to advance
    const hit = this.scene.add.zone(0, 0, width, h).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.next());
    this.scene.input.keyboard?.on('keydown-SPACE', () => this.next());
    this.scene.input.keyboard?.on('keydown-ENTER', () => this.next());

    container.add([bg, father, daughter, text, hint, hit]);
    container.setVisible(false);

    this.ui = { container, bg, father, daughter, text, hint, slotSize };
  }

  isActive() { return this.active; }

  start(script, { blocking = true, onComplete } = {}) {
    if (!script || !script.length) { onComplete?.(); return; }
    this.blocking = blocking;
    this.onComplete = onComplete || null;
    this.script = script;
    this.lineIndex = 0;
    this.active = true;
    this.ui.container.setVisible(true);
    if (blocking) this.scene.timerEvent && (this.scene.timerEvent.paused = true);
    this.showLine(0, true);
  }

  applySpeaker(speaker) {
    const color = this.colors[speaker] || '#e5e7eb';
    this.ui.text.setColor(color);
    this.ui.father.setAlpha(speaker === 'father' ? 1 : 0.35);
    this.ui.daughter.setAlpha(speaker === 'daughter' ? 1 : 0.35);
  }

  showLine(index, reset = false) {
    if (!this.script || index < 0 || index >= this.script.length) return this.finish();
    const line = this.script[index];
    this.applySpeaker(line.speaker);
    // Typewriter
    this.currentFullText = line.text || '';
    this.currentShown = '';
    this.ui.text.setText('');
    this.ui.hint.setVisible(false);
    this.typedEvent?.remove(false);
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
    if (this.blocking) this.scene.timerEvent && (this.scene.timerEvent.paused = false);
    const cb = this.onComplete; this.onComplete = null;
    cb && cb();
  }
}

