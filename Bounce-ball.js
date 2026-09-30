/* ============================================================
   Mathematical Practice in Computing — Week 1: Vectors
   From vector maths to a simple physics engine in p5.js

   Paste this whole file into the p5.js Web Editor (sketch.js).
   Press 1–8 to switch between scenes. Everything from the slides
   is here, in the same order as the lecture:

     1  Bouncing ball with separate x, y, vx, vy   (slide 8)
     2  Vector maths: add, subtract, scale, magnitude, normalise
                                                   (slides 11–15)
     3  One Particle + gravity, launch by dragging (slides 16–25)
     4  Mass: same force, different acceleration   (slides 18, 23)
     5  "Make the system misbehave" challenge      (slide 26)
     6  From one particle to many                  (slide 27)
     7  Vector field: F(x, y) returns a vector     (slide 28)
     8  Attraction: normalise, then multiply       (slides 15, 17)

   Keys (work in every scene):
     G  gravity on/off          R  reverse gravity
     + / -  gravity strength    W  wind on/off
     D  drag on/off             A  reset acceleration each frame on/off
     M  gravity scales with mass (F = m g)   V  show velocity/acceleration
     T  trails                  F  field arrows (scene 7)
     Space  reset scene         H  hide/show the help panel
   Mouse:
     Scenes 3 and 5: press, drag, release to launch a particle
                     (launch velocity = release − press, a subtraction!)
     Scene 6: click to add particles     Scene 8: hold mouse to repel
   ============================================================ */

let mode = 1;
let ball;                 // scene 1: plain variables, no vectors
let particles = [];
let launchStart = null;   // where a drag-launch began
let hudVisible = true;
const HUD_H = 92;

// Settings that the keys toggle. Each scene loads its own preset.
const opt = {};

const SCENES = {
  1: {
    name: "Bouncing ball: separate x, y, vx, vy",
    hint: "It works... until we want gravity, wind, drag or attraction. Move to scene 3 to see the vector version."
  },
  2: {
    name: "Vector maths (move the mouse)",
    hint: "Add: head to tail. Subtract: displacement between two positions. Scale: same direction, new length. Normalise: length 1."
  },
  3: {
    name: "A single Particle: position, velocity, acceleration",
    hint: "Drag and release to launch. Green = velocity (x10), red = acceleration (x100). Sketch first, then predict the next frame."
  },
  4: {
    name: "Mass: same force, different acceleration (a = F / m)",
    hint: "The same wind force pushes all four particles. Heavier ones accelerate less. Try G, then M to compare gravity as a force vs F = m g."
  },
  5: {
    name: "Challenge: make the system misbehave",
    hint: "Predict, then press: + (stronger gravity), R (reverse), W (wind), A (remove the acceleration reset!), drag-launch for initial velocity."
  },
  6: {
    name: "From one particle to many: simple rules, collective behaviour",
    hint: "100 independent Particles, same rules. Click to add more. Toggle G, W, D, R to change the environment for all of them."
  },
  7: {
    name: "Vector field: force = (sin(y*0.01), cos(x*0.01))",
    hint: "Each particle samples the field at its own position. F toggles the arrows, T toggles the trails."
  },
  8: {
    name: "Attraction: direction = target − position, normalise, then scale",
    hint: "Every particle gets a force of fixed strength toward the mouse. Hold the mouse button to reverse it."
  }
};

/* ---------------- p5 lifecycle ---------------- */

function setup() {
  createCanvas(min(windowWidth, 1100), min(windowHeight, 700));
  textFont("monospace");
  initScene();
}

function windowResized() {
  resizeCanvas(min(windowWidth, 1100), min(windowHeight, 700));
  initScene();
}

function draw() {
  // Scene 7 leaves soft trails by only partly clearing the canvas.
  if (mode === 7 && opt.trails) background(245, 40);
  else background(245);

  switch (mode) {
    case 1: runBouncingBall(); break;
    case 2: runVectorMaths(); break;
    case 3:
    case 4:
    case 5:
    case 6: runParticleScene(); break;
    case 7: runVectorField(); break;
    case 8: runAttraction(); break;
  }

  drawLaunchArrow();
  if (hudVisible) drawHUD();
}

/* ---------------- Scene setup and presets ---------------- */

function preset(overrides) {
  Object.assign(opt, {
    gravity: false, gravityMult: 1, reverse: false,
    wind: false, windStrength: 0.05,
    drag: false, resetAcc: true, massGravity: false,
    trails: true, vectors: false, field: true
  }, overrides);
}

