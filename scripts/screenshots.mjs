// Regenerates the README screenshots in docs/screenshots.
// Usage: start the app (npm run dev), then: node scripts/screenshots.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5273'
const OUT = 'docs/screenshots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})

async function open(theme, viewport) {
  const ctx = await browser.newContext({ viewport, permissions: ['microphone'], deviceScaleFactor: 2 })
  await ctx.addInitScript((t) => localStorage.setItem('jotly-theme', t), theme)
  const page = await ctx.newPage()
  await page.goto(BASE)
  await page.getByRole('textbox', { name: 'Page title' }).waitFor()
  return { ctx, page }
}

async function record(page, ms = 1500) {
  await page.getByTestId('add-audio').click()
  await page.getByRole('button', { name: 'Start recording' }).click()
  await page.getByTestId('rec-timer').waitFor()
  await page.waitForTimeout(ms)
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByTestId('preview-audio').waitFor()
  await page.getByTestId('add-to-note').click()
}

async function nameSticker(page, index, name) {
  const st = page.getByTestId('audio-block').nth(index)
  await st.getByRole('button', { name: /^Options for/ }).dispatchEvent('click')
  await page.getByRole('menuitem', { name: 'Rename' }).dispatchEvent('click')
  const box = page.getByRole('textbox', { name: 'Sticker name' })
  await box.fill(name)
  await box.press('Enter')
  await page.evaluate(() => document.activeElement?.blur())
  await page.mouse.move(5, 5)
  await page.waitForTimeout(1500)
}

async function buildNote(page) {
  await page.getByRole('button', { name: 'New page' }).click()
  const title = page.getByRole('textbox', { name: 'Page title' })
  await title.fill('Product review, week 12')
  await title.press('Enter')
  const first = page.locator('[data-block-id]').first()
  await first.fill('We should simplify the onboarding flow before the next release.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Users drop off at the permissions step, so say it, do not write an essay.')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Heading', exact: true }).click()
  await page.keyboard.type('Follow-ups')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Bullet', exact: true }).click()
  await page.keyboard.type('Review first-session analytics.')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Re-record the welcome tour.')
  const blocks = page.locator('[data-block-id]')

  await blocks.nth(0).focus()
  await record(page, 1800)
  await nameSticker(page, 0, 'Onboarding idea')
  await blocks.nth(1).focus()
  await record(page, 1200)
  await nameSticker(page, 1, 'Why they drop')
  await blocks.nth(4).focus()
  await record(page, 1000)
  await nameSticker(page, 2, 'Tour notes')
  await page.getByTestId('save-status').filter({ hasText: 'Saved' }).waitFor()
  await blocks.nth(0).blur()
  const stickers = page.getByTestId('audio-block')
  for (let i = 0; i < 3; i++) {
    const st = stickers.nth(i)
    await st.focus()
    await page.keyboard.press('ArrowLeft', { delay: 10 })
    for (let k = 0; k < 14; k++) await page.keyboard.press('ArrowLeft')
    await page.evaluate(() => document.activeElement?.blur())
  }
  await page.locator('[data-block-id]').first().focus()
  await page.mouse.move(5, 5)
  await page.waitForTimeout(2500)
}

// 1) Hero: light theme, one sticker playing (expanded), two small
{
  const { ctx, page } = await open('light', { width: 1360, height: 860 })
  await buildNote(page)
  await page.getByTestId('play').first().click().catch(() => {})
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/hero-light.png` })
  await ctx.close()
}

// 2) Dark theme
{
  const { ctx, page } = await open('dark', { width: 1360, height: 860 })
  await buildNote(page)
  await page.getByTestId('play').first().click().catch(() => {})
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/hero-dark.png` })
  await ctx.close()
}

// 3) Recorder open
{
  const { ctx, page } = await open('light', { width: 1360, height: 860 })
  await page.getByRole('button', { name: 'New page' }).click()
  const title = page.getByRole('textbox', { name: 'Page title' })
  await title.fill('Voice memo')
  await title.press('Enter')
  await page.locator('[data-block-id]').first().fill('Walk through the new checkout screens.')
  await page.getByTestId('add-audio').click()
  await page.getByRole('button', { name: 'Start recording' }).click()
  await page.getByTestId('rec-timer').waitFor()
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/recorder.png` })
  await ctx.close()
}

// 4) Mobile
{
  const { ctx, page } = await open('light', { width: 390, height: 800 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/mobile.png` })
  await ctx.close()
}

await browser.close()
console.log('screenshots written to', OUT)
