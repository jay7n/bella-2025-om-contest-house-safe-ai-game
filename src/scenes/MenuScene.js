import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor(){ super('Menu'); }
  create(){
    const { width, height } = this.scale;
    this.add.text(width/2, height*0.3, '家庭安全巡查官', { fontFamily:'system-ui', fontSize: 42, color:'#e5e7eb' }).setOrigin(0.5);
    const btn = this.add.rectangle(width/2, height*0.6, 220, 56, 0x10b981).setInteractive({ useHandCursor:true });
    this.add.text(btn.x, btn.y, '开始教学关', { fontFamily:'system-ui', fontSize: 22, color:'#ffffff' }).setOrigin(0.5);
    btn.on('pointerup', () => this.scene.start('Level', { levelId: 'kitchen' }));
  }
}
