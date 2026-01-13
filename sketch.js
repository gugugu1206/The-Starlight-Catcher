let handPose;
let video;
let hands = [];

const THUMB_TIP = 4;
const INDEX_FINGER_TIP = 8;

// Matter.js
const { Engine, Body, Bodies, Composite, Composites, Constraint, Vector, Events } = Matter;
let engine;
let bridge;
let num = 8;
let radius = 10;
let length = 25;
let stars = [];
let particles = [];
let maxStars = 50;

let isTossing = false;
let frameSkip = 0;

// 点阵参数
let dotMatrix = [];
let dotSize = 3;
let dotSpacing = 35;
let dotAlpha = 40;

// 波动效果相关变量
let waveEffects = [];

// ==================== 音效系统核心变量 ====================
let audioContext;
let soundEnabled = false; // 总开关
let backgroundSynth;
let arpeggioNotes = [
    'C4', 'E4', 'F4', 'C5',
    'B4', 'E4', 'F4', 'B4',
    'A4', 'C5', 'E5', 'A5',
    'F4', 'A4', 'C5', 'F5',
    'E5', 'C5', 'G4', 'E4'
];
let currentArpNote = 0;
let lastArpTime = 0;
let arpInterval = 900; 
let arpVolume = 0.05; 

// 星星掉落音效相关
let lastStarFallTime = 0;
let starFallSoundCooldown = 300;
// ========================================================

function preload() {
  handPose = ml5.handPose({ maxHands: 1, flipped: true });
}

function setup() {
  createCanvas(800, 600);
  video = createCapture(VIDEO, { flipped: true });
  video.size(800, 600);
  video.hide();
  handPose.detectStart(video, gotHands);

  engine = Engine.create();
  engine.gravity.scale = 0.001;
  bridge = new Bridge(num, radius, length);

  // 初始化白色点阵
  createDotMatrix();
  
  // 初始化音效系统
  initAudioSystem();

  // 监听碰撞事件
  Events.on(engine, 'collisionStart', function (event) {
    let pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
      let pair = pairs[i];
      let star = null;
      let bridgeBody = null;

      // 查找碰撞的星星
      for (let s of stars) {
        if (s.body === pair.bodyA || s.body === pair.bodyB) {
          star = s;
          bridgeBody = (pair.bodyA === s.body) ? pair.bodyB : pair.bodyA;
          break;
        }
      }

      if (star && bridgeBody && bridgeBody.label === 'bridge') {
        // 星星接触绳子后变色
        star.changeColor();
        
        // 播放绳子碰撞音效（根据碰撞力度）
        let collisionForce = constrain(pair.collision.depth * 2, 0.5, 3.0);
        playRopeCollision(collisionForce);
        
        // 创建白色点阵波动效果
        createWaveEffect(pair.collision.supports[0].x, pair.collision.supports[0].y, star.r);
        
        // 记录碰撞时间用于果冻效果
        star.lastCollisionTime = millis();
        star.collisionForce = collisionForce;
      }
    }
  });

  // 添加点击/按键事件来启用音频（浏览器要求）
  canvas.addEventListener('click', enableAudio);
  document.addEventListener('keydown', enableAudio);
}

