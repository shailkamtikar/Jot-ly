import { expect, test, type Page } from '@playwright/test'

// Every Playwright test runs in a brand-new browser context, so storage always starts empty.
async function fresh(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Page title' })).toBeVisible()
}

async function savedStatus(page: Page) {
  await expect(page.getByTestId('save-status')).toContainText('Saved')
}

async function recordSticker(page: Page, ms = 1200) {
  await page.getByTestId('add-audio').click()
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByTestId('rec-timer')).toBeVisible()
  await page.waitForTimeout(ms)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByTestId('preview-audio')).toBeVisible()
  await page.getByTestId('add-to-note').click()
}

test('core flow: write, record a sticker, reload, play, fold back, rename, delete, export', async ({ page }) => {
  await fresh(page)

  // create a page, type a paragraph, add heading + bullet
  await page.getByRole('button', { name: 'New page' }).click()
  const title = page.getByRole('textbox', { name: 'Page title' })
  await title.fill('Project planning')
  await title.press('Enter')
  const first = page.locator('[data-block-id]').first()
  await first.fill('We should simplify the onboarding flow.')
  await page.getByRole('button', { name: 'Heading', exact: true }).click()
  await page.keyboard.type('Follow-up')
  await page.getByRole('button', { name: 'Bullet', exact: true }).click()
  await page.keyboard.type('Review first-session analytics.')
  await savedStatus(page)

  // record with pause/resume; the sticker attaches to the line being edited
  await first.click()
  const firstId = await first.getAttribute('data-block-id')
  await page.getByTestId('add-audio').click()
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByTestId('rec-timer')).toBeVisible()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.waitForTimeout(400) // let the display settle on the paused value
  const paused = await page.getByTestId('rec-timer').innerText()
  await page.waitForTimeout(1200)
  expect(await page.getByTestId('rec-timer').innerText()).toBe(paused) // timer frozen while paused
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByTestId('preview-audio')).toBeVisible()
  await page.getByTestId('add-to-note').click()

  const sticker = page.getByTestId('audio-block')
  await expect(sticker).toHaveCount(1)
  await expect(sticker).toHaveAttribute('data-anchor', firstId!)
  await expect(sticker).toHaveAttribute('data-expanded', 'false') // new stickers start small

  // reload: text and sticker still exist, same attachment
  await savedStatus(page)
  await page.reload()
  await expect(sticker).toHaveCount(1)
  await expect(sticker).toHaveAttribute('data-anchor', firstId!)
  await expect(page.locator('[data-block-id]').first()).toHaveValue('We should simplify the onboarding flow.')

  // play: it opens up; pause + move away: it folds back into a small sticker
  const play = page.getByTestId('play')
  await play.click()
  await expect(play).toHaveAccessibleName(/^Pause/)
  await expect(sticker).toHaveAttribute('data-expanded', 'true')
  await page.getByTestId('speed').click()
  await expect(page.getByTestId('speed')).toHaveText('1.5×')
  await play.click()
  await expect(play).toHaveAccessibleName(/^Play/)
  await page.mouse.move(5, 5)
  await expect(sticker, await sticker.getAttribute('data-state') ?? '').toHaveAttribute('data-expanded', 'false', { timeout: 6000 })

  // rename (via the options menu)
  await page.getByRole('button', { name: /^Options for/ }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  await page.getByRole('textbox', { name: 'Sticker name' }).fill('Onboarding context')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('sticker-title')).toHaveText('Onboarding context')

  // markdown export
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export page as Markdown' }).click()])
  expect(download.suggestedFilename()).toBe('project-planning.md')

  // delete, undo, delete
  await page.getByRole('button', { name: /^Options for/ }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(sticker).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(sticker).toHaveCount(1)
  await page.getByRole('button', { name: /^Options for/ }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(sticker).toHaveCount(0)

  // theme persists across reload
  await page.getByRole('radio', { name: 'Dark theme' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('a sticker can be dragged anywhere, stays attached to its line, and survives a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await fresh(page)
  await page.getByRole('button', { name: 'New page' }).click()
  await page.getByRole('textbox', { name: 'Page title' }).fill('Drag test')
  await page.getByRole('textbox', { name: 'Page title' }).press('Enter')
  await page.locator('[data-block-id]').first().fill('Alpha line')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Beta line')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Gamma line')
  await page.locator('[data-block-id]').first().click()
  await recordSticker(page)

  const sticker = page.getByTestId('audio-block')
  await expect(sticker).toHaveCount(1)
  await page.waitForTimeout(600) // entrance spring settles
  const before = (await sticker.boundingBox())!

  // drag it diagonally: down past the next lines and to the left, i.e. not just up/down
  // grab it by its middle (a tilted sticker's bounding-box corner is empty space)
  const gx = before.x + before.width / 2
  const gy = before.y + before.height / 2
  await page.mouse.move(gx, gy)
  await page.mouse.down()
  await page.mouse.move(gx - 120, gy + 60, { steps: 8 })
  await page.mouse.move(gx - 260, gy + 130, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(600)

  const after = (await sticker.boundingBox())!
  expect(before.x - after.x).toBeGreaterThan(150) // moved sideways
  expect(after.y - before.y).toBeGreaterThan(80) // and down
  expect(await sticker.getAttribute('data-anchor')).toBeTruthy()
  await expect(page.getByTestId('play')).toHaveAccessibleName(/^Play/) // dragging did not trigger playback

  // the position is saved
  await savedStatus(page)
  await page.reload()
  await page.waitForTimeout(600)
  const reloaded = (await page.getByTestId('audio-block').boundingBox())!
  expect(Math.abs(reloaded.x - after.x)).toBeLessThan(3)
  expect(Math.abs(reloaded.y - after.y)).toBeLessThan(3)

  // it travels with its line: make the text above it much longer and the sticker moves down with it
  const yBefore = reloaded.y
  await page.locator('[data-block-id]').first().fill('Alpha line that is now long enough to wrap onto several rows of text on the screen. '.repeat(6))
  await page.waitForTimeout(600)
  const yAfter = (await page.getByTestId('audio-block').boundingBox())!.y
  expect(yAfter).toBeGreaterThan(yBefore + 20)
})

test('a sticker can be moved with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await fresh(page)
  await recordSticker(page, 800)
  const sticker = page.getByTestId('audio-block')
  await expect(sticker).toHaveCount(1)
  await page.waitForTimeout(600)
  const before = (await sticker.boundingBox())!
  await sticker.focus()
  await page.keyboard.press('Shift+ArrowLeft')
  await page.keyboard.press('Shift+ArrowDown')
  await page.waitForTimeout(500)
  const after = (await sticker.boundingBox())!
  expect(before.x - after.x).toBeGreaterThan(30)
  expect(after.y - before.y).toBeGreaterThan(30)
})

test('microphone denied shows a helpful message', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: [] })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
  })
  await fresh(page)
  await page.getByTestId('add-audio').click()
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByRole('alert')).toContainText('Microphone access is blocked')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Start recording' })).toBeVisible()
  await ctx.close()
})

