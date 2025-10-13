import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor(){ super('Menu'); }
  create(){
    const { width, height } = this.scale;
    // 标题
    this.add.text(width/2, height*0.22, '家庭安全巡查官（厨房篇）', { fontFamily:'system-ui', fontSize: 42, color:'#e5e7eb' }).setOrigin(0.5);

    // 开始按钮
    const btnW = 220, btnH = 56;
    const btnY = Math.floor(height*0.38) + 50;
    const btn = this.add.rectangle(width/2, btnY, btnW, btnH, 0x10b981).setInteractive({ useHandCursor:true });
    this.add.text(btn.x, btn.y, '开始游戏', { fontFamily:'system-ui', fontSize: 22, color:'#ffffff' }).setOrigin(0.5);
    btn.on('pointerup', () => this.scene.start('Level', { levelId: 'kitchen' }));

    // 规则与操作说明面板（放在按钮下方）
    const panelW = Math.min(560, Math.floor(width*0.9));
    const panelH = 150;
    const px = Math.floor((width - panelW)/2);
    let py = btnY + Math.floor(btnH/2) + 60;
    // if (py + panelH + 24 > height) py = Math.max(Math.floor(height - panelH - 24), btnY + Math.floor(btnH/2) + 8);
    const g = this.add.graphics();
    g.fillStyle(0x0b1220, 0.75);
    g.fillRoundedRect(px, py, panelW, panelH, 12);
    g.lineStyle(2, 0xffffff, 0.15);
    g.strokeRoundedRect(px, py, panelW, panelH, 12);

    const tip = [
      '目标：在时间耗尽前找出所有安全隐患。',
      '移动：方向键（↑↓←→）。',
      '检查：靠近目标后按空格键确认；不在附近按则为误点并扣时。',
      '对话：对话期间空格仅用于推进，不会触发检查。',
      '提示：右下角“提示”按钮可高亮一个未找到的隐患。',
      '评分：根据剩余时间、误点次数计算评级。',
    ].join('\n');
    this.add.text(px+16, py+16, tip, { fontFamily:'system-ui', fontSize: 18, color:'#e5e7eb', wordWrap:{ width: panelW-32 } });

  }
}
