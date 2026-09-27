/**
 * Petits effets de récompense, joués après une action réussie : gerbe d'étincelles et de tickets
 * autour d'un bouton, pluie de confettis pour les grands moments, légère vibration sur téléphone.
 * Rien ne se joue si l'utilisateur réduit les animations. À n'appeler que côté navigateur.
 */

/** Ressort (léger dépassement puis retour) : même courbe que --ease-spring dans globals.css. */
export const SPRING =
  "linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)";

/** Couleurs de la salle : ampoule tungstène, lumière d'écran, velours, vert « sortie ». */
const PALETTE = ["#f2b84b", "#ffc965", "#f6ecdc", "#d4344b", "#3fcf8e"];

type Shape = "spark" | "ticket" | "star";

export function reducedMotion() {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Vibration courte (Android ; ignorée ailleurs). */
export function haptic(pattern: number | number[] = 10) {
  if (reducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

/** Calque fixe au-dessus de la page, qui accueille les particules le temps de leur animation. */
function layer() {
  let el = document.getElementById("fx-layer");
  if (!el) {
    el = document.createElement("div");
    el.id = "fx-layer";
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:70;overflow:hidden";
    document.body.appendChild(el);
  }
  return el;
}

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function particle(shape: Shape, color: string, size: number) {
  const el = document.createElement("span");
  el.style.cssText = `position:absolute;left:0;top:0;will-change:transform,opacity;color:${color}`;
  if (shape === "star") {
    el.textContent = "★";
    el.style.fontSize = `${size * 1.6}px`;
    el.style.lineHeight = "1";
  } else if (shape === "ticket") {
    // Ticket de cinéma miniature : rectangle arrondi avec sa perforation.
    el.style.width = `${size}px`;
    el.style.height = `${size * 1.6}px`;
    el.style.borderRadius = "2px";
    el.style.background = `linear-gradient(${color} 0 38%, transparent 38% 46%, ${color} 46%)`;
  } else {
    el.style.width = el.style.height = `${size * 0.7}px`;
    el.style.borderRadius = "999px";
    el.style.background = color;
    el.style.boxShadow = `0 0 ${size}px ${color}`;
  }
  return el;
}

/**
 * Gerbe de particules qui jaillit d'un élément (bouton cliqué) puis retombe.
 * `from` peut être la position du bouton relevée au clic, s'il a disparu entre-temps.
 * `shapes` : étincelles, tickets ou étoiles ; `colors` : sous-ensemble de la palette.
 */
export function burst(
  from: Element | DOMRect | null | undefined,
  {
    count = 16,
    spread = 80,
    shapes = ["spark", "ticket", "star"],
    colors = PALETTE,
  }: { count?: number; spread?: number; shapes?: Shape[]; colors?: string[] } = {},
) {
  if (!from || reducedMotion()) return;
  const r = from instanceof Element ? from.getBoundingClientRect() : from;
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const host = layer();
  for (let i = 0; i < count; i++) {
    const el = particle(pick(shapes), pick(colors), 7 + Math.random() * 5);
    host.appendChild(el);
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const dist = spread * (0.55 + Math.random() * 0.6);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - spread * 0.25;
    const rot = (Math.random() - 0.5) * 540;
    const at = (tx: number, ty: number, s: number, deg: number) =>
      `translate(${x + tx}px, ${y + ty}px) translate(-50%, -50%) scale(${s}) rotate(${deg}deg)`;
    el.animate(
      [
        { transform: at(0, 0, 0.3, 0), opacity: 1 },
        { transform: at(dx, dy, 1, rot * 0.6), opacity: 1, offset: 0.5 },
        { transform: at(dx * 1.15, dy + spread * 0.55, 0.5, rot), opacity: 0 },
      ],
      { duration: 650 + Math.random() * 350, easing: "cubic-bezier(0.15, 0.8, 0.3, 1)", fill: "forwards" },
    ).finished.then(() => el.remove(), () => el.remove());
  }
}

/** Pluie de confettis (tickets et étoiles) sur tout l'écran, pour les grands moments. */
export function confetti({ count = 90 }: { count?: number } = {}) {
  if (typeof window === "undefined" || reducedMotion()) return;
  const host = layer();
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const el = particle(pick<Shape>(["ticket", "ticket", "star", "spark"]), pick(PALETTE), 8 + Math.random() * 6);
    host.appendChild(el);
    const x0 = Math.random() * w;
    const sway = (Math.random() - 0.5) * 160;
    const rot = (Math.random() - 0.5) * 900;
    const at = (x: number, y: number, deg: number) => `translate(${x}px, ${y}px) rotate(${deg}deg)`;
    el.animate(
      [
        { transform: at(x0, -30, 0), opacity: 1 },
        { transform: at(x0 + sway, h * 0.5, rot * 0.5), opacity: 1, offset: 0.55 },
        { transform: at(x0 - sway * 0.4, h + 40, rot), opacity: 0.9 },
      ],
      {
        duration: 1800 + Math.random() * 1400,
        delay: Math.random() * 450,
        easing: "cubic-bezier(0.25, 0.6, 0.45, 1)",
        fill: "both",
      },
    ).finished.then(() => el.remove(), () => el.remove());
  }
}

/** Petit rebond d'un élément (ex. compteur qui vient de changer). */
export function pop(el: Element | null | undefined, scale = 1.25) {
  if (!el || reducedMotion()) return;
  el.animate([{ transform: `scale(${scale})` }, { transform: "none" }], { duration: 550, easing: SPRING });
}