test('pages: create, filter, delete, search, keyboard flow', async ({ page }) => {
  await fresh(page)
  await page.getByRole('button', { name: 'New page' }).click()
  await page.getByRole('textbox', { name: 'Page title' }).fill('Groceries')
  await page.getByRole('button', { name: 'New page' }).click()
  await page.getByRole('textbox', { name: 'Page title' }).fill('Meeting notes')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Discuss budget')
  await page.keyboard.press('Enter')
  await page.keyboard.type('- first item')
  await expect(page.locator('[data-block-type="bullet"]')).toHaveValue('first item')
  await savedStatus(page)

  // filter
  const nav = page.getByRole('navigation', { name: 'Pages' })
  await page.getByRole('searchbox', { name: 'Filter pages by title' }).fill('groc')
  await expect(nav.getByRole('button', { name: /Groceries/ }).first()).toBeVisible()
  await expect(nav.getByRole('button', { name: /Meeting notes/ })).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Filter pages by title' }).fill('zzz')
  await expect(page.getByText('No pages found.')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Filter pages by title' }).fill('')

  // search by body text
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search notes' }).fill('budget')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('Meeting notes')

  // reload keeps the open page
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue('Meeting notes')

  // delete with confirm
  await page.getByRole('button', { name: 'Delete page Groceries' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(nav.getByRole('button', { name: /Groceries/ }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Delete page Groceries' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(nav.getByRole('button', { name: /Groceries/ })).toHaveCount(0)
})

test('backup round trip restores pages and stickers', async ({ page }) => {
  await fresh(page)
  await page.getByRole('button', { name: 'New page' }).click()
  await page.getByRole('textbox', { name: 'Page title' }).fill('Backup me')
  await recordSticker(page, 1000)
  await expect(page.getByTestId('audio-block')).toHaveCount(1)
  await savedStatus(page)

  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()])
  const path = await download.path()

  // delete the page, then restore it from the backup
  await page.getByRole('button', { name: 'Delete page Backup me' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('button', { name: /Backup me/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  await page.getByLabel('Choose a Jotly backup file').setInputFiles(path)
  // the Welcome page also exists locally, so the app asks what to do with it
  await page.getByRole('button', { name: 'Skip them' }).click()
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: /Backup me/ }).first().click()
  await expect(page.getByTestId('audio-block')).toHaveCount(1)
  await page.getByTestId('play').click()
  await expect(page.getByTestId('play')).toHaveAccessibleName(/^Pause/)
})