function initScene() {
  particles = [];
  launchStart = null;
  const top = hudVisible ? HUD_H + 30 : 40;

  switch (mode) {
    case 1:
      preset({});
      ball = { x: 100, y: 130, vx: 3, vy: 2 };
      break;

    case 2:
      preset({});
      break;

    case 3:
      preset({ gravity: true, vectors: true });
      particles.push(new Particle(width / 2, top, 1));
      break;

    case 4:
      preset({ wind: true, windStrength: 0.1, vectors: true, trails: true });
      // Four particles stacked on the left, masses 1, 2, 4, 8.
      [1, 2, 4, 8].forEach((m, i) => {
        const y = top + 40 + i * ((height - top - 80) / 3);
        particles.push(new Particle(40, y, m));
      });
      break;

    case 5:
      preset({ gravity: true, vectors: true });
      [1, 2, 4, 8].forEach((m, i) => {
        particles.push(new Particle(width * (0.2 + i * 0.2), top, m));
      });
      break;

    case 6:
      preset({ gravity: true, wind: true, trails: false });
      for (let i = 0; i < 100; i++) {
        particles.push(new Particle(random(width), random(height), random(1, 4)));
      }
      break;

    case 7:
      preset({ trails: true, field: true });
      for (let i = 0; i < 500; i++) {
        const p = new Particle(random(width), random(height), 1);
        p.r = 2.5; p.trailLen = 0; p.speedColour = true;
        particles.push(p);
      }
      background(245);
      break;

    case 8:
      preset({ trails: false });
      for (let i = 0; i < 250; i++) {
        const p = new Particle(random(width), random(height), 1);
        p.r = 3; p.trailLen = 0; p.speedColour = true;
        p.velocity = p5.Vector.random2D().mult(random(0.5, 2));
        particles.push(p);
      }
      break;
  }
}

/* ---------------- The Particle class (slide 24, plus display) ---------------- */

class Particle {
  constructor(x, y, mass = 1) {
    this.position = createVector(x, y);
    this.velocity = createVector(0, 0);
    this.acceleration = createVector(0, 0);
    this.mass = mass;

    // Extra bits for drawing only
    this.r = 6 + 4 * sqrt(mass);
    this.lastAcc = createVector(0, 0);
    this.history = [];
    this.trailLen = 40;
    this.speedColour = false;
    this.col = color(
      random(30, 200), random(60, 160), random(120, 230)
    );
  }

  // F = m a  ->  a = F / m
  // p5.Vector.div is the STATIC form: it returns a new vector,
  // so the original force is untouched.
  applyForce(force) {
    const f = p5.Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  // acceleration changes velocity; velocity changes position
  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);

    this.lastAcc = this.acceleration.copy(); // remember it so we can draw it
    if (opt.resetAcc) {
      this.acceleration.mult(0);             // forget last frame's forces
    }

    if (this.trailLen > 0) {
      this.history.push(this.position.copy());
      if (this.history.length > this.trailLen) this.history.shift();
    }
  }

  // Bounce off the walls (reverse one component, like slide 8)
  edges() {
    const bounce = 0.92;
    if (this.position.x > width - this.r) {
      this.position.x = width - this.r; this.velocity.x *= -bounce;
    } else if (this.position.x < this.r) {
      this.position.x = this.r; this.velocity.x *= -bounce;
    }
    if (this.position.y > height - this.r) {
      this.position.y = height - this.r; this.velocity.y *= -bounce;
    } else if (this.position.y < this.r) {
      this.position.y = this.r; this.velocity.y *= -bounce;
    }
  }

  // Reappear on the opposite side
  wrap() {
    if (this.position.x > width) this.position.x = 0;
    if (this.position.x < 0) this.position.x = width;
    if (this.position.y > height) this.position.y = 0;
    if (this.position.y < 0) this.position.y = height;
  }

  display() {
    // trail
    if (opt.trails && this.history.length > 1) {
      noFill();
      for (let i = 1; i < this.history.length; i++) {
        const a = map(i, 0, this.history.length, 0, 140);
        stroke(red(this.col), green(this.col), blue(this.col), a);
        strokeWeight(2);
        line(this.history[i - 1].x, this.history[i - 1].y,
             this.history[i].x, this.history[i].y);
      }
    }

    // body
    if (this.speedColour) {
      const t = constrain(this.velocity.mag() / 4, 0, 1);
      fill(lerpColor(color(40, 110, 220), color(235, 80, 90), t));
      noStroke();
    } else {
      fill(this.col);
      stroke(30, 60);
      strokeWeight(1);
    }
    circle(this.position.x, this.position.y, this.r * 2);

    // mass label on heavier particles
    if (this.r > 9) {
      noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(11);
      text("m=" + this.mass, this.position.x, this.position.y);
    }

    if (opt.vectors) this.showVectors();
  }

  showVectors() {
    // velocity in green (scaled x10), acceleration in red (scaled x100)
    drawArrow(this.position, p5.Vector.mult(this.velocity, 10), color(30, 160, 80), 2);
    drawArrow(this.position, p5.Vector.mult(this.lastAcc, 100), color(210, 50, 60), 2);
  }
}

