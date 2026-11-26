/** Motion tokens (seconds). Keep every animation on these so the app feels consistent. */
export const dur = { micro: 0.15, card: 0.2, page: 0.24 } as const

export const easeOut = [0.16, 1, 0.3, 1] as const
export const easeIn = [0.7, 0, 0.84, 0] as const

export const enter = { duration: dur.card, ease: easeOut }
export const exit = { duration: dur.micro, ease: easeIn }
export const spring = { type: 'spring', stiffness: 520, damping: 38 } as const

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: enter },
  exit: { opacity: 0, transition: exit },
}

export const pop = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: enter },
  exit: { opacity: 0, scale: 0.97, transition: exit },
}
