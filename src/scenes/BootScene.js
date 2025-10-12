import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  preload(){
    // 进度条
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width/2, height/2, 0, 12, 0x10b981).setOrigin(0.5);
    const frame = this.add.rectangle(width/2, height/2, width*0.6, 14, 0xffffff).setOrigin(0.5).setStrokeStyle(2, 0xffffff);
    this.load.on('progress', p => { bar.width = frame.width * p - 4; });
  }
  create(){ this.scene.start('Menu'); }
}