/* ---------------- Forces (slides 17, 21, 22) ---------------- */

function applyEnvironment(p) {
  if (opt.gravity) {
    const g = createVector(0, 0.1 * opt.gravityMult * (opt.reverse ? -1 : 1));
    if (opt.massGravity) g.mult(p.mass);   // weight = m g, so acceleration is the same for all
    p.applyForce(g);
  }
  if (opt.wind) {
    p.applyForce(createVector(opt.windStrength, 0));
  }
  if (opt.drag) {
    // drag pushes against velocity: F = -c v
    const drag = p.velocity.copy().mult(-0.03);
    p.applyForce(drag);
  }
}

/* ---------------- Scene 1: bouncing ball ---------------- */

function runBouncingBall() {
  // Slide 8, verbatim idea: separate variables and reversing a component.
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x < 15 || ball.x > width - 15) ball.vx *= -1;
  if (ball.y < 15 || ball.y > height - 15) ball.vy *= -1;
  ball.x = constrain(ball.x, 15, width - 15);
  ball.y = constrain(ball.y, 15, height - 15);

  noStroke(); fill(60, 120, 220);
  circle(ball.x, ball.y, 30);

  fill(40); textAlign(LEFT, TOP); textSize(14);
  const yy = height - 150;
  text(
    "let x = 100, y = 100;\n" +
    "let vx = 3,  vy = 2;\n\n" +
    "x += vx;  y += vy;\n" +
    "// bounce = reverse one component\n\n" +
    "x=" + nf(ball.x, 1, 1) + "  y=" + nf(ball.y, 1, 1) +
    "   vx=" + ball.vx + "  vy=" + ball.vy,
    20, yy
  );
}

/* ---------------- Scene 2: vector maths ---------------- */

function runVectorMaths() {
  const y0 = hudVisible ? HUD_H : 0;
  const w = width / 2;
  const h = (height - y0) / 2;
  const mouse = createVector(mouseX, mouseY);
  const lim = min(w, h) * 0.38;

  // panel dividers
  stroke(210); strokeWeight(1);
  line(w, y0, w, height);
  line(0, y0 + h, width, y0 + h);

  const centres = [
    createVector(w * 0.5, y0 + h * 0.5),
    createVector(w * 1.5, y0 + h * 0.5),
    createVector(w * 0.5, y0 + h * 1.5),
    createVector(w * 1.5, y0 + h * 1.5)
  ];

  // The mouse steers one vector in each panel: (mouse - panel centre), limited in length.
  const steer = (c) => p5.Vector.sub(mouse, c).limit(lim);

  // --- Top left: addition (a.add(b)) ---
  {
    const c = centres[0];
    const a = createVector(lim * 0.7, -lim * 0.35);
    const b = steer(c);
    const o = createVector(c.x - lim * 0.4, c.y + lim * 0.3);
    const sum = p5.Vector.add(a, b);          // static form: a and b are unchanged
    drawArrow(o, a, color(50, 110, 220), 3);
    drawArrow(p5.Vector.add(o, a), b, color(240, 140, 30), 3);
    drawArrow(o, sum, color(150, 60, 190), 3);
    panelLabel("ADD: a + b (head to tail)", c.x, y0 + 8 + 0 * h);
    caption("a (blue) + b (orange, follows mouse) = purple\n"
      + "sum = (" + nf(sum.x, 1, 0) + ", " + nf(sum.y, 1, 0) + ")", 10, y0 + h - 34);
  }

  // --- Top right: subtraction (p5.Vector.sub) ---
  {
    const c = centres[1];
    const position = createVector(c.x - lim * 0.6, c.y + lim * 0.3);
    const target = p5.Vector.add(c, steer(c));
    const direction = p5.Vector.sub(target, position);
    noStroke(); fill(50, 110, 220); circle(position.x, position.y, 12);
    fill(240, 140, 30); circle(target.x, target.y, 12);
    drawArrow(position, direction, color(150, 60, 190), 3);
    noStroke(); fill(50, 110, 220); textAlign(CENTER); textSize(12);
    text("position", position.x, position.y + 20);
    fill(240, 140, 30); text("target", target.x, target.y - 12);
    panelLabel("SUBTRACT: target − position", c.x, y0 + 8);
    caption("displacement = (" + nf(direction.x, 1, 0) + ", " + nf(direction.y, 1, 0) + ")",
      w + 10, y0 + h - 22);
  }

  // --- Bottom left: scaling (mult) ---
  {
    const c = centres[2];
    const v = createVector(lim * 0.5, -lim * 0.3);
    const s = 2 * sin(frameCount * 0.02);     // animates between -2 and 2
    const scaled = p5.Vector.mult(v, s);
    const o = createVector(c.x, c.y);
    drawArrow(o, scaled, color(150, 60, 190), 3);
    drawArrow(o, v, color(50, 110, 220), 3);
    panelLabel("SCALE: v.mult(s)", c.x, y0 + h + 8);
    caption("s = " + nf(s, 1, 2) + "   |v| = " + nf(v.mag(), 1, 1)
      + "   |s v| = " + nf(scaled.mag(), 1, 1)
      + "\nnegative s reverses the direction", 10, height - 34);
  }

  // --- Bottom right: magnitude and normalise ---
  {
    const c = centres[3];
    const v = steer(c);
    const unit = v.copy().normalize();
    const unitDrawn = p5.Vector.mult(unit, 60);   // unit vector, drawn 60 px long
    drawArrow(c, v, color(50, 110, 220), 3);
    drawArrow(c, unitDrawn, color(210, 50, 60), 4);
    noFill(); stroke(210, 50, 60, 90); strokeWeight(1);
    circle(c.x, c.y, 120);                       // the "unit circle" (60 px radius)
    panelLabel("MAGNITUDE + NORMALISE", c.x, y0 + h + 8);
    caption("|v| = " + nf(v.mag(), 1, 1) + "   unit = ("
      + nf(unit.x, 1, 2) + ", " + nf(unit.y, 1, 2) + ")   |unit| = " + nf(unit.mag(), 1, 2),
      w + 10, height - 22);
  }
}

