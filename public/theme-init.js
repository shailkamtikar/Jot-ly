// Runs before first paint so there is no light/dark flash. Kept as a separate file so a strict CSP (script-src 'self') works.
;(function () {
  try {
    var pref = localStorage.getItem('jotly-theme')
    var dark = pref === 'dark' || ((pref === null || pref === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  } catch (e) {
    document.documentElement.dataset.theme = 'light'
  }
})()
