import Phaser from 'phaser';

export default class ResultScene extends Phaser.Scene {
  constructor(){ super('Result'); }
  init(data){ this.dataIn = data || {}; }
  create(){
    const { width, height } = this.scale;
    const { success, score, rating, found, total, levelId, missed = [] } = this.dataIn;

    // Switch to win/fail music
    const musicKey = success ? 'win_music' : 'fail_music';
    const musicUrl = success ? '/audio/win.mp3' : '/audio/fail.mp3';
    const playMusic = () => {
      try { this.sound.stopAll(); } catch(_){}
      const start = () => {
        try {
          const s = this.sound.add(musicKey, { loop:false, volume: 0.6 });
          s.play();
          this.resultMusic = s;
        } catch(_){}
      };
      if (this.sound.locked){ this.sound.once('unlocked', start); } else { start(); }
    };
    const inCache = this.cache.audio?.exists ? this.cache.audio.exists(musicKey) : this.cache.audio?.has?.(musicKey);
    if (!inCache){ this.load.audio(musicKey, musicUrl); this.load.once('complete', playMusic); this.load.start(); }
    else { playMusic(); }
    // 主面板
    const panelW = Math.min(760, Math.floor(width*0.8));
    const panelH = Math.min(520, Math.floor(height*0.8));
    const px = Math.floor((width-panelW)/2);
    const py = Math.floor((height-panelH)/2);
    const bg = this.add.rectangle(px, py, panelW, panelH, 0x111827, 0.95).setOrigin(0);
    bg.setStrokeStyle(2, 0xffffff, 0.2);
    this.add.text(width/2, py+48, success? '任务完成！':'任务失败', { fontSize:36, color:'#e5e7eb' }).setOrigin(0.5);
    this.add.text(width/2, py+96, `得分 ${score}  ·  评级 ${rating}`, { fontSize:22, color:'#10b981' }).setOrigin(0.5);
    this.add.text(width/2, py+128, `已发现 ${found}/${total}`, { fontSize:18, color:'#e5e7eb' }).setOrigin(0.5);

    // 安全知识总结
    const sumPad = 16;
    const sumX = px + sumPad;
    const sumY = py + 160;
    const sumW = panelW - sumPad*2;
    const title = this.add.text(sumX, sumY, '安全知识总结', { fontSize:20, color:'#e5e7eb' });
    const points = [
      '1. 刀具收纳入架，刀口朝下，远离边缘。',
      '2. 灶台用完即关火，阀门二次确认不遗漏。',
      '3. 热油锅离开先关火，再降温，谨防烫伤与起火。',
      '4. 地面有水及时清理，提醒家人注意防滑。',
      '5. 压力罐远离热源、竖直稳固放置，定期检查阀门。',
    ].join('\n');
    this.add.text(sumX, sumY+28, points, { fontSize:16, color:'#cbd5e1', wordWrap:{ width: sumW } });

    // 失败时显示“本次遗漏项”列表
    if (!success && Array.isArray(missed) && missed.length){
      const missTitle = this.add.text(sumX, sumY+28+5*22+12, '本次遗漏项', { fontSize:18, color:'#fca5a5' });
      const missLines = missed.map((m, i) => `${i+1}. ${m.name}`).join('\n');
      this.add.text(sumX, missTitle.y+22, missLines, { fontSize:16, color:'#fca5a5', wordWrap:{ width: sumW } });
    }

    const btnRetry = this.add.text(width/2, py+panelH-40, '再试一次', { fontSize:18, color:'#ffffff', backgroundColor:'#10b981', padding:{x:10,y:6} })
      .setInteractive({useHandCursor:true}).on('pointerup', ()=> window.location.reload());
    btnRetry.setOrigin(0.5);
  }
}
