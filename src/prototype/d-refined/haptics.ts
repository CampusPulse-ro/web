/**
 * The research's haptic vocabulary on the web: navigator.vibrate works in Chrome on Android (his
 * phone) and is silently absent elsewhere. Selection for choices, success for "it's on"; never on
 * scroll or tab switches.
 */
export function haptic(kind: 'selection' | 'success') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(kind === 'selection' ? 8 : [10, 60, 14])
}