function panelLabel(str, x, y) {
  noStroke(); fill(30); textAlign(CENTER, TOP); textSize(13);
  text(str, x, y);
}

function caption(str, x, y) {
  noStroke(); fill(70); textAlign(LEFT, TOP); textSize(11);
  text(str, x, y);
}

/* ---------------- Scenes 3–6: particles under forces ---------------- */

function runParticleScene() {
  for (const p of particles) {
    applyEnvironment(p);
    p.update();
    p.edges();
    p.display();
  }

  if (mode === 5) drawMisbehaveStatus();
}

function drawMisbehaveStatus() {
  if (!particles.length) return;
  if (!opt.resetAcc) {
    noStroke(); fill(210, 50, 60); textAlign(RIGHT, BOTTOM); textSize(13);
    text("Acceleration is NOT reset: forces pile up every frame.\n"
       + "Watch the red arrows and the speed grow.",
      width - 12, height - 12);
  }
}

/* ---------------- Scene 7: vector field ---------------- */

// A field is a function F(x, y) that returns a vector.
function fieldAt(x, y) {
  return createVector(sin(y * 0.01), cos(x * 0.01));
}

function runVectorField() {
  if (opt.field) {
    for (let x = 20; x < width; x += 40) {
      for (let y = 20; y < height; y += 40) {
        const f = fieldAt(x, y);
        drawArrow(createVector(x, y), p5.Vector.mult(f, 16), color(120, 140, 190, 150), 1, 4);
      }
    }
  }

  for (const p of particles) {
    // sample the field at this particle's own position
    const force = fieldAt(p.position.x, p.position.y).mult(0.1);
    p.applyForce(force);
    p.applyForce(p.velocity.copy().mult(-0.04));  // a little drag keeps speeds sensible
    p.update();
    p.wrap();
    p.display();
  }
}

/* ---------------- Scene 8: attraction ---------------- */

function runAttraction() {
  const target = createVector(mouseX, mouseY);

  for (const p of particles) {
    // 1. displacement to the target (subtraction)
    const direction = p5.Vector.sub(target, p.position);
    // 2. keep only the direction (normalise -> unit vector)
    direction.normalize();
    // 3. choose the strength separately (scale)
    direction.mult(mouseIsPressed ? -0.35 : 0.25);

    p.applyForce(direction);
    p.applyForce(p.velocity.copy().mult(-0.02));
    p.update();
    p.wrap();
    p.display();
  }

  noFill(); stroke(30, 120); strokeWeight(1.5);
  circle(mouseX, mouseY, 16);
}

