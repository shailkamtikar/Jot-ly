import { expect, test, type Page } from '@playwright/test'

// Every Playwright test runs in a brand-new browser context, so storage always starts empty.
async function fresh(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Page title' })).toBeVisible()
}

async function savedStatus(page: Page) {
  await expect(page.getByTestId('save-status')).toContainText('Saved')
}

test('core flow: write, record an audio sticker, reload, play, rename, delete, export', async ({ page }) => {
  await fresh(page)

  // 1-3. create a page, type a paragraph, add heading + bullet
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

  // 4-6. record, pause, resume, stop, add to note — inserted after the first (focused) block
  await first.click()
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
  await expect(page.getByTestId('audio-block')).toHaveCount(1)

  // sticker sits directly after the first block
  const order = await page.locator('[data-testid="block-row"]').evaluateAll((rows) =>
    rows.map((r) => (r.querySelector('[data-testid="audio-block"]') ? 'audio' : 'text')),
  )
  expect(order.indexOf('audio')).toBe(1)

  // 7-8. reload: text and audio still exist
  await savedStatus(page)
  await page.reload()
  await expect(page.getByTestId('audio-block')).toHaveCount(1)
  await expect(page.locator('[data-block-id]').first()).toHaveValue('We should simplify the onboarding flow.')

  // 9. play / pause, speed
  const play = page.getByTestId('play')
  await play.click()
  await expect(play).toHaveAccessibleName(/^Pause/)
  await page.getByTestId('speed').click()
  await expect(page.getByTestId('speed')).toHaveText('1.5×')
  await play.click()
  await expect(play).toHaveAccessibleName(/^Play/)

  // 10. rename and delete (with undo)
  await page.getByTestId('sticker-title').click()
  await page.getByRole('textbox', { name: 'Sticker name' }).fill('Onboarding context')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('sticker-title')).toHaveText('Onboarding context')

  // 11. markdown export
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export page as Markdown' }).click()])
  expect(download.suggestedFilename()).toBe('project-planning.md')

  await page.getByTestId('delete-sticker').click()
  await expect(page.getByTestId('audio-block')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('audio-block')).toHaveCount(1)
  await page.getByTestId('delete-sticker').click()
  await expect(page.getByTestId('audio-block')).toHaveCount(0)

  // 12. theme persists across reload
  await page.getByRole('radio', { name: 'Dark theme' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
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
  await page.getByRole('searchbox', { name: 'Filter pages by title' }).fill('groc')
  await expect(page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: 'Groceries', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: 'Meeting notes', exact: true })).toHaveCount(0)
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
  await expect(page.getByRole('button', { name: 'Groceries', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete page Groceries' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('button', { name: 'Groceries', exact: true })).toHaveCount(0)
})

test('backup round trip restores pages and audio', async ({ page }) => {
  await fresh(page)
  await page.getByRole('button', { name: 'New page' }).click()
  await page.getByRole('textbox', { name: 'Page title' }).fill('Backup me')
  await page.getByTestId('add-audio').click()
  await page.getByRole('button', { name: 'Start recording' }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Stop' }).click()
  await page.getByTestId('add-to-note').click()
  await expect(page.getByTestId('audio-block')).toHaveCount(1)
  await savedStatus(page)

  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()])
  const path = await download.path()

  // delete the page, then restore it from the backup
  await page.getByRole('button', { name: 'Delete page Backup me' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('button', { name: 'Backup me', exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Backup', exact: true }).click()
  await page.getByLabel('Choose a Jotly backup file').setInputFiles(path)
  // the Welcome page also exists locally, so the app asks what to do with it
  await page.getByRole('button', { name: 'Skip them' }).click()
  await expect(page.getByRole('button', { name: 'Backup me', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Backup me', exact: true }).click()
  await expect(page.getByTestId('audio-block')).toHaveCount(1)
  await page.getByTestId('play').click()
  await expect(page.getByTestId('play')).toHaveAccessibleName(/^Pause/)
})
