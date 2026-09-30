// Drag inside the canvas: a vector grows from the centre to the mouse.
// Double-click to reset. Works in p5.js 1.x and 2.x.

let origin;   // where the vector starts (centre of the canvas)
let target;   // where the mouse is pulling the vector to
let v;        // the vector we draw; it grows smoothly towards target

function setup() {
  createCanvas(600, 400);
  origin = createVector(width / 2, height / 2);
  target = createVector(0, 0);
  v = createVector(0, 0);
  textFont("monospace");
}

function draw() {
  background(245);
  drawAxes();

  // While dragging inside the frame, the target follows the mouse
  if (mouseIsPressed && mouseInsideCanvas()) {
    target.set(mouseX - origin.x, mouseY - origin.y);
  }

  // Grow: move 15% of the remaining distance each frame
  v.lerp(target, 0.15);

  drawComponents(v);
  drawArrow(origin, v, color(28, 29, 32));
  drawReadout(v);
}

function mouseInsideCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function doubleClicked() {
  target.set(0, 0);
}

// Draws vec as an arrow starting at base
function drawArrow(base, vec, col) {
  if (vec.mag() < 1) return;
  push();
  translate(base.x, base.y);
  rotate(vec.heading());
  stroke(col);
  strokeWeight(3);
  line(0, 0, vec.mag(), 0);
  noStroke();
  fill(col);
  triangle(vec.mag(), 0, vec.mag() - 14, -7, vec.mag() - 14, 7);
  pop();
}

// Dashed x (blue) and y (orange) components: the right triangle
function drawComponents(vec) {
  push();
  strokeWeight(2);
  drawingContext.setLineDash([6, 6]);
  stroke(21, 96, 130);
  line(origin.x, origin.y, origin.x + vec.x, origin.y);
  stroke(233, 113, 50);
  line(origin.x + vec.x, origin.y, origin.x + vec.x, origin.y + vec.y);
  pop();
}

function drawAxes() {
  stroke(218, 218, 214);
  strokeWeight(1);
  line(0, origin.y, width, origin.y);
  line(origin.x, 0, origin.x, height);
}

function drawReadout(vec) {
  let angle = vec.heading();
  noStroke();
  fill(28, 29, 32);
  textSize(14);
  text("drag inside the frame · double-click to reset", 12, 20);
  textSize(16);
  fill(21, 96, 130);
  text("x = " + vec.x.toFixed(0), 12, height - 76);
  fill(233, 113, 50);
  text("y = " + vec.y.toFixed(0) + "  (y points down)", 12, height - 54);
  fill(28, 29, 32);
  text("|v| = " + vec.mag().toFixed(1), 12, height - 32);
  text("angle = " + angle.toFixed(2) + " rad  (" + degrees(angle).toFixed(0) + "°)", 12, height - 10);
}