function draw() {
  frameSkip++;
  if (frameSkip % 2 !== 0) return;

  background(220);
  Engine.update(engine);
  
  // 绘制视频
  image(video, 0, 0, width, height);
  
  // 更新波动效果
  updateWaveEffects();
  
  // 绘制白色点阵图层
  drawDotMatrix();

  // 生成新星星
  if (random() < 0.084 && stars.length < maxStars) {
    stars.push(new Star());
    
    // 播放星星掉落声音
    if (soundEnabled && millis() - lastStarFallTime > starFallSoundCooldown) {
      playStarFall();
      lastStarFallTime = millis();
    }
  }

  // ==================== 播放背景音乐（琶音） ====================
  if (soundEnabled && backgroundSynth && millis() - lastArpTime > arpInterval) {
    let note = arpeggioNotes[currentArpNote];
    backgroundSynth.play(note, arpVolume, 0, arpInterval * 0.8 / 1000);
    currentArpNote = (currentArpNote + 1) % arpeggioNotes.length;
    lastArpTime = millis();
  }
  // =============================================================

  // 处理手势和绳子
  if (hands.length > 0) {
    let thumb = hands[0].keypoints[THUMB_TIP];
    let index = hands[0].keypoints[INDEX_FINGER_TIP];
    
    bridge.updateEndPoints(thumb, index);
    
    fill(67, 56, 202);
    noStroke();
    circle(thumb.x, thumb.y, 12);
    circle(index.x, index.y, 12);
    
    fill(255, 215, 0);
    circle(thumb.x, thumb.y, 6);
    circle(index.x, index.y, 6);
  }

  // 绘制桥
  bridge.display();

  // 更新和绘制星星
  for (let i = stars.length - 1; i >= 0; i--) {
    stars[i].checkDone();
    stars[i].display();
    
    if (stars[i].done) {
      stars[i].removeCircle();
      stars.splice(i, 1);
    }
  }

  // 更新和绘制弥散粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  // 显示提示信息
  if (!soundEnabled) {
    fill(255, 255, 255, 200);
    rect(10, 10,180, 30, 5);
    fill(0, 0, 0);
    textSize(12);
    text('点击页面或按任意键启用音效', 18, 30);
  }
}

// ==================== 白色点阵相关函数 ====================

function createDotMatrix() {
  dotMatrix = [];
  
  // 计算需要的行数和列数
  let cols = Math.ceil(width / dotSpacing) + 1;
  let rows = Math.ceil(height / dotSpacing) + 1;
  
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * dotSpacing;
      let y = j * dotSpacing;
      
      // 添加一些随机偏移
      let offsetX = random(-2, 2);
      let offsetY = random(-2, 2);
      
      dotMatrix.push({
        baseX: x + offsetX,
        baseY: y + offsetY,
        x: x + offsetX,
        y: y + offsetY,
        size: dotSize,
        alpha: dotAlpha,
        waveOffset: 0,
        wavePhase: random(TWO_PI)
      });
    }
  }
}

function drawDotMatrix() {
  noStroke();
  
  for (let dot of dotMatrix) {
    // 计算波动效果
    let totalWaveOffset = 0;
    for (let wave of waveEffects) {
      let distance = dist(dot.baseX, dot.baseY, wave.x, wave.y);
      if (distance < wave.radius) {
        let waveStrength = (1 - distance / wave.radius) * wave.strength;
        totalWaveOffset += sin(dot.wavePhase + millis() * 0.01) * waveStrength;
      }
    }
    
    // 应用波动偏移
    dot.waveOffset = lerp(dot.waveOffset, totalWaveOffset, 0.1);
    let currentX = dot.baseX + sin(dot.wavePhase) * dot.waveOffset;
    let currentY = dot.baseY + cos(dot.wavePhase) * dot.waveOffset;
    
    fill(255, 255, 255, dot.alpha);
    circle(currentX, currentY, dot.size);
  }
}

function createWaveEffect(x, y, starSize) {
  waveEffects.push({
    x: x,
    y: y,
    radius: starSize * 6, // 波动半径
    strength: 6, // 波动强度
    startTime: millis(),
    duration: 1500 // 1.5秒持续时间
  });
}

function updateWaveEffects() {
  let currentTime = millis();
  
  for (let i = waveEffects.length - 1; i >= 0; i--) {
    let wave = waveEffects[i];
    let elapsed = currentTime - wave.startTime;
    
    if (elapsed > wave.duration) {
      waveEffects.splice(i, 1);
    } else {
      // 波动强度随时间衰减
      wave.strength = 6 * (1 - elapsed / wave.duration);
    }
  }
}

// ==================== 音效核心函数ai辅助 ====================

function initAudioSystem() {
  try {
    // 创建音频上下文
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('音效系统初始化成功，等待用户交互...');
  } catch (error) {
    console.log('浏览器不支持Web Audio API');
  }
}

