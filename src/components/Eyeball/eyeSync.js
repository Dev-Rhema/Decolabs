// Shared tracking/blink driver for every mounted Eyeball instance.
//
// Each Eyeball used to run its own mousemove listener, rAF loop and blink
// timer, computed relative to its own on-screen position. That made two
// eyes drift toward different targets (each "converging" on the cursor
// independently, like real eyes) and blink at different random moments.
// Registering every instance here instead means one shared target/current
// offset drives all of them identically, and one shared timer blinks them
// together.

const EYE_CENTER = { x: 700, y: 540 };
// The pupil's resting position (PUPIL.cx in Eyeball.jsx) already sits
// right-of-center in the eye shape, so an equal +/-85 swing looks strong
// moving right (toward the outer corner) but barely noticeable moving
// left (it's just returning toward where the eye shape's own center is).
// Give left more room than right so the two directions read as equally
// far in the actual rendered eye.
const MAX_OFFSET_X_LEFT = 150;
const MAX_OFFSET_X_RIGHT = 85;
const MAX_OFFSET_Y = 45;

const eyes = new Set(); // { svg, pupilGroup }
let referenceSvg = null;

const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
let rafId = null;
let blinkTimeout = null;

function pointerToViewBox(svg, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return {
    x: ((clientX - rect.left) / rect.width) * vb.width + vb.x,
    y: ((clientY - rect.top) / rect.height) * vb.height + vb.y,
  };
}

function updateTarget(clientX, clientY) {
  if (!referenceSvg) return;
  const p = pointerToViewBox(referenceSvg, clientX, clientY);
  const dx = p.x - EYE_CENTER.x;
  const dy = p.y - EYE_CENTER.y;
  const dist = Math.hypot(dx, dy);
  const scale = dist === 0 ? 0 : Math.min(1, dist / 500);
  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle);
  const maxOffsetX = cos < 0 ? MAX_OFFSET_X_LEFT : MAX_OFFSET_X_RIGHT;
  target.x = cos * maxOffsetX * scale;
  target.y = Math.sin(angle) * MAX_OFFSET_Y * scale;
}

function onMouseMove(e) {
  updateTarget(e.clientX, e.clientY);
}
function onTouchMove(e) {
  if (e.touches[0]) updateTarget(e.touches[0].clientX, e.touches[0].clientY);
}

function animate() {
  current.x += (target.x - current.x) * 0.18;
  current.y += (target.y - current.y) * 0.18;
  const transform = `translate(${current.x.toFixed(2)}, ${current.y.toFixed(2)})`;
  eyes.forEach(({ pupilGroup }) => pupilGroup?.setAttribute("transform", transform));
  rafId = requestAnimationFrame(animate);
}

function blink() {
  eyes.forEach(({ svg }) => {
    svg.style.transformOrigin = "50% 50%";
    svg.animate(
      [
        { transform: "scaleY(1)" },
        { transform: "scaleY(0.05)" },
        { transform: "scaleY(1)" },
      ],
      { duration: 200, easing: "ease-in-out" },
    );
  });
  blinkTimeout = setTimeout(blink, 2800 + Math.random() * 3500);
}

function pickReferenceSvg() {
  referenceSvg = eyes.size ? eyes.values().next().value.svg : null;
}

export function registerEye(svg, pupilGroup) {
  const entry = { svg, pupilGroup };
  const isFirst = eyes.size === 0;
  eyes.add(entry);
  if (!referenceSvg) referenceSvg = svg;

  if (isFirst) {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    rafId = requestAnimationFrame(animate);
    blinkTimeout = setTimeout(blink, 2000 + Math.random() * 2000);
  }

  return function unregister() {
    eyes.delete(entry);
    if (referenceSvg === svg) pickReferenceSvg();

    if (eyes.size === 0) {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      cancelAnimationFrame(rafId);
      clearTimeout(blinkTimeout);
      target.x = target.y = current.x = current.y = 0;
    }
  };
}
