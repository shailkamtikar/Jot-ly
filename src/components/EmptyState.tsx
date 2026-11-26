import { motion } from 'motion/react'
import { easeOut } from '../lib/motion'
import { useTheme } from '../state/theme'
import { useWorkspace } from '../state/workspace'
import { ArrowIcon } from './icons'
import BlurText from './reactbits/BlurText'
import SpotlightCard from './reactbits/SpotlightCard'

const STEPS = [
  { n: '01', title: 'Write it', body: 'Headings, lists and plain paragraphs. Nothing to configure, everything autosaves.' },
  { n: '02', title: 'Say it', body: 'Stick a short voice note on the line it explains. Tone and nuance, no typing.' },
  { n: '03', title: 'Move it', body: 'Drag stickers anywhere. They stay attached to their line and fold up small when idle.' },
]

export function EmptyState() {
  const { createPage } = useWorkspace()
  const { resolved } = useTheme()
  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-10 px-6 py-14 md:px-12">
      <div>
        <p className="label mb-5 text-accent-ink">Jotly / Notes with a voice</p>
        <h1 className="sr-only">Think it. Write it. Say it.</h1>
        <BlurText
          text="Think it. Write it. Say it."
          delay={110}
          animateBy="words"
          direction="top"
          className="font-display text-[clamp(3rem,10vw,7.5rem)] leading-[0.92]"
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: easeOut }}
          className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-muted"
        >
          A quiet notebook where your voice lives next to your words. Create a page, write a little, then stick a recording right where it belongs.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5, ease: easeOut }}
          type="button"
          onClick={createPage}
          className="label arrow-link mt-8 flex items-center gap-3 rounded-[3px] bg-accent px-5 py-3.5 text-accent-fg transition-[filter] hover:brightness-105"
        >
          Create your first page <ArrowIcon className="arrow" width={16} height={16} />
        </motion.button>
      </div>

      <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 + i * 0.1, duration: 0.5, ease: easeOut }}
            className="bg-bg"
          >
            <SpotlightCard theme={resolved} className="!h-full !rounded-none !p-6" intensity={0.1} spotlightSize={260} borderGlow={0.4}>
              <span className="font-display text-4xl text-accent-ink">{s.n}</span>
              <h2 className="font-display mt-6 text-2xl">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </SpotlightCard>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