function enableAudio() {
  if (soundEnabled) return;
  
  if (audioContext) {
    // 恢复音频上下文
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    soundEnabled = true;
    console.log('音效已启用');
    
    // 初始化背景音乐合成器
    backgroundSynth = new p5.PolySynth();
    if (backgroundSynth.audiovoice) {
      backgroundSynth.audiovoice.oscillator.type = 'sine'; // 使用正弦波基础音色
    }
    
    // 移除事件监听器
    canvas.removeEventListener('click', enableAudio);
    document.removeEventListener('keydown', enableAudio);
  }
}

// 播放星星掉落声音
function playStarFall() {
  if (!soundEnabled || !audioContext) return;
  
  try {
    // 主音
    let oscillator1 = audioContext.createOscillator();
    let gainNode1 = audioContext.createGain();
    
    oscillator1.type = 'sine';
    let startFreq = 800; 
    oscillator1.frequency.value = startFreq;
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    // 音量包络：快速淡入，中速淡出
    let now = audioContext.currentTime;
    let starVolume = 0.10;
    gainNode1.gain.setValueAtTime(0, now);
    gainNode1.gain.linearRampToValueAtTime(starVolume, now + 0.05);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, now + 1.2); 
    
    // 频率滑落，制造bling的坠落感
    oscillator1.frequency.setValueAtTime(startFreq, now);
    oscillator1.frequency.exponentialRampToValueAtTime(500, now + 0.8);
    
    // 添加一个短促的高八度和声，增加层次感
    setTimeout(() => {
      try {
        let oscillator2 = audioContext.createOscillator();
        let gainNode2 = audioContext.createGain();
        
        oscillator2.type = 'triangle';
        oscillator2.frequency.value = startFreq * 2; // 高八度
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        let later = audioContext.currentTime;
        gainNode2.gain.setValueAtTime(0, later);
        gainNode2.gain.linearRampToValueAtTime(starVolume * 0.5, later + 0.02); 
        gainNode2.gain.exponentialRampToValueAtTime(0.001, later + 0.3);
        
        oscillator2.start(later);
        oscillator2.stop(later + 0.5);
      } catch (e) {
      }
    }, 100);
    
    oscillator1.start(now);
    oscillator1.stop(now + 1.5);
    
  } catch (error) {
  }
}

// 播放绳子碰撞声音
function playRopeCollision(force = 1.0) {
  if (!soundEnabled || !audioContext) return;

  try {
    let baseFreq = 380 + (force * 80); 
    let now = audioContext.currentTime;
    let ropeVolume = 0.30; 

    let oscillator = audioContext.createOscillator();
    let gainNode = audioContext.createGain();

    oscillator.type = 'sine'; 
    oscillator.frequency.value = baseFreq;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    let attackTime = 0.003;
    let decayTime = 0.3 + (force * 0.05);
    let sustainLevel = 0.0; 

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(ropeVolume, now + attackTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime); 
    
    let totalDuration = attackTime + decayTime;

    oscillator.frequency.setValueAtTime(baseFreq, now);
    oscillator.frequency.linearRampToValueAtTime(baseFreq * 1.15, now + attackTime);
    oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.70, now + attackTime + (decayTime * 0.2));
    oscillator.frequency.setValueAtTime(baseFreq * 0.70, now + attackTime + (decayTime * 0.3));
    oscillator.frequency.linearRampToValueAtTime(baseFreq * 0.85, now + attackTime + (decayTime * 0.5));
    oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.60, now + totalDuration);

    oscillator.start(now);
    oscillator.stop(now + totalDuration + 0.05); 

  } catch (error) {
    console.error("播放Q弹音效失败:", error);
  }
}

// ==================== 其他功能函数 ====================

// 全局函数：创建弥散粒子效果
window.createParticles = function (x, y, baseColor) {
  let particleCount = 13;
  
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(x, y, baseColor));
  }
};

function gotHands(results) {
  hands = results;
}

function keyPressed() {
  if (key === ' ' && !isTossing) {
    isTossing = true;
    
    // 添加闪光效果
    background(255, 240, 180, 150);
    
    // 将所有星星向上抛
    stars.forEach(star => {
      star.toss();
    });
    
    // 延时重置状态
    setTimeout(() => {
      isTossing = false;
    }, 2000);
  }

}