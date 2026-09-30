// A flock of 250 "sheep" (same shape, same size) that run to the mouse.
// Each one steers with three simple rules (Craig Reynolds' steering behaviours):
//   1. Seek     - head towards the mouse, slowing down as it arrives
//   2. Separate - don't bump into close neighbours
//   3. Align    - roughly match the direction of nearby sheep
// Move the mouse off the canvas and the flock stops and "grazes".
// Works in p5.js 1.x and 2.x.

const NUM_SHEEP = 250;

// Tweak these to change the flock's personality
const MAX_SPEED = 3;       // pixels per frame
const MAX_FORCE = 0.1;     // how sharply a sheep can turn
const SLOW_RADIUS = 100;   // start slowing down this close to the mouse
const SEPARATION = 18;     // personal space in pixels
const NEIGHBOUR = 40;      // how far a sheep looks when aligning

let flock = [];

function setup() {
  createCanvas(800, 500);
  for (let i = 0; i < NUM_SHEEP; i++) {
    flock.push(new Sheep(random(width), random(height)));
  }
}

function draw() {
  background(245);

  let mouseOnCanvas = mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height;
  let target = mouseOnCanvas ? createVector(mouseX, mouseY) : null;

  for (let s of flock) {
    s.flock(flock, target);
    s.update();
    s.display();
  }

  if (mouseOnCanvas) {
    noFill();
    stroke(233, 113, 50);
    strokeWeight(2);
    circle(mouseX, mouseY, 16);
  }
}

class Sheep {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D().mult(random(0.5, 1.5));
    this.acceleration = createVector(0, 0);
    this.size = 6; // same for every sheep
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  // Combine the three rules, each with a weight
  flock(others, target) {
    let separate = this.separate(others).mult(1.8);
    let align = this.align(others).mult(0.5);
    this.applyForce(separate);
    this.applyForce(align);

    if (target) {
      this.applyForce(this.seek(target).mult(1.0));
    } else {
      this.velocity.mult(0.95); // no mouse: slow down and graze
    }
  }

  // Rule 1: steer towards the target, slowing down when close ("arrive")
  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    let d = desired.mag();
    let speed = d < SLOW_RADIUS ? map(d, 0, SLOW_RADIUS, 0, MAX_SPEED) : MAX_SPEED;
    desired.setMag(speed);
    let steer = p5.Vector.sub(desired, this.velocity); // steering = desired - current
    steer.limit(MAX_FORCE);
    return steer;
  }

  // Rule 2: push away from neighbours that are too close (closer = stronger push)
  separate(others) {
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of others) {
      let d = this.position.dist(other.position);
      if (other !== this && d > 0 && d < SEPARATION) {
        let away = p5.Vector.sub(this.position, other.position);
        away.normalize();
        away.div(d);
        sum.add(away);
        count++;
      }
    }
    if (count === 0) return createVector(0, 0);
    sum.setMag(MAX_SPEED);
    let steer = p5.Vector.sub(sum, this.velocity);
    steer.limit(MAX_FORCE * 1.5);
    return steer;
  }

  // Rule 3: steer towards the average direction of nearby sheep
  align(others) {
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of others) {
      let d = this.position.dist(other.position);
      if (other !== this && d < NEIGHBOUR) {
        sum.add(other.velocity);
        count++;
      }
    }
    if (count === 0) return createVector(0, 0);
    sum.setMag(MAX_SPEED);
    let steer = p5.Vector.sub(sum, this.velocity);
    steer.limit(MAX_FORCE);
    return steer;
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(MAX_SPEED);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    // Keep the flock inside the frame
    this.position.x = constrain(this.position.x, 0, width);
    this.position.y = constrain(this.position.y, 0, height);
  }

  // Draw a triangle pointing where the sheep is moving (Week 2: heading + rotate)
  display() {
    push();
    translate(this.position.x, this.position.y);
    rotate(this.velocity.heading());
    noStroke();
    fill(28, 29, 32);
    let s = this.size;
    triangle(-s, -s * 0.6, -s, s * 0.6, s * 1.4, 0);
    pop();
  }
}
