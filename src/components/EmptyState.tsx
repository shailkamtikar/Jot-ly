import { useWorkspace } from '../state/workspace'
import { PlusIcon } from './icons'
import BlurText from './reactbits/BlurText'

export function EmptyState() {
  const { createPage } = useWorkspace()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <BlurText text="Think it. Write it. Say it." delay={90} animateBy="words" direction="top" className="justify-center text-3xl font-semibold tracking-tight md:text-5xl" />
      <p className="max-w-md text-muted">Notes you can talk to. Create a page, write a little, then drop a voice sticker right where it belongs.</p>
      <button type="button" onClick={createPage} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-fg shadow-sm transition-transform active:scale-[0.98]">
        <PlusIcon width={16} height={16} /> Create your first page
      </button>
    </div>
  )
}
