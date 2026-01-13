class Bridge {
  constructor(num, radius, length) {
    this.bodies = []; 
    this.num = num; 
    this.radius = radius; 
    this.length = length;
    this.ropeThickness = 6;
    
    this.lastThumbPos = { x: width/4, y: height/2 };
    this.lastIndexPos = { x: 3*width/4, y: height/2 };
    
    this.initialize();
  }
  
  initialize() {
    for (let i=0; i<this.num; i++) {
      // 为每个桥体添加标签，便于碰撞检测
      this.bodies[i] = Bodies.circle(0, 0, this.radius, {
        label: 'bridge',
        isStatic: false
      });
    }

    this.chains = Composite.create();
    Composite.add(this.chains, this.bodies);
    let options = {
      stiffness: 0.8,
      length: this.length
    }
    Composites.chain(this.chains, 0, 0, 0, 0, options);
    Composite.add(engine.world, [this.chains]);
    
    this.bodies[0].position.x = this.lastThumbPos.x;
    this.bodies[0].position.y = this.lastThumbPos.y;
    this.bodies[this.bodies.length-1].position.x = this.lastIndexPos.x;
    this.bodies[this.bodies.length-1].position.y = this.lastIndexPos.y;
  }
  
  updateEndPoints(thumb, index) {
    const smoothFactor = 0.5;
    
    this.lastThumbPos.x += (thumb.x - this.lastThumbPos.x) * smoothFactor;
    this.lastThumbPos.y += (thumb.y - this.lastThumbPos.y) * smoothFactor;
    this.lastIndexPos.x += (index.x - this.lastIndexPos.x) * smoothFactor;
    this.lastIndexPos.y += (index.y - this.lastIndexPos.y) * smoothFactor;
    
    this.bodies[0].position.x = this.lastThumbPos.x;
    this.bodies[0].position.y = this.lastThumbPos.y;
    this.bodies[this.bodies.length-1].position.x = this.lastIndexPos.x;
    this.bodies[this.bodies.length-1].position.y = this.lastIndexPos.y;
  }
  
  display() {
    stroke(238, 0, 255);
    strokeWeight(this.ropeThickness);
    strokeCap(ROUND);
    
    for (let i=0; i<this.bodies.length-1; i++) {
      let x1 = this.bodies[i].position.x;
      let y1 = this.bodies[i].position.y;
      let x2 = this.bodies[i+1].position.x;
      let y2 = this.bodies[i+1].position.y;
      line(x1, y1, x2, y2);
    }
    
    noStroke();
    fill(238, 0, 255,200);
    
    let firstX = this.bodies[0].position.x;
    let firstY = this.bodies[0].position.y;
    let lastX = this.bodies[this.bodies.length-1].position.x;
    let lastY = this.bodies[this.bodies.length-1].position.y;
    
    ellipse(firstX, firstY, this.radius*2.5, this.radius*2.5);
    ellipse(lastX, lastY, this.radius*2.5, this.radius*2.5);
    
    fill(139, 69, 19, 150);
    ellipse(firstX, firstY, this.radius*1.5, this.radius*1.5);
    ellipse(lastX, lastY, this.radius*1.5, this.radius*1.5);
  }
}