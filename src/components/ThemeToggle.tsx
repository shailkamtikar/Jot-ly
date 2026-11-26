import { useTheme } from '../state/theme'
import type { ThemePref } from '../lib/theme'
import { MonitorIcon, MoonIcon, SunIcon } from './icons'

const OPTIONS: Array<{ value: ThemePref; label: string; icon: typeof SunIcon }> = [
  { value: 'light', label: 'Light theme', icon: SunIcon },
  { value: 'system', label: 'System theme', icon: MonitorIcon },
  { value: 'dark', label: 'Dark theme', icon: MoonIcon },
]

export function ThemeToggle() {
  const { pref, setPref } = useTheme()
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-[3px] border border-line bg-sunken p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          aria-label={label}
          title={label}
          onClick={() => setPref(value)}
          className={`rounded-md p-1.5 transition-colors ${pref === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
        >
          <Icon width={16} height={16} />
        </button>
      ))}
    </div>
  )
}
