import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import LevelScene from './scenes/LevelScene.js';
import ResultScene from './scenes/ResultScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0f172a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
  render: { pixelArt: true, antialias: false },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, MenuScene, LevelScene, ResultScene],
};

window.addEventListener('load', () => { new Phaser.Game(config); });
