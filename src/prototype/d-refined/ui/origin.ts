/** The rectangle a container transform starts from (see ContainerTransform). */
let origin: { rect: DOMRect; at: number } | null = null

export function rememberOrigin(el: Element) {
  origin = { rect: el.getBoundingClientRect(), at: performance.now() }
}

/** The remembered rect if the tap was just now (not cleared on read: StrictMode reads twice). */
export function takeOrigin(): DOMRect | null {
  return origin && performance.now() - origin.at < 700 ? origin.rect : null
}
