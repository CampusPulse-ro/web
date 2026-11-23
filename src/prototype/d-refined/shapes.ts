/**
 * A small part of the M3 Expressive shape library (cookies, sunny, burst, clover, pill…), drawn as
 * radial functions so any shape can morph into any other: every shape is sampled at the same N
 * angles, so a morph is just each radius moving to its new length. That is the same trick
 * androidx.graphics.shapes uses (matched vertices), simplified for star-shaped outlines.
 */

const N = 96

type Radial = (t: number) => number

/** n rounded lobes with soft valleys (the M3 "cookie" and "clover" family). */
function scallop(n: number, depth: number, soft = 0.25): Radial {
  const norm = Math.sqrt(1 + soft * soft)
  return (t) => {
    const c = Math.cos((n * t) / 2)
    return 1 - depth * (1 - Math.sqrt(c * c + soft * soft) / norm)
  }
}

/** n soft points (the "sunny" and "burst" family). */
function rays(n: number, depth: number, sharp = 1): Radial {
  return (t) => 1 - depth * ((1 - Math.cos(n * t)) / 2) ** sharp
}

/** A regular polygon; corners are rounded afterwards by smoothing the samples. */
function polygon(n: number, rotate = 0): Radial {
  const seg = (2 * Math.PI) / n
  return (t) => {
    const a = (((t - rotate) % seg) + seg) % seg
    return Math.cos(Math.PI / n) / Math.cos(a - Math.PI / n)
  }
}

/** Superellipse: p = 2 is an ellipse, higher is squarer. */
function superellipse(a: number, b: number, p: number, rotate = 0): Radial {
  return (t) => {
    const u = t - rotate
    return (Math.abs(Math.cos(u) / a) ** p + Math.abs(Math.sin(u) / b) ** p) ** (-1 / p)
  }
}

interface Def {
  r: Radial
  /** Moving-average window over the samples, rounds corners. */
  smooth?: number
}

const defs = {
  circle: { r: () => 1 },
  cookie4: { r: scallop(4, 0.16, 0.45) },
  cookie6: { r: scallop(6, 0.13, 0.35) },
  cookie9: { r: scallop(9, 0.1, 0.3) },
  cookie12: { r: scallop(12, 0.08, 0.3) },
  clover4: { r: scallop(4, 0.34, 0.22) },
  clover8: { r: scallop(8, 0.26, 0.25) },
  sunny: { r: rays(8, 0.14) },
  verySunny: { r: rays(8, 0.26, 0.9) },
  softBurst: { r: rays(10, 0.2, 0.75) },
  flower: { r: scallop(8, 0.2, 0.4) },
  pentagon: { r: polygon(5, -Math.PI / 2), smooth: 9 },
  gem: { r: polygon(6, 0), smooth: 11 },
  square: { r: superellipse(1, 1, 4.5) },
  pill: { r: superellipse(1, 0.62, 3.2, Math.PI / 4) },
  oval: { r: superellipse(1, 0.74, 2, -Math.PI / 4) },
  puffy: { r: (t: number) => superellipse(1, 0.8, 2)(t) * scallop(6, 0.07, 0.35)(t) },
} satisfies Record<string, Def>

export type ShapeName = keyof typeof defs

function radii(def: Def): number[] {
  let r = Array.from({ length: N }, (_, i) => def.r(-Math.PI / 2 + (i / N) * 2 * Math.PI))
  if (def.smooth) {
    const w = def.smooth
    const half = Math.floor(w / 2)
    r = r.map((_, i) => {
      let s = 0
      for (let k = -half; k <= half; k++) s += r[(i + k + N) % N]
      return s / (2 * half + 1)
    })
  }
  const max = Math.max(...r)
  return r.map((x) => x / max)
}

const cache = new Map<ShapeName, string>()

/** The SVG path of a shape in a 100×100 box, always N points, so Motion can tween between any two. */
export function shapePath(name: ShapeName): string {
  const hit = cache.get(name)
  if (hit) return hit
  const r = radii(defs[name])
  const pts = r.map((ri, i) => {
    const t = -Math.PI / 2 + (i / N) * 2 * Math.PI
    return `${(50 + 50 * ri * Math.cos(t)).toFixed(2)} ${(50 + 50 * ri * Math.sin(t)).toFixed(2)}`
  })
  const d = `M${pts[0]}L${pts.slice(1).join('L')}Z`
  cache.set(name, d)
  return d
}

/** The order M3's indeterminate loading indicator cycles through. */
export const loadingSequence: ShapeName[] = [
  'softBurst',
  'cookie9',
  'pentagon',
  'pill',
  'sunny',
  'cookie4',
  'oval',
]