/* ---------------- Drawing helpers ---------------- */

// An arrow from base along vec (vec is a displacement, not a position)
function drawArrow(base, vec, col, weight = 2, head = 8) {
  if (vec.mag() < 1) return;
  push();
  stroke(col); fill(col); strokeWeight(weight);
  line(base.x, base.y, base.x + vec.x, base.y + vec.y);
  translate(base.x + vec.x, base.y + vec.y);
  rotate(vec.heading());
  noStroke();
  triangle(0, 0, -head * 1.5, head * 0.6, -head * 1.5, -head * 0.6);
  pop();
}

function drawLaunchArrow() {
  if ((mode === 3 || mode === 5) && launchStart && mouseIsPressed) {
    const disp = p5.Vector.sub(createVector(mouseX, mouseY), launchStart);
    drawArrow(launchStart, disp, color(240, 140, 30), 3);
    noStroke(); fill(240, 140, 30); textAlign(LEFT, BOTTOM); textSize(12);
    text("launch velocity = " + nf(disp.x * 0.05, 1, 2) + ", " + nf(disp.y * 0.05, 1, 2),
      launchStart.x + 10, launchStart.y - 10);
  }
}

function onOff(b) { return b ? "on" : "off"; }

function drawHUD() {
  noStroke(); fill(255, 235);
  rect(0, 0, width, HUD_H);
  fill(20); textAlign(LEFT, TOP); textSize(13);
  text(mode + "  " + SCENES[mode].name, 10, 6, width - 20);

  fill(80); textSize(11);
  text(SCENES[mode].hint, 10, 24, width - 20, 30);

  fill(30);
  text(
    "Scenes 1-8 | G gravity:" + onOff(opt.gravity) +
    "  R reverse:" + onOff(opt.reverse) +
    "  +/- strength:x" + opt.gravityMult +
    "  W wind:" + onOff(opt.wind) +
    "  D drag:" + onOff(opt.drag) +
    "  A reset accel:" + onOff(opt.resetAcc) +
    "  M m*g:" + onOff(opt.massGravity) +
    "  V vectors:" + onOff(opt.vectors) +
    "  T trails:" + onOff(opt.trails) +
    "  F field:" + onOff(opt.field) +
    "  Space reset  H hide",
    10, 60, width - 20, 30
  );
}

/* ---------------- Input ---------------- */

function keyPressed() {
  if (key >= "1" && key <= "8") { mode = int(key); initScene(); return false; }

  const k = key.toLowerCase();
  if (k === "g") opt.gravity = !opt.gravity;
  else if (k === "r") { opt.reverse = !opt.reverse; opt.gravity = true; }
  else if (k === "w") opt.wind = !opt.wind;
  else if (k === "d") opt.drag = !opt.drag;
  else if (k === "a") opt.resetAcc = !opt.resetAcc;
  else if (k === "m") opt.massGravity = !opt.massGravity;
  else if (k === "v") opt.vectors = !opt.vectors;
  else if (k === "t") opt.trails = !opt.trails;
  else if (k === "f") opt.field = !opt.field;
  else if (k === "h") { hudVisible = !hudVisible; }
  else if (key === "+" || key === "=") { opt.gravityMult = min(opt.gravityMult * 2, 16); opt.gravity = true; }
  else if (key === "-" || key === "_") { opt.gravityMult = max(opt.gravityMult / 2, 0.25); }
  else if (key === " ") { initScene(); }
  else return;

  return false; // stop the browser scrolling on space etc.
}

function mousePressed() {
  launchStart = createVector(mouseX, mouseY);

  if (mode === 6) {
    for (let i = 0; i < 10; i++) {
      const p = new Particle(mouseX + random(-10, 10), mouseY + random(-10, 10), random(1, 4));
      p.velocity = p5.Vector.random2D().mult(random(1, 3));
      particles.push(p);
    }
  }
}

function mouseReleased() {
  if ((mode === 3 || mode === 5) && launchStart) {
    // launch velocity = release position - press position (vector subtraction)
    const disp = p5.Vector.sub(createVector(mouseX, mouseY), launchStart);
    const mass = mode === 3 ? 1 : random([1, 2, 4, 8]);
    const p = new Particle(launchStart.x, launchStart.y, mass);
    p.velocity = disp.mult(0.05);
    if (mode === 3) particles = [p];
    else {
      particles.push(p);
      if (particles.length > 30) particles.shift();
    }
  }
  launchStart = null;
}
