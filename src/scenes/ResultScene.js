import Phaser from 'phaser';

export default class ResultScene extends Phaser.Scene {
  constructor(){ super('Result'); }
  init(data){ this.dataIn = data || {}; }
  create(){
    const { width, height } = this.scale;
    const { success, score, rating, found, total, levelId } = this.dataIn;
    this.add.rectangle(width/2, height/2, width*0.7, height*0.6, 0x111827).setStrokeStyle(2, 0xffffff, 0.2);
    this.add.text(width/2, height*0.32, success? '任务完成！':'任务失败', { fontSize:36, color:'#e5e7eb' }).setOrigin(0.5);
    this.add.text(width/2, height*0.45, `得分 ${score}  ·  评级 ${rating}`, { fontSize:22, color:'#10b981' }).setOrigin(0.5);
    this.add.text(width/2, height*0.54, `已发现 ${found}/${total}`, { fontSize:18, color:'#e5e7eb' }).setOrigin(0.5);

    const btnRetry = this.add.text(width/2, height*0.66, '再试一次', { fontSize:18, color:'#ffffff', backgroundColor:'#10b981', padding:{x:10,y:6} })
      .setInteractive({useHandCursor:true}).on('pointerup', ()=> this.scene.start('Level', { levelId }));
    const btnMenu = this.add.text(width/2, height*0.76, '返回菜单', { fontSize:16, color:'#e5e7eb' })
      .setInteractive({useHandCursor:true}).on('pointerup', ()=> this.scene.start('Menu'));
    btnRetry.setOrigin(0.5); btnMenu.setOrigin(0.5);
  }
}
