import { useState, useRef, useEffect } from 'react'
import { THEMES } from '../constants/themes'
import './ThemePicker.css'

export default function ThemePicker({ currentTheme, onThemeChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [])

  const current = THEMES.find((t) => t.id === currentTheme)

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className="theme-toggle"
        onClick={() => setOpen((v) => !v)}
        title="Change theme"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </button>

      {open && (
        <div className="theme-dropdown">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option${theme.id === currentTheme ? ' selected' : ''}`}
              onClick={() => {
                onThemeChange(theme.id)
                setOpen(false)
              }}
            >
              <span className="theme-icon">{theme.icon}</span>
              <span className="theme-name">{theme.name}</span>
              {theme.id === currentTheme && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
