class Particle {
  constructor(x, y, baseColor) {
    this.pos = createVector(x, y);
    
    // 随机方向的粒子迸发
    let angle = random(TWO_PI);
    let speed = random(1, 5);
    this.vel = createVector(cos(angle) * speed, sin(angle) * speed);
    
    // 随机大小的弥散粒子
    this.size = random(1.5, 6);
    
    // 基于星星颜色的随机颜色变化
    this.color = color(
      red(baseColor) + random(-50, 50),
      green(baseColor) + random(-50, 50),
      blue(baseColor) + random(-50, 50),
      255 
    );
    
    // 生命周期
    this.lifespan = 255;
    this.decay = random(3, 8);
    
    // 随机旋转
    this.angle = 0;
    this.rotationSpeed = random(-0.1, 0.1);
  }
  
  update() {
    // 更新位置
    this.pos.add(this.vel);
    
    // 添加重力效果
    this.vel.y += 0.05;
    
    // 减少速度
    this.vel.mult(0.98);
    
    // 更新旋转
    this.angle += this.rotationSpeed;
    
    // 减少生命周期
    this.lifespan -= this.decay;
    
    // 更新颜色透明度
    this.color.setAlpha(this.lifespan);
  }
  
  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    
    noStroke();
    fill(this.color);
    
    // 绘制粒子
    if (random() > 0.5) {
      ellipse(0, 0, this.size, this.size);
    } else {
      rectMode(CENTER);
      rect(0, 0, this.size, this.size);
    }
    
    pop();
  }
  
  isDead() {
    return this.lifespan <= 0;
  }
}