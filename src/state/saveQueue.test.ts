import { createPage } from '../lib/blocks'
import type { Page } from '../lib/types'
import { createSaveQueue, type SaveStatus } from './saveQueue'

afterEach(() => vi.useRealTimers())

function setup(save: (p: Page) => Promise<void>, retryDelaysMs = [10, 10, 10]) {
  const statuses: SaveStatus[] = []
  const q = createSaveQueue({ save, onStatus: (s) => statuses.push(s), debounceMs: 500, retryDelaysMs })
  return { q, statuses }
}

describe('saveQueue', () => {
  it('debounces rapid edits into one write', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async (_p: Page) => {})
    const { q } = setup(save)
    const p = createPage()
    for (let i = 0; i < 5; i++) q.schedule({ ...p, title: 't' + i })
    await vi.advanceTimersByTimeAsync(499)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0].title).toBe('t4')
  })

  it('reports saved only after the write resolves', async () => {
    let release!: () => void
    const save = vi.fn(() => new Promise<void>((r) => (release = r)))
    const { q, statuses } = setup(save)
    q.schedule(createPage(), true)
    await Promise.resolve()
    expect(statuses.at(-1)).toBe('saving')
    release()
    await q.flush()
    expect(statuses.at(-1)).toBe('saved')
  })

  it('never lets an older write land after a newer one', async () => {
    const order: string[] = []
    const gates: Array<() => void> = []
    const save = vi.fn((p: Page) => new Promise<void>((r) => gates.push(() => (order.push(p.title), r()))))
    const { q } = setup(save)
    const p = createPage()
    q.schedule({ ...p, title: 'first' }, true)
    await Promise.resolve()
    q.schedule({ ...p, title: 'second' }, true)
    gates[0]()
    await vi.waitFor(() => expect(gates.length).toBe(2))
    gates[1]()
    await q.flush()
    expect(order).toEqual(['first', 'second'])
  })

  it('flush writes immediately', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    const { q } = setup(save)
    q.schedule(createPage())
    await q.flush()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('retries a transient failure and then reports saved', async () => {
    let calls = 0
    const save = vi.fn(async () => {
      if (++calls === 1) throw new Error('boom')
    })
    const { q, statuses } = setup(save)
    q.schedule(createPage(), true)
    await q.flush()
    expect(calls).toBe(2)
    expect(statuses).toContain('retrying')
    expect(statuses.at(-1)).toBe('saved')
  })

  it('reports an error after exhausting retries and keeps working afterwards', async () => {
    let fail = true
    const save = vi.fn(async () => {
      if (fail) throw new Error('down')
    })
    const { q, statuses } = setup(save)
    q.schedule(createPage(), true)
    await q.flush()
    expect(statuses.at(-1)).toBe('error')
    expect(save).toHaveBeenCalledTimes(4)
    fail = false
    q.schedule(createPage(), true)
    await q.flush()
    expect(statuses.at(-1)).toBe('saved')
  })
})
